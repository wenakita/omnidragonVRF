// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRedstoneOracle
 * @dev Interface for RedStone oracle price feeds
 *
 * Used by OmniDragonSwapTriggerOracle to read RedStone price data
 * RedStone uses a unique model where data is attached to transactions
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
interface IRedstoneOracle {
    /**
     * @dev Get the latest value for a given data feed ID
     * @param dataFeedId The identifier for the data feed (e.g., "SONIC", "USD")
     * @return value The latest value with specified decimals
     */
    function getValue(bytes32 dataFeedId) external view returns (uint256 value);

    /**
     * @dev Get value with timestamp
     * @param dataFeedId The identifier for the data feed
     * @return value The latest value
     * @return timestamp The timestamp of the value
     */
    function getValueWithTimestamp(bytes32 dataFeedId) external view returns (
        uint256 value,
        uint256 timestamp
    );

    /**
     * @dev Get multiple values at once
     * @param dataFeedIds Array of data feed identifiers
     * @return values Array of values corresponding to the feed IDs
     */
    function getValues(bytes32[] calldata dataFeedIds) external view returns (uint256[] memory values);
}
