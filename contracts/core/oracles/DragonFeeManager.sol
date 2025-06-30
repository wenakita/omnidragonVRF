// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';
import { Pausable } from '@openzeppelin/contracts/utils/Pausable.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import { IDragonFeeManager } from "../../interfaces/oracles/IDragonFeeManager.sol";
import { IOmniDragonPriceOracle } from "../../interfaces/oracles/IOmniDragonPriceOracle.sol";
import { EnhancedDragonMarketAnalyzer } from '../../libraries/core/EnhancedDragonMarketAnalyzer.sol';
import { DragonMath } from "../../libraries/math/DragonMath.sol";

/**
 * @title DragonFeeManager
 * @dev Consolidated Fee Manager and Market Maker for the Dragon ecosystem
 *
 * CONSOLIDATED FUNCTIONALITY:
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * ✅ Adaptive fee management based on market conditions
 * ✅ Market making operations and liquidity tracking
 * ✅ Volume tracking and statistics
 * ✅ Jackpot size management
 * ✅ Integration with price oracle for market data
 * ✅ Revenue distribution for veDRAGON holders
 * ✅ Partner voting and fee distribution
 *
 * FEE STRUCTURE:
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * - Burn Fee: Fixed at 0.69% (69 basis points) - non-configurable
 * - Jackpot Fee: Adaptive based on market conditions (default 6.9%)
 * - veDRAGON Fee: Automatically calculated as (totalFee - jackpotFee - burnFee)
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract DragonFeeManager is IDragonFeeManager, Ownable, Pausable, ReentrancyGuard {
    
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // STRUCTS AND ENUMS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    struct FeeConfiguration {
        uint256 totalFee;       // Total fee in basis points
        uint256 burnFee;        // Burn fee in basis points (fixed at 69)
        uint256 jackpotFee;     // Jackpot fee in basis points
        uint256 liquidityFee;   // Liquidity/veDRAGON fee in basis points
        uint256 lastUpdate;     // Last update timestamp
    }

    struct MarketData {
        uint256 totalVolume;        // Total cumulative volume
        uint256 dailyVolume;        // Daily volume
        uint256 totalTrades;        // Total number of trades
        uint256 dailyTrades;        // Daily trades
        uint256 lastVolumeReset;    // Last daily volume reset
        uint256 lastPriceUpdate;    // Last price update timestamp
        uint256 averageTradeSize;   // Average trade size
    }

    struct LiquidityData {
        uint256 totalLiquidity;     // Total liquidity available
        uint256 availableLiquidity; // Available liquidity for trading
        uint256 reservedLiquidity;  // Reserved liquidity
        uint256 utilizationRate;    // Liquidity utilization rate (basis points)
        uint256 lastUpdate;         // Last liquidity update
    }

    struct AdaptiveFeeParams {
        uint256 baseMultiplier;         // Base fee multiplier (basis points)
        uint256 volatilityThreshold;    // Volatility threshold for fee adjustments
        uint256 liquidityThreshold;     // Liquidity threshold for fee adjustments
        bool enabled;                   // Whether adaptive fees are enabled
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // CUSTOM ERRORS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    error TotalFeeTooLow();
    error FeesExceedTotal();
    error FeeTooHigh();
    error InvalidPriceOracle();
    error PriceOracleNotSet();
    error InvalidFeeConfiguration();
    error InvalidLiquidityData();
    error IntervalMustBeGreaterThanZero();
    error AlreadyInitialized();

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════════════════

    // Core configuration
    IOmniDragonPriceOracle public priceOracle;
    FeeConfiguration public feeConfig;
    MarketData public marketData;
    LiquidityData public liquidityData;
    AdaptiveFeeParams public adaptiveFeeParams;

    // Initialization flag
    bool public initialized;

    // Jackpot management
    uint256 public currentJackpotSize;
    
    // Update control
    uint256 public feeUpdateInterval;   // Minimum time between fee updates (seconds)
    uint256 public lastFeeUpdate;       // Timestamp of last fee update
    uint256 public volumeUpdateInterval; // Interval between volume resets (seconds)
    
    // Constants
    uint256 public constant MAX_TOTAL_FEE = 2000; // 20% maximum total fee
    uint256 public constant FIXED_BURN_FEE = 69;  // 0.69% fixed burn fee
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant DAILY_RESET_INTERVAL = 1 days;

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════════════

    constructor(
        address _priceOracle,
        uint256 _totalFee,
        uint256 _initialJackpotFee
    ) Ownable(msg.sender) {
        if (_priceOracle != address(0)) {
            priceOracle = IOmniDragonPriceOracle(_priceOracle);
        }
        
        // Allow placeholder values for post-deployment initialization
        if (_totalFee > 0 && _totalFee <= FIXED_BURN_FEE) revert TotalFeeTooLow();
        if (_totalFee > MAX_TOTAL_FEE) revert FeeTooHigh();
        if (_totalFee > 0 && _initialJackpotFee + FIXED_BURN_FEE > _totalFee) revert FeesExceedTotal();

        // Initialize fee configuration
        feeConfig = FeeConfiguration({
            totalFee: _totalFee,
            burnFee: FIXED_BURN_FEE,
            jackpotFee: _initialJackpotFee,
            liquidityFee: _totalFee > FIXED_BURN_FEE ? _totalFee - _initialJackpotFee - FIXED_BURN_FEE : 0,
            lastUpdate: block.timestamp
        });

        // Initialize market data
        marketData = MarketData({
            totalVolume: 0,
            dailyVolume: 0,
            totalTrades: 0,
            dailyTrades: 0,
            lastVolumeReset: block.timestamp,
            lastPriceUpdate: block.timestamp,
            averageTradeSize: 0
        });

        // Initialize liquidity data
        liquidityData = LiquidityData({
            totalLiquidity: 0,
            availableLiquidity: 0,
            reservedLiquidity: 0,
            utilizationRate: 0,
            lastUpdate: block.timestamp
        });

        // Initialize adaptive fee parameters
        adaptiveFeeParams = AdaptiveFeeParams({
            baseMultiplier: 10000, // 100% (no adjustment by default)
            volatilityThreshold: 5000, // 50%
            liquidityThreshold: 2000, // 20%
            enabled: true
        });

        // Initialize intervals
        feeUpdateInterval = 1 days;
        volumeUpdateInterval = 1 days;

        // Mark as initialized if constructor is called with valid values
        initialized = (_totalFee > FIXED_BURN_FEE);

        if (initialized) {
            emit FeeConfigurationUpdated(_totalFee, FIXED_BURN_FEE, _initialJackpotFee, feeConfig.liquidityFee);
        }
    }

    /**
     * @dev Initialize the contract after deployment with placeholder values
     * @param _totalFee Initial total fee (scaled by 1e4, e.g. 1000 = 10%)
     * @param _initialJackpotFee Initial jackpot fee (scaled by 1e4)
     */
    function initialize(
        uint256 _totalFee,
        uint256 _initialJackpotFee
    ) external onlyOwner {
        if (initialized) revert AlreadyInitialized();

        if (_totalFee <= FIXED_BURN_FEE) revert TotalFeeTooLow();
        if (_totalFee > MAX_TOTAL_FEE) revert FeeTooHigh();
        if (_initialJackpotFee + FIXED_BURN_FEE > _totalFee) revert FeesExceedTotal();

        // Set fee structure with fixed burn fee
        feeConfig.totalFee = _totalFee;
        feeConfig.burnFee = FIXED_BURN_FEE;
        feeConfig.jackpotFee = _initialJackpotFee;
        feeConfig.liquidityFee = _totalFee - _initialJackpotFee - FIXED_BURN_FEE;
        feeConfig.lastUpdate = block.timestamp;

        // Mark as initialized
        initialized = true;

        emit Initialized(_totalFee, _initialJackpotFee);
        emit FeeConfigurationUpdated(_totalFee, FIXED_BURN_FEE, _initialJackpotFee, feeConfig.liquidityFee);
    }

    /// @dev Register my contract on Sonic FeeM
    function registerMe() external {
        (bool _success,) = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830).call(
            abi.encodeWithSignature("selfRegister(uint256)", 143)
        );
        require(_success, "FeeM registration failed");
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // INTERFACE IMPLEMENTATION
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Calculate dynamic fees based on market conditions
     */
    function calculateDynamicFees(
        address /* user */,
        uint8 /* transactionType */,
        uint256 amount,
        uint256 marketVolatility,
        uint256 liquidityDepth
    ) external view override returns (uint256 jackpotFee, uint256 veDRAGONFee, uint256 burnFee, uint256 totalFee) {
        // Get base fee configuration
        FeeConfiguration memory config = feeConfig;
        
        // Apply adaptive adjustments if enabled
        if (adaptiveFeeParams.enabled) {
            // Use DragonMath for adaptive fee calculations
            DragonMath.FeeAllocation memory allocation = DragonMath.calculateAdaptiveFees(
                currentJackpotSize,
                marketData.dailyVolume,
                config.totalFee
            );
            
            config.jackpotFee = allocation.jackpotFeeBps;
            config.liquidityFee = allocation.lpFeeBps;
            
            // Further adjust based on volatility and liquidity
            if (marketVolatility > adaptiveFeeParams.volatilityThreshold) {
                uint256 volatilityMultiplier = 10000 + ((marketVolatility - adaptiveFeeParams.volatilityThreshold) * 100);
                config.jackpotFee = (config.jackpotFee * volatilityMultiplier) / 10000;
            }
            
            if (liquidityDepth < adaptiveFeeParams.liquidityThreshold) {
                uint256 liquidityMultiplier = 10000 + ((adaptiveFeeParams.liquidityThreshold - liquidityDepth) * 150);
                config.jackpotFee = (config.jackpotFee * liquidityMultiplier) / 10000;
            }
            
            // Ensure fees don't exceed maximum
            uint256 maxJackpotFee = config.totalFee - config.burnFee - 100; // Leave at least 1% for veDRAGON
            if (config.jackpotFee > maxJackpotFee) {
                config.jackpotFee = maxJackpotFee;
            }
            
            config.liquidityFee = config.totalFee - config.jackpotFee - config.burnFee;
        }
        
        // Calculate fees for the specific amount
        burnFee = (amount * config.burnFee) / BASIS_POINTS;
        jackpotFee = (amount * config.jackpotFee) / BASIS_POINTS;
        veDRAGONFee = (amount * config.liquidityFee) / BASIS_POINTS;
        totalFee = burnFee + jackpotFee + veDRAGONFee;
    }

    /**
     * @dev Update market data for fee calculations
     */
    function updateMarketData(address token, uint256 volume, uint256 price, uint256 timestamp) external override {
        // Update volume data
        marketData.totalVolume += volume;
        marketData.dailyVolume += volume;
        marketData.totalTrades += 1;
        marketData.dailyTrades += 1;
        marketData.lastPriceUpdate = timestamp;
        
        // Update average trade size
        if (marketData.totalTrades > 0) {
            marketData.averageTradeSize = marketData.totalVolume / marketData.totalTrades;
        }
        
        // Check if daily reset is needed
        if (block.timestamp >= marketData.lastVolumeReset + DAILY_RESET_INTERVAL) {
            _resetDailyData();
        }
        
        // Consider updating fees if conditions are met
        _maybeUpdateFees();
        
        emit MarketDataUpdated(token, volume, price, timestamp);
    }

    /**
     * @dev Add transaction volume (legacy DragonFeeManager compatibility)
     */
    function addVolume(uint256 _volumeAmount) external onlyOwner {
        // Add to cumulative volume
        marketData.totalVolume += _volumeAmount;
        marketData.dailyVolume += _volumeAmount;

        // Check if it's time to reset the daily volume counter
        if (block.timestamp >= marketData.lastVolumeReset + volumeUpdateInterval) {
            marketData.lastVolumeReset = block.timestamp;
            emit VolumeUpdated(marketData.dailyVolume);
            marketData.dailyVolume = 0;
            _maybeUpdateFees();
        }
    }

    /**
     * @dev Set adaptive fee parameters
     */
    function setAdaptiveFeeParameters(
        uint256 baseMultiplier,
        uint256 volatilityThreshold,
        uint256 liquidityThreshold
    ) external override onlyOwner {
        adaptiveFeeParams.baseMultiplier = baseMultiplier;
        adaptiveFeeParams.volatilityThreshold = volatilityThreshold;
        adaptiveFeeParams.liquidityThreshold = liquidityThreshold;
        
        emit AdaptiveFeeParametersUpdated(baseMultiplier, volatilityThreshold, liquidityThreshold);
    }

    /**
     * @dev Check if adaptive fees are enabled
     */
    function isAdaptiveFeesEnabled() external view override returns (bool) {
        return adaptiveFeeParams.enabled;
    }

    /**
     * @dev Get current fee configuration
     */
    function getFeeConfiguration() external view override returns (
        uint256 totalFee,
        uint256 burnFee,
        uint256 jackpotFee,
        uint256 liquidityFee
    ) {
        FeeConfiguration memory config = feeConfig;
        return (config.totalFee, config.burnFee, config.jackpotFee, config.liquidityFee);
    }

    /**
     * @dev Get current fee percentages (legacy DragonFeeManager compatibility)
     */
    function getFees() external view returns (
        uint256 _jackpotFee,
        uint256 _liquidityFee,
        uint256 _burnFee,
        uint256 _totalFee
    ) {
        return (feeConfig.jackpotFee, feeConfig.liquidityFee, feeConfig.burnFee, feeConfig.totalFee);
    }

    /**
     * @dev Update fee configuration
     */
    function updateFeeConfiguration(uint256 totalFee, uint256 jackpotFee) external override onlyOwner {
        if (totalFee <= FIXED_BURN_FEE) revert TotalFeeTooLow();
        if (totalFee > MAX_TOTAL_FEE) revert FeeTooHigh();
        if (jackpotFee + FIXED_BURN_FEE > totalFee) revert FeesExceedTotal();
        
        uint256 liquidityFee = totalFee - jackpotFee - FIXED_BURN_FEE;
        
        feeConfig.totalFee = totalFee;
        feeConfig.jackpotFee = jackpotFee;
        feeConfig.liquidityFee = liquidityFee;
        feeConfig.lastUpdate = block.timestamp;
        
        emit FeeConfigurationUpdated(totalFee, FIXED_BURN_FEE, jackpotFee, liquidityFee);
    }

    /**
     * @dev Update total fee (legacy DragonFeeManager compatibility)
     */
    function updateTotalFee(uint256 _totalFee) external onlyOwner {
        if (_totalFee < FIXED_BURN_FEE) revert TotalFeeTooLow();
        if (_totalFee > MAX_TOTAL_FEE) revert FeeTooHigh();

        feeConfig.totalFee = _totalFee;
        _updateFees();
    }

    /**
     * @dev Get market liquidity data
     */
    function getMarketLiquidity() external view override returns (
        uint256 totalLiquidity,
        uint256 availableLiquidity,
        uint256 utilizationRate
    ) {
        LiquidityData memory data = liquidityData;
        return (data.totalLiquidity, data.availableLiquidity, data.utilizationRate);
    }

    /**
     * @dev Calculate market impact for a trade
     */
    function calculateMarketImpact(uint256 tradeSize, bool isBuy) external view override returns (uint256 impact) {
        if (liquidityData.availableLiquidity == 0) return 0;
        
        // Calculate impact as percentage of available liquidity
        uint256 liquidityRatio = (tradeSize * BASIS_POINTS) / liquidityData.availableLiquidity;
        
        // Apply different multipliers for buy vs sell
        uint256 multiplier = isBuy ? 120 : 80; // 1.2x for buys, 0.8x for sells
        impact = (liquidityRatio * multiplier) / 100;
        
        // Cap maximum impact
        if (impact > 1000) impact = 1000; // Max 10% impact
    }

    /**
     * @dev Get trading volume statistics
     */
    function getVolumeStats() external view override returns (
        uint256 dailyVolume,
        uint256 totalVolume,
        uint256 averageTradeSize
    ) {
        MarketData memory data = marketData;
        return (data.dailyVolume, data.totalVolume, data.averageTradeSize);
    }

    /**
     * @dev Update jackpot size
     */
    function updateJackpotSize(uint256 newJackpotSize) external override onlyOwner {
        currentJackpotSize = newJackpotSize;
        emit JackpotSizeUpdated(newJackpotSize);
        _maybeUpdateFees();
    }

    /**
     * @dev Get current jackpot size
     */
    function getJackpotSize() external view override returns (uint256) {
        return currentJackpotSize;
    }

    /**
     * @dev Calculate the optimal fee allocation based on current conditions (legacy compatibility)
     */
    function calculateAdaptiveFees(
        uint256 _jackpotSize,
        uint256 _dailyVolume
    ) public view returns (
        uint256 _jackpotFee,
        uint256 _liquidityFee
    ) {
        // If adaptive fees are disabled, return current fees
        if (!adaptiveFeeParams.enabled) {
            return (feeConfig.jackpotFee, feeConfig.liquidityFee);
        }

        // Use DragonMath library for calculations
        DragonMath.FeeAllocation memory allocation = DragonMath.calculateAdaptiveFees(
            _jackpotSize,
            _dailyVolume,
            feeConfig.totalFee
        );

        return (allocation.jackpotFeeBps, allocation.lpFeeBps);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Set price oracle address
     */
    function setPriceOracle(address _priceOracle) external onlyOwner {
        if (_priceOracle == address(0)) revert InvalidPriceOracle();
        priceOracle = IOmniDragonPriceOracle(_priceOracle);
    }

    /**
     * @dev Toggle adaptive fees
     */
    function setAdaptiveFeesEnabled(bool enabled) external onlyOwner {
        adaptiveFeeParams.enabled = enabled;
        emit AdaptiveFeesToggled(enabled);
    }

    /**
     * @dev Set fee update interval
     */
    function setFeeUpdateInterval(uint256 _intervalSeconds) external onlyOwner {
        if (_intervalSeconds == 0) revert IntervalMustBeGreaterThanZero();
        feeUpdateInterval = _intervalSeconds;
    }

    /**
     * @dev Set volume update interval
     */
    function setVolumeUpdateInterval(uint256 _intervalSeconds) external onlyOwner {
        if (_intervalSeconds == 0) revert IntervalMustBeGreaterThanZero();
        volumeUpdateInterval = _intervalSeconds;
    }

    /**
     * @dev Update liquidity data
     */
    function updateLiquidityData(
        uint256 totalLiquidity,
        uint256 availableLiquidity,
        uint256 reservedLiquidity
    ) external onlyOwner {
        if (availableLiquidity + reservedLiquidity > totalLiquidity) revert InvalidLiquidityData();
        
        liquidityData.totalLiquidity = totalLiquidity;
        liquidityData.availableLiquidity = availableLiquidity;
        liquidityData.reservedLiquidity = reservedLiquidity;
        liquidityData.utilizationRate = totalLiquidity > 0 ? 
            ((totalLiquidity - availableLiquidity) * BASIS_POINTS) / totalLiquidity : 0;
        liquidityData.lastUpdate = block.timestamp;
    }

    /**
     * @dev Force an update of fee allocation
     */
    function updateFees() external onlyOwner {
        _updateFees();
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Check if this contract is registered for Sonic FeeM
     * @return isRegistered Whether the contract is registered for fee monetization
     */
    function checkFeeMStatus() external view returns (bool isRegistered) {
        // AUDIT FIX: Implement actual FeeM contract query
        address feeMContract = 0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830;
        
        (bool success, bytes memory returnData) = feeMContract.staticcall(abi.encodeWithSignature("isRegistered(address)", address(this)));
        if (success && returnData.length >= 32) {
            return abi.decode(returnData, (bool));
        }
        
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Update fees if conditions are met
     */
    function _maybeUpdateFees() internal {
        // Check if enough time has passed since last update
        if (block.timestamp >= lastFeeUpdate + feeUpdateInterval) {
            _updateFees();
        }
    }

    /**
     * @dev Update fee allocation based on current conditions
     */
    function _updateFees() internal {
        // Skip if adaptive fees are disabled
        if (!adaptiveFeeParams.enabled) return;

        // Calculate new fees using DragonMath
        (uint256 newJackpotFee, uint256 newLiquidityFee) = calculateAdaptiveFees(
            currentJackpotSize,
            marketData.dailyVolume
        );

        // Update fees
        feeConfig.jackpotFee = newJackpotFee;
        feeConfig.liquidityFee = newLiquidityFee;
        lastFeeUpdate = block.timestamp;

        emit FeeUpdated(feeConfig.jackpotFee, feeConfig.liquidityFee, feeConfig.burnFee, feeConfig.totalFee);
    }

    /**
     * @dev Reset daily data
     */
    function _resetDailyData() internal {
        marketData.dailyVolume = 0;
        marketData.dailyTrades = 0;
        marketData.lastVolumeReset = block.timestamp;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    event FeeConfigurationUpdated(uint256 totalFee, uint256 burnFee, uint256 jackpotFee, uint256 liquidityFee);
    event AdaptiveFeeParametersUpdated(uint256 baseMultiplier, uint256 volatilityThreshold, uint256 liquidityThreshold);
    event MarketDataUpdated(address indexed token, uint256 volume, uint256 price, uint256 timestamp);
    event JackpotSizeUpdated(uint256 newSize);
    event AdaptiveFeesToggled(bool enabled);
    event FeeUpdated(uint256 jackpotFee, uint256 liquidityFee, uint256 burnFee, uint256 totalFee);
    event VolumeUpdated(uint256 newVolume);
    event Initialized(uint256 totalFee, uint256 jackpotFee);
} 