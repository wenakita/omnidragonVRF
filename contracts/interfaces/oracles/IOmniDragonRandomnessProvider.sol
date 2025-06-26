// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOmniDragonRandomnessProvider
 * @dev Interface for the OmniDragon Randomness Provider
 */
interface IOmniDragonRandomnessProvider {
    /**
     * @dev Request types for randomness
     */
    enum RequestType {
        POOL,           // Pool-based pseudo-randomness
        CHAINLINK_VRF,  // Chainlink VRF cross-chain
        INSTANT         // Instant pseudo-randomness
    }

    /**
     * @dev Randomness request structure
     */
    struct RandomnessRequest {
        address requester;     // Contract requesting randomness
        uint64 timestamp;      // When the request was made
        bool fulfilled;        // Whether request has been fulfilled
        uint256 randomValue;   // The random value (0 if not fulfilled)
        uint32 requestType;    // Type of request (RequestType enum)
        uint64 vrfSequence;    // VRF sequence number if applicable
    }

    /**
     * @dev Request randomness from pool (pseudo-randomness)
     * @return randomnessId The unique identifier for this randomness request
     */
    function requestRandomnessFromPool() external payable returns (uint256 randomnessId);

    /**
     * @dev Request randomness from Chainlink VRF via cross-chain integrator
     * @return randomnessId The unique identifier for this randomness request
     */
    function requestRandomnessFromChainlinkVRF() external payable returns (uint256 randomnessId);

    /**
     * @dev Get instant randomness for per-swap lotteries (no fee, pseudo-random)
     * @param swapper The address of the user making the swap
     * @param tokenA The first token in the swap
     * @param tokenB The second token in the swap  
     * @param amountIn The input amount
     * @param amountOut The output amount
     * @return randomness The generated random value
     */
    function drawUnpredictableFromPool(
        address swapper,
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint256 amountOut
    ) external returns (uint256 randomness);

    /**
     * @dev Receives random words from ChainlinkVRFIntegratorV2_5
     * @param randomWords Array of random words from Chainlink VRF
     * @param sequence The VRF sequence number from the integrator
     */
    function receiveRandomWords(uint256[] memory randomWords, uint64 sequence) external;

    /**
     * @dev Get randomness request details
     * @param randomnessId Request ID
     * @return requester The requester address
     * @return timestamp When the request was made
     * @return fulfilled Whether request has been fulfilled
     * @return randomValue The random value
     * @return requestType The request type
     */
    function getRandomnessRequest(uint256 randomnessId) external view returns (
        address requester,
        uint64 timestamp,
        bool fulfilled,
        uint256 randomValue,
        uint32 requestType
    );

    /**
     * @dev Get estimated fees for different request types
     * @return poolFeeAmount Fee for pool requests
     * @return vrfFeeAmount Fee for VRF requests
     * @return instantFeeAmount Fee for instant requests
     */
    function getEstimatedFees() external view returns (
        uint256 poolFeeAmount, 
        uint256 vrfFeeAmount, 
        uint256 instantFeeAmount
    );

    /**
     * @dev Get statistics
     * @return totalVRF Total VRF requests
     * @return totalPool Total pool requests
     * @return totalInstant Total instant requests
     * @return successfulCallbacks Successful VRF callbacks
     * @return pendingRequests Pending requests
     */
    function getStatistics() external view returns (
        uint256 totalVRF,
        uint256 totalPool,
        uint256 totalInstant,
        uint256 successfulCallbacks,
        uint256 pendingRequests
    );

    /**
     * @dev Check if VRF is enabled
     * @return enabled Whether VRF is enabled
     */
    function isVRFEnabled() external view returns (bool enabled);

    /**
     * @dev Check FeeM registration status
     * @return isRegistered Whether contract is registered for FeeM
     */
    function checkFeeMStatus() external view returns (bool isRegistered);

    /* ========== ADMIN FUNCTIONS ========== */

    function setChainlinkVRFIntegrator(address _integrator) external;
    function authorizeConsumer(address consumer, bool authorized) external;
    function setFees(uint256 _vrfFee, uint256 _poolFee, uint256 _instantFee) external;
    function setMaxPendingRequests(uint256 _maxPendingRequests) external;
    function withdrawFees() external;
    function emergencyFulfillRequest(uint256 randomnessId, uint256 randomValue) external;

    // Events
    event RandomnessRequested(
        uint256 indexed randomnessId,
        address indexed requester,
        RequestType requestType,
        uint64 vrfSequence
    );

    event RandomnessFulfilled(
        uint256 indexed randomnessId,
        uint256 randomValue,
        bool fromVRF
    );

    event RandomnessDelivered(
        uint256 indexed randomnessId,
        address indexed requester,
        uint256 randomValue
    );

    event RandomnessDeliveryFailed(
        uint256 indexed randomnessId,
        address indexed requester,
        string reason
    );

    event ChainlinkVRFIntegratorUpdated(
        address indexed oldIntegrator,
        address indexed newIntegrator
    );

    event VRFCallbackReceived(
        uint256 indexed randomnessId,
        uint64 indexed vrfSequence,
        uint256 randomValue
    );

    event ConsumerAuthorized(address indexed consumer, bool authorized);
    event FeesUpdated(uint256 vrfFee, uint256 poolFee, uint256 instantFee);
    event EmergencyFallbackUsed(uint256 indexed randomnessId, string reason);
}
