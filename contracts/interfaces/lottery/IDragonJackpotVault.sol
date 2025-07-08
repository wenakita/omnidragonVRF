// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDragonJackpotVault
 * @dev Interface for the Dragon Jackpot Vault system
 *
 * Manages jackpot accumulation, distribution, and lottery mechanics
 * Core component of the OmniDragon tokenomics and reward system
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */

/**
 * @title IDragonJackpotVault
 * @dev Interface for the Dragon Jackpot Vault system
 *
 * Manages jackpot accumulation, distribution, and lottery mechanics
 * Core component of the OmniDragon tokenomics and reward system
 */
interface IDragonJackpotVault {
  /**
   * @dev Add ERC20 tokens to the jackpot with proper token tracking
   * @param token Token address
   * @param amount Amount to add
   */
  function addERC20ToJackpot(address token, uint256 amount) external;

  /**
   * @dev Add collected funds that are already in the vault (for trusted callers only)
   * @param token Token address
   * @param amount Amount to add to accounting
   */
  function addCollectedFunds(address token, uint256 amount) external;

  /**
   * @notice Get the current jackpot balance
   * @return balance The current jackpot balance
   */
  function getJackpotBalance() external view returns (uint256 balance);

  /**
   * @notice Pay out a jackpot to a winner
   * @param winner Address of the winner
   * @param amount Amount to pay
   */
  function payJackpot(address winner, uint256 amount) external;

  /**
   * @notice Get the time of the last jackpot win
   * @return timestamp The last win timestamp
   */
  function getLastWinTime() external view returns (uint256 timestamp);

  /**
   * @notice Set the wrapped native token address
   * @param _wrappedNativeToken The new wrapped native token address
   */
  function setWrappedNativeToken(address _wrappedNativeToken) external;

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
   * @dev Get jackpot balance for a specific token
   * @param token Token address
   * @return Jackpot balance
   */
  function getJackpotBalance(address token) external view returns (uint256);
}
