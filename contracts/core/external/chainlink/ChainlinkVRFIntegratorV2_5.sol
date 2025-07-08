// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title ChainlinkVRFIntegratorV2_5 - OmniDragon Cross-Chain VRF System
 * @dev Sonic-based contract that receives random words requests and forwards them to Arbitrum
 *      for Chainlink VRF 2.5 processing. Part of the OmniDragon ecosystem's cross-chain lottery
 *      and random words infrastructure.
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OApp, MessagingFee, Origin } from "../../../../lib/devtools/packages/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "../../../../lib/devtools/packages/oapp-evm/contracts/oapp/OAppSender.sol";
import { OAppOptionsType3 } from "../../../../lib/devtools/packages/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OptionsBuilder } from "../../../../lib/devtools/packages/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { IChainlinkVRFIntegratorV2_5 } from "../../../interfaces/external/chainlink/IChainlinkVRFIntegratorV2_5.sol";
import { IRandomWordsCallbackV2_5 } from "../../../interfaces/external/chainlink/IRandomWordsCallbackV2_5.sol";
import { SetConfigParam } from "../../../../lib/layerzero-v2/packages/layerzero-v2/evm/protocol/contracts/interfaces/IMessageLibManager.sol";

/**
 * @title ChainlinkVRFIntegratorV2_5
 * @notice Resides on a source chain (e.g., Sonic). Called by a provider to get random words from a peer on a destination chain (e.g., Arbitrum).
 */
