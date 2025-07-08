// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IDrandRandomnessProvider
 * @dev Interface for drand-based randomness provider
 */
interface IDrandRandomnessProvider {
    
    // ============ STRUCTS ============
    
    struct DrandBeacon {
        uint256 round;
        bytes32 randomness;
        bytes signature;
        uint256 timestamp;
        bool verified;
    }

    struct RandomnessRequest {
        address requester;
        uint256 drandRound;
        uint64 timestamp;
        bool fulfilled;
        uint256 randomValue;
        bytes32 requestHash;
    }

    // ============ EVENTS ============
    
    event RandomnessRequested(uint256 indexed requestId, address indexed requester, uint256 drandRound);
    event DrandBeaconStored(uint256 indexed round, bytes32 randomness, uint256 timestamp);
    event DrandBeaconVerified(uint256 indexed round, bool verified);
    event RandomnessFulfilled(uint256 indexed requestId, uint256 randomValue, uint256 drandRound);
    event ConsumerAuthorized(address indexed consumer, bool authorized);

    // ============ EXTERNAL FUNCTIONS ============

    /**
     * @dev Request randomness from drand for a specific round
     * @param drandRound The drand round to use for randomness (0 = current round)
     * @return requestId The unique identifier for this randomness request
     */
    function requestDrandRandomness(uint256 drandRound) external returns (uint256);

    /**
     * @dev Submit drand beacon data for verification and storage
     * @param round The drand round number
     * @param randomness The random value from drand
     * @param signature The BLS signature from drand
     */
    function submitDrandBeacon(
        uint256 round,
        bytes32 randomness,
        bytes calldata signature
    ) external;

    /**
     * @dev Verify a drand beacon's signature
     * @param round The drand round to verify
     * @return verified Whether the beacon was successfully verified
     */
    function verifyDrandBeacon(uint256 round) external returns (bool verified);

    /**
     * @dev Get randomness from a fulfilled request
     * @param requestId The request identifier
     * @return randomValue The random value
     * @return fulfilled Whether the request was fulfilled
     */
    function getRandomness(uint256 requestId) external view returns (uint256 randomValue, bool fulfilled);

    /**
     * @dev Check if consumer is authorized
     * @param consumer The consumer address to check
     * @return authorized Whether the consumer is authorized
     */
    function isAuthorizedConsumer(address consumer) external view returns (bool authorized);

    /**
     * @dev Get current drand round number
     * @return round The current drand round
     */
    function getCurrentDrandRound() external view returns (uint256 round);

    /**
     * @dev Get estimated fees for randomness request (compatibility with old interface)
     * @return fee The estimated fee (0 for drand as it's free)
     */
    function getEstimatedFees() external view returns (uint256 fee);

    /**
     * @dev Request randomness (compatibility method for old interface)
     * @return requestId The request identifier
     */
    function requestRandomnessFromVRF() external payable returns (uint256 requestId);
} 