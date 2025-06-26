// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IStdReference
 * @dev Interface for Band Protocol's Standard Reference oracle contract
 *
 * Used by OmniDragonSwapTriggerOracle to read Band Protocol price feeds
 * Band provides cross-chain data oracle aggregating real-world data
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
interface IStdReference {
    /**
     * @dev Structure returned for standard reference data
     */
    struct ReferenceData {
        uint256 rate; // base/quote exchange rate, multiplied by 1e18
        uint256 lastUpdatedBase; // UNIX epoch of last base price update
        uint256 lastUpdatedQuote; // UNIX epoch of last quote price update
    }

    /**
     * @dev Returns the price data for the given base/quote pair
     * @param _base The base symbol (e.g., "BTC")
     * @param _quote The quote symbol (e.g., "USD")
     * @return Reference data containing rate and update times
     */
    function getReferenceData(string memory _base, string memory _quote)
        external
        view
        returns (ReferenceData memory);

    /**
     * @dev Similar to getReferenceData, but with multiple base/quote pairs
     * @param _bases Array of base symbols
     * @param _quotes Array of quote symbols
     * @return Array of reference data for each pair
     */
    function getReferenceDataBulk(string[] memory _bases, string[] memory _quotes)
        external
        view
        returns (ReferenceData[] memory);
}
