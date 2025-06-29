// SPDX-License-Identifier: MIT

/**
 * @title IDragonJackpotDistributor
 * @dev Interface for Dragon Jackpot Distribution functionality
 *
 * Manages jackpot fund accumulation and distribution to lottery winners
 * Core component of the OmniDragon lottery and reward system
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */

pragma solidity ^0.8.20;

/**
 * @title IDragonJackpotDistributor
 * @dev Interface for Dragon Jackpot Distributor functionality
 */
interface IDragonJackpotDistributor {
    /**
     * @dev Add funds to the jackpot
     * @param amount Amount to add
     */
    function addToJackpot(uint256 amount) external;

    /**
     * @dev Distribute a jackpot to a winner
     * @param winner Address of the winner
     * @param amount Amount to distribute
     */
    function distributeJackpot(address winner, uint256 amount) external;

    /**
     * @dev Get the current jackpot balance
     * @return Current jackpot balance
     */
    function getCurrentJackpot() external view returns (uint256);
}
