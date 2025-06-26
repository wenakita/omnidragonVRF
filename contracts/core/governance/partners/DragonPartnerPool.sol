// SPDX-License-Identifier: MIT

/**
 *   ██████╗  █████╗ ██████╗ ████████╗███╗   ██╗███████╗██████╗ ███████╗
 *   ██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝████╗  ██║██╔════╝██╔══██╗██╔════╝
 *   ██████╔╝███████║██████╔╝   ██║   ██╔██╗ ██║█████╗  ██████╔╝███████╗
 *   ██╔═══╝ ██╔══██║██╔══██╗   ██║   ██║╚██╗██║██╔══╝  ██╔══██╗╚════██║
 *   ██║     ██║  ██║██║  ██║   ██║   ██║ ╚████║███████╗██║  ██║███████║
 *   ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚══════╝
 *              COLLABORATION AND INTEGRATION SYSTEM
 *
 * Governance: DragonPartnerPool
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonic_reddragon_bot
 */

pragma solidity ^0.8.20;

import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import { Pausable } from '@openzeppelin/contracts/utils/Pausable.sol';
import { IDragonPartnerRegistry } from '../../../interfaces/governance/partners/IDragonPartnerRegistry.sol';
import { IveDRAGONBoostManager } from '../../../interfaces/governance/partners/IveDRAGONBoostManager.sol';
import { IJackpot } from '../../../interfaces/external/IJackpot.sol';
import '../../../libraries/core/SonicFeeMHelper.sol';

/**
 * @title DragonPartnerPool
 * @dev Pool contract for partners receiving votes and distributing rewards
 */
