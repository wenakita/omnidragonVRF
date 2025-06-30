// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDragonFeeManager
 * @dev Consolidated interface for Dragon Fee Manager and Market Maker
 * Combines fee management, market making, and revenue distribution functionality
 */
interface IDragonFeeManager {
    
    /**
     * @dev Calculate dynamic fees based on market conditions
     * @param user User address
     * @param transactionType Type of transaction (0=buy, 1=sell, 2=transfer)
     * @param amount Transaction amount
     * @param marketVolatility Current market volatility score
     * @param liquidityDepth Current liquidity depth
     * @return jackpotFee Jackpot fee amount
     * @return veDRAGONFee veDRAGON fee amount
     * @return burnFee Burn fee amount
     * @return totalFee Total fee amount
     */
    function calculateDynamicFees(
        address user,
        uint8 transactionType,
        uint256 amount,
        uint256 marketVolatility,
        uint256 liquidityDepth
    ) external view returns (uint256 jackpotFee, uint256 veDRAGONFee, uint256 burnFee, uint256 totalFee);
    
    /**
     * @dev Update market data for fee calculations
     * @param token Token address
     * @param volume Trading volume
     * @param price Current price
     * @param timestamp Update timestamp
     */
    function updateMarketData(address token, uint256 volume, uint256 price, uint256 timestamp) external;
    
    /**
     * @dev Set adaptive fee parameters
     * @param baseMultiplier Base fee multiplier
     * @param volatilityThreshold Volatility threshold for fee adjustments
     * @param liquidityThreshold Liquidity threshold for fee adjustments
     */
    function setAdaptiveFeeParameters(uint256 baseMultiplier, uint256 volatilityThreshold, uint256 liquidityThreshold) external;
    
    /**
     * @dev Check if adaptive fees are enabled
     * @return enabled True if adaptive fees are enabled
     */
    function isAdaptiveFeesEnabled() external view returns (bool);

    /**
     * @dev Get current fee configuration
     * @return totalFee Total fee in basis points
     * @return burnFee Burn fee in basis points
     * @return jackpotFee Jackpot fee in basis points
     * @return liquidityFee Liquidity fee in basis points
     */
    function getFeeConfiguration() external view returns (
        uint256 totalFee,
        uint256 burnFee,
        uint256 jackpotFee,
        uint256 liquidityFee
    );

    /**
     * @dev Update fee configuration
     * @param totalFee New total fee in basis points
     * @param jackpotFee New jackpot fee in basis points
     */
    function updateFeeConfiguration(uint256 totalFee, uint256 jackpotFee) external;

    /**
     * @dev Get market liquidity data
     * @return totalLiquidity Total liquidity in the market
     * @return availableLiquidity Available liquidity for trading
     * @return utilizationRate Liquidity utilization rate
     */
    function getMarketLiquidity() external view returns (
        uint256 totalLiquidity,
        uint256 availableLiquidity,
        uint256 utilizationRate
    );

    /**
     * @dev Calculate market impact for a trade
     * @param tradeSize Size of the trade
     * @param isBuy True if buy trade, false if sell
     * @return impact Market impact in basis points
     */
    function calculateMarketImpact(uint256 tradeSize, bool isBuy) external view returns (uint256 impact);

    /**
     * @dev Get trading volume statistics
     * @return dailyVolume Daily trading volume
     * @return totalVolume Total cumulative volume
     * @return averageTradeSize Average trade size
     */
    function getVolumeStats() external view returns (
        uint256 dailyVolume,
        uint256 totalVolume,
        uint256 averageTradeSize
    );

    /**
     * @dev Update jackpot size
     * @param newJackpotSize New jackpot size
     */
    function updateJackpotSize(uint256 newJackpotSize) external;

    /**
     * @dev Get current jackpot size
     * @return jackpotSize Current jackpot size
     */
    function getJackpotSize() external view returns (uint256 jackpotSize);

    // Events - defined in implementing contract to avoid duplication
} 