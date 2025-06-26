// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDragonMarketController
 * @dev Interface for Dragon Market Controller for adaptive fee management
 */
interface IDragonMarketController {
  function calculateDynamicFees(
    address user,
    uint8 transactionType,
    uint256 amount,
    uint256 marketVolatility,
    uint256 liquidityDepth
  ) external view returns (uint256 jackpotFee, uint256 veDRAGONFee, uint256 burnFee, uint256 totalFee);
  
  function updateMarketData(address token, uint256 volume, uint256 price, uint256 timestamp) external;
  function setAdaptiveFeeParameters(uint256 baseMultiplier, uint256 volatilityThreshold, uint256 liquidityThreshold) external;
  function isAdaptiveFeesEnabled() external view returns (bool);
} 