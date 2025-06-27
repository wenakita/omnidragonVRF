// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IChainlinkVRFIntegratorV2_5 } from "../../interfaces/external/chainlink/IChainlinkVRFIntegratorV2_5.sol";

// ============ INTERFACES ============

interface IRandomWordsCallbackV2_5 {
    function receiveRandomWords(uint256[] memory randomWords, uint64 sequence) external;
}

interface IRandomnessRequester {
    function receiveRandomness(uint256 requestId, uint256 randomValue) external;
}

/**
 * @title OmniDragonRandomnessProvider
 * @dev Advanced randomness provider that wraps ChainlinkVRFIntegratorV2_5 with full cross-chain VRF integration
 * 
 * FEATURES:
 * - Full Chainlink VRF integration via ChainlinkVRFIntegratorV2_5 (Sonic → Arbitrum → Chainlink)
 * - Authorization system for consumers
 * - Request mapping and callback handling
 * - Fallback pseudo-randomness for instant decisions
 * - Fee management and withdrawal
 * - Comprehensive event logging
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */ 
contract OmniDragonRandomnessProvider is Ownable, ReentrancyGuard, IRandomWordsCallbackV2_5 {

    // ============ CONSTANTS ============
    
    uint32 constant ARBITRUM_EID = 30110; // Arbitrum's LayerZero V2 Endpoint ID

    // ============ STATE VARIABLES ============

    struct RandomnessRequest {
        address requester;
        uint64 timestamp;
        bool fulfilled;
        uint256 randomValue;
        uint32 requestType;
        uint64 vrfSequence; // Maps to ChainlinkVRFIntegrator sequence
    }

    enum RequestType {
        POOL,           // Pool-based randomness (pseudo for now)
        CHAINLINK_VRF,  // Cross-chain Chainlink VRF
        INSTANT         // Instant pseudo-randomness
    }

    mapping(uint256 => RandomnessRequest) public randomnessRequests;
    mapping(uint64 => uint256) public vrfSequenceToRequestId; // VRF sequence → randomness ID
    uint256 public nextRandomnessId;
    
    // Chainlink VRF integration
    IChainlinkVRFIntegratorV2_5 public chainlinkVRFIntegrator;
    bool public chainlinkVRFEnabled;
    
    // Authorization
    mapping(address => bool) public authorizedConsumers;
    
    // Fees and limits
    uint256 public vrfFee = 0.2 ether;      // Fee for cross-chain VRF (covers LayerZero + Chainlink)
    uint256 public poolFee = 0.001 ether;   // Fee for pool-based randomness
    uint256 public instantFee = 0;           // No fee for instant pseudo-randomness
    uint256 public maxPendingRequests = 100; // Prevent spam

    // Statistics
    uint256 public totalVRFRequests;
    uint256 public totalPoolRequests;
    uint256 public totalInstantRequests;
    uint256 public successfulVRFCallbacks;

    // ============ EVENTS ============
    
    event RandomnessRequested(uint256 indexed randomnessId, address indexed requester, RequestType requestType, uint64 vrfSequence);
    event RandomnessFulfilled(uint256 indexed randomnessId, uint256 randomValue, bool fromVRF);
    event RandomnessDelivered(uint256 indexed requestId, address indexed requester, uint256 randomValue);
    event RandomnessDeliveryFailed(uint256 indexed requestId, address indexed requester, string reason);
    event ChainlinkVRFIntegratorUpdated(address indexed oldIntegrator, address indexed newIntegrator);
    event VRFCallbackReceived(uint256 indexed randomnessId, uint64 indexed vrfSequence, uint256 randomValue);
    event ConsumerAuthorized(address indexed consumer, bool authorized);
    event FeesUpdated(uint256 vrfFee, uint256 poolFee, uint256 instantFee);
    event EmergencyFallbackUsed(uint256 indexed randomnessId, string reason);

    // ============ CONSTRUCTOR ============

    constructor(address _vrfIntegrator) Ownable(msg.sender) {
        if (_vrfIntegrator != address(0)) {
            chainlinkVRFIntegrator = IChainlinkVRFIntegratorV2_5(_vrfIntegrator);
            chainlinkVRFEnabled = true;
        } else {
            chainlinkVRFEnabled = false;
        }
        
        // Register for Sonic FeeM automatically
    }

    // ============ EXTERNAL FUNCTIONS ============

    /**
     * @dev Request randomness from pool (uses pseudo-randomness for now)
     * @return randomnessId The unique identifier for this randomness request
     */
    function requestRandomnessFromPool() external payable nonReentrant returns (uint256) {
        require(msg.value >= poolFee, "Insufficient fee");
        require(_getPendingRequestCount() < maxPendingRequests, "Too many pending requests");
        
        uint256 randomnessId = nextRandomnessId++;
        randomnessRequests[randomnessId] = RandomnessRequest({
            requester: msg.sender,
            timestamp: uint64(block.timestamp),
            fulfilled: false,
            randomValue: 0,
            requestType: uint32(RequestType.POOL),
            vrfSequence: 0
        });

        totalPoolRequests++;
        emit RandomnessRequested(randomnessId, msg.sender, RequestType.POOL, 0);
        
        // Generate strong pseudo-randomness
        uint256 pseudoRandom = _generatePseudoRandom(randomnessId, msg.sender);
        
        // Fulfill immediately
        randomnessRequests[randomnessId].randomValue = pseudoRandom;
        randomnessRequests[randomnessId].fulfilled = true;
        
        emit RandomnessFulfilled(randomnessId, pseudoRandom, false);
        _deliverRandomness(randomnessId);
        
        return randomnessId;
    }

    /**
     * @dev Request randomness from Chainlink VRF via cross-chain integrator
     * @return randomnessId The unique identifier for this randomness request
     */
    function requestRandomnessFromChainlinkVRF() external payable nonReentrant returns (uint256) {
        require(chainlinkVRFEnabled, "Chainlink VRF not enabled");
        require(address(chainlinkVRFIntegrator) != address(0), "VRF integrator not set");
        require(msg.value >= vrfFee, "Insufficient fee for VRF");
        require(_getPendingRequestCount() < maxPendingRequests, "Too many pending requests");
        
        uint256 randomnessId = nextRandomnessId++;
        
                 // Make the VRF request to the integrator
         try chainlinkVRFIntegrator.requestRandomWordsSimple{value: msg.value}(ARBITRUM_EID) {
            
            // For simplicity, we'll track by request ID instead of VRF sequence for now
            // The callback will match by finding pending VRF requests
            randomnessRequests[randomnessId] = RandomnessRequest({
                requester: msg.sender,
                timestamp: uint64(block.timestamp),
                fulfilled: false,
                randomValue: 0,
                requestType: uint32(RequestType.CHAINLINK_VRF),
                vrfSequence: 0 // Will be updated in callback if needed
            });
            
            totalVRFRequests++;
            emit RandomnessRequested(randomnessId, msg.sender, RequestType.CHAINLINK_VRF, 0);
            
        } catch (bytes memory reason) {
            // If VRF request fails, use fallback pseudo-randomness
            emit EmergencyFallbackUsed(randomnessId, string(reason));
            
            randomnessRequests[randomnessId] = RandomnessRequest({
                requester: msg.sender,
                timestamp: uint64(block.timestamp),
                fulfilled: false,
                randomValue: 0,
                requestType: uint32(RequestType.CHAINLINK_VRF),
                vrfSequence: 0
            });
            
            uint256 fallbackRandom = _generatePseudoRandom(randomnessId, msg.sender);
            randomnessRequests[randomnessId].randomValue = fallbackRandom;
            randomnessRequests[randomnessId].fulfilled = true;
            
            emit RandomnessFulfilled(randomnessId, fallbackRandom, false);
            _deliverRandomness(randomnessId);
        }
        
        return randomnessId;
    }

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
    ) external returns (uint256 randomness) {
        require(authorizedConsumers[msg.sender], "Not authorized consumer");
        
        // Generate high-quality pseudo-randomness for instant decisions
        randomness = uint256(keccak256(abi.encodePacked(
            swapper, tokenA, tokenB, amountIn, amountOut,
            block.timestamp, block.prevrandao, block.coinbase,
            tx.gasprice, gasleft(), msg.sender,
            totalInstantRequests++ // Ensures uniqueness
        )));
        
        return randomness;
    }

    // ============ VRF CALLBACK ============

    /**
     * @dev Receives random words from ChainlinkVRFIntegratorV2_5
     * @param randomWords Array of random words from Chainlink VRF
     * @param sequence The VRF sequence number from the integrator
     */
    function receiveRandomWords(uint256[] memory randomWords, uint64 sequence) external override {
        require(msg.sender == address(chainlinkVRFIntegrator), "Only VRF integrator can call");
        require(randomWords.length > 0, "No random words provided");
        
        // Find the corresponding randomness request
        uint256 randomnessId = vrfSequenceToRequestId[sequence];
        require(randomnessId != 0 || sequence == 0, "Unknown VRF sequence"); // Allow sequence 0 for first request
        
        // Handle case where sequence 0 maps to first request
        if (sequence == 0 && randomnessId == 0) {
            randomnessId = _findPendingVRFRequest();
        }
        
        if (randomnessId == 0) {
            // No matching request found, log and return
            return;
        }
        
        RandomnessRequest storage request = randomnessRequests[randomnessId];
        
        // Verify this is a VRF request that hasn't been fulfilled
        if (request.requestType != uint32(RequestType.CHAINLINK_VRF) || request.fulfilled) {
            return;
        }
        
        // Store the random value and mark as fulfilled
        uint256 randomValue = randomWords[0];
        request.randomValue = randomValue;
        request.fulfilled = true;
        
        // Update statistics
        successfulVRFCallbacks++;
        
        // Clean up the mapping
        delete vrfSequenceToRequestId[sequence];
        
        // Emit events
        emit VRFCallbackReceived(randomnessId, sequence, randomValue);
        emit RandomnessFulfilled(randomnessId, randomValue, true);
        
        // Deliver the randomness to the requester
        _deliverRandomness(randomnessId);
    }

    // ============ ADMIN FUNCTIONS ============

    function setChainlinkVRFIntegrator(address _integrator) external onlyOwner {
        address oldIntegrator = address(chainlinkVRFIntegrator);
        chainlinkVRFIntegrator = IChainlinkVRFIntegratorV2_5(_integrator);
        chainlinkVRFEnabled = _integrator != address(0);
        
        emit ChainlinkVRFIntegratorUpdated(oldIntegrator, _integrator);
    }

    function authorizeConsumer(address consumer, bool authorized) external onlyOwner {
        authorizedConsumers[consumer] = authorized;
        emit ConsumerAuthorized(consumer, authorized);
    }

    function setFees(uint256 _vrfFee, uint256 _poolFee, uint256 _instantFee) external onlyOwner {
        vrfFee = _vrfFee;
        poolFee = _poolFee;
        instantFee = _instantFee;
        
        emit FeesUpdated(_vrfFee, _poolFee, _instantFee);
    }

    function setMaxPendingRequests(uint256 _maxPendingRequests) external onlyOwner {
        maxPendingRequests = _maxPendingRequests;
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        payable(owner()).transfer(balance);
    }

    function emergencyFulfillRequest(uint256 randomnessId, uint256 randomValue) external onlyOwner {
        RandomnessRequest storage request = randomnessRequests[randomnessId];
        require(!request.fulfilled, "Request already fulfilled");
        require(request.requester != address(0), "Request does not exist");
        
        request.randomValue = randomValue;
        request.fulfilled = true;
        
        emit EmergencyFallbackUsed(randomnessId, "Emergency fulfillment by owner");
        emit RandomnessFulfilled(randomnessId, randomValue, false);
        
        _deliverRandomness(randomnessId);
    }

    // ============ VIEW FUNCTIONS ============

    function getRandomnessRequest(uint256 randomnessId) external view returns (
        address requester,
        uint64 timestamp,
        bool fulfilled,
        uint256 randomValue,
        uint32 requestType
    ) {
        RandomnessRequest memory request = randomnessRequests[randomnessId];
        return (
            request.requester,
            request.timestamp,
            request.fulfilled,
            request.randomValue,
            request.requestType
        );
    }

    function getEstimatedFees() external view returns (
        uint256 poolFeeAmount, 
        uint256 vrfFeeAmount, 
        uint256 instantFeeAmount
    ) {
        return (poolFee, vrfFee, instantFee);
    }

    function getStatistics() external view returns (
        uint256 totalVRF,
        uint256 totalPool,
        uint256 totalInstant,
        uint256 successfulCallbacks,
        uint256 pendingRequests
    ) {
        return (
            totalVRFRequests,
            totalPoolRequests,
            totalInstantRequests,
            successfulVRFCallbacks,
            _getPendingRequestCount()
        );
    }

    function isVRFEnabled() external view returns (bool) {
        return chainlinkVRFEnabled && address(chainlinkVRFIntegrator) != address(0);
    }

    function checkFeeMStatus() external view returns (bool isRegistered) {
    }

    // ============ INTERNAL FUNCTIONS ============

    function _deliverRandomness(uint256 randomnessId) internal {
        RandomnessRequest storage request = randomnessRequests[randomnessId];
        
        // Try to deliver randomness to requester if it implements the interface
        if (request.requester.code.length > 0) {
            try IRandomnessRequester(request.requester).receiveRandomness(randomnessId, request.randomValue) {
                emit RandomnessDelivered(randomnessId, request.requester, request.randomValue);
            } catch Error(string memory reason) {
                emit RandomnessDeliveryFailed(randomnessId, request.requester, reason);
            } catch (bytes memory) {
                emit RandomnessDeliveryFailed(randomnessId, request.requester, "Low-level delivery failure");
            }
        } else {
            // For EOA requests, just emit the delivered event
            emit RandomnessDelivered(randomnessId, request.requester, request.randomValue);
        }
    }

    function _generatePseudoRandom(uint256 randomnessId, address requester) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            block.coinbase,
            requester,
            randomnessId,
            tx.gasprice,
            gasleft(),
            address(this).balance
        )));
    }

    function _getPendingRequestCount() internal view returns (uint256) {
        uint256 count = 0;
        uint256 endId = nextRandomnessId;
        uint256 startId = endId > 100 ? endId - 100 : 0; // Check last 100 requests
        
        for (uint256 i = startId; i < endId; i++) {
            if (!randomnessRequests[i].fulfilled && randomnessRequests[i].requester != address(0)) {
                count++;
            }
        }
        
        return count;
    }

    function _findPendingVRFRequest() internal view returns (uint256) {
        uint256 endId = nextRandomnessId;
        uint256 startId = endId > 10 ? endId - 10 : 0; // Check last 10 requests
        
        for (uint256 i = endId; i > startId; i--) {
            uint256 requestId = i - 1;
            RandomnessRequest memory request = randomnessRequests[requestId];
            
            if (request.requestType == uint32(RequestType.CHAINLINK_VRF) && 
                !request.fulfilled && 
                request.requester != address(0)) {
                return requestId;
            }
        }
        
        return 0;
    }

    // Required to receive ETH
    receive() external payable {}
} 