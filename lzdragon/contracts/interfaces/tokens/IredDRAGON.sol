// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IredDRAGON
 * @dev Interface for redDRAGON - A tradeable token with lottery integration
 * 
 * OVERVIEW:
 * redDRAGON is a tradeable ERC20 token that can be paired with other tokens on Uniswap V3.
 * When users swap other tokens for redDRAGON, it triggers:
 * 1. Fee collection (6.9% of swap amount)
 * 2. Fee distribution (69% to jackpot, 31% to veDRAGON holders)
 * 3. Lottery entry based on USD swap value
 * 
 * LOTTERY PROBABILITY SCALING:
 * - $10,000 USD = 4% chance
 * - $1,000 USD = 0.4% chance  
 * - $100 USD = 0.04% chance
 * - $10 USD = 0.004% chance
 * 
 * FEATURES:
 * - ERC20 tradeable token
 * - Uniswap V3 liquidity pools
 * - Swap-based lottery integration
 * - Fee distribution to ecosystem
 * - USD-based probability calculation
 */
interface IredDRAGON is IERC20 {
    
    // ========== STRUCTS ==========
    
    struct SwapConfig {
        address jackpotVault;           // Jackpot vault address
        address revenueDistributor;     // veDRAGON revenue distributor
        address lotteryManager;         // Lottery manager for entries
        address priceOracle;            // Price oracle for USD conversion
        uint256 swapFeeBps;            // Swap fee in basis points (690 = 6.9%)
        uint256 jackpotShareBps;       // Jackpot share of fees (6900 = 69%)
        uint256 revenueShareBps;       // Revenue share of fees (3100 = 31%)
        bool swapFeesEnabled;          // Whether swap fees are enabled
        bool lotteryEnabled;           // Whether lottery is enabled
    }
    
    struct LotteryConfig {
        uint256 minSwapUSD;            // Minimum USD swap for lottery ($10)
        uint256 maxSwapUSD;            // Maximum USD swap for max probability ($10,000)
        uint256 minProbabilityPPM;     // Minimum probability in PPM (40 = 0.004%)
        uint256 maxProbabilityPPM;     // Maximum probability in PPM (40000 = 4%)
        bool enabled;                  // Whether lottery is enabled
    }
    
    // ========== EVENTS ==========
    
    event SwapProcessed(
        address indexed user,
        address indexed inputToken,
        uint256 inputAmount,
        uint256 redDRAGONAmount,
        uint256 feeAmount,
        uint256 usdValue,
        uint256 timestamp
    );
    
    event LotteryTriggered(
        address indexed user,
        uint256 usdSwapValue,
        uint256 probabilityPPM,
        uint256 timestamp
    );
    
    event FeesDistributed(
        uint256 jackpotAmount,
        uint256 revenueAmount,
        uint256 timestamp
    );
    
    event SwapConfigUpdated(
        address indexed jackpotVault,
        address indexed revenueDistributor,
        address indexed lotteryManager,
        uint256 swapFeeBps
    );
    
    event LotteryConfigUpdated(
        uint256 minSwapUSD,
        uint256 maxSwapUSD,
        uint256 minProbabilityPPM,
        uint256 maxProbabilityPPM
    );
    
    // ========== INITIALIZATION ==========
    
    /**
     * @notice Initialize the contract (called once after deployment)
     * @param _owner Owner address
     * @param _jackpotVault Jackpot vault address
     * @param _revenueDistributor veDRAGON revenue distributor
     * @param _lotteryManager Lottery manager address
     * @param _priceOracle Price oracle address
     */
    function initialize(
        address _owner,
        address _jackpotVault,
        address _revenueDistributor,
        address _lotteryManager,
        address _priceOracle
    ) external;
    
    // ========== SWAP FUNCTIONS ==========
    
