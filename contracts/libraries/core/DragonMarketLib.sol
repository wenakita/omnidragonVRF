// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DragonMarketLib
 * @dev Comprehensive market analysis and fee processing library for Dragon ecosystem
 * 
 * UNIFIED DRAGON MARKET LIBRARY
 * This library consolidates all market analysis, fee calculations, and processing
 * functionality into a single, optimized library for the Dragon ecosystem.
 *
 * CORE FUNCTIONALITY:
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * ✅ Market Condition Analysis - Comprehensive market health scoring
 * ✅ Fee Calculation & Distribution - Dynamic fee allocation based on market conditions
 * ✅ Oracle Analysis - Multi-source data validation and confidence scoring
 * ✅ Liquidity Analysis - Depth and impact calculations
 * ✅ Volatility Metrics - Price stability and trend analysis
 * ✅ Volume Analysis - Trading activity and momentum scoring
 * ✅ Risk Assessment - Market risk and circuit breaker calculations
 * ✅ Fee Processing - Complete fee calculation, validation, and distribution
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
library DragonMarketLib {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    // Fee constants (basis points)
    uint256 public constant BASE_BURN_BPS = 69;           // 0.69% burn fee (fixed)
    uint256 public constant MIN_JACKPOT_BPS = 100;        // 1% minimum jackpot fee
    uint256 public constant MAX_JACKPOT_BPS = 1500;       // 15% maximum jackpot fee
    uint256 public constant MIN_TOTAL_FEE_BPS = 200;      // 2% minimum total fee
    uint256 public constant MAX_TOTAL_FEE_BPS = 2500;     // 25% maximum total fee
    uint256 public constant DEFAULT_JACKPOT_BPS = 690;    // 6.9% default jackpot fee
    uint256 public constant DEFAULT_VEDRAGON_BPS = 241;   // 2.41% default veDRAGON fee
    uint256 public constant BASIS_POINTS = 10000;         // 100% in basis points

    // Market condition constants
    uint256 public constant EXCELLENT_THRESHOLD = 8500;   // 85% - excellent market conditions
    uint256 public constant GOOD_THRESHOLD = 7000;        // 70% - good market conditions
    uint256 public constant FAIR_THRESHOLD = 5000;        // 50% - fair market conditions
    uint256 public constant POOR_THRESHOLD = 3000;        // 30% - poor market conditions

    // Volatility constants
    uint256 public constant LOW_VOLATILITY_THRESHOLD = 200;    // 2% price change
    uint256 public constant MEDIUM_VOLATILITY_THRESHOLD = 500; // 5% price change
    uint256 public constant HIGH_VOLATILITY_THRESHOLD = 1000;  // 10% price change

    // Liquidity constants
    uint256 public constant MIN_LIQUIDITY_THRESHOLD = 1000 * 1e18;     // 1K minimum liquidity
    uint256 public constant GOOD_LIQUIDITY_THRESHOLD = 10000 * 1e18;   // 10K good liquidity
    uint256 public constant EXCELLENT_LIQUIDITY_THRESHOLD = 100000 * 1e18; // 100K excellent liquidity

    // Oracle confidence constants
    uint256 public constant MIN_ORACLE_CONFIDENCE = 5000;     // 50% minimum confidence
    uint256 public constant SINGLE_ORACLE_CONFIDENCE = 6000;  // 60% for single oracle
    uint256 public constant DUAL_ORACLE_CONFIDENCE = 7500;    // 75% for two oracles
    uint256 public constant TRIPLE_ORACLE_CONFIDENCE = 8500;  // 85% for three oracles
    uint256 public constant QUAD_ORACLE_CONFIDENCE = 9500;    // 95% for four+ oracles

    // Volume thresholds
    uint256 public constant HIGH_VOLUME_THRESHOLD = 1000000 * 1e18; // 1M token volume
    uint256 public constant LOW_VOLUME_THRESHOLD = 100000 * 1e18;   // 100K token volume

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Fee structure for different transaction types
     */
    struct Fees {
        uint256 jackpot;    // Basis points for jackpot
        uint256 veDRAGON;   // Basis points for veDRAGON holders
        uint256 burn;       // Basis points for token burn
        uint256 total;      // Total basis points (sum of above)
    }

    /**
     * @dev Fee distribution configuration
     */
    struct FeeDistribution {
        address jackpotVault;
        address revenueDistributor;
        address burnAddress;
        bool distributionEnabled;
    }

    /**
     * @dev Fee calculation result
     */
    struct FeeCalculation {
        uint256 jackpotAmount;
        uint256 veDRAGONAmount;
        uint256 burnAmount;
        uint256 totalFeeAmount;
        uint256 transferAmount;
    }

    /**
     * @dev Comprehensive market analysis result
     */
    struct MarketAnalysis {
        uint256 overallScore;
        uint256 liquidityScore;
        uint256 volatilityScore;
        uint256 volumeScore;
        uint256 oracleConfidence;
        uint256 riskLevel;
        bool isHealthy;
        bool shouldIncreaseFees;
        bool shouldDecreaseFees;
        uint256 recommendedJackpotFee;
    }

    /**
     * @dev Market data input for analysis
     */
    struct MarketData {
        uint256 totalLiquidity;
        uint256 currentVolume;
        uint256 previousVolume;
        int256 currentPrice;
        int256 previousPrice;
        uint256 jackpotSize;
        uint256 activeStakers;
        uint256 daysSinceLastJackpot;
        uint256 timestamp;
    }

    /**
     * @dev Oracle analysis result
     */
    struct OracleAnalysis {
        uint256 confidence;
        uint256 deviation;
        uint256 freshness;
        uint256 diversity;
        bool isReliable;
    }

    /**
     * @dev Optimal fee allocation result
     */
    struct FeeAllocation {
        uint256 jackpotFeeBps;
        uint256 liquidityFeeBps;
        uint256 burnFeeBps;
        uint256 totalFeeBps;
        bool isOptimal;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    event FeeCalculated(
        address indexed token,
        uint256 amount,
        uint256 jackpotFee,
        uint256 veDRAGONFee,
        uint256 burnFee
    );

    event FeeDistributed(
        address indexed recipient,
        address indexed token,
        uint256 amount,
        string feeType
    );

    event FeeStructureUpdated(
        string feeType,
        uint256 jackpot,
        uint256 veDRAGON,
        uint256 burn,
        uint256 total
    );

    event MarketAnalysisCompleted(
        uint256 overallScore,
        uint256 liquidityScore,
        uint256 volatilityScore,
        uint256 volumeScore,
        bool isHealthy
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    error InvalidFeeStructure();
    error FeeTooHigh();
    error ZeroAmount();
    error ZeroAddress();
    error DistributionFailed();
    error InvalidBasisPoints();
    error InvalidTotalFee();

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // FEE PROCESSING FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Initialize default fee structures
     */
    function initializeDefaultFees() internal pure returns (Fees memory buyFees, Fees memory sellFees, Fees memory transferFees) {
        buyFees = Fees({
            jackpot: DEFAULT_JACKPOT_BPS,
            veDRAGON: DEFAULT_VEDRAGON_BPS,
            burn: BASE_BURN_BPS,
            total: DEFAULT_JACKPOT_BPS + DEFAULT_VEDRAGON_BPS + BASE_BURN_BPS
        });
        
        sellFees = buyFees; // Same as buy fees
        
        transferFees = Fees({
            jackpot: 0,
            veDRAGON: 0,
            burn: 0, // No fees on regular transfers
            total: 0
        });
        
        return (buyFees, sellFees, transferFees);
    }

    /**
     * @dev Validate fee structure
     */
    function validateFees(uint256 jackpot, uint256 veDRAGON, uint256 burn) internal pure returns (uint256 total) {
        total = jackpot + veDRAGON + burn;
        
        if (total > MAX_TOTAL_FEE_BPS) {
            revert FeeTooHigh();
        }
        
        if (jackpot > BASIS_POINTS || veDRAGON > BASIS_POINTS || burn > BASIS_POINTS) {
            revert InvalidBasisPoints();
        }
        
        return total;
    }

    /**
     * @dev Calculate fees for a transaction
     */
    function calculateFees(
        uint256 amount,
        Fees memory feeStructure
    ) internal pure returns (FeeCalculation memory calculation) {
        if (amount == 0) {
            revert ZeroAmount();
        }
        
        calculation.jackpotAmount = (amount * feeStructure.jackpot) / BASIS_POINTS;
        calculation.veDRAGONAmount = (amount * feeStructure.veDRAGON) / BASIS_POINTS;
        calculation.burnAmount = (amount * feeStructure.burn) / BASIS_POINTS;
        
        calculation.totalFeeAmount = calculation.jackpotAmount + 
                                   calculation.veDRAGONAmount + 
                                   calculation.burnAmount;
        
        calculation.transferAmount = amount - calculation.totalFeeAmount;
        
        return calculation;
    }

    /**
     * @dev Distribute fees to respective recipients
     */
    function distributeFees(
        FeeCalculation memory calculation,
        FeeDistribution memory distribution,
        address token
    ) internal {
        if (!distribution.distributionEnabled) {
            return;
        }
        
        // Distribute to jackpot vault
        if (calculation.jackpotAmount > 0 && distribution.jackpotVault != address(0)) {
            if (token == address(0)) {
                // Native token transfer
                (bool success, ) = distribution.jackpotVault.call{value: calculation.jackpotAmount}("");
                if (!success) revert DistributionFailed();
            } else {
                // ERC20 token transfer
                IERC20(token).safeTransfer(distribution.jackpotVault, calculation.jackpotAmount);
            }
            
            emit FeeDistributed(distribution.jackpotVault, token, calculation.jackpotAmount, "Jackpot");
        }
        
        // Distribute to veDRAGON revenue distributor
        if (calculation.veDRAGONAmount > 0 && distribution.revenueDistributor != address(0)) {
            if (token == address(0)) {
                // Native token transfer
                (bool success, ) = distribution.revenueDistributor.call{value: calculation.veDRAGONAmount}("");
                if (!success) revert DistributionFailed();
            } else {
                // ERC20 token transfer
                IERC20(token).safeTransfer(distribution.revenueDistributor, calculation.veDRAGONAmount);
            }
            
            emit FeeDistributed(distribution.revenueDistributor, token, calculation.veDRAGONAmount, "veDRAGON");
        }
        
        // Handle burn (transfer to burn address or actual burn)
        if (calculation.burnAmount > 0) {
            if (distribution.burnAddress != address(0)) {
                if (token == address(0)) {
                    // Native token to burn address
                    (bool success, ) = distribution.burnAddress.call{value: calculation.burnAmount}("");
                    if (!success) revert DistributionFailed();
                } else {
                    // ERC20 to burn address
                    IERC20(token).safeTransfer(distribution.burnAddress, calculation.burnAmount);
                }
                
                emit FeeDistributed(distribution.burnAddress, token, calculation.burnAmount, "Burn");
            }
            // If burnAddress is address(0), the tokens are effectively burned by not being transferred
        }
    }

    /**
     * @dev Update fee structure with validation
     */
    function updateFeeStructure(
        Fees storage fees,
        uint256 jackpot,
        uint256 veDRAGON,
        uint256 burn,
        string memory feeType
    ) internal {
        uint256 total = validateFees(jackpot, veDRAGON, burn);
        
        fees.jackpot = jackpot;
        fees.veDRAGON = veDRAGON;
        fees.burn = burn;
        fees.total = total;
        
        emit FeeStructureUpdated(feeType, jackpot, veDRAGON, burn, total);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // MARKET ANALYSIS FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Calculate liquidity score based on total liquidity
     */
    function _calculateLiquidityScore(uint256 totalLiquidity) private pure returns (uint256) {
        if (totalLiquidity >= EXCELLENT_LIQUIDITY_THRESHOLD) {
            return 2500; // Max points
        }
        if (totalLiquidity >= GOOD_LIQUIDITY_THRESHOLD) {
            return 1500 + (1000 * (totalLiquidity - GOOD_LIQUIDITY_THRESHOLD)) / (EXCELLENT_LIQUIDITY_THRESHOLD - GOOD_LIQUIDITY_THRESHOLD);
        }
        if (totalLiquidity >= MIN_LIQUIDITY_THRESHOLD) {
            return 500 + (1000 * (totalLiquidity - MIN_LIQUIDITY_THRESHOLD)) / (GOOD_LIQUIDITY_THRESHOLD - MIN_LIQUIDITY_THRESHOLD);
        }
        return (500 * totalLiquidity) / MIN_LIQUIDITY_THRESHOLD;
    }

    /**
     * @dev Calculate volume score based on daily volume and liquidity
     */
    function _calculateVolumeScore(uint256 dailyVolume, uint256 totalLiquidity) private pure returns (uint256) {
        if (totalLiquidity == 0) return 0;
        uint256 turnoverRatio = (dailyVolume * BASIS_POINTS) / totalLiquidity; // In bps
        
        if (turnoverRatio > 5000) { // >50% turnover
            return 2000;
        }
        if (turnoverRatio > 1000) { // >10% turnover
            return 1000 + (1000 * (turnoverRatio - 1000)) / 4000;
        }
        return (1000 * turnoverRatio) / 1000;
    }

    /**
     * @dev Calculate volatility score based on price change
     */
    function _calculateVolatilityScore(int256 currentPrice, int256 previousPrice) private pure returns (uint256) {
        if (previousPrice == 0) {
            return 500; // Default moderate volatility
        }
        
        // Calculate absolute price change percentage (in basis points)
        int256 priceChange = currentPrice - previousPrice;
        uint256 absChangePercent = uint256(priceChange > 0 ? priceChange : -priceChange) * BASIS_POINTS / uint256(previousPrice);
        
        if (absChangePercent > HIGH_VOLATILITY_THRESHOLD) { // >10% change
            return 950;
        } else if (absChangePercent > MEDIUM_VOLATILITY_THRESHOLD) { // 5-10% change
            return 800;
        } else if (absChangePercent > LOW_VOLATILITY_THRESHOLD) { // 2-5% change
            return 600;
        } else if (absChangePercent > 50) { // 0.5-2% change
            return 400;
        } else {
            return 200; // <0.5% change
        }
    }

    /**
     * @dev Calculate activity score based on stakers and volume
     */
    function _calculateActivityScore(uint256 activeStakers, uint256 dailyVolume) private pure returns (uint256) {
        uint256 stakerScore = activeStakers > 1000 ? 750 : (activeStakers * 750) / 1000;
        uint256 volumeActivityScore = dailyVolume > (50000 * 1e18) ? 750 : (dailyVolume * 750) / (50000 * 1e18);
        return stakerScore + volumeActivityScore;
    }

    /**
     * @dev Calculate jackpot score based on size and time since last jackpot
     */
    function _calculateJackpotScore(uint256 jackpotSize, uint256 daysSinceLastJackpot) private pure returns (uint256) {
        uint256 sizeScore = jackpotSize > (10000 * 1e18) ? 1000 : (jackpotSize * 1000) / (10000 * 1e18);
        uint256 timeScore = daysSinceLastJackpot < 30 ? 500 : 0;
        return sizeScore + timeScore;
    }

    /**
     * @dev Calculate trend score based on price direction and volume
     */
    function _calculateTrendScore(int256 priceChangePercent, uint256 dailyVolume) private pure returns (uint256) {
        // Positive trend if price is up and volume is high
        if (priceChangePercent > 0 && dailyVolume > (25000 * 1e18)) {
            return 500 + (uint256(priceChangePercent) * 500) / 1000; // Max 1000 at 10% increase
        }
        return 500; // Neutral trend
    }

    /**
     * @dev Calculate comprehensive market condition score
     */
    function calculateMarketConditionScore(
        uint256 totalLiquidity,
        uint256 dailyVolume,
        int256 priceChangePercent,
        uint256 activeStakers,
        uint256 jackpotSize,
        uint256 daysSinceLastJackpot
    ) public pure returns (uint256 score) {
        // Liquidity component (0-2500 points, 25% weight)
        uint256 liquidityScore = _calculateLiquidityScore(totalLiquidity);
        
        // Volume component (0-2000 points, 20% weight)
        uint256 volumeScore = _calculateVolumeScore(dailyVolume, totalLiquidity);
        
        // Price stability component (0-1500 points, 15% weight)
        uint256 stabilityScore = 1500 - _calculateVolatilityScore(0, 1); // Inverse volatility for stability
        
        // Activity component (0-1500 points, 15% weight)
        uint256 activityScore = _calculateActivityScore(activeStakers, dailyVolume);
        
        // Jackpot component (0-1500 points, 15% weight)
        uint256 jackpotScore = _calculateJackpotScore(jackpotSize, daysSinceLastJackpot);
        
        // Trend component (0-1000 points, 10% weight)
        uint256 trendScore = _calculateTrendScore(priceChangePercent, dailyVolume);
        
        // Combine all components
        score = liquidityScore + volumeScore + stabilityScore + activityScore + jackpotScore + trendScore;
        
        // Ensure score is within bounds
        if (score > BASIS_POINTS) score = BASIS_POINTS;
        
        return score;
    }

    /**
     * @dev Calculate oracle confidence based on multiple factors
     */
    function calculateOracleConfidence(
        uint256 validOracles,
        uint256 totalWeight,
        uint256 priceDeviation,
        uint256 dataFreshness
    ) public pure returns (uint256 confidence) {
        // Oracle count confidence
        uint256 countConfidence;
        if (validOracles >= 4) {
            countConfidence = QUAD_ORACLE_CONFIDENCE;
        } else if (validOracles == 3) {
            countConfidence = TRIPLE_ORACLE_CONFIDENCE;
        } else if (validOracles == 2) {
            countConfidence = DUAL_ORACLE_CONFIDENCE;
        } else if (validOracles == 1) {
            countConfidence = SINGLE_ORACLE_CONFIDENCE;
        } else {
            return 0; // No confidence with zero oracles
        }

        // Weighting confidence
        uint256 weightConfidence = (totalWeight * BASIS_POINTS) / BASIS_POINTS;

        // Combine confidences (average them)
        confidence = (countConfidence + weightConfidence) / 2;

        // Apply penalties for deviation and staleness
        if (priceDeviation > 100) { // >1% deviation
            confidence = (confidence * (BASIS_POINTS - (priceDeviation * 10))) / BASIS_POINTS;
        }
        if (dataFreshness > 300) { // >5 minutes old
            confidence = (confidence * (BASIS_POINTS - ((dataFreshness - 300) * 5))) / BASIS_POINTS;
        }

        if (confidence < MIN_ORACLE_CONFIDENCE) confidence = MIN_ORACLE_CONFIDENCE;
        if (confidence > BASIS_POINTS) confidence = BASIS_POINTS;

        return confidence;
    }

    /**
     * @dev Calculate optimal fee allocation based on market conditions
     */
    function calculateOptimalFeeAllocation(
        uint256 jackpotSize,
        uint256 /* dailyVolume */,
        uint256 totalFeeBps,
        uint256 marketScore
    ) public pure returns (FeeAllocation memory allocation) {
        if (totalFeeBps < MIN_TOTAL_FEE_BPS || totalFeeBps > MAX_TOTAL_FEE_BPS) {
            revert InvalidTotalFee();
        }
        
        allocation.burnFeeBps = BASE_BURN_BPS;
        uint256 availableForAllocation = totalFeeBps - allocation.burnFeeBps;
        
        // Calculate optimal jackpot fee based on market conditions
        uint256 baseJackpotFee = DEFAULT_JACKPOT_BPS;
        int256 marketAdjustment = (int256(marketScore) - 5000) / 10;
        int256 jackpotAdjustment = jackpotSize < (5000 * 1e18) ? int256(200) : int256(-200);
        int256 totalAdjustment = marketAdjustment + jackpotAdjustment;
        int256 adjustedJackpotFee = int256(baseJackpotFee) + totalAdjustment;

        if (adjustedJackpotFee < int256(MIN_JACKPOT_BPS)) {
            adjustedJackpotFee = int256(MIN_JACKPOT_BPS);
        }
        if (adjustedJackpotFee > int256(MAX_JACKPOT_BPS)) {
            adjustedJackpotFee = int256(MAX_JACKPOT_BPS);
        }
        if (uint256(adjustedJackpotFee) > availableForAllocation) {
            allocation.jackpotFeeBps = availableForAllocation;
        } else {
            allocation.jackpotFeeBps = uint256(adjustedJackpotFee);
        }
        
        allocation.liquidityFeeBps = availableForAllocation - allocation.jackpotFeeBps;
        allocation.totalFeeBps = totalFeeBps;
        allocation.isOptimal = (allocation.jackpotFeeBps + allocation.liquidityFeeBps + allocation.burnFeeBps) == totalFeeBps;
        
        return allocation;
    }

    /**
     * @dev Perform comprehensive market analysis
     */
    function analyzeMarketConditions(
        MarketData memory data,
        uint256 currentJackpotFee
    ) public pure returns (MarketAnalysis memory analysis) {
        // Calculate individual scores
        analysis.liquidityScore = _calculateLiquidityScore(data.totalLiquidity);
        analysis.volumeScore = _calculateVolumeScore(data.currentVolume, data.totalLiquidity);
        analysis.volatilityScore = _calculateVolatilityScore(data.currentPrice, data.previousPrice);
        
        // Calculate overall market score
        analysis.overallScore = calculateMarketConditionScore(
            data.totalLiquidity,
            data.currentVolume,
            data.currentPrice - data.previousPrice,
            data.activeStakers,
            data.jackpotSize,
            data.daysSinceLastJackpot
        );
        
        // Determine market health
        analysis.isHealthy = analysis.overallScore > FAIR_THRESHOLD;
        
        // Determine fee adjustment recommendations
        if (analysis.overallScore > 7000) { // High activity/volatility
            analysis.shouldIncreaseFees = true;
            analysis.recommendedJackpotFee = currentJackpotFee + 100; // Increase by 1%
        } else if (analysis.overallScore < 3000) { // Low activity
            analysis.shouldDecreaseFees = true;
            analysis.recommendedJackpotFee = currentJackpotFee > 50 ? currentJackpotFee - 50 : MIN_JACKPOT_BPS; // Decrease by 0.5%
        } else {
            // Moderate conditions - maintain current fees
            analysis.recommendedJackpotFee = currentJackpotFee;
        }
        
        // Ensure recommended fee is within bounds
        if (analysis.recommendedJackpotFee > MAX_JACKPOT_BPS) {
            analysis.recommendedJackpotFee = MAX_JACKPOT_BPS;
        }
        if (analysis.recommendedJackpotFee < MIN_JACKPOT_BPS) {
            analysis.recommendedJackpotFee = MIN_JACKPOT_BPS;
        }
        
        return analysis;
    }

    /**
     * @dev Check if fee structure is valid
     */
    function isValidFeeStructure(Fees memory fees) internal pure returns (bool) {
        return fees.total <= MAX_TOTAL_FEE_BPS && 
               fees.total == (fees.jackpot + fees.veDRAGON + fees.burn);
    }

    /**
     * @dev Calculate total fees for a transaction without distribution
     */
    function calculateTotalFee(uint256 amount, Fees memory feeStructure) internal pure returns (uint256) {
        if (amount == 0) return 0;
        return (amount * feeStructure.total) / BASIS_POINTS;
    }
} 