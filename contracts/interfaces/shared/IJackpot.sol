// SPDX-License-Identifier: MIT

/**
 * @title IJackpot
 * @dev Interface for jackpot entry and management
 *
 * Defines various methods for entering the lottery jackpot system
 * Supports multiple entry types: Dragon tokens, wrapped native, and native tokens
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */

pragma solidity ^0.8.20;

interface IJackpot {
    /**
     * @dev Enter the jackpot with Dragon tokens
     * @param user Address of the user entering the jackpot
     * @param amount Amount of Dragon tokens to enter
     */
    function enterJackpotWithDragon(address user, uint256 amount) external;

    /**
     * @dev Enter the jackpot with wrapped native tokens
     * @param user Address of the user entering the jackpot
     * @param amount Amount of wrapped native tokens to enter
     */
    function enterJackpotWithWrappedNativeToken(address user, uint256 amount) external;

    /**
     * @dev Enter the jackpot with native tokens
     * @param user Address of the user entering the jackpot
     */
    function enterJackpotWithNative(address user) external payable;

    /**
     * @dev Set protocol reward percentages
     * @param dragonPct Percentage for entering with DRAGON
     * @param nativePct Percentage for entering with native token
     */
    function setRewardPercentages(uint256 dragonPct, uint256 nativePct) external;

    /**
     * @dev Get jackpot balance
     * @return Current jackpot balance
     */
    function getJackpotBalance() external view returns (uint256);

    /**
     * @dev Enter jackpot
     * @param user User entering the jackpot
     * @param amount Amount to use for entry
     */
    function enterJackpot(address user, uint256 amount) external;
}
