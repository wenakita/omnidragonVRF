// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DragonMarketAnalyzer
 * @dev Library for market analysis and fee calculations in the Dragon ecosystem
 * @notice Provides sophisticated market analysis tools for adaptive fee management
 */
library DragonMarketAnalyzer {
    // Constants
    uint256 public constant BASE_BURN_BPS = 69; // 0.69% fixed burn fee
    uint256 public constant MAX_TOTAL_FEE_BPS = 2000; // 20% maximum total fee
    uint256 public constant MIN_JACKPOT_FEE_BPS = 200; // 2% minimum jackpot fee
    uint256 public constant MAX_JACKPOT_FEE_BPS = 1500; // 15% maximum jackpot fee
    
    // Market condition thresholds
    uint256 public constant HIGH_VOLUME_THRESHOLD = 1000000 ether; // 1M token volume
    uint256 public constant LOW_VOLUME_THRESHOLD = 100000 ether; // 100K token volume
    uint256 public constant HIGH_VOLATILITY_THRESHOLD = 500; // 5% price change
    uint256 public constant LOW_VOLATILITY_THRESHOLD = 100; // 1% price change
    
    // Analysis parameters
    uint256 public constant VOLUME_WEIGHT = 40; // 40% weight for volume analysis
    uint256 public constant VOLATILITY_WEIGHT = 35; // 35% weight for volatility analysis
    uint256 public constant TREND_WEIGHT = 25; // 25% weight for trend analysis
    
    /**
     * @dev Struct for market analysis results
     */
    struct MarketAnalysis {
        uint256 volumeScore;
        uint256 volatilityScore;
        uint256 trendScore;
        uint256 overallScore;
        bool shouldIncreaseFees;
        bool shouldDecreaseFees;
        uint256 recommendedJackpotFee;
    }
    
    /**
     * @dev Struct for market data input
     */
    struct MarketData {
        uint256 currentVolume;
        uint256 previousVolume;
        int256 currentPrice;
        int256 previousPrice;
        uint256 jackpotSize;
        uint256 liquidityDepth;
        uint256 timestamp;
    }
    
    /**
     * @dev Analyze market conditions and recommend fee adjustments
     * @param data Market data for analysis
     * @param currentJackpotFee Current jackpot fee in basis points
     * @return analysis Complete market analysis with recommendations
     */
    function analyzeMarketConditions(
        MarketData memory data,
        uint256 currentJackpotFee
    ) internal pure returns (MarketAnalysis memory analysis) {
        // Calculate individual scores
        analysis.volumeScore = _calculateVolumeScore(data.currentVolume, data.previousVolume);
        analysis.volatilityScore = _calculateVolatilityScore(data.currentPrice, data.previousPrice);
        analysis.trendScore = _calculateTrendScore(data.currentPrice, data.previousPrice, data.jackpotSize);
        
        // Calculate weighted overall score
        analysis.overallScore = (
            analysis.volumeScore * VOLUME_WEIGHT +
            analysis.volatilityScore * VOLATILITY_WEIGHT +
            analysis.trendScore * TREND_WEIGHT
        ) / 100;
        
        // Determine fee adjustment recommendations
        if (analysis.overallScore > 700) { // High activity/volatility
            analysis.shouldIncreaseFees = true;
            analysis.recommendedJackpotFee = _increaseFee(currentJackpotFee, analysis.overallScore);
        } else if (analysis.overallScore < 300) { // Low activity
            analysis.shouldDecreaseFees = true;
            analysis.recommendedJackpotFee = _decreaseFee(currentJackpotFee, analysis.overallScore);
        } else {
            // Moderate conditions - maintain current fees
            analysis.recommendedJackpotFee = currentJackpotFee;
        }
        
        return analysis;
    }
    
    /**
     * @dev Calculate volume score based on current vs previous volume
     * @param currentVolume Current trading volume
     * @param previousVolume Previous period trading volume
     * @return score Volume score (0-1000)
     */
    function _calculateVolumeScore(
        uint256 currentVolume,
        uint256 previousVolume
    ) private pure returns (uint256 score) {
        if (previousVolume == 0) {
            return currentVolume > LOW_VOLUME_THRESHOLD ? 500 : 200;
        }
        
        // Calculate volume change ratio
        uint256 volumeRatio = (currentVolume * 1000) / previousVolume;
        
        if (volumeRatio > 1500) { // 50% increase
            score = 900;
        } else if (volumeRatio > 1200) { // 20% increase
            score = 700;
        } else if (volumeRatio > 800) { // -20% to +20%
            score = 500;
        } else if (volumeRatio > 500) { // -50% to -20%
            score = 300;
        } else {
            score = 100; // Very low volume
        }
        
        return score;
    }
    
    /**
     * @dev Calculate volatility score based on price movement
     * @param currentPrice Current token price
     * @param previousPrice Previous period token price
     * @return score Volatility score (0-1000)
     */
    function _calculateVolatilityScore(
        int256 currentPrice,
        int256 previousPrice
    ) private pure returns (uint256 score) {
        if (previousPrice == 0) {
            return 500; // Default moderate volatility
        }
        
        // Calculate absolute price change percentage (in basis points)
        int256 priceChange = currentPrice - previousPrice;
        uint256 absChangePercent = uint256(priceChange > 0 ? priceChange : -priceChange) * 10000 / uint256(previousPrice);
        
        if (absChangePercent > 1000) { // >10% change
            score = 950;
        } else if (absChangePercent > 500) { // 5-10% change
            score = 800;
        } else if (absChangePercent > 200) { // 2-5% change
            score = 600;
        } else if (absChangePercent > 50) { // 0.5-2% change
            score = 400;
        } else {
            score = 200; // <0.5% change
        }
        
        return score;
    }
    
    /**
     * @dev Calculate trend score based on price direction and jackpot size
     * @param currentPrice Current token price
     * @param previousPrice Previous period token price
     * @param jackpotSize Current jackpot size
     * @return score Trend score (0-1000)
     */
    function _calculateTrendScore(
        int256 currentPrice,
        int256 previousPrice,
        uint256 jackpotSize
    ) private pure returns (uint256 score) {
        score = 500; // Base score
        
        // Price trend component
        if (previousPrice > 0) {
            if (currentPrice > previousPrice) {
                score += 200; // Upward trend
            } else if (currentPrice < previousPrice) {
                score -= 100; // Downward trend
            }
        }
        
        // Jackpot size component
        if (jackpotSize > 10000 ether) { // Large jackpot
            score += 100;
        } else if (jackpotSize > 1000 ether) { // Medium jackpot
            score += 50;
        }
        
        // Ensure score stays within bounds
        if (score > 1000) score = 1000;
        if (score < 0) score = 0;
        
        return score;
    }
    
    /**
     * @dev Increase fee based on market activity score
     * @param currentFee Current jackpot fee in basis points
     * @param activityScore Market activity score (0-1000)
     * @return newFee Recommended new fee
     */
    function _increaseFee(
        uint256 currentFee,
        uint256 activityScore
    ) private pure returns (uint256 newFee) {
        uint256 increaseAmount;
        
        if (activityScore > 900) {
            increaseAmount = 100; // 1% increase for very high activity
        } else if (activityScore > 800) {
            increaseAmount = 50; // 0.5% increase for high activity
        } else {
            increaseAmount = 25; // 0.25% increase for moderate-high activity
        }
        
        newFee = currentFee + increaseAmount;
        
        // Ensure within bounds
        if (newFee > MAX_JACKPOT_FEE_BPS) {
            newFee = MAX_JACKPOT_FEE_BPS;
        }
        
        return newFee;
    }
    
    /**
     * @dev Decrease fee based on low market activity
     * @param currentFee Current jackpot fee in basis points
     * @param activityScore Market activity score (0-1000)
     * @return newFee Recommended new fee
     */
    function _decreaseFee(
        uint256 currentFee,
        uint256 activityScore
    ) private pure returns (uint256 newFee) {
        uint256 decreaseAmount;
        
        if (activityScore < 200) {
            decreaseAmount = 50; // 0.5% decrease for very low activity
        } else {
            decreaseAmount = 25; // 0.25% decrease for low activity
        }
        
        newFee = currentFee > decreaseAmount ? currentFee - decreaseAmount : MIN_JACKPOT_FEE_BPS;
        
        // Ensure within bounds
        if (newFee < MIN_JACKPOT_FEE_BPS) {
            newFee = MIN_JACKPOT_FEE_BPS;
        }
        
        return newFee;
    }
    
    /**
     * @dev Calculate optimal fee distribution based on market conditions
     * @param totalFee Total fee in basis points
     * @param marketScore Overall market activity score
     * @return jackpotFee Recommended jackpot fee
     * @return liquidityFee Recommended liquidity fee
     * @return burnFee Fixed burn fee (always BASE_BURN_BPS)
     */
    function calculateOptimalFeeDistribution(
        uint256 totalFee,
        uint256 marketScore
    ) internal pure returns (
        uint256 jackpotFee,
        uint256 liquidityFee,
        uint256 burnFee
    ) {
        burnFee = BASE_BURN_BPS; // Always fixed
        
        // Calculate jackpot fee based on market activity
        if (marketScore > 700) {
            jackpotFee = (totalFee * 70) / 100; // 70% of total fee for high activity
        } else if (marketScore > 500) {
            jackpotFee = (totalFee * 60) / 100; // 60% of total fee for moderate activity
        } else {
            jackpotFee = (totalFee * 50) / 100; // 50% of total fee for low activity
        }
        
        // Subtract burn fee from jackpot fee calculation
        if (jackpotFee + burnFee > totalFee) {
            jackpotFee = totalFee - burnFee;
        }
        
        // Ensure jackpot fee is within bounds
        if (jackpotFee > MAX_JACKPOT_FEE_BPS) {
            jackpotFee = MAX_JACKPOT_FEE_BPS;
        }
        if (jackpotFee < MIN_JACKPOT_FEE_BPS) {
            jackpotFee = MIN_JACKPOT_FEE_BPS;
        }
        
        // Calculate remaining liquidity fee
        liquidityFee = totalFee - jackpotFee - burnFee;
        
        return (jackpotFee, liquidityFee, burnFee);
    }
    
    /**
     * @dev Validate fee configuration
     * @param totalFee Total fee in basis points
     * @param jackpotFee Jackpot fee in basis points
     * @param liquidityFee Liquidity fee in basis points
     * @return isValid Whether the fee configuration is valid
     */
    function validateFeeConfiguration(
        uint256 totalFee,
        uint256 jackpotFee,
        uint256 liquidityFee
    ) internal pure returns (bool isValid) {
        // Check total doesn't exceed maximum
        if (totalFee > MAX_TOTAL_FEE_BPS) return false;
        
        // Check jackpot fee bounds
        if (jackpotFee < MIN_JACKPOT_FEE_BPS || jackpotFee > MAX_JACKPOT_FEE_BPS) return false;
        
        // Check sum equals total (including burn fee)
        if (jackpotFee + liquidityFee + BASE_BURN_BPS != totalFee) return false;
        
        return true;
    }
} 