// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";

/**
 * @title IOmniDragonVRFConsumerV2_5
 * @dev Interface for OmniDragon VRF Consumer V2.5 - Chainlink VRF 2.5 integration contract
 * 
 * This contract resides on a destination chain (e.g., Arbitrum), receives VRF requests from a source chain via LayerZero,
 * gets randomness from Chainlink VRF 2.5, and sends responses back to the source chain.
 */
interface IOmniDragonVRFConsumerV2_5 {
    
    // Events
    event RandomWordsRequested(uint256 indexed requestId, uint32 indexed srcEid, bytes32 indexed requester, uint256 timestamp);
    event VRFRequestSent(uint64 indexed sequence, uint256 indexed vrfRequestId);
    event RandomnessFulfilled(uint256 indexed requestId, uint256[] randomWords);
    event ResponseSentToSonic(uint64 indexed sequence, uint256 randomWord, uint256 fee);
    event ResponsePending(uint64 indexed sequence, uint256 indexed requestId, string reason);
    event VRFConfigUpdated(uint256 subscriptionId, bytes32 keyHash, uint32 callbackGasLimit, uint16 requestConfirmations);
    event MinimumBalanceUpdated(uint256 oldBalance, uint256 newBalance);
    event SonicGasLimitUpdated(uint32 oldLimit, uint32 newLimit);
    event ContractFunded(address indexed funder, uint256 amount, uint256 newBalance);

    /**
     * @notice Retry sending a pending response
     * @param sequence The sequence number to retry
     */
    function retryPendingResponse(uint64 sequence) external payable;

    /**
     * @notice Quote LayerZero fee for sending response to Sonic
     * @dev Provides accurate fee estimation for responses
     */
    function quoteSendToSonic() external view returns (MessagingFee memory fee);

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
    ) external;

    /**
     * @notice Test VRF request function (owner only) - for testing purposes
     */
    function testVRFRequest() external returns (uint256 requestId);

    /* ========== CONFIGURATION FUNCTIONS ========== */

    /**
     * @dev Set VRF 2.5 configuration (owner only)
     */
    function setVRFConfig(
        uint256 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        bool _nativePayment
    ) external;

    function setMinimumBalance(uint256 _minimumBalance) external;
    function setSonicGasLimit(uint32 _gasLimit) external;

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @dev Get VRF configuration
     */
    function getVRFConfig() external view returns (
        uint256 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        bool _nativePayment
    );

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
    );

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
    );

    /**
     * @dev Check contract status
     */
    function getContractStatus() external view returns (
        uint256 balance,
        uint256 minBalance,
        bool canSendResponses,
        uint32 gasLimit
    );

    /* ========== STATE VARIABLES ========== */

    function subscriptionId() external view returns (uint256);
    function keyHash() external view returns (bytes32);
    function callbackGasLimit() external view returns (uint32);
    function requestConfirmations() external view returns (uint16);
    function numWords() external view returns (uint32);
    function nativePayment() external view returns (bool);
    function minimumBalance() external view returns (uint256);
    function sonicGasLimit() external view returns (uint32);
    function sequenceToRequestId(uint64 sequence) external view returns (uint256);
    function pendingResponses(uint64 sequence) external view returns (bool);

    /* ========== ADMIN FUNCTIONS ========== */

    function withdraw() external;

    /**
     * @dev Fund contract with ETH for LayerZero fees and VRF operations
     */
    function fundContract() external payable;
}