contract ChainlinkVRFIntegratorV2_5 is OApp, OAppOptionsType3 {
    using OptionsBuilder for bytes;
    
    // Constants
    uint32 constant ARBITRUM_EID = 30110;
    
    // Events
    event RandomWordsReceived(uint256[] randomWords, uint64 sequence, address provider);
    event CallbackSucceeded(uint64 sequence, address provider);
    event CallbackFailed(uint64 sequence, address provider, string reason);
    event RandomWordsRequested(uint64 requestId, address requester, uint32 dstEid);
    event MessageSent(uint64 requestId, uint32 dstEid, bytes payload);
    event GasLimitUpdated(uint32 oldLimit, uint32 newLimit);
    event RequestTimeoutUpdated(uint256 oldTimeout, uint256 newTimeout);
    event RequestExpired(uint64 requestId, address provider);
    event ContractFunded(address funder, uint256 amount, uint256 balance);
    event FeeMRevenueToJackpot(uint256 amount, uint256 timestamp);
    event JackpotVaultSet(address oldVault, address newVault);
    
    // State variables
    uint64 public requestCounter;
    uint32 public defaultGasLimit = 700000;
    address public jackpotVault; // Jackpot vault for FeeM revenue
    
    // Request tracking
    struct RequestStatus {
        bool fulfilled;
        bool exists;
        address provider;
        uint256 randomWord;
        uint256 timestamp;
        bool isContract; // Track if provider is a contract
    }
    mapping(uint64 => RequestStatus) public s_requests;
    // AUDIT FIX: Removed redundant randomWordsProviders mapping

    // Configuration
    uint256 public requestTimeout = 300; // 5 minutes timeout

    constructor(address _endpoint, address _initialOwner) 
        OApp(_endpoint, address(this)) 
        Ownable(_initialOwner) 
    {
        // No-op constructor
    }

    /**
     * @dev Receives random words responses from Arbitrum
     * @dev Updated to handle the correct payload format: (sequence, randomWord)
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32,
        bytes calldata _payload,
        address,
        bytes calldata
    ) internal override {
        require(peers[_origin.srcEid] == _origin.sender, "Unauthorized");
        require(_payload.length == 64, "Invalid payload size"); // AUDIT FIX: abi.encode(uint64, uint256) = 64 bytes

        (uint64 sequence, uint256 randomWord) = abi.decode(_payload, (uint64, uint256));
        
        RequestStatus storage request = s_requests[sequence];
        require(request.exists, "Request not found");
        require(!request.fulfilled, "Request already fulfilled");
        require(block.timestamp <= request.timestamp + requestTimeout, "Request expired");
        
        address provider = request.provider;
        require(provider != address(0), "Provider not found");
        
        // Mark as fulfilled
        request.fulfilled = true;
        request.randomWord = randomWord;
        
        // AUDIT FIX: Removed redundant randomWordsProviders mapping cleanup

        // Create randomWords array for callback/event
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = randomWord;
        
        // Always emit the RandomWordsReceived event first
        emit RandomWordsReceived(randomWords, sequence, provider);
        
        // Only attempt callback if provider is a contract
        if (request.isContract) {
            try IRandomWordsCallbackV2_5(provider).receiveRandomWords(randomWords, sequence) {
                emit CallbackSucceeded(sequence, provider);
            } catch Error(string memory reason) {
                emit CallbackFailed(sequence, provider, reason);
            } catch (bytes memory /*lowLevelData*/) {
                emit CallbackFailed(sequence, provider, "Low-level callback failure");
            }
        }
        // For EOA (wallet) requests, the RandomWordsReceived event is sufficient
        // Users can query s_requests[sequence].randomWord to get their value
    }

    /**
     * @notice Manual retry for stuck LayerZero messages
     * @dev In LayerZero V2, retry is handled by the executor infrastructure
     *      This function is for administrative purposes and monitoring
     * @param requestId The request ID that may need attention
     */
    function checkRequestStatus(uint64 requestId) external view returns (
        bool fulfilled,
        bool exists,
        address provider,
        uint256 randomWord,
        uint256 timestamp,
        bool expired
    ) {
        RequestStatus memory request = s_requests[requestId];
        return (
            request.fulfilled,
            request.exists,
            request.provider,
            request.randomWord,
            request.timestamp,
            block.timestamp > request.timestamp + requestTimeout
        );
    }

    /**
     * @notice Get the random word for a fulfilled request
     * @param requestId The request ID to query
     * @return randomWord The random word (0 if not fulfilled)
     * @return fulfilled Whether the request has been fulfilled
     */
    function getRandomWord(uint64 requestId) external view returns (uint256 randomWord, bool fulfilled) {
        RequestStatus memory request = s_requests[requestId];
        return (request.randomWord, request.fulfilled);
    }

    /**
     * @dev Main function to request random words from a peer VRF Consumer.
     * @param _dstEid The destination endpoint ID (e.g., for Arbitrum).
     * @param _options LayerZero options for the cross-chain message.
     */
    function requestRandomWords(uint32 _dstEid, bytes calldata _options) external payable returns (MessagingReceipt memory receipt, uint64 requestId) {
        bytes32 peer = peers[_dstEid];
        require(peer != bytes32(0), "Peer not set");
        
        requestCounter++;
        requestId = requestCounter;
        
        // Check if caller is a contract
        bool isContract = msg.sender.code.length > 0;
        
        // Store request info
        s_requests[requestId] = RequestStatus({
            fulfilled: false,
            exists: true,
            provider: msg.sender,
            randomWord: 0,
            timestamp: block.timestamp,
            isContract: isContract
        });

        bytes memory payload = abi.encode(requestId);

        receipt = _lzSend(
            _dstEid,
            payload,
            _options,
            MessagingFee({nativeFee: msg.value, lzTokenFee: 0}),
            payable(msg.sender)
        );

        emit RandomWordsRequested(requestId, msg.sender, _dstEid);
        emit MessageSent(requestId, _dstEid, payload);
    }

    /**
     * @dev Convenience function to request random words with a default gas limit.
     * @param _dstEid The destination endpoint ID (e.g., for Arbitrum).
     */
    function requestRandomWordsSimple(uint32 _dstEid) external payable returns (MessagingReceipt memory receipt, uint64 requestId) {
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(defaultGasLimit, 0);
        return this.requestRandomWords{value: msg.value}(_dstEid, options);
    }
    
    /**
     * @dev Quote the fee for a random words request.
     * @param _dstEid The destination endpoint ID.
     * @param _options LayerZero options for the cross-chain message.
     */
    function quote(uint32 _dstEid, bytes calldata _options) public view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encode(uint64(requestCounter + 1));
        fee = _quote(_dstEid, payload, _options, false);
    }

    /**
     * @dev Allows the owner to set the default gas limit for simple requests.
     * @param _newGasLimit The new default gas limit.
     */
    function setDefaultGasLimit(uint32 _newGasLimit) external onlyOwner {
        uint32 oldLimit = defaultGasLimit;
        defaultGasLimit = _newGasLimit;
        emit GasLimitUpdated(oldLimit, _newGasLimit); // AUDIT FIX: Emit event
    }

    /**
     * @dev Authorize/deauthorize callers (owner only)
     * @param caller The address to authorize/deauthorize
     * @param authorized Whether to authorize or deauthorize
     */
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        // For now, this is a placeholder function for interface compatibility
        // The current implementation allows all callers
        // This can be enhanced with actual authorization logic if needed
    }

    /**
     * @dev Allows the owner to set the request timeout duration.
     * @param _newTimeout The new timeout in seconds.
     */
    function setRequestTimeout(uint256 _newTimeout) external onlyOwner {
        uint256 oldTimeout = requestTimeout;
        requestTimeout = _newTimeout;
        emit RequestTimeoutUpdated(oldTimeout, _newTimeout); // AUDIT FIX: Emit event
    }

    /**
     * @dev Set peer for a specific endpoint ID (owner only)
     * @param _eid The endpoint ID to set the peer for
     * @param _peer The peer address (as bytes32)
     */
    function setPeer(uint32 _eid, bytes32 _peer) public override onlyOwner {
        _setPeer(_eid, _peer);
    }

    /**
     * @dev Set LayerZero configuration (called by LayerZero tooling)
     * @param _lib The message library address
     * @param _params Array of configuration parameters
     */
    // function setConfig(address _lib, SetConfigParam[] calldata _params) external onlyOwner {
    //     // Delegate to the LayerZero endpoint
    //     endpoint.setConfig(address(this), _lib, _params);
    // }

    /**
     * @dev Get LayerZero configuration
     * @param _lib The message library address
     * @param _eid The endpoint ID
     * @param _configType The configuration type
     * @return config The configuration bytes
     */
    function getConfig(address _lib, uint32 _eid, uint32 _configType) external view returns (bytes memory config) {
        return endpoint.getConfig(address(this), _lib, _eid, _configType);
    }

    /**
     * @dev Clean up expired requests (anyone can call)
     * @param requestIds Array of request IDs to clean up (max 50 per transaction)
     */
    function cleanupExpiredRequests(uint64[] calldata requestIds) external {
        require(requestIds.length <= 50, "Too many requests to cleanup"); // AUDIT FIX: Prevent DoS
        
        for (uint256 i = 0; i < requestIds.length; i++) {
            uint64 requestId = requestIds[i];
            RequestStatus storage request = s_requests[requestId];
            
            if (request.exists && !request.fulfilled && 
                block.timestamp > request.timestamp + requestTimeout) {
                
                address provider = request.provider;
                
                // Mark as expired and clean up
                delete s_requests[requestId];
                // AUDIT FIX: Removed redundant randomWordsProviders mapping cleanup
                
                emit RequestExpired(requestId, provider);
            }
        }
    }

    // Enhanced storage for lottery functionality
    mapping(uint64 => uint256) public sequenceToRandomWord;
    mapping(uint64 => address) public sequenceToUser;
    mapping(uint64 => uint256) public sequenceToSwapAmount;
    mapping(uint64 => uint256) public sequenceToWinProbability;
    
    // Events for lottery processing
    event InstantLotteryProcessed(address indexed user, uint256 swapAmount, bool won, uint256 reward);
    event RandomnessStored(uint64 indexed sequence, uint256 randomWord, address user);

    /**
     * @dev Enhanced callback function for Instantaneous Lottery Token
     * @param randomWords Array of random words received
     * @param sequence The sequence number of the request
     */
    function receiveRandomWords(uint256[] memory randomWords, uint256 sequence) external {
        require(randomWords.length > 0, "No random words provided");
        
        // Simply log the received random words
        emit RandomWordsReceived(randomWords, uint64(sequence), msg.sender);
    }
    
    /**
     * @dev Process instant lottery with received randomness
     * @param sequence The request sequence number
     * @param randomness The random number from VRF
     * @param user The user who triggered the lottery
     * @param swapAmount The swap amount that triggered the lottery
     * @param winProbability The win probability in basis points (out of 10000)
     */
    function _processInstantLottery(
        uint64 sequence,
        uint256 randomness,
        address user,
        uint256 swapAmount,
        uint256 winProbability
    ) internal {
        // Calculate win condition using modulo for uniform distribution
        // winProbability is in basis points (1 BP = 0.01%, so 10000 = 100%)
        bool won = (randomness % 10000) < winProbability;
        
        uint256 reward = 0;
        
        if (won) {
            // Calculate reward based on current jackpot
            // This is a placeholder - you'll need to integrate with your jackpot system
            reward = _calculateLotteryReward(swapAmount);
            
            // Distribute reward to winner
            if (reward > 0) {
                _distributeLotteryReward(user, reward);
            }
        }
        
        // Clean up storage to save gas for future operations
        delete sequenceToUser[sequence];
        delete sequenceToSwapAmount[sequence];
        delete sequenceToWinProbability[sequence];
        
        emit InstantLotteryProcessed(user, swapAmount, won, reward);
    }
    
    /**
     * @dev Set lottery context for a VRF request (called by lottery system)
     * @param sequence The VRF request sequence
     * @param user The user who triggered the lottery
     * @param swapAmount The swap amount
     * @param winProbability Win probability in basis points
     */
    function setLotteryContext(
        uint64 sequence,
        address user,
        uint256 swapAmount,
        uint256 winProbability
    ) external {
        // Add access control here - only authorized lottery contracts should call this
        // require(authorizedLotteryContracts[msg.sender], "Unauthorized");
        
        sequenceToUser[sequence] = user;
        sequenceToSwapAmount[sequence] = swapAmount;
        sequenceToWinProbability[sequence] = winProbability;
    }
    
    /**
     * @dev Calculate lottery reward (placeholder implementation)
     * @param swapAmount The swap amount that triggered the lottery
     * @return reward The calculated reward amount
     */
    function _calculateLotteryReward(uint256 swapAmount) internal pure returns (uint256 reward) {
        // Placeholder implementation - integrate with your jackpot distributor
        // This could be a percentage of current jackpot, or based on swap amount
        return swapAmount / 100; // Example: 1% of swap amount
    }
    
    /**
     * @dev Distribute lottery reward to winner (placeholder implementation)
     * @param user The winner address
     * @param reward The reward amount
     */
    function _distributeLotteryReward(address user, uint256 reward) internal {
        // Placeholder implementation - integrate with your reward distribution system
        // This might call your jackpot distributor or token contract
        
        // Example: Transfer ETH reward (if contract holds ETH)
        if (address(this).balance >= reward) {
            (bool success, ) = payable(user).call{value: reward}("");
            require(success, "Reward transfer failed");
        }
    }

    /// @dev Register my contract on Sonic FeeM
    function registerMe() external {
        (bool _success,) = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830).call(
            abi.encodeWithSignature("selfRegister(uint256)", 143)
        );
        require(_success, "FeeM registration failed");
    }

    /**
     * @dev Emergency withdraw (owner only)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        // AUDIT FIX: Use call instead of transfer for better compatibility
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Fund contract with ETH for LayerZero operations
     * @notice Anyone can fund the contract to ensure smooth VRF operations
     */
    function fundContract() external payable {
        require(msg.value > 0, "Must send ETH to fund contract");
        emit ContractFunded(msg.sender, msg.value, address(this).balance);
    }

    /**
     * @dev Get current contract balance and status
     * @return balance Current ETH balance
     * @return canOperate Whether contract has sufficient funds for operations
     */
    function getContractStatus() external view returns (uint256 balance, bool canOperate) {
        balance = address(this).balance;
        canOperate = balance > 0; // Simple check - any balance allows operation
        return (balance, canOperate);
    }

    /**
     * @dev Receive FeeM revenue - forward to jackpot vault
     */
    receive() external payable {
        if (msg.value > 0 && jackpotVault != address(0)) {
            // Forward FeeM revenue directly to jackpot vault
            (bool success,) = payable(jackpotVault).call{value: msg.value}("");
            if (success) {
                emit FeeMRevenueToJackpot(msg.value, block.timestamp);
            }
        }
    }

    /**
     * @dev Set the jackpot vault address for FeeM revenue forwarding
     * @param _jackpotVault The new jackpot vault address
     */
    function setJackpotVault(address _jackpotVault) external onlyOwner {
        require(_jackpotVault != address(0), "Zero address");
        address oldVault = jackpotVault;
        jackpotVault = _jackpotVault;
        emit JackpotVaultSet(oldVault, _jackpotVault);
    }
} 