    /**
     * @notice Process a swap that results in redDRAGON tokens
     * @dev Called by Uniswap V3 pools or authorized swap contracts
     * @param user Address receiving redDRAGON tokens
     * @param inputToken Token being swapped for redDRAGON
     * @param inputAmount Amount of input token
     * @param redDRAGONAmount Amount of redDRAGON tokens to mint
     * @param expectedUSDValue Expected USD value of the swap
     */
    function processSwap(
        address user,
        address inputToken,
        uint256 inputAmount,
        uint256 redDRAGONAmount,
        uint256 expectedUSDValue
    ) external;
    
    /**
     * @notice Process swap fees and distribute to ecosystem
     * @param totalFeeAmount Total fee amount collected
     */
    function processSwapFees(uint256 totalFeeAmount) external;
    
    // ========== LOTTERY FUNCTIONS ==========
    
    /**
     * @notice Trigger lottery entry for a swap
     * @param user User address
     * @param usdSwapValue USD value of the swap
     */
    function triggerLottery(address user, uint256 usdSwapValue) external;
    
    /**
     * @notice Calculate lottery probability for USD amount
     * @param usdAmount USD amount of swap
     * @return probabilityPPM Probability in parts per million
     */
    function calculateLotteryProbability(uint256 usdAmount) external view returns (uint256 probabilityPPM);
    
    // ========== CONFIGURATION ==========
    
    /**
     * @notice Update swap configuration
     * @param _jackpotVault Jackpot vault address
     * @param _revenueDistributor Revenue distributor address
     * @param _lotteryManager Lottery manager address
     * @param _priceOracle Price oracle address
     * @param _swapFeeBps Swap fee in basis points
     * @param _swapFeesEnabled Whether swap fees are enabled
     */
    function updateSwapConfig(
        address _jackpotVault,
        address _revenueDistributor,
        address _lotteryManager,
        address _priceOracle,
        uint256 _swapFeeBps,
        bool _swapFeesEnabled
    ) external;
    
    /**
     * @notice Update lottery configuration
     * @param _minSwapUSD Minimum USD swap amount
     * @param _maxSwapUSD Maximum USD swap amount for max probability
     * @param _minProbabilityPPM Minimum probability in PPM
     * @param _maxProbabilityPPM Maximum probability in PPM
     * @param _enabled Whether lottery is enabled
     */
    function updateLotteryConfig(
        uint256 _minSwapUSD,
        uint256 _maxSwapUSD,
        uint256 _minProbabilityPPM,
        uint256 _maxProbabilityPPM,
        bool _enabled
    ) external;
    
    /**
     * @notice Set authorized swap contract
     * @param swapContract Address of swap contract
     * @param authorized Whether contract is authorized
     */
    function setAuthorizedSwapContract(address swapContract, bool authorized) external;
    
    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @notice Get current swap configuration
     * @return config Current swap configuration
     */
    function getSwapConfig() external view returns (SwapConfig memory config);
    
    /**
     * @notice Get current lottery configuration
     * @return config Current lottery configuration
     */
    function getLotteryConfig() external view returns (LotteryConfig memory config);
    
    /**
     * @notice Get USD value of token amount
     * @param token Token address
     * @param amount Token amount
     * @return usdValue USD value (scaled by 1e6)
     */
    function getUSDValue(address token, uint256 amount) external view returns (uint256 usdValue);
    
    /**
     * @notice Check if address is authorized swap contract
     * @param swapContract Address to check
     * @return authorized Whether address is authorized
     */
    function isAuthorizedSwapContract(address swapContract) external view returns (bool authorized);
    
    /**
     * @notice Get total fees collected
     * @return jackpotFees Total fees sent to jackpot
     * @return revenueFees Total fees sent to revenue distributor
     */
    function getTotalFees() external view returns (uint256 jackpotFees, uint256 revenueFees);
    
    /**
     * @notice Check if contract is initialized
     * @return initialized Whether contract is initialized
     */
    function isInitialized() external view returns (bool initialized);
}
