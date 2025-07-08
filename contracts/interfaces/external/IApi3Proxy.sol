// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IApi3Proxy
 * @dev Interface for API3 dAPI proxy contracts
 * Based on official API3 documentation: https://docs.api3.org/
 * 
 * API3 dAPIs provide first-party oracle data directly from data providers
 * without intermediaries. This interface allows reading price data from
 * API3 proxy contracts obtained through the API3 Market.
 */
interface IApi3Proxy {
    /**
     * @notice Reads the latest data from the dAPI
     * @dev This is the primary function for reading API3 dAPI data
     * @return value The latest price value (typically 18 decimals for USD pairs)
     * @return timestamp The timestamp of when the data was last updated
     */
    function read() external view returns (int224 value, uint256 timestamp);
}

/**
 * @title IApi3ReaderProxyV1
 * @dev Extended interface for API3 ReaderProxyV1 contracts
 * These contracts also implement Chainlink's AggregatorV2V3Interface
 * for drop-in compatibility with existing Chainlink integrations.
 */
interface IApi3ReaderProxyV1 is IApi3Proxy {
    /**
     * @notice Returns the description of the data feed
     * @return The description string
     */
    function description() external view returns (string memory);
    
    /**
     * @notice Returns the number of decimals for the data feed
     * @return The number of decimals (typically 18 for USD pairs)
     */
    function decimals() external view returns (uint8);
    
    /**
     * @notice Returns the version of the aggregator
     * @return The version number
     */
    function version() external view returns (uint256);
    
    /**
     * @notice Chainlink-compatible interface for latest round data
     * @return roundId The round ID (always 1 for API3)
     * @return answer The price answer
     * @return startedAt The timestamp when the round started
     * @return updatedAt The timestamp when the round was updated
     * @return answeredInRound The round ID in which the answer was computed
     */
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}