contract DragonPartnerPool is Ownable, ReentrancyGuard, Pausable {
  using SafeERC20 for IERC20;

  // State variables
  address public partnerAddress;
  address public veDRAGONBoostManager;
  address public jackpot;
  address public treasury;
  address public partnerRegistry;

  // Pool configuration
  uint256 public feePercentage; // In basis points (e.g., 500 = 5%)
  uint256 public partnerId;
  bool public initialized;

  // Boost tracking
  uint256 public lastProbabilityBoost;
  uint256 public lastBoostUpdate;
  uint256 public boostUpdateInterval;

  // Reward tracking
  mapping(address => uint256) public totalRewards;
  mapping(address => uint256) public distributedRewards;
  uint256 public lastDistribution;

  // Staking tracking
  IERC20 public stakingToken;
  uint256 public totalStaked;
  mapping(address => uint256) public userStakes;
  mapping(address => uint256) public userRewardDebt;
  uint256 public accRewardPerShare; // 1e12 precision

  // Constants
  uint256 private constant REWARD_PRECISION = 1e12;
  uint256 private constant PROBABILITY_PRECISION = 10000;

  // Events
  event Initialized(address indexed partnerAddress, uint256 indexed partnerId);
  event Staked(address indexed user, uint256 amount);
  event Unstaked(address indexed user, uint256 amount);
  event RewardsHarvested(address indexed user, address indexed token, uint256 amount);
  event RewardsAdded(address indexed token, uint256 amount);
  event RewardsDistributed(address indexed token, uint256 totalAmount, uint256 feeAmount, uint256 partnerAmount);
  event ProbabilityBoostUpdated(uint256 oldBoost, uint256 newBoost);
  event JackpotEntered(address indexed user, uint256 baseAmount, uint256 boostedAmount);

  /**
   * @dev Constructor
   * @param _partnerAddress Address of the partner
   * @param _veDRAGONBoostManager Address of veDRAGON boost manager contract
   * @param _treasury Address of treasury
   * @param _jackpot Address of jackpot contract
   * @param _feePercentage Fee percentage in basis points
   */
  constructor(
    address _partnerAddress,
    address _veDRAGONBoostManager,
    address _treasury,
    address _jackpot,
    uint256 _feePercentage
  ) Ownable(msg.sender) {
    require(_partnerAddress != address(0), 'Zero address: partner');
    require(_veDRAGONBoostManager != address(0), 'Zero address: veDRAGONBoostManager');
    require(_treasury != address(0), 'Zero address: treasury');
    require(_jackpot != address(0), 'Zero address: jackpot');
    require(_feePercentage <= 5000, 'Fee too high');

    partnerAddress = _partnerAddress;
    veDRAGONBoostManager = _veDRAGONBoostManager;
    treasury = _treasury;
    jackpot = _jackpot;
    feePercentage = _feePercentage;
    boostUpdateInterval = 1 days;
    lastDistribution = block.timestamp;
    lastBoostUpdate = block.timestamp;

    // Register for Sonic FeeM automatically
    SonicFeeMHelper.registerForFeeM();
  }

  /**
   * @dev Initialize the pool with partner registry and staking token
   * @param _partnerRegistry Partner registry address
   * @param _stakingToken Token used for staking
   */
  function initialize(address _partnerRegistry, address _stakingToken) external onlyOwner {
    require(!initialized, 'Already initialized');
    require(_partnerRegistry != address(0), 'Zero address: registry');
    require(_stakingToken != address(0), 'Zero address: token');

    partnerRegistry = _partnerRegistry;
    stakingToken = IERC20(_stakingToken);

    // First store the partner ID (we'll verify it's registered in the next step)
    // Partners are registered by index in the array
    for (uint256 i = 0; i < IDragonPartnerRegistry(_partnerRegistry).getPartnerCount(); i++) {
      if (IDragonPartnerRegistry(_partnerRegistry).partnerList(i) == partnerAddress) {
        partnerId = i;
        break;
      }
    }

    // Verify the partner is registered
    bool isActive = IDragonPartnerRegistry(_partnerRegistry).isPartnerActive(partnerAddress);
    require(isActive, 'Partner not active');

    initialized = true;

    emit Initialized(partnerAddress, partnerId);
  }

  /**
   * @dev Modifier to check if contract is initialized
   */
  modifier whenInitialized() {
    require(initialized, 'Not initialized');
    _;
  }

  /**
   * @dev Update probability boost from veDRAGON voting
   */
  function updateProbabilityBoost() external whenInitialized {
    require(block.timestamp >= lastBoostUpdate + boostUpdateInterval, 'Too soon to update');

    uint256 oldBoost = lastProbabilityBoost;
    uint256 newBoost = IveDRAGONBoostManager(veDRAGONBoostManager).getPartnerProbabilityBoost(partnerId);

    lastProbabilityBoost = newBoost;
    lastBoostUpdate = block.timestamp;

    emit ProbabilityBoostUpdated(oldBoost, newBoost);
  }

  /**
   * @dev Stake tokens into the pool
   * @param _amount Amount to stake
   */
  function stake(uint256 _amount) external nonReentrant whenNotPaused whenInitialized {
    require(_amount > 0, 'Zero amount');

    // Harvest pending rewards first
    _harvestRewards(msg.sender);

    // Transfer tokens
    stakingToken.safeTransferFrom(msg.sender, address(this), _amount);

    // Update state
    userStakes[msg.sender] += _amount;
    totalStaked += _amount;

    // Update reward debt
    userRewardDebt[msg.sender] = (userStakes[msg.sender] * accRewardPerShare) / REWARD_PRECISION;

    emit Staked(msg.sender, _amount);
  }

  /**
   * @dev Unstake tokens from the pool
   * @param _amount Amount to unstake
   */
  function unstake(uint256 _amount) external nonReentrant whenInitialized {
    require(_amount > 0, 'Zero amount');
    require(userStakes[msg.sender] >= _amount, 'Insufficient stake');

    // Harvest pending rewards first
    _harvestRewards(msg.sender);

    // Update state
    userStakes[msg.sender] -= _amount;
    totalStaked -= _amount;

    // Update reward debt
    userRewardDebt[msg.sender] = (userStakes[msg.sender] * accRewardPerShare) / REWARD_PRECISION;

    // Transfer tokens back to user
    stakingToken.safeTransfer(msg.sender, _amount);

    emit Unstaked(msg.sender, _amount);
  }

  /**
   * @dev Harvest pending rewards
   */
  function harvestRewards() external nonReentrant whenInitialized {
    _harvestRewards(msg.sender);
  }

  /**
   * @dev Enter jackpot with boost
   * @param _amount Amount of tokens to enter with
   */
  function enterJackpot(uint256 _amount) external nonReentrant whenNotPaused whenInitialized {
    require(_amount > 0, 'Zero amount');

    // Use a common wrapped native token (e.g., WETH)
    // Normally we would get this from jackpot, but the interface doesn't expose it
    address wrappedNativeToken = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // WETH address

    // Transfer tokens from user
    IERC20(wrappedNativeToken).safeTransferFrom(msg.sender, address(this), _amount);

    // Approve jackpot to use tokens  
    IERC20(wrappedNativeToken).safeIncreaseAllowance(veDRAGONBoostManager, _amount);

    // Enter jackpot with boosted amount using veDRAGON boost
    uint256 finalBoostedAmount = IveDRAGONBoostManager(veDRAGONBoostManager).enterJackpotWithBoost(msg.sender, _amount);

    emit JackpotEntered(msg.sender, _amount, finalBoostedAmount);
  }

  /**
   * @dev Add rewards to the pool
   * @param _token Token to add as reward
   * @param _amount Amount to add
   */
  function addRewards(address _token, uint256 _amount) external nonReentrant whenInitialized {
    require(_token != address(0), 'Zero address');
    require(_amount > 0, 'Zero amount');

    // Transfer tokens
    IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

    // Update state
    totalRewards[_token] += _amount;

    emit RewardsAdded(_token, _amount);
  }

  /**
   * @dev Distribute rewards to stakers
   * @param _token Token to distribute
   */
  function distributeRewards(address _token) external nonReentrant whenInitialized {
    require(_token != address(0), 'Zero address');
    require(totalStaked > 0, 'No stakers');

    uint256 balance = IERC20(_token).balanceOf(address(this));
    uint256 stakingBalance = totalStaked;

    // Calculate amount to distribute (non-staked tokens)
    uint256 distributableAmount = balance - stakingBalance;
    require(distributableAmount > 0, 'No rewards to distribute');

    // Calculate fee for treasury
    uint256 feeAmount = (distributableAmount * feePercentage) / 10000;

    // Calculate partner amount with boost
    uint256 basePartnerAmount = distributableAmount - feeAmount;
    uint256 boostMultiplier = PROBABILITY_PRECISION + lastProbabilityBoost;
    uint256 boostedPartnerAmount = (basePartnerAmount * boostMultiplier) / PROBABILITY_PRECISION;

    // Calculate amount to distribute to stakers (original amount - fees - partner share)
    uint256 stakerAmount = distributableAmount - feeAmount - boostedPartnerAmount;

    // Distribute fees
    if (feeAmount > 0) {
      IERC20(_token).safeTransfer(treasury, feeAmount);
    }

    // Distribute to partner
    if (boostedPartnerAmount > 0) {
      IERC20(_token).safeTransfer(partnerAddress, boostedPartnerAmount);
    }

    // Update staker rewards
    if (stakerAmount > 0 && totalStaked > 0) {
      accRewardPerShare += (stakerAmount * REWARD_PRECISION) / totalStaked;
    }

    // Update state
    distributedRewards[_token] += distributableAmount;
    lastDistribution = block.timestamp;

    emit RewardsDistributed(_token, distributableAmount, feeAmount, boostedPartnerAmount);
  }

  /**
   * @dev Internal function to harvest rewards
   * @param _user User address
   */
  function _harvestRewards(address _user) internal {
    uint256 userStake = userStakes[_user];
    if (userStake == 0) {
      return;
    }

    uint256 pending = (userStake * accRewardPerShare) / REWARD_PRECISION - userRewardDebt[_user];
    if (pending > 0) {
      // Determine the reward token - in this case, it's the staking token itself
      address rewardToken = address(stakingToken);

      // Update reward debt
      userRewardDebt[_user] = (userStake * accRewardPerShare) / REWARD_PRECISION;

      // Transfer rewards
      stakingToken.safeTransfer(_user, pending);

      emit RewardsHarvested(_user, rewardToken, pending);
    }
  }

  /**
   * @dev Get pending rewards for a user
   * @param _user User address
   * @return Amount of pending rewards
   */
  function pendingRewards(address _user) external view returns (uint256) {
    if (userStakes[_user] == 0) {
      return 0;
    }

    uint256 _accRewardPerShare = accRewardPerShare;

    return (userStakes[_user] * _accRewardPerShare) / REWARD_PRECISION - userRewardDebt[_user];
  }

  /**
   * @dev Set fee percentage
   * @param _feePercentage New fee percentage
   */
  function setFeePercentage(uint256 _feePercentage) external onlyOwner {
    require(_feePercentage <= 5000, 'Fee too high');
    feePercentage = _feePercentage;
  }

  /**
   * @dev Set boost update interval
   * @param _interval New interval in seconds
   */
  function setBoostUpdateInterval(uint256 _interval) external onlyOwner {
    require(_interval >= 1 hours, 'Interval too short');
    boostUpdateInterval = _interval;
  }

  /**
   * @dev Pause the contract
   */
  function pause() external onlyOwner {
    _pause();
  }

  /**
   * @dev Unpause the contract
   */
  function unpause() external onlyOwner {
    _unpause();
  }

  /**
   * @dev Emergency withdraw tokens
   * @param _token Token to withdraw
   * @param _to Recipient address
   */
  function emergencyWithdraw(address _token, address _to) external onlyOwner {
    require(_to != address(0), 'Zero address');

    uint256 balance = IERC20(_token).balanceOf(address(this));
    if (balance > 0) {
      IERC20(_token).safeTransfer(_to, balance);
    }
  }

  /**
   * @notice Check if this contract is registered for Sonic FeeM
   * @return isRegistered Whether the contract is registered for fee monetization
   */
  function checkFeeMStatus() external view returns (bool isRegistered) {
    return SonicFeeMHelper.isRegisteredForFeeM();
  }
}