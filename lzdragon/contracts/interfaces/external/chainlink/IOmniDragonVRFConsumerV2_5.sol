// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOmniDragonVRFConsumerV2_5
 * @dev Interface for the OmniDragon VRF Consumer V2.5
 */
interface IOmniDragonVRFConsumerV2_5 {
    // ============ STRUCTS ============
    
    struct VRFRequest {
        address requester;
        bool fulfilled;
        uint256[] randomWords;
        uint256 timestamp;
    }

    struct LocalVRFConfig {
        uint64 subscriptionId;
        bytes32 keyHash;
        uint32 callbackGasLimit;
        uint16 requestConfirmations;
        uint32 numWords;
        bool enabled;
    }

    // ============ EVENTS ============
    
    event VRFRequested(uint256 indexed requestId, address indexed requester);
    event VRFFulfilled(uint256 indexed requestId, uint256[] randomWords);
    event CrossChainVRFRequested(uint256 indexed requestId, uint32 indexed dstEid, address indexed requester);
    event AuthorizedCallerUpdated(address indexed caller, bool authorized);
    event VRFConfigUpdated(bytes32 keyHash, uint32 callbackGasLimit, uint16 requestConfirmations);
    
    event LocalVRFRequested(
        uint256 indexed requestId,
        address indexed requester,
        uint256 timestamp
    );
    
    event LocalVRFFulfilled(
        uint256 indexed requestId,
        uint256[] randomWords,
        address indexed requester
    );
    
    event LocalCallerAuthorized(address indexed caller, bool indexed authorized);
    
    event LocalVRFConfigUpdated(
        uint64 subscriptionId,
        bytes32 keyHash,
        uint32 callbackGasLimit,
        uint16 requestConfirmations,
        uint32 numWords,
        bool enabled
    );

    // ============ VRF FUNCTIONS ============
    
    function requestRandomWords() external returns (uint256 requestId);
    
    function requestRandomWordsLocal() external returns (uint256 requestId);
    
    function requestCrossChainVRF(
        uint32 dstEid,
        bytes calldata options
    ) external payable returns (uint256 requestId);

    // ============ ADMIN FUNCTIONS ============
    
    function setLotteryManager(address _lotteryManager) external;
    
    function setAuthorizedCaller(address caller, bool authorized) external;
    
    function updateVRFConfig(
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords
    ) external;
    
    function setVRFEnabled(bool _enabled) external;
    
    function setLocalCallerAuthorization(address caller, bool authorized) external;
    
    function updateLocalVRFConfig(
        uint64 subscriptionId,
        bytes32 keyHash,
        uint32 callbackGasLimit,
        uint16 requestConfirmations,
        uint32 numWords,
        bool enabled
    ) external;
    
    function withdrawLink(uint256 amount) external;
    
    function withdrawNative(uint256 amount) external;

    // ============ VIEW FUNCTIONS ============
    
    function getVRFRequest(uint256 requestId) external view returns (
        address requester,
        bool fulfilled,
        uint256[] memory randomWords,
        uint256 timestamp
    );
    
    function getVRFConfig() external view returns (
        uint256 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords
    );
    
    function isAuthorizedCaller(address caller) external view returns (bool);
    
    function getStats() external view returns (
        uint256 _totalRequests,
        uint256 _totalFulfillments,
        bool _vrfEnabled
    );
    
    function getLocalVRFConfig() external view returns (LocalVRFConfig memory);
    
    function isLocalCallerAuthorized(address caller) external view returns (bool);
    
    function getLocalRequest(uint256 requestId) external view returns (VRFRequest memory);
    
    function getLocalRequestStatus(uint256 requestId) external view returns (
        bool fulfilled,
        uint256[] memory randomWords
    );

    // ============ CALLBACK INTERFACE ============
    
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external;
} 