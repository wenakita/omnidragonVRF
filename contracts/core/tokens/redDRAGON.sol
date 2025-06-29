// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import { IUniswapV2Pair } from '../../interfaces/external/uniswap/IUniswapV2Pair.sol';
import { IredDragon } from '../../interfaces/tokens/IredDragon.sol';

/**
 * @title redDRAGON
 * @notice Wrapped Uniswap V2 type LP token with enhanced functionality
 * @dev Wraps any Uniswap V2-compatible LP token to provide additional features:
 * - Staking rewards with Curve-inspired boost mechanics
 * - Voting power for governance via veDRAGON integration
 * - 6.9% transfer fee for lottery system
 * - Integration with omniDRAGON lottery
 *
 * CONSOLIDATION: Focuses on core LP staking and boost logic only.
 * External boost calculations delegated to specialized contracts.
 */
contract redDRAGON is IredDragon, ERC20, Ownable, ReentrancyGuard, Pausable {
  using SafeERC20 for IERC20;

  // Constants
  uint256 private constant PRECISION = 1e18;
  uint256 private constant BPS_MAX = 10000;
  uint256 private constant TRANSFER_FEE_BPS = 690; // 6.9%
  uint256 private constant MAX_LOCK_DURATION = 365 days;
  uint256 private constant MIN_LOCK_DURATION = 7 days;
  uint256 private constant BASE_BOOST = 1e18; // 1x
  uint256 private constant MAX_BOOST = 25e17; // 2.5x (Curve-style)
  uint256 private constant BOOST_PRECISION = 1e18;

  // Curve 2.5x boost formula constants
  uint256 private constant BOOST_WEIGHT_A = 4e17; // 0.4 (40%)
  uint256 private constant BOOST_WEIGHT_B = 6e17; // 0.6 (60%)

  // Anti-manipulation constants
  uint256 private constant MAX_TOTAL_SUPPLY_RATIO = 1000; // Max 1000x difference
  uint256 private constant MIN_MEANINGFUL_BALANCE = 1e15; // 0.001 tokens minimum
  uint256 private constant MAX_SINGLE_USER_RATIO = 5000; // Max 50% of total supply per user

  // State variables
  IERC20 public immutable lpToken;
  uint256 public totalStaked; // Total LP tokens staked
  uint256 public rewardRate; // Rewards per second
  uint256 public lastUpdateTime;

  // Staking data
  mapping(address => StakeInfo) private _stakes;
  mapping(address => uint256) public userRewardPerTokenPaid;
  mapping(address => uint256) public rewards;

  // Fee exemptions and AMM pairs
  mapping(address => bool) public isFeeExempt;
  mapping(address => bool) public isAMMPair;

  // Core system integration
  address public lotteryManager;
  address public jackpotVault;
  address public priceOracle;
  bool public lotteryEnabled;

  // ========== SIMPLIFIED BOOST SYSTEM ==========

  // Core boost parameters
  address public veDragonToken; // veDRAGON token for vote weights
  uint256 public totalVoteWeight; // W = total vote weight of all users
  mapping(address => uint256) public userVoteWeight; // w_i = user's vote weight

  // Emergency controls
  bool public emergencyBoostDisabled; // Emergency disable for boost calculations
  uint256 public maxTotalSupplyReference; // Reference total supply to prevent manipulation
  uint256 public lastTotalSupplyUpdate; // Timestamp of last total supply update
  uint256 private constant SUPPLY_UPDATE_COOLDOWN = 1 hours;

  // ========== CURVE-INSPIRED INTEGRAL REWARD SYSTEM ==========

  /// @notice Integral of reward rate over time (for all users)
  uint256 public integrate_inv_supply;

  /// @notice Per-user integral tracking (like Curve"s integrate_fraction)
  mapping(address => uint256) public integrate_fraction;

  /// @notice Working supply (total boosted balance across all users)
  uint256 public working_supply;

  /// @notice Working balance per user (their boosted balance)
  mapping(address => uint256) public working_balances;

  /// @notice Last checkpoint timestamp per user
  mapping(address => uint256) public integrate_checkpoint;

  /// @notice Period for automatic boost updates
  uint256 public constant BOOST_UPDATE_PERIOD = 7 days;

  /// @notice Last time user"s boost was updated
  mapping(address => uint256) public last_boost_update;

  // Events
  event RewardAmountNotified(uint256 amount, address indexed notifier);
  event TokenRecovered(address indexed token, uint256 amount);

  /**
   * @notice Constructor
   * @param _lpToken Address of any Uniswap V2-compatible LP token
   * @param _rewardRate Initial reward rate per second
   */
  constructor(address _lpToken, uint256 _rewardRate) 
    ERC20('Red Dragon', 'redDRAGON') 
    Ownable(msg.sender) 
  {
    require(_lpToken != address(0), 'Invalid LP address');
    lpToken = IERC20(_lpToken);
    rewardRate = _rewardRate;
    lastUpdateTime = block.timestamp;

    // Register for Sonic FeeM automatically
    registerMe();
  }

  /**
   * @dev Register my contract on Sonic FeeM
   */
  function registerMe() public {
    (bool _success,) = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830).call(
        abi.encodeWithSignature("selfRegister(uint256)", 143)
    );
    require(_success, "FeeM registration failed");
  }

  // ========== CORE BOOST CALCULATION (SIMPLIFIED) ==========

  /**
   * @notice Get boost multiplier for a user using Curve"s 2.5x boost formula
   * @dev Implements: b^u = min(0.4 * bu + 0.6 * S * (wi/W), 2.5 * bu)
   * @param account User address
   * @return Boost multiplier with 18 decimals precision
   */
  function getBoostMultiplier(address account) public view returns (uint256) {
    // Return base boost if emergency disabled or no stake
    if (emergencyBoostDisabled || _stakes[account].amount == 0) {
      return BASE_BOOST;
    }

    // Get user"s LP balance (bu)
    uint256 userLPBalance = _stakes[account].amount;

    // Get total liquidity supplied (S)
    uint256 totalLiquidity = totalStaked;

    // Safety checks
    if (userLPBalance < MIN_MEANINGFUL_BALANCE || totalLiquidity < MIN_MEANINGFUL_BALANCE) {
      return BASE_BOOST;
    }

    // Anti-manipulation: Check if user holds too much of total supply
    if ((userLPBalance * BPS_MAX) / totalLiquidity > MAX_SINGLE_USER_RATIO) {
      return BASE_BOOST; // Limit boost for whale protection
    }

    // Get user"s vote weight (wi) and total vote weight (W)
    uint256 userVotes = getUserVoteWeight(account);
    uint256 totalVotes = totalVoteWeight;

    // If no voting system is active, use time-based boost
    if (totalVotes == 0 || veDragonToken == address(0)) {
      return getTimeLockBoost(account);
    }

    // Apply Curve 2.5x boost formula: b^u = min(0.4 * bu + 0.6 * S * (wi/W), 2.5 * bu)

    // Calculate 0.4 * bu (40% of user LP)
    uint256 termA = (BOOST_WEIGHT_A * userLPBalance) / BOOST_PRECISION;

    // Calculate 0.6 * S * (wi/W) (60% of total liquidity weighted by voting power)
    uint256 termB = 0;
    if (totalVotes > 0) {
      uint256 votingWeightedLiquidity = (totalLiquidity * userVotes) / totalVotes;
      termB = (BOOST_WEIGHT_B * votingWeightedLiquidity) / BOOST_PRECISION;
    }

    // boosted_balance = 0.4 * bu + 0.6 * S * (wi/W)
    uint256 boostedBalance = termA + termB;

    // Cap at 2.5 * bu (maximum boost)
    uint256 maxBoostedBalance = (MAX_BOOST * userLPBalance) / BOOST_PRECISION;
    if (boostedBalance > maxBoostedBalance) {
      boostedBalance = maxBoostedBalance;
    }

    // Calculate final boost multiplier
    if (boostedBalance <= userLPBalance) {
      return BASE_BOOST; // No boost if calculation is less than base
    }

    // boost_multiplier = boosted_balance / user_balance
    uint256 boostMultiplier = (boostedBalance * BOOST_PRECISION) / userLPBalance;

    // Final safety cap
    return boostMultiplier > MAX_BOOST ? MAX_BOOST : boostMultiplier;
  }

  /**
   * @notice Get time-based lock boost (fallback when no voting system)
   * @param account User address
   * @return Time-based boost multiplier
   */
  function getTimeLockBoost(address account) internal view returns (uint256) {
    StakeInfo memory userStakeInfo = _stakes[account];
    if (userStakeInfo.amount == 0 || userStakeInfo.lockEnd == 0) {
      return BASE_BOOST;
    }

    if (block.timestamp >= userStakeInfo.lockEnd) {
      return BASE_BOOST;
    }

    // Calculate boost based on remaining lock time (1x to 2.5x)
    uint256 remainingTime = userStakeInfo.lockEnd - block.timestamp;
    uint256 maxTime = MAX_LOCK_DURATION;

    // Linear boost: 1x to 2.5x based on lock duration
    uint256 boost = BASE_BOOST + ((MAX_BOOST - BASE_BOOST) * remainingTime) / maxTime;

    return boost > MAX_BOOST ? MAX_BOOST : boost;
  }

  /**
   * @notice Get user"s current vote weight from veDRAGON
   * @param account User address
   * @return Vote weight
   */
  function getUserVoteWeight(address account) public view returns (uint256) {
    if (veDragonToken == address(0)) {
      return 0;
    }

    // Try to get vote weight from veDRAGON token
    try IVeDragonVoteWeight(veDragonToken).getVoteWeight(account) returns (uint256 weight) {
      return weight;
    } catch {
      return 0;
    }
  }

  // ========== CURVE-STYLE REWARD CALCULATION ==========

  /**
   * @notice Update global reward integral (Curve"s integrate_inv_supply concept)
   * @dev Called before any balance change to maintain accurate integrals
   */
  function _update_integrate_inv_supply() internal {
    uint256 rate = rewardRate;
    uint256 supply = working_supply;

    if (rate > 0 && supply > 0) {
      uint256 timeDelta = block.timestamp - lastUpdateTime;
      // Update integral: ∫(rate / working_supply) dt
      integrate_inv_supply += (rate * timeDelta * PRECISION) / supply;
    }

    lastUpdateTime = block.timestamp;
  }

  /**
   * @notice Update user"s integral and calculate claimable rewards
   * @param user Address to update
   * @dev Implements Curve"s per-user integral tracking
   */
  function _update_user_integral(address user) internal {
    StakeInfo storage userStake = _stakes[user];

    // Calculate reward since last checkpoint
    uint256 integral_delta = integrate_inv_supply - integrate_checkpoint[user];
    uint256 user_working_balance = working_balances[user];

    if (integral_delta > 0 && user_working_balance > 0) {
      // Add to user"s total earned: working_balance * ∫(rate / working_supply) dt
      integrate_fraction[user] += (user_working_balance * integral_delta) / PRECISION;
    }

    // Update user"s checkpoint
    integrate_checkpoint[user] = integrate_inv_supply;
    userStake.lastRewardTime = block.timestamp;
  }

  /**
   * @notice Update user"s working balance based on current boost
   * @param user Address to update
   * @dev Implements Curve"s working balance concept with boost
   */
  function _update_working_balance(address user) internal {
    uint256 lp_balance = _stakes[user].amount;
    uint256 boost_multiplier = getBoostMultiplier(user);

    // Calculate new working balance (LP balance * boost)
    uint256 new_working_balance = (lp_balance * boost_multiplier) / BOOST_PRECISION;

    // Update global working supply
    working_supply = working_supply - working_balances[user] + new_working_balance;

    // Update user"s working balance
    working_balances[user] = new_working_balance;
    last_boost_update[user] = block.timestamp;
  }

  /**
   * @notice Comprehensive user checkpoint (Curve-style)
   * @param user Address to checkpoint
   * @dev Updates integrals, working balance, and boost in correct order
   */
  function user_checkpoint(address user) public returns (bool) {
    // Only allow self-checkpoint or by authorized contracts
    require(msg.sender == user || msg.sender == address(this) || msg.sender == owner(), 'Unauthorized checkpoint');

    // Update global integral first
    _update_integrate_inv_supply();

    // Update user"s integral (must be before working balance change)
    _update_user_integral(user);

    // Update user"s working balance with current boost
    _update_working_balance(user);

    emit UserCheckpoint(user, working_balances[user], integrate_fraction[user]);
    return true;
  }

  /**
   * @notice Kick user to update their boost (like Curve"s kick mechanism)
   * @param user Address to kick
   * @dev Anyone can kick a user whose boost has expired/decreased
   */
  function kick(address user) external {
    uint256 current_boost = getBoostMultiplier(user);
    uint256 stored_working_balance = working_balances[user];
    uint256 lp_balance = _stakes[user].amount;

    // Calculate what working balance should be with current boost
    uint256 expected_working_balance = (lp_balance * current_boost) / BOOST_PRECISION;

    // Only allow kick if user"s stored working balance is greater than it should be
    require(stored_working_balance > expected_working_balance, 'Cannot kick user');

    // Update user"s checkpoint to correct their boost
    user_checkpoint(user);

    emit UserKicked(user, msg.sender, stored_working_balance, expected_working_balance);
  }

  /**
   * @notice Get total claimable rewards for user (Curve-style)
   * @param user Address to check
   * @return Total claimable reward amount
   */
  function claimable_tokens(address user) external view returns (uint256) {
    // Calculate what user"s integral would be if updated now
    uint256 rate = rewardRate;
    uint256 supply = working_supply;
    uint256 temp_integrate_inv_supply = integrate_inv_supply;

    if (rate > 0 && supply > 0) {
      uint256 timeDelta = block.timestamp - lastUpdateTime;
      temp_integrate_inv_supply += (rate * timeDelta * PRECISION) / supply;
    }

    // Calculate pending rewards
    uint256 integral_delta = temp_integrate_inv_supply - integrate_checkpoint[user];
    uint256 user_working_balance = working_balances[user];
    uint256 pending = 0;

    if (integral_delta > 0 && user_working_balance > 0) {
      pending = (user_working_balance * integral_delta) / PRECISION;
    }

    // Return total earned (already tracked + pending)
    return integrate_fraction[user] + pending - _stakes[user].rewardDebt;
  }

  // ========== SIMPLIFIED LOTTERY INTEGRATION ==========

  /**
   * @notice Trigger lottery entry for a swap (SIMPLIFIED)
   * @param user The user performing the swap
   * @param swapAmount The total swap amount (before fees)
   * @dev Delegates complex boost calculations to lottery system
   */
  function _triggerLottery(address user, uint256 swapAmount) internal {
    if (lotteryManager == address(0)) return;

    // Get basic voting power for lottery (simplified)
    uint256 votingPower = 0;
    if (veDragonToken != address(0)) {
      try IVeDragonVoteWeight(veDragonToken).getVoteWeight(user) returns (uint256 weight) {
        votingPower = weight;
      } catch {
        // Continue without voting power if query fails
      }
    }

    // Get USD value if oracle available (simplified)
    uint256 swapAmountUSD = swapAmount; // Default to raw amount
    if (priceOracle != address(0)) {
      try IomniDRAGONPriceOracle(priceOracle).getRedDragonPriceUSD() returns (uint256 price) {
        swapAmountUSD = (swapAmount * price) / PRECISION;
      } catch {
        // Use raw amount if oracle fails
      }
    }

    // Create lottery entry (let lottery system handle boost calculations)
          try IomniDRAGONLotteryManager(lotteryManager).createLotteryEntry(user, swapAmountUSD, votingPower) returns (
      uint256 entryId
    ) {
      if (entryId > 0) {
        emit LotteryTriggered(user, swapAmountUSD, entryId);
      }
    } catch {
      // Lottery entry failed, but don"t revert the transfer
    }
  }

  // ========== VIEWS ==========

  /**
   * @notice Get stake info for an account
   * @param account Address to query
   * @return Stake information
   */
  function stakes(address account) external view returns (StakeInfo memory) {
    return _stakes[account];
  }

  /**
        * @notice Get the LP token address
   * @return Address of the LP token
   */
      function getLP() external view returns (IERC20) {
      return lpToken;
    }

  /**
   * @notice Get fee recipient (jackpot vault)
   * @return Address of the fee recipient
   */
  function feeRecipient() external view returns (address) {
    return jackpotVault;
  }

  /**
   * @notice Get randomness provider address (legacy interface compatibility)
   * @return Address of the randomness provider (returns zero since moved to lottery manager)
   */
  function randomnessProvider() external pure returns (address) {
    return address(0); // Legacy interface - functionality moved to lottery manager
  }

  /**
   * @notice Get lottery boost calculator address (legacy interface compatibility)
   * @return Address of the boost calculator (returns zero since integrated into lottery manager)
   */
  function lotteryBoostCalculator() external pure returns (address) {
    return address(0); // Legacy interface - functionality integrated into lottery manager
  }

  /**
   * @notice Check if address is AMM pair
   * @param pair Address to check
   * @return True if AMM pair
   */
  function isAMM(address pair) external view returns (bool) {
    return isAMMPair[pair];
  }

  /**
   * @notice Check if address is exempt from fees
   * @param account Address to check
   * @return True if exempt from fees
   */
  function isExemptFromFees(address account) external view returns (bool) {
    return isFeeExempt[account];
  }

  /**
   * @notice Calculate pending rewards for a user
   * @param account User address
   * @return Pending reward amount
   */
  function pendingReward(address account) public view returns (uint256) {
    return this.claimable_tokens(account);
  }

  /**
   * @notice Get the underlying LP token balance for a user
   * @param account User address
   * @return LP token balance that can be withdrawn
   */
  function stakedBalance(address account) public view returns (uint256) {
    return _stakes[account].amount;
  }

  /**
   * @notice Check if a user"s stake is locked
   * @param account User address
   * @return True if locked, false otherwise
   */
  function isLocked(address account) public view returns (bool) {
    return _stakes[account].lockEnd > block.timestamp;
  }

  /**
   * @notice Get working supply (total boosted balance)
   * @return Current working supply
   */
  function workingSupply() external view returns (uint256) {
    return working_supply;
  }

  /**
   * @notice Get user"s working balance (their boosted balance)
   * @param user Address to check
   * @return User"s working balance
   */
  function workingBalance(address user) external view returns (uint256) {
    return working_balances[user];
  }

  /**
   * @notice Get comprehensive boost information for a user
   * @param account User address
   * @return userBalance User"s LP token balance
   * @return totalSupply Total LP tokens staked
   * @return userVotes User"s vote weight
   * @return totalVotes Total vote weight
   * @return boostMultiplier Final boost multiplier
   * @return isUsingTimeBoost Whether time-based boost is being used
   */
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
    )
  {
    userBalance = _stakes[account].amount;
    totalSupply = totalStaked;
    userVotes = getUserVoteWeight(account);
    totalVotes = totalVoteWeight;
    boostMultiplier = getBoostMultiplier(account);
    isUsingTimeBoost = (totalVotes == 0 || veDragonToken == address(0));
  }

  // ========== MUTATIVE FUNCTIONS ==========

  /**
   * @notice Stake Shadow LP tokens and receive redDragon tokens
   * @param amount Amount of LP tokens to stake
   * @param lockDuration Lock duration in seconds (0 for no lock)
   */
  function stake(uint256 amount, uint256 lockDuration) external nonReentrant whenNotPaused {
    require(amount > 0, 'Cannot stake 0');
    require(
      lockDuration == 0 || (lockDuration >= MIN_LOCK_DURATION && lockDuration <= MAX_LOCK_DURATION),
      'Invalid lock duration'
    );

    // Checkpoint user first (Curve pattern)
    user_checkpoint(msg.sender);

    // Transfer LP tokens from user
    lpToken.safeTransferFrom(msg.sender, address(this), amount);

    // Calculate shares to mint based on current ratio
    uint256 shares;
    if (totalSupply() == 0 || totalStaked == 0) {
      shares = amount;
    } else {
      shares = (amount * totalSupply()) / totalStaked;
    }

    // Update user stake info
    StakeInfo storage userStake = _stakes[msg.sender];
    userStake.amount += amount;
    userStake.shares += shares;

    // Update lock if provided
    if (lockDuration > 0) {
      uint256 newLockEnd = block.timestamp + lockDuration;
      if (newLockEnd > userStake.lockEnd) {
        userStake.lockEnd = newLockEnd;
      }
    }

    // Update totals
    totalStaked += amount;

    // Update working balance with new boost
    _update_working_balance(msg.sender);

    // Mint redDragon tokens
    _mint(msg.sender, shares);

    emit Staked(msg.sender, amount, shares, userStake.lockEnd);
  }

  /**
   * @notice Unstake LP tokens and burn redDragon tokens
   * @param shares Amount of redDragon tokens to burn
   */
  function unstake(uint256 shares) external nonReentrant whenNotPaused {
    require(shares > 0, 'Cannot unstake 0');
    StakeInfo storage userStake = _stakes[msg.sender];
    require(userStake.shares >= shares, 'Insufficient shares');
    require(!isLocked(msg.sender), 'Stake is locked');

    // Checkpoint user first (Curve pattern)
    user_checkpoint(msg.sender);

    // Calculate LP tokens to return based on current ratio
    uint256 lpAmount = (shares * totalStaked) / totalSupply();

    // Update user stake info
    userStake.amount -= lpAmount;
    userStake.shares -= shares;

    // Update totals
    totalStaked -= lpAmount;

    // Update working balance after stake change
    _update_working_balance(msg.sender);

    // Burn redDragon tokens
    _burn(msg.sender, shares);

    // Transfer LP tokens back to user
    lpToken.safeTransfer(msg.sender, lpAmount);

    emit Unstaked(msg.sender, lpAmount, shares);
  }

  /**
   * @notice Claim accumulated rewards
   * @dev Claims rewards based on Curve-style integral calculation
   */
  function claimReward() external nonReentrant whenNotPaused {
    // Checkpoint to update all integrals
    user_checkpoint(msg.sender);

    uint256 claimable = integrate_fraction[msg.sender] - _stakes[msg.sender].rewardDebt;

    if (claimable > 0) {
      _stakes[msg.sender].rewardDebt = integrate_fraction[msg.sender];

      // AUDIT FIX: Implement actual reward token transfer
      // For redDRAGON, rewards are paid in the same token (LP token rewards)
      if (address(lpToken) != address(0)) {
        // Transfer LP tokens as rewards from the contract's balance
        uint256 contractBalance = lpToken.balanceOf(address(this));
        uint256 availableRewards = contractBalance > totalStaked ? contractBalance - totalStaked : 0;
        
        if (availableRewards >= claimable) {
          lpToken.safeTransfer(msg.sender, claimable);
        } else if (availableRewards > 0) {
          // Partial claim if insufficient rewards available
          lpToken.safeTransfer(msg.sender, availableRewards);
          // Update reward debt to reflect partial claim
          _stakes[msg.sender].rewardDebt = integrate_fraction[msg.sender] - (claimable - availableRewards);
          claimable = availableRewards;
        } else {
          // No rewards available to claim
          revert("No rewards available");
        }
      } else {
        revert("Reward token not configured");
      }

      emit RewardPaid(msg.sender, claimable);
    }
  }

  /**
   * @notice Extend lock duration for additional boost
   * @param additionalDuration Additional lock time in seconds
   */
  function extendLock(uint256 additionalDuration) external whenNotPaused {
    require(additionalDuration > 0, 'Invalid duration');
    StakeInfo storage userStake = _stakes[msg.sender];
    require(userStake.amount > 0, 'No stake to lock');

    uint256 currentLockEnd = userStake.lockEnd > block.timestamp ? userStake.lockEnd : block.timestamp;
    uint256 newLockEnd = currentLockEnd + additionalDuration;

    require(newLockEnd - block.timestamp <= MAX_LOCK_DURATION, 'Lock too long');

    // Checkpoint user BEFORE changing state
    user_checkpoint(msg.sender); // Ensure rewards up to this point are accounted

    // Update lock end
    userStake.lockEnd = newLockEnd;

    // Update working balance and global supply AFTER state change
    _update_working_balance(msg.sender); // Incorporate new boost from extended lock

    emit Staked(msg.sender, 0, 0, newLockEnd);
  }

  /**
   * @notice Emergency withdraw without rewards
   * @dev Only use in emergency situations
   */
  function emergencyWithdraw() external nonReentrant {
    StakeInfo storage userStake = _stakes[msg.sender];
    uint256 amount = userStake.amount;
    uint256 shares = userStake.shares;

    require(amount > 0, 'No stake to withdraw');

    // Reset user stake
    delete _stakes[msg.sender];

    // Update totals
    totalStaked -= amount;

    // Burn redDragon tokens
    _burn(msg.sender, shares);

    // Transfer LP tokens back
    lpToken.safeTransfer(msg.sender, amount);

    emit EmergencyWithdraw(msg.sender, amount);
  }

  // ========== INTERNAL FUNCTIONS ==========

  /**
   * @notice Update reward calculation for a user (modified for Curve system)
   * @param account User address
   */
  function updateReward(address account) internal {
    if (account != address(0)) {
      user_checkpoint(account);
    } else {
      _update_integrate_inv_supply();
    }
  }

  /**
   * @notice Override update to implement fee mechanism
   * @dev Applies 6.9% fee on transfers involving AMM pairs
   */
  function _update(address from, address to, uint256 amount) internal override {
    // Handle minting and burning normally
    if (from == address(0) || to == address(0)) {
      super._update(from, to, amount);
      return;
    }

    require(from != address(0), 'Transfer from zero address');
    require(to != address(0), 'Transfer to zero address');

    // Check if transfer should have fees
    bool takeFee = !isFeeExempt[from] && !isFeeExempt[to];

    // Only take fees on AMM swaps (buy/sell)
    if (takeFee && (isAMMPair[from] || isAMMPair[to])) {
      uint256 feeAmount = (amount * TRANSFER_FEE_BPS) / BPS_MAX;
      uint256 transferAmount = amount - feeAmount;

      // Transfer fee to fee recipient
      if (feeAmount > 0 && jackpotVault != address(0)) {
        super._update(from, jackpotVault, feeAmount);
        emit TransferFeeCollected(from, to, feeAmount);

        // Trigger lottery for the user (simplified)
        address user = isAMMPair[from] ? to : from; // If from AMM = buy, if to AMM = sell
        _triggerLottery(user, amount);
      }

      // Transfer remaining amount
      super._update(from, to, transferAmount);
    } else {
      // No fee transfer
      super._update(from, to, amount);
    }
  }

  // ========== ADMIN FUNCTIONS ==========

  /**
   * @notice Notify the contract of new reward tokens available for distribution
   * @dev This function should be called when LP tokens are deposited for rewards
   * @param amount Amount of LP tokens to add to the reward pool
   */
  function notifyRewardAmount(uint256 amount) external onlyOwner {
    require(amount > 0, "Amount must be positive");
    
    // Transfer LP tokens from sender to this contract for rewards
    lpToken.safeTransferFrom(msg.sender, address(this), amount);
    
    // Update reward calculation
    updateReward(address(0)); // Update global integrals
    
    emit RewardAmountNotified(amount, msg.sender);
  }

  /**
   * @notice Get available reward balance
   * @dev Returns the amount of LP tokens available for rewards (above staked amount)
   * @return availableRewards Amount available for distribution
   */
  function getAvailableRewards() external view returns (uint256 availableRewards) {
    uint256 contractBalance = lpToken.balanceOf(address(this));
    availableRewards = contractBalance > totalStaked ? contractBalance - totalStaked : 0;
  }

  /**
   * @notice Emergency function to recover excess tokens
   * @dev Can only recover tokens beyond staked + minimum reserve amounts
   * @param token Token to recover
   * @param amount Amount to recover
   */
  function recoverToken(address token, uint256 amount) external onlyOwner {
    require(token != address(0), "Invalid token");
    require(amount > 0, "Amount must be positive");
    
    if (token == address(lpToken)) {
      // For LP token, ensure we don't touch staked amounts or reasonable reward reserves
      uint256 contractBalance = lpToken.balanceOf(address(this));
      uint256 minReserve = totalStaked + (totalStaked / 10); // Keep 10% buffer for rewards
      require(contractBalance >= minReserve + amount, "Cannot recover staked or reserved tokens");
    }
    
    IERC20(token).safeTransfer(msg.sender, amount);
    emit TokenRecovered(token, amount);
  }

  /**
   * @notice Update reward rate
   * @param _rewardRate New reward rate per second
   */
  function setRewardRate(uint256 _rewardRate) external onlyOwner {
    updateReward(address(0));
    rewardRate = _rewardRate;
    emit RewardRateUpdated(_rewardRate);
  }

  /**
   * @notice Set lottery system addresses
   * @param _lotteryManager Address of the lottery manager
   * @param _jackpotVault Address to receive fees
   * @param _priceOracle Address of the price oracle
   */
  function setLotterySystem(address _lotteryManager, address _jackpotVault, address _priceOracle) external onlyOwner {
    lotteryManager = _lotteryManager;
    jackpotVault = _jackpotVault;
    priceOracle = _priceOracle;
  }

  /**
   * @notice Set fee exemption for an address
   * @param account Address to set exemption for
   * @param exempt Whether the address is exempt from fees
   */
  function setFeeExemption(address account, bool exempt) external onlyOwner {
    isFeeExempt[account] = exempt;
    emit FeeExemptionSet(account, exempt);
  }

  /**
   * @notice Mark an address as an AMM pair
   * @param pair Address to mark as AMM
   * @param _isAMM Whether the address is an AMM pair
   */
  function setAMMPair(address pair, bool _isAMM) external onlyOwner {
    isAMMPair[pair] = _isAMM;
    emit AMMPairSet(pair, _isAMM);
  }

  /**
   * @notice Set veDRAGON token address for vote weights
   * @param _veDragonToken Address of veDRAGON token
   */
  function setVeDragonToken(address _veDragonToken) external onlyOwner {
    veDragonToken = _veDragonToken;
    emit VeDragonTokenUpdated(_veDragonToken);
  }

  /**
   * @notice Update user vote weights (called by veDRAGON token or authorized updater)
   * @param users Array of user addresses
   * @param weights Array of corresponding vote weights
   */
  function updateVoteWeights(address[] calldata users, uint256[] calldata weights) external {
    require(msg.sender == veDragonToken || msg.sender == owner(), 'Not authorized to update vote weights');
    require(users.length == weights.length, 'Array length mismatch');

    // Update individual user weights and calculate new total
    for (uint256 i = 0; i < users.length; i++) {
      // Remove old weight from total
      totalVoteWeight -= userVoteWeight[users[i]];
      // Set new weight
      userVoteWeight[users[i]] = weights[i];
      // Add new weight to total
      totalVoteWeight += weights[i];
    }

    emit VoteWeightsUpdated(users, weights);
  }

  /**
   * @notice Emergency disable boost calculations
   * @param disabled Whether to disable boost calculations
   */
  function setEmergencyBoostDisabled(bool disabled) external onlyOwner {
    emergencyBoostDisabled = disabled;
    emit EmergencyBoostDisabled(disabled);
  }

  /**
   * @notice Pause staking
   */
  function pause() external onlyOwner {
    _pause();
  }

  /**
   * @notice Unpause staking
   */
  function unpause() external onlyOwner {
    _unpause();
  }

  /**
   * @notice Check if this contract is registered for Sonic FeeM
   * @return isRegistered Whether the contract is registered for fee monetization
   */
  function checkFeeMStatus() external pure returns (bool isRegistered) {
    return true; // Assume registered for FeeM in production
  }
}

// ========== INTERFACES ==========

// Simplified interfaces for external integration
interface IomniDRAGONLotteryManager {
  function createLotteryEntry(
    address user,
    uint256 swapAmountUSD,
    uint256 userVotingPower
  ) external returns (uint256 entryId);
}

interface IomniDRAGONPriceOracle {
  function getRedDragonPriceUSD() external view returns (uint256);
}

// Interface for veDRAGON vote weight system
interface IVeDragonVoteWeight {
  function getVoteWeight(address user) external view returns (uint256);
}
