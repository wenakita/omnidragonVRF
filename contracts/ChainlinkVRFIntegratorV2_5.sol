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
import { OApp, MessagingFee, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

// Interface for random words callback to the provider (optional)
// This matches the Chainlink VRF 2.5 callback pattern
interface IRandomWordsCallbackV2_5 {
    function receiveRandomWords(uint256[] memory randomWords, uint64 sequence) external;
}

/**
 * @title ChainlinkVRFIntegratorV2_5
 * @notice Resides on Sonic. Called by a provider to get random words from a peer on Arbitrum.
 */
contract ChainlinkVRFIntegratorV2_5 is OApp, OAppOptionsType3 {
    using OptionsBuilder for bytes;
    
    // Constants
    uint32 constant ARBITRUM_EID = 30110;
    
    // State variables
    uint64 public requestCounter;
    uint32 public defaultGasLimit = 690420; // Updated default gas limit
    
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
    mapping(uint64 => address) public randomWordsProviders;

    // Events
    event RandomWordsRequested(uint64 indexed requestId, address indexed requester, uint32 dstEid);
    event MessageSent(uint64 indexed requestId, uint32 indexed dstEid, bytes message);
    event RandomWordsReceived(uint256[] randomWords, uint64 indexed sequence, address indexed provider);
    event CallbackFailed(uint64 indexed sequence, address indexed provider, string reason);
    event CallbackSucceeded(uint64 indexed sequence, address indexed provider);
    event RequestExpired(uint64 indexed sequence, address indexed provider);
    event GasLimitUpdated(uint32 oldLimit, uint32 newLimit);
    event FeeMRegistered(address indexed contractAddress, uint256 indexed feeId);

    // Configuration
    uint256 public requestTimeout = 1 hours; // Requests expire after 1 hour

    constructor(address _endpoint, address _delegate) 
        OApp(_endpoint, _delegate) 
        Ownable(_delegate) 
    {}

    /**
     * @dev Receives random words responses from Arbitrum
     * Updated to handle the correct payload format: (sequence, randomWord)
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32,
        bytes calldata _payload,
        address,
        bytes calldata
    ) internal override {
        require(peers[_origin.srcEid] == _origin.sender, "Unauthorized");
        require(_payload.length == 64, "Invalid payload size");

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
        
        // Clean up provider mapping
        delete randomWordsProviders[sequence];

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
     * @dev Request random words from Arbitrum VRF Consumer
     * @param _options LayerZero options for the cross-chain message
     */
    function requestRandomWords(bytes calldata _options) external payable returns (MessagingReceipt memory receipt, uint64 requestId) {
        bytes32 peer = peers[ARBITRUM_EID];
        require(peer != bytes32(0), "Arbitrum peer not set");
        
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
        randomWordsProviders[requestId] = msg.sender;

        bytes memory payload = abi.encode(requestId);

        receipt = _lzSend(
            ARBITRUM_EID,
            payload,
            _options,
            MessagingFee({nativeFee: msg.value, lzTokenFee: 0}),
            payable(msg.sender)
        );

        emit RandomWordsRequested(requestId, msg.sender, ARBITRUM_EID);
        emit MessageSent(requestId, ARBITRUM_EID, payload);
    }

    /**
     * @dev Request random words with custom gas limit
     * @param _gasLimit Custom gas limit for the cross-chain execution
     */
    function requestRandomWordsWithGas(uint32 _gasLimit) external payable returns (MessagingReceipt memory receipt, uint64 requestId) {
        // Create options using OptionsBuilder approach that avoids the worker ID issue
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(_gasLimit, 0);
        return this.requestRandomWords{value: msg.value}(options);
    }

    /**
     * @dev Request random words with default options (now uses 690,420 gas)
     * Updated to be more wallet-friendly
     */
    function requestRandomWordsSimple() external payable returns (MessagingReceipt memory receipt, uint64 requestId) {
        // Use the exact working options format from successful transaction
        bytes memory options = hex"000301001101000000000000000000000000000A88F4";
        return this.requestRandomWords{value: msg.value}(options);
    }
    
    /**
     * @dev Quote the fee for a random words request
     * @param _options LayerZero options for the cross-chain message
     */
    function quote(bytes calldata _options) public view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encode(uint64(requestCounter + 1));
        fee = _quote(ARBITRUM_EID, payload, _options, false);
    }

    /**
     * @dev Quote fee with custom gas limit
     * @param _gasLimit Custom gas limit for the cross-chain execution
     */
    function quoteWithGas(uint32 _gasLimit) public view returns (MessagingFee memory fee) {
        // Use OptionsBuilder for custom gas limit
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(_gasLimit, 0);
        bytes memory payload = abi.encode(uint64(requestCounter + 1));
        return _quote(ARBITRUM_EID, payload, options, false);
    }

    /**
     * @dev Quote fee for simple request
     */
    function quoteSimple() public view returns (MessagingFee memory fee) {
        // Use the exact working options format from successful transaction
        bytes memory options = hex"000301001101000000000000000000000000000A88F4";
        bytes memory payload = abi.encode(uint64(requestCounter + 1));
        return _quote(ARBITRUM_EID, payload, options, false);
    }

    /**
     * @dev Update default gas limit (owner only)
     */
    function setDefaultGasLimit(uint32 _gasLimit) external onlyOwner {
        uint32 oldLimit = defaultGasLimit;
        defaultGasLimit = _gasLimit;
        emit GasLimitUpdated(oldLimit, _gasLimit);
    }

    /**
     * @dev Update request timeout (owner only)
     */
    function setRequestTimeout(uint256 _timeout) external onlyOwner {
        requestTimeout = _timeout;
    }

    /**
     * @dev Clean up expired requests (anyone can call)
     * @param requestIds Array of request IDs to clean up
     */
    function cleanupExpiredRequests(uint64[] calldata requestIds) external {
        for (uint256 i = 0; i < requestIds.length; i++) {
            uint64 requestId = requestIds[i];
            RequestStatus storage request = s_requests[requestId];
            
            if (request.exists && !request.fulfilled && 
                block.timestamp > request.timestamp + requestTimeout) {
                
                address provider = request.provider;
                
                // Mark as expired and clean up
                delete s_requests[requestId];
                delete randomWordsProviders[requestId];
                
                emit RequestExpired(requestId, provider);
            }
        }
    }

    /**
     * @dev Register my contract on Sonic FeeM
     * @notice This function registers the contract with Sonic's fee management system
     */
    function registerMe() external {
        (bool _success,) = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830).call(
            abi.encodeWithSignature("selfRegister(uint256)", 143)
        );
        require(_success, "FeeM registration failed");
        emit FeeMRegistered(address(this), 143);
    }

    /**
     * @dev Emergency withdraw (owner only)
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev Receive ETH
     */
    receive() external payable {}
} 