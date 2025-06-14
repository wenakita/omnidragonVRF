// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title OmniDragonVRFConsumerV2_5
 * @dev Arbitrum-based contract that properly handles Chainlink VRF 2.5 requests using the 
 *      CORRECT struct-based interface and sends randomness back to Sonic via LayerZero V2.
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OApp, MessagingFee, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

// CORRECT Chainlink VRF 2.5 interfaces - using struct-based approach
interface IVRFCoordinatorV2Plus {
    /**y
     * @notice Request a set of random words using the NEW VRF 2.5 struct format
     * @param req The RandomWordsRequest struct containing all parameters
     */
    function requestRandomWords(
        VRFV2PlusClient.RandomWordsRequest calldata req
    ) external returns (uint256 requestId);
}

// VRF 2.5 Client library for proper struct formatting
library VRFV2PlusClient {
    // Extra arguments structure for VRF 2.5
    struct ExtraArgsV1 {
        bool nativePayment;
    }

    // Main request structure for VRF 2.5
    struct RandomWordsRequest {
        bytes32 keyHash;
        uint256 subId;
        uint16 requestConfirmations;
        uint32 callbackGasLimit;
        uint32 numWords;
        bytes extraArgs;
    }

    // VRF 2.5 tag for extra args
    bytes4 public constant EXTRA_ARGS_V1_TAG = bytes4(keccak256("VRF ExtraArgsV1")); // Correct tag

    /**
     * @notice Encode extra arguments for VRF 2.5 with proper tag
     */
    function _argsToBytes(ExtraArgsV1 memory extraArgs) internal pure returns (bytes memory) {
        return abi.encodePacked(EXTRA_ARGS_V1_TAG, abi.encode(extraArgs.nativePayment));
    }
}

/**
 * @title OmniDragonVRFConsumerV2_5
 * @notice Resides on Arbitrum. Receives requests from Sonic, gets randomness from Chainlink VRF 2.5, and sends it back.
 */
contract OmniDragonVRFConsumerV2_5 is OApp, OAppOptionsType3 {
    using OptionsBuilder for bytes;

    IVRFCoordinatorV2Plus public immutable vrfCoordinator;
    
    // Sonic peer configuration
    uint32 public constant SONIC_EID = 30332;
    
    // Chainlink VRF 2.5 configuration
    uint256 public subscriptionId;
    bytes32 public keyHash;
    uint32 public callbackGasLimit = 690420; // High gas limit for callbacks
    uint16 public requestConfirmations = 3;
    uint32 public numWords = 1;
    
    // VRF 2.5 payment option: false = LINK, true = native token
    bool public nativePayment = false;

    // FIXED: Enhanced tracking with proper data structures
    struct VRFRequest {
        uint64 sequence;
        bytes32 sonicPeer;
        uint256 randomWord;
        bool fulfilled;
        bool responseSent;
        uint256 timestamp;
    }

    mapping(uint256 => VRFRequest) public vrfRequests;
    mapping(uint64 => uint256) public sequenceToRequestId;
    
    // Funding and retry tracking
    mapping(uint64 => bool) public pendingResponses; // Track responses waiting for funding
    uint256 public minimumBalance = 0.01 ether; // Minimum ETH balance for responses
    uint32 public sonicGasLimit = 690420; // Gas limit for Sonic execution

    event RandomWordsRequested(
        uint256 indexed requestId,
        uint32 indexed srcEid,
        bytes32 indexed requester,
        uint256 timestamp
    );
    event VRFRequestSent(uint256 indexed originalRequestId, uint256 indexed vrfRequestId);
    event RandomnessFulfilled(uint256 indexed requestId, uint256[] randomWords);
    event ResponseSentToSonic(uint64 indexed sequence, uint256 randomWord, uint256 fee);
    event ResponsePending(uint64 indexed sequence, uint256 indexed requestId, string reason);
    event VRFConfigUpdated(uint256 subscriptionId, bytes32 keyHash, uint32 callbackGasLimit, uint16 requestConfirmations);
    event MinimumBalanceUpdated(uint256 oldBalance, uint256 newBalance);
    event SonicGasLimitUpdated(uint32 oldLimit, uint32 newLimit);

    constructor(
        address _endpoint,
        address _owner,
        address _vrfCoordinator,
        uint256 _subscriptionId,
        bytes32 _keyHash
    ) OApp(_endpoint, _owner) Ownable(_owner) {
        vrfCoordinator = IVRFCoordinatorV2Plus(_vrfCoordinator);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
    }

    /**
     * @notice LayerZero V2 receive function - receives VRF requests from Sonic
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32,
        bytes calldata _message,
        address,
        bytes calldata
    ) internal override {
        // Verify source is our Sonic peer
        require(peers[_origin.srcEid] == _origin.sender, "Invalid source");
        require(_origin.srcEid == SONIC_EID, "Invalid source chain");
        
        uint64 sequence = abi.decode(_message, (uint64));
        
        // Check for duplicate requests
        require(sequenceToRequestId[sequence] == 0, "Duplicate sequence");

        // Request randomness from Chainlink VRF 2.5 using CORRECT struct format with tag
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: nativePayment})
        );
        
        uint256 requestId = vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: numWords,
                extraArgs: extraArgs
            })
        );
        
        // FIXED: Store complete request information
        vrfRequests[requestId] = VRFRequest({
            sequence: sequence,
            sonicPeer: _origin.sender,
            randomWord: 0,
            fulfilled: false,
            responseSent: false,
            timestamp: block.timestamp
        });
        
        sequenceToRequestId[sequence] = requestId;

        // Emit events matching the working consumer
        emit VRFRequestSent(sequence, requestId);
        emit RandomWordsRequested(requestId, _origin.srcEid, _origin.sender, block.timestamp);
    }

    /**
     * @notice Callback function used by VRF Coordinator
     * @dev This function is called by the VRF Coordinator when randomness is ready
     * @param requestId The request ID
     * @param randomWords Array of random words
     */
    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external {
        require(msg.sender == address(vrfCoordinator), "Only VRF Coordinator can fulfill");

        VRFRequest storage request = vrfRequests[requestId];
        require(request.sequence != 0, "Invalid request ID");
        require(!request.fulfilled, "Already fulfilled");

        // Mark as fulfilled and store random word
        request.fulfilled = true;
        request.randomWord = randomWords[0];

        // Calculate the fee required to send the response back to Sonic
        bytes memory payload = abi.encode(request.sequence, request.randomWord);
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(sonicGasLimit, 0);
        MessagingFee memory fee = _quote(SONIC_EID, payload, options, false);

        // Check if contract has enough ETH balance to pay for the LayerZero fee
        if (address(this).balance < fee.nativeFee) {
            // If not, mark as pending for manual retry later
            pendingResponses[request.sequence] = true;
            emit ResponsePending(request.sequence, requestId, "Insufficient balance for LayerZero fees");
            return;
        }

        // FIXED: Call sendResponseToSonic with the required fee as msg.value
        // This ensures that the _lzSend call in sendResponseToSonic has the necessary ETH
        (bool success, bytes memory returnData) = address(this).call{value: fee.nativeFee}(
            abi.encodeWithSelector(this.sendResponseToSonic.selector, requestId)
        );

        if (success) {
            emit RandomnessFulfilled(requestId, randomWords);
        } else {
            // If sending fails, mark as pending and emit the error
            pendingResponses[request.sequence] = true;
            
            // Try to extract the revert reason
            string memory reason;
            if (returnData.length > 0) {
                // Extract revert reason from returnData
                assembly {
                    reason := add(returnData, 0x20)
                }
            } else {
                reason = "Unknown error in LayerZero send";
            }
            
            emit ResponsePending(request.sequence, requestId, reason);
        }
    }

    /**
     * @notice FIXED: Send response back to Sonic with proper LayerZero V2 options
     * @dev Uses proper fee calculation and LayerZero V2 options encoding
     * @param requestId The VRF request ID
     */
    function sendResponseToSonic(uint256 requestId) external payable {
        require(msg.sender == address(this) || msg.sender == owner(), "Unauthorized");
        
        VRFRequest storage request = vrfRequests[requestId];
        require(request.sequence != 0, "Invalid request ID");
        require(request.fulfilled, "Request not fulfilled");
        require(!request.responseSent, "Response already sent");
        
        bytes memory payload = abi.encode(request.sequence, request.randomWord);
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(sonicGasLimit, 0);
        
        // The fee is provided by the payable call to this function.
        // We use msg.value as the nativeFee for the _lzSend call.
        MessagingFee memory fee = MessagingFee({nativeFee: msg.value, lzTokenFee: 0});
        
        // Send with the fee provided in msg.value
        _lzSend(
            SONIC_EID,
            payload,
            options,
            fee,
            payable(owner()) // Refund any excess gas to the owner
        );
        
        // Mark as sent
        request.responseSent = true;
        
        emit ResponseSentToSonic(request.sequence, request.randomWord, fee.nativeFee);
    }

    /**
     * @notice Manual retry for pending responses
     * @dev Call this after funding the contract to retry failed responses
     * @param sequence The sequence number to retry
     */
    function retryPendingResponse(uint64 sequence) external payable {
        require(pendingResponses[sequence], "No pending response for this sequence");
        
        uint256 requestId = sequenceToRequestId[sequence];
        require(requestId != 0, "Invalid sequence");
        
        VRFRequest storage request = vrfRequests[requestId];
        require(request.fulfilled, "VRF not fulfilled yet");
        require(!request.responseSent, "Response already sent");
        
        // Get the fee required for this response
        bytes memory payload = abi.encode(request.sequence, request.randomWord);
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(sonicGasLimit, 0);
        MessagingFee memory fee = _quote(SONIC_EID, payload, options, false);
        
        // Check if we have enough ETH (considering both msg.value and contract balance)
        uint256 totalAvailable = msg.value + address(this).balance;
        require(totalAvailable >= fee.nativeFee, "Insufficient ETH for LayerZero fee");
        require(totalAvailable >= minimumBalance, "Insufficient balance after fee");
        
        // Call sendResponseToSonic with the exact fee as msg.value
        // This ensures _lzSend has access to the required ETH
        (bool success, bytes memory returnData) = address(this).call{value: fee.nativeFee}(
            abi.encodeWithSelector(this.sendResponseToSonic.selector, requestId)
        );

        if (success) {
            // Success - clean up pending status
            delete pendingResponses[sequence];
            
            uint256[] memory randomWords = new uint256[](1);
            randomWords[0] = request.randomWord;
            emit RandomnessFulfilled(requestId, randomWords); // Signal successful retry
        } else {
            // Extract revert reason if available
            string memory reason;
            if (returnData.length > 0) {
                assembly {
                    reason := add(returnData, 0x20)
                }
                revert(string(abi.encodePacked("Retry failed: ", reason)));
            } else {
                revert("Retry failed: unknown error");
            }
        }
    }

    /**
     * @notice FIXED: Quote LayerZero fee for sending response to Sonic
     * @dev Provides accurate fee estimation for responses
     */
    function quoteSendToSonic() external view returns (MessagingFee memory fee) {
        // Sample payload for fee estimation
        bytes memory payload = abi.encode(uint64(1), uint256(12345));
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(sonicGasLimit, 0);
        return _quote(SONIC_EID, payload, options, false);
    }

    /**
     * @notice LayerZero V2 clear method for manual message recovery
     * @dev Use this if messages get stuck and need manual clearing
     * @param _origin Original message origin
     * @param _guid Message GUID
     * @param _message Original message content
     */
    function clearStuckMessage(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message
    ) external onlyOwner {
        endpoint.clear(address(this), _origin, _guid, _message);
    }

    /**
     * @dev Set VRF 2.5 configuration (owner only)
     */
    function setVRFConfig(
        uint256 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        bool _nativePayment
    ) external onlyOwner {
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        nativePayment = _nativePayment;
        
        emit VRFConfigUpdated(_subscriptionId, _keyHash, _callbackGasLimit, _requestConfirmations);
    }

    /**
     * @dev Set minimum balance for responses (owner only)
     */
    function setMinimumBalance(uint256 _minimumBalance) external onlyOwner {
        uint256 oldBalance = minimumBalance;
        minimumBalance = _minimumBalance;
        emit MinimumBalanceUpdated(oldBalance, _minimumBalance);
    }

    /**
     * @dev Set Sonic gas limit (owner only)
     */
    function setSonicGasLimit(uint32 _gasLimit) external onlyOwner {
        require(_gasLimit >= 100000 && _gasLimit <= 10000000, "Invalid gas limit");
        uint32 oldLimit = sonicGasLimit;
        sonicGasLimit = _gasLimit;
        emit SonicGasLimitUpdated(oldLimit, _gasLimit);
    }

    /**
     * @dev Emergency funding function
     */
    function fundContract() external payable {
        require(msg.value > 0, "Must send ETH");
        // ETH automatically added to contract balance
    }

    /**
     * @dev Test VRF request function (owner only) - for testing purposes
     * Uses the CORRECT VRF 2.5 struct format
     */
    function testVRFRequest() external onlyOwner returns (uint256 requestId) {
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: nativePayment})
        );
        
        requestId = vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: numWords,
                extraArgs: extraArgs
            })
        );
        
        // Store a test request
        uint64 testSequence = uint64(block.timestamp);
        vrfRequests[requestId] = VRFRequest({
            sequence: testSequence,
            sonicPeer: bytes32(uint256(uint160(msg.sender))),
            randomWord: 0,
            fulfilled: false,
            responseSent: false,
            timestamp: block.timestamp
        });
        
        sequenceToRequestId[testSequence] = requestId;

        emit VRFRequestSent(testSequence, requestId);
        emit RandomWordsRequested(requestId, 0, bytes32(uint256(uint160(msg.sender))), block.timestamp);
    }

    /**
     * @dev Get VRF configuration
     */
    function getVRFConfig() external view returns (
        uint256 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        bool _nativePayment
    ) {
        return (subscriptionId, keyHash, callbackGasLimit, requestConfirmations, nativePayment);
    }

    /**
     * @dev Get request details by sequence
     */
    function getRequestBySequence(uint64 sequence) external view returns (
        uint256 requestId,
        bool exists,
        bool fulfilled,
        bool responseSent,
        uint256 randomWord,
        uint256 timestamp
    ) {
        requestId = sequenceToRequestId[sequence];
        if (requestId == 0) {
            return (0, false, false, false, 0, 0);
        }
        
        VRFRequest storage request = vrfRequests[requestId];
        return (
            requestId,
            true,
            request.fulfilled,
            request.responseSent,
            request.randomWord,
            request.timestamp
        );
    }

    /**
     * @dev Get request details by VRF request ID
     */
    function getRequestById(uint256 requestId) external view returns (
        uint64 sequence,
        bool exists,
        bool fulfilled,
        bool responseSent,
        uint256 randomWord,
        uint256 timestamp
    ) {
        VRFRequest storage request = vrfRequests[requestId];
        if (request.sequence == 0) {
            return (0, false, false, false, 0, 0);
        }
        
        return (
            request.sequence,
            true,
            request.fulfilled,
            request.responseSent,
            request.randomWord,
            request.timestamp
        );
    }

    /**
     * @dev Check contract status
     */
    function getContractStatus() external view returns (
        uint256 balance,
        uint256 minBalance,
        bool canSendResponses,
        uint32 gasLimit
    ) {
        balance = address(this).balance;
        minBalance = minimumBalance;
        canSendResponses = balance >= minBalance;
        gasLimit = sonicGasLimit;
        
        return (balance, minBalance, canSendResponses, gasLimit);
    }

    /**
     * @dev Withdraw ETH (owner only)
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev Receive ETH for LayerZero fees
     */
    receive() external payable {}
}

