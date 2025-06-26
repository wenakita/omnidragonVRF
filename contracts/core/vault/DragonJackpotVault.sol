// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';
import { IDragonJackpotVault } from "../../interfaces/vault/IDragonJackpotVault.sol";
import { SonicFeeMHelper } from "../../libraries/core/SonicFeeMHelper.sol";

/**
 * @title DragonJackpotVault
 * @dev Jackpot vault with lottery mechanics and adaptive fee management
 *
 * Central component for Dragon ecosystem lottery system and jackpot distribution
 * Integrates with OmniDragon token to provide engaging lottery experiences
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract DragonJackpotVault is IDragonJackpotVault, Ownable, ReentrancyGuard {
  using SafeERC20 for IERC20;

  // Track jackpot balances by token
  mapping(address => uint256) public jackpotBalances;

  // Wrapped native token (WETH, WrappedNativeToken)
  address public wrappedNativeToken;

  // Last win timestamp
  uint256 public lastWinTimestamp;

  // Fee manager address for registration
  address public feeManagerAddress;

  // Events
  event JackpotAdded(address indexed token, uint256 amount);
  event JackpotPaid(address indexed token, address indexed winner, uint256 amount);
  event WrappedNativeTokenSet(address indexed oldToken, address indexed newToken);
  event FeeManagerAddressSet(address indexed oldAddress, address indexed newAddress);

  /**
   * @dev Constructor
   * @param _wrappedNativeToken Initial wrapped native token address
   * @param _feeManagerAddress Initial fee manager address for registration
   */
  constructor(address _wrappedNativeToken, address _feeManagerAddress) Ownable(msg.sender) {
    require(_wrappedNativeToken != address(0), 'Zero address');
    require(_feeManagerAddress != address(0), 'Zero address');
    wrappedNativeToken = _wrappedNativeToken;
    feeManagerAddress = _feeManagerAddress;

    // Register for Sonic FeeM automatically
    SonicFeeMHelper.registerForFeeM();
  }

  /**
   * @dev Add ERC20 tokens to the jackpot with proper token tracking
   * @param token Token address
   * @param amount Amount to add
   */
  function addERC20ToJackpot(address token, uint256 amount) external {
    require(amount > 0, 'Amount must be > 0');
    IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    jackpotBalances[token] += amount;
    emit JackpotAdded(token, amount);
  }

  /**
   * @dev Add collected funds that are already in the vault (for trusted callers only)
   * @param token Token address
   * @param amount Amount to add to accounting
   */
  function addCollectedFunds(address token, uint256 amount) external onlyOwner {
    require(amount > 0, 'Amount must be > 0');
    require(token != address(0), 'Invalid token');
    jackpotBalances[token] += amount;
    emit JackpotAdded(token, amount);
  }

  /**
   * @dev Get the current jackpot balance (in wrapped native token)
   * @return balance The current jackpot balance
   */
  function getJackpotBalance() external view override returns (uint256 balance) {
    return jackpotBalances[wrappedNativeToken];
  }

  /**
   * @dev Pay jackpot to winner (owner only) with specific token
   * @param token Token address
   * @param winner Winner address
   * @param amount Amount to pay
   */
  function payJackpotWithToken(address token, address winner, uint256 amount) external onlyOwner nonReentrant {
    require(winner != address(0), 'Zero address');
    require(amount > 0, 'Amount must be > 0');
    require(jackpotBalances[token] >= amount, 'Insufficient balance');

    // Checks-Effects-Interactions pattern
    jackpotBalances[token] -= amount;
    lastWinTimestamp = block.timestamp;

    IERC20(token).safeTransfer(winner, amount);
    emit JackpotPaid(token, winner, amount);
  }

  /**
   * @dev Pay jackpot to winner using wrapped native token (implements interface method)
   * @param winner Winner address
   * @param amount Amount to pay
   */
  function payJackpot(address winner, uint256 amount) external override onlyOwner nonReentrant {
    require(wrappedNativeToken != address(0), 'Wrapped token not set');
    require(winner != address(0), 'Zero address');
    require(amount > 0, 'Amount must be > 0');
    require(jackpotBalances[wrappedNativeToken] >= amount, 'Insufficient balance');

    // Checks-Effects-Interactions pattern
    jackpotBalances[wrappedNativeToken] -= amount;
    lastWinTimestamp = block.timestamp;

    IERC20(wrappedNativeToken).safeTransfer(winner, amount);
    emit JackpotPaid(wrappedNativeToken, winner, amount);
  }

  /**
   * @dev Get the time of the last jackpot win
   * @return timestamp The last win timestamp
   */
  function getLastWinTime() external view override returns (uint256 timestamp) {
    return lastWinTimestamp;
  }

  /**
   * @dev Set the wrapped native token address
   * @param _wrappedNativeToken The new wrapped native token address
   */
  function setWrappedNativeToken(address _wrappedNativeToken) external override onlyOwner {
    require(_wrappedNativeToken != address(0), 'Zero address');
    address oldToken = wrappedNativeToken;
    wrappedNativeToken = _wrappedNativeToken;
    emit WrappedNativeTokenSet(oldToken, _wrappedNativeToken);
  }

  /**
   * @dev Set the fee manager address for registration
   * @param _feeManagerAddress The new fee manager address
   */
  function setFeeManagerAddress(address _feeManagerAddress) external onlyOwner {
    require(_feeManagerAddress != address(0), 'Zero address');
    address oldAddress = feeManagerAddress;
    feeManagerAddress = _feeManagerAddress;
    emit FeeManagerAddressSet(oldAddress, _feeManagerAddress);
  }

  /**
   * @dev Get jackpot balance for a specific token
   * @param token Token address
   * @return Jackpot balance
   */
  function getJackpotBalance(address token) external view returns (uint256) {
    return jackpotBalances[token];
  }

  /**
   * @dev Allow receiving ETH and track it as wrapped native token balance
   */
  receive() external payable {
    require(wrappedNativeToken != address(0), 'Wrapped token not set for ETH');
    require(msg.value > 0, 'No ETH sent');

    // Track received ETH as wrapped native token balance
    jackpotBalances[wrappedNativeToken] += msg.value;
    emit JackpotAdded(wrappedNativeToken, msg.value);
  }

  /**
   * @notice Check if this contract is registered for Sonic FeeM
   * @return isRegistered Whether the contract is registered for fee monetization
   */
  function checkFeeMStatus() external view returns (bool isRegistered) {
    return SonicFeeMHelper.isRegisteredForFeeM();
  }
}
