// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IStorkOracle
 * @dev Interface for STORK oracle price feeds
 *
 * Used by OmniDragonSwapTriggerOracle to read STORK price data
 * STORK provides ultra low latency price feeds for DeFi
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
interface IStorkOracle {
    /**
     * @dev Get the latest price for a given asset ID
     * @param assetId The identifier for the asset (e.g., hash of "BTCUSD")
     * @return price The latest price (with decimals as configured)
     * @return timestamp The timestamp of the price update
     */
    function getLatestPrice(bytes32 assetId) external view returns (uint256 price, uint256 timestamp);

    /**
     * @dev Get price with additional metadata
     * @param assetId The identifier for the asset
     * @return price The latest price
     * @return timestamp The timestamp of the price update
     * @return decimals The number of decimals in the price
     */
    function getPriceWithMetadata(bytes32 assetId) external view returns (
        uint256 price,
        uint256 timestamp,
        uint8 decimals
    );
}
