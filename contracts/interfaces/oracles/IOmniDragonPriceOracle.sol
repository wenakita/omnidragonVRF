// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOmniDragonPriceOracle
 * @dev Interface for OmniDragon Price Oracle
 * Handles multi-oracle price aggregation and market condition analysis
 */
interface IOmniDragonPriceOracle {
    /**
     * @dev Oracle type enumeration
     */
    enum OracleType { CHAINLINK, API3, BAND, PYTH, REDSTONE, STORK }

    /**
     * @dev Oracle source structure
     */
    struct OracleSource {
        address oracleAddress;
        OracleType oracleType;
        bool isActive;
        uint8 decimals;
        bytes32 priceId; // Used by Pyth and STORK
        string baseSymbol; // Used by Band Protocol
        string quoteSymbol; // Used by Band Protocol
    }

    /**
     * @dev Price data structure
     */
    struct PriceData {
        int256 price;
        uint256 timestamp;
        uint256 roundId;
    }

    /**
     * @dev Get current aggregated price
     * @return price Aggregated price in 8 decimals
     * @return success Whether price aggregation was successful
     * @return timestamp Timestamp of the price
     */
    function getAggregatedPrice() external view returns (int256 price, bool success, uint256 timestamp);

    /**
     * @dev Update and get fresh aggregated price (state-changing)
     * @return price Aggregated price in 8 decimals
     * @return success Whether price aggregation was successful
     */
    function updateAndGetPrice() external returns (int256 price, bool success);

    /**
     * @dev Get market condition score (0-100)
     * @return score Market condition score based on volatility and volume
     */
    function getMarketConditionScore() external view returns (uint256 score);

    /**
     * @dev Update market conditions with new swap data
     * @param swapAmount Swap amount to add to statistics
     */
    function updateMarketConditions(uint256 swapAmount) external;



    /**
     * @dev Get oracle configuration for a specific oracle ID
     * @param _oracleId The oracle ID to query
     */
    function getOracleConfig(uint8 _oracleId) external view returns (
        address oracleAddress,
        OracleType oracleType,
        bool isActive,
        uint8 decimals,
        bytes32 priceId,
        string memory baseSymbol,
        string memory quoteSymbol
    );

    /**
     * @dev Get market statistics
     */
    function getMarketStats() external view returns (
        uint256 totalVolume,
        uint256 totalSwaps,
        uint256 avgSwapAmount,
        uint256 priceChanges,
        uint256 significantChanges,
        uint256 lastUpdate
    );

    /**
     * @dev Get last valid price for an oracle
     * @param _oracleId Oracle ID
     */
    function getLastValidPrice(uint8 _oracleId) external view returns (PriceData memory);

    // Events
    event OracleAdded(uint8 indexed oracleId, address oracleAddress, OracleType oracleType);
    event OracleUpdated(uint8 indexed oracleId, address oracleAddress, bool isActive);
    event MinimumOracleResponsesUpdated(uint8 oldValue, uint8 newValue);
    event NativeTokenConfigured(string nativeSymbol, string quoteSymbol);
    event PriceAggregated(int256 price, uint256 timestamp, uint8 oracleCount);
    event MarketConditionUpdated(uint256 swapVolume, uint256 swapCount, uint256 marketScore);
    event CircuitBreakerTriggered(uint8 indexed oracleId, int256 oldPrice, int256 newPrice);
}
