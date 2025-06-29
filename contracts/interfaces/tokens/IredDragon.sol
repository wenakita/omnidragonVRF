// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/**
 * @title IredDragon
 * @notice Interface for the redDragon wrapped LP token
 */
interface IredDragon is IERC20 {
  // Structs
  struct StakeInfo {
    uint256 amount; // Amount of LP tokens staked
    uint256 shares; // Amount of redDragon tokens received
    uint256 lockEnd; // Lock end timestamp (0 if not locked)
    uint256 lastRewardTime; // Last reward calculation timestamp
    uint256 rewardDebt; // Reward debt for fair distribution
  }

  // View functions
  function getLP() external view returns (IERC20);
  function totalStaked() external view returns (uint256);
  function rewardRate() external view returns (uint256);
  function stakes(address account) external view returns (StakeInfo memory);
  function stakedBalance(address account) external view returns (uint256);
  function isLocked(address account) external view returns (bool);
  function getBoostMultiplier(address account) external view returns (uint256);
  function pendingReward(address account) external view returns (uint256);

  // Fee-related views
  function isExemptFromFees(address account) external view returns (bool);
  function isAMM(address pair) external view returns (bool);
  function lotteryManager() external view returns (address);
  function feeRecipient() external view returns (address);
  function priceOracle() external view returns (address);

  // Curve-style system views
  function workingSupply() external view returns (uint256);
  function workingBalance(address user) external view returns (uint256);
  function claimable_tokens(address user) external view returns (uint256);
  function getBoostInfo(
    address account
  )
    external
    view
    returns (
      uint256 userBalance,
      uint256 totalSupply,
      uint256 userVotes,
      uint256 totalVotes,
      uint256 boostMultiplier,
      bool isUsingTimeBoost
    );

  // Voting system
  function veDragonToken() external view returns (address);
  function totalVoteWeight() external view returns (uint256);
  function userVoteWeight(address user) external view returns (uint256);
  function getUserVoteWeight(address account) external view returns (uint256);

  // Staking functions
  function stake(uint256 amount, uint256 lockDuration) external;
  function unstake(uint256 shares) external;
  function claimReward() external;
  function extendLock(uint256 additionalDuration) external;
  function emergencyWithdraw() external;

  // Curve-style system functions
  function user_checkpoint(address user) external returns (bool);
  function kick(address user) external;

  // Admin functions
  function setRewardRate(uint256 _rewardRate) external;
  function pause() external;
  function unpause() external;
  function recoverToken(address token, uint256 amount) external;
  function setLotterySystem(address _lotteryManager, address _jackpotVault, address _priceOracle) external;
  function setFeeExemption(address account, bool exempt) external;
  function setAMMPair(address pair, bool _isAMM) external;
  function setVeDragonToken(address _veDragonToken) external;
  function updateVoteWeights(address[] calldata users, uint256[] calldata weights) external;
  function setEmergencyBoostDisabled(bool disabled) external;

  // Events
  event Staked(address indexed user, uint256 amount, uint256 shares, uint256 lockEnd);
  event Unstaked(address indexed user, uint256 amount, uint256 shares);
  event RewardPaid(address indexed user, uint256 reward);
  event RewardRateUpdated(uint256 newRate);
  event EmergencyWithdraw(address indexed user, uint256 amount);
  event TransferFeeCollected(address indexed from, address indexed to, uint256 feeAmount);
  event LotteryTriggered(address indexed user, uint256 swapAmountUSD, uint256 entryId);
  event FeeExemptionSet(address indexed account, bool exempt);
  event AMMPairSet(address indexed pair, bool isAMM);
  event UserCheckpoint(address indexed user, uint256 workingBalance, uint256 integrateFraction);
  event UserKicked(address indexed user, address indexed kicker, uint256 oldWorkingBalance, uint256 newWorkingBalance);
  event VeDragonTokenUpdated(address indexed newToken);
  event VoteWeightsUpdated(address[] users, uint256[] weights);
  event EmergencyBoostDisabled(bool disabled);
  event TotalSupplyReferenceUpdated(uint256 newReference);
}
