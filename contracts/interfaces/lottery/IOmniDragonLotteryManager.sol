// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOmniDragonLotteryManager
 * @dev Interface for the OmniDragon Lottery Manager
 */
interface IOmniDragonLotteryManager {
    // ============ ENUMS ============
    
    enum RandomnessSource {
        LOCAL_VRF,
        CROSS_CHAIN_VRF
    }

    // ============ STRUCTS ============
    
    struct InstantLotteryConfig {
        uint256 baseWinProbability;
        uint256 minSwapAmount;
        uint256 rewardPercentage;
        bool isActive;
        bool useVRFForInstant;
    }

    struct UserStats {
        uint256 totalSwaps;
        uint256 totalVolume;
        uint256 totalWins;
        uint256 totalRewards;
        uint256 lastSwapTimestamp;
    }

    struct PendingLotteryEntry {
        address user;
        uint256 swapAmountUSD;
        uint256 winProbability;
        uint256 timestamp;
        bool fulfilled;
        RandomnessSource randomnessSource;
    }

    // ============ EVENTS ============
    
    event InstantLotteryProcessed(address indexed user, uint256 swapAmount, bool won, uint256 reward);
    event InstantLotteryEntered(address indexed user, uint256 swapAmountUSD, uint256 winChancePPM, uint256 boostedWinChancePPM, uint256 randomnessId);
    event LotteryEntryCreated(address indexed user, uint256 swapAmountUSD, uint256 winProbability, uint256 vrfRequestId);
    event RandomnessRequested(uint256 indexed requestId, address indexed user, RandomnessSource source);
    event RandomnessFulfilled(uint256 indexed requestId, uint256 randomness, RandomnessSource source);
    event PrizeClaimable(address indexed winner, uint256 amount);
    event PrizeClaimed(address indexed winner, uint256 amount);
    event PrizeTransferFailed(address indexed winner, uint256 amount);
    event InstantLotteryConfigured(uint256 baseWinProbability, uint256 minSwapAmount, uint256 rewardPercentage, bool isActive);
    event SwapContractAuthorized(address indexed swapContract, bool authorized);
    event LotteryManagerInitialized(address jackpotDistributor, address veDRAGONToken);

    // ============ ADMIN FUNCTIONS ============
    
    function setVRFIntegrator(address _vrfIntegrator) external;
    function setLocalVRFConsumer(address _localVRFConsumer) external;
    function setJackpotVault(address _jackpotVault) external;
    function setJackpotDistributor(address _jackpotDistributor) external;
    function setRedDRAGONToken(address _redDRAGONToken) external;
    function setAuthorizedSwapContract(address swapContract, bool authorized) external;
    function configureInstantLottery(
        uint256 _baseWinProbability,
        uint256 _minSwapAmount,
        uint256 _rewardPercentage,
        bool _isActive,
        bool _useVRFForInstant
    ) external;

    // ============ LOTTERY FUNCTIONS ============
    
    function processEntry(address user, uint256 amount) external;
    function processInstantLottery(address user, uint256 swapAmountUSD) external;
    function processNativeTokenEntry(address user, uint256 nativeAmount) external;
    function processWETHEntry(address user, uint256 wethAmount) external;

    // ============ VIEW FUNCTIONS ============
    
    function getInstantLotteryConfig() external view returns (
        uint256 baseWinProbability,
        uint256 minSwapAmount,
        uint256 rewardPercentage,
        bool isActive,
        bool useVRFForInstant
    );
    
    function getUserStats(address user) external view returns (
        uint256 totalSwaps,
        uint256 totalVolume,
        uint256 totalWins,
        uint256 totalRewards,
        uint256 lastSwapTimestamp
    );
    
    function getPendingEntry(uint256 requestId) external view returns (
        address user,
        uint256 swapAmountUSD,
        uint256 winProbability,
        uint256 timestamp,
        bool fulfilled,
        RandomnessSource randomnessSource
    );
    
    function calculateWinProbability(address user, uint256 swapAmountUSD) external view returns (
        uint256 baseProbability,
        uint256 boostedProbability
    );
    
    function getCurrentJackpot() external view returns (uint256);
    function getUnclaimedPrizes(address user) external view returns (uint256 amount);
    function getTotalUnclaimedPrizes() external view returns (uint256 total);

    // ============ PRIZE CLAIM FUNCTIONS ============
    
    function claimPrize() external;

    // ============ AUTHORIZATION CHECK ============
    
    function authorizedSwapContracts(address) external view returns (bool);
} 