// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDragonRevenueDistributor
 * @dev Minimal stub interface for testing - handles veDRAGON fee distribution
 */
interface IDragonRevenueDistributor {
    function distributeGeneralFees(address token, uint256 amount) external;
    function depositFees(uint256 partnerId, address token, uint256 amount) external payable;
    function claimRewards(address user) external;
    function getClaimableRewards(address user) external view returns (uint256);
} 