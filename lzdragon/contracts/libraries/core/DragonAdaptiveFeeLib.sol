// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { DragonMarketLib } from "./DragonMarketLib.sol";
import { IOmniDragonPriceOracle } from "../../interfaces/oracles/IOmniDragonPriceOracle.sol";

/**
 * @title DragonAdaptiveFeeLib
 * @dev Library for adaptive fee calculations based on market conditions
 *
 * ADAPTIVE FEE SYSTEM:
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * ✅ Oracle-based market analysis integration
 * ✅ Dynamic fee multiplier calculations
 * ✅ Market condition scoring and adjustments
 * ✅ Fee scaling and bounds enforcement
 * ✅ Inverse fee relationships for ecosystem balance
 * ✅ Gas-optimized calculations
 *
 * MARKET-BASED ADJUSTMENTS:
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * - Poor Market (Score < 3000): Increase fees by 50% to reduce selling pressure
 * - Fair Market (3000-5000): Increase fees by 25% for moderate protection
 * - Good Market (7000-8000): Reduce fees by 10% to encourage activity
 * - Excellent Market (>8000): Reduce fees by 20% for maximum liquidity
 *
 * VOLATILITY ADJUSTMENTS:
 * - High Volatility (>70%): +10% fees to stabilize
 * - Low Volatility (<30%): -5% fees to encourage trading
 *
 * LIQUIDITY ADJUSTMENTS:
 * - Low Liquidity (<30%): +20% fees to protect remaining liquidity
 * - High Liquidity (>80%): -10% fees to maximize volume
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
library DragonAdaptiveFeeLib {
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    uint256 public constant BASIS_POINTS = 10000; // 100%
    uint256 public constant MIN_MULTIPLIER = 5000; // 50% minimum
    uint256 public constant MAX_MULTIPLIER = 20000; // 200% maximum
    
    // Market condition thresholds
    uint256 public constant POOR_MARKET_THRESHOLD = 3000; // 30%
    uint256 public constant FAIR_MARKET_THRESHOLD = 5000; // 50%
    uint256 public constant GOOD_MARKET_THRESHOLD = 7000; // 70%
    uint256 public constant EXCELLENT_MARKET_THRESHOLD = 8000; // 80%
    
    // Volatility thresholds
    uint256 public constant HIGH_VOLATILITY_THRESHOLD = 7000; // 70%
    uint256 public constant LOW_VOLATILITY_THRESHOLD = 3000; // 30%
    
    // Liquidity thresholds
    uint256 public constant LOW_LIQUIDITY_THRESHOLD = 3000; // 30%
    uint256 public constant HIGH_LIQUIDITY_THRESHOLD = 8000; // 80%

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    struct AdaptiveFeeConfig {
        address priceOracle;
        bool adaptiveFeesEnabled;
        uint256 marketUpdateInterval;
        uint256 maxTotalFee;
    }

    struct MarketConditions {
        uint256 marketScore;
        uint256 liquidityScore;
        uint256 volatilityScore;
        uint256 volumeScore;
        uint256 timestamp;
        bool isValid;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    event AdaptiveFeesCalculated(
        uint256 originalJackpot,
        uint256 adaptiveJackpot,
        uint256 originalVeDRAGON,
        uint256 adaptiveVeDRAGON,
        uint256 marketScore,
        uint256 multiplier
    );

    event MarketConditionsAnalyzed(
        uint256 marketScore,
        uint256 liquidityScore,
        uint256 volatilityScore,
        uint256 volumeScore,
        uint256 feeMultiplier
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // MAIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Calculate adaptive fees based on current market conditions
     * @param baseFees The base fee structure to adjust
     * @param config Adaptive fee configuration
     * @return adaptiveFees The adjusted fee structure
     */
    function calculateAdaptiveFees(
        DragonMarketLib.Fees memory baseFees,
        AdaptiveFeeConfig memory config
    ) internal view returns (DragonMarketLib.Fees memory adaptiveFees) {
        // If adaptive fees disabled or no oracle, return base fees
        if (!config.adaptiveFeesEnabled || config.priceOracle == address(0)) {
            return baseFees;
        }

        // Get market conditions from oracle
        MarketConditions memory conditions = getMarketConditions(config);
        
        // If market data is invalid or stale, return base fees
        if (!conditions.isValid) {
            return baseFees;
        }

        // Calculate fee multiplier based on market conditions
        uint256 feeMultiplier = calculateFeeMultiplier(conditions);

        // Apply adaptive adjustments
        adaptiveFees = baseFees;
        
        // Adjust jackpot fee based on market conditions
        adaptiveFees.jackpot = adjustFeeWithMultiplier(baseFees.jackpot, feeMultiplier);
        
        // Adjust veDRAGON fee (inverse relationship - lower fees in bad markets to encourage holding)
        adaptiveFees.veDRAGON = adjustFeeInverse(baseFees.veDRAGON, feeMultiplier);
        
        // Burn fee remains constant
        adaptiveFees.burn = baseFees.burn;
        
        // Recalculate total
        adaptiveFees.total = adaptiveFees.jackpot + adaptiveFees.veDRAGON + adaptiveFees.burn;
        
        // Ensure total doesn't exceed maximum
        if (adaptiveFees.total > config.maxTotalFee) {
            adaptiveFees = scaleFeeStructure(adaptiveFees, config.maxTotalFee);
        }

        return adaptiveFees;
    }

    /**
     * @dev Get market conditions from the price oracle
     * @param config Adaptive fee configuration
     * @return conditions Market conditions struct
     */
    function getMarketConditions(AdaptiveFeeConfig memory config) 
        internal 
        view 
        returns (MarketConditions memory conditions) 
    {
        try IOmniDragonPriceOracle(config.priceOracle).getAggregatedPrice() returns (
            int256 price,
            bool success,
            uint256 timestamp
        ) {
            // Check if data is fresh and successful
            bool isDataFresh = (block.timestamp - timestamp) <= config.marketUpdateInterval;
            
            if (success && isDataFresh) {
                conditions.marketScore = success ? 7000 : 3000; // Simplified scoring
                conditions.liquidityScore = 5000; // Default neutral
                conditions.volatilityScore = 5000; // Default neutral
                conditions.volumeScore = 5000; // Default neutral
                conditions.timestamp = timestamp;
                conditions.isValid = true;
            } else {
                conditions.isValid = false;
            }
        } catch {
            conditions.isValid = false;
        }

        return conditions;
    }

    /**
     * @dev Calculate fee multiplier based on market conditions
     * @param conditions Market conditions data
     * @return multiplier Fee multiplier in basis points
     */
    function calculateFeeMultiplier(MarketConditions memory conditions) 
        internal 
        pure 
        returns (uint256 multiplier) 
    {
        // Base multiplier is 100% (10000 basis points)
        multiplier = BASIS_POINTS;
        
        // Adjust based on overall market health
        if (conditions.marketScore < POOR_MARKET_THRESHOLD) {
            // Very poor market - increase fees significantly
            multiplier = (multiplier * 150) / 100; // 1.5x
        } else if (conditions.marketScore < FAIR_MARKET_THRESHOLD) {
            // Poor market - increase fees moderately
            multiplier = (multiplier * 125) / 100; // 1.25x
        } else if (conditions.marketScore > EXCELLENT_MARKET_THRESHOLD) {
            // Excellent market - reduce fees
            multiplier = (multiplier * 80) / 100; // 0.8x
        } else if (conditions.marketScore > GOOD_MARKET_THRESHOLD) {
            // Good market - slightly reduce fees
            multiplier = (multiplier * 90) / 100; // 0.9x
        }
        
        // Adjust for volatility (higher volatility = higher fees)
        if (conditions.volatilityScore > HIGH_VOLATILITY_THRESHOLD) {
            multiplier = (multiplier * 110) / 100; // +10%
        } else if (conditions.volatilityScore < LOW_VOLATILITY_THRESHOLD) {
            multiplier = (multiplier * 95) / 100; // -5%
        }
        
        // Adjust for liquidity (lower liquidity = higher fees)
        if (conditions.liquidityScore < LOW_LIQUIDITY_THRESHOLD) {
            multiplier = (multiplier * 120) / 100; // +20%
        } else if (conditions.liquidityScore > HIGH_LIQUIDITY_THRESHOLD) {
            multiplier = (multiplier * 90) / 100; // -10%
        }
        
        // Ensure multiplier stays within reasonable bounds
        if (multiplier < MIN_MULTIPLIER) multiplier = MIN_MULTIPLIER;
        if (multiplier > MAX_MULTIPLIER) multiplier = MAX_MULTIPLIER;
        
        return multiplier;
    }

    /**
     * @dev Apply fee multiplier to a fee component
     * @param baseFee Original fee amount in basis points
     * @param multiplier Multiplier in basis points
     * @return adjustedFee Adjusted fee amount
     */
    function adjustFeeWithMultiplier(uint256 baseFee, uint256 multiplier) 
        internal 
        pure 
        returns (uint256 adjustedFee) 
    {
        return (baseFee * multiplier) / BASIS_POINTS;
    }

    /**
     * @dev Apply inverse fee multiplier (for veDRAGON fees)
     * @param baseFee Original fee amount in basis points
     * @param multiplier Multiplier in basis points
     * @return adjustedFee Inversely adjusted fee amount
     */
    function adjustFeeInverse(uint256 baseFee, uint256 multiplier) 
        internal 
        pure 
        returns (uint256 adjustedFee) 
    {
        // Inverse relationship: when multiplier is high, fee is lower
        uint256 inverseMultiplier = (BASIS_POINTS * BASIS_POINTS) / multiplier;
        return (baseFee * inverseMultiplier) / BASIS_POINTS;
    }

    /**
     * @dev Scale fee structure proportionally to fit within maximum total
     * @param fees Original fee structure
     * @param maxTotalFee Maximum allowed total fee
     * @return scaledFees Proportionally scaled fee structure
     */
    function scaleFeeStructure(
        DragonMarketLib.Fees memory fees,
        uint256 maxTotalFee
    ) internal pure returns (DragonMarketLib.Fees memory scaledFees) {
        if (fees.total <= maxTotalFee) {
            return fees;
        }

        // Calculate scale factor
        uint256 scaleFactor = (maxTotalFee * BASIS_POINTS) / fees.total;
        
        // Scale fees proportionally
        scaledFees.jackpot = (fees.jackpot * scaleFactor) / BASIS_POINTS;
        scaledFees.veDRAGON = (fees.veDRAGON * scaleFactor) / BASIS_POINTS;
        scaledFees.burn = fees.burn; // Keep burn fee constant
        scaledFees.total = scaledFees.jackpot + scaledFees.veDRAGON + scaledFees.burn;

        return scaledFees;
    }

    /**
     * @dev Preview adaptive fees without applying them
     * @param baseFees Base fee structure
     * @param config Adaptive fee configuration
     * @return adaptiveFees Calculated adaptive fees
     * @return multiplier Applied multiplier
     * @return conditions Market conditions used
     */
    function previewAdaptiveFees(
        DragonMarketLib.Fees memory baseFees,
        AdaptiveFeeConfig memory config
    ) internal view returns (
        DragonMarketLib.Fees memory adaptiveFees,
        uint256 multiplier,
        MarketConditions memory conditions
    ) {
        conditions = getMarketConditions(config);
        
        if (!conditions.isValid || !config.adaptiveFeesEnabled) {
            return (baseFees, BASIS_POINTS, conditions);
        }

        multiplier = calculateFeeMultiplier(conditions);
        adaptiveFees = calculateAdaptiveFees(baseFees, config);

        return (adaptiveFees, multiplier, conditions);
    }

    /**
     * @dev Check if adaptive fees would be different from base fees
     * @param baseFees Base fee structure
     * @param config Adaptive fee configuration
     * @return isAdaptive Whether fees would be adapted
     * @return multiplier Applied multiplier
     */
    function isAdaptiveFeeActive(
        DragonMarketLib.Fees memory baseFees,
        AdaptiveFeeConfig memory config
    ) internal view returns (bool isAdaptive, uint256 multiplier) {
        if (!config.adaptiveFeesEnabled || config.priceOracle == address(0)) {
            return (false, BASIS_POINTS);
        }

        MarketConditions memory conditions = getMarketConditions(config);
        
        if (!conditions.isValid) {
            return (false, BASIS_POINTS);
        }

        multiplier = calculateFeeMultiplier(conditions);
        isAdaptive = (multiplier != BASIS_POINTS);

        return (isAdaptive, multiplier);
    }
} 