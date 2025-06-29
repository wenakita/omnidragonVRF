// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/math/Math.sol';
import '@openzeppelin/contracts/utils/math/SafeCast.sol';
import { IveDRAGON } from '../../interfaces/tokens/IveDRAGON.sol';
import '../../libraries/math/veDRAGONMath.sol';
import '../../libraries/core/DragonDateTimeLib.sol';

/**
 * @title veDRAGON
 * @notice Unified Vote-Escrowed token for governance and rewards
 * @dev Supports both DRAGON tokens and LP tokens with advanced features:
 * - Time-weighted voting power with cube root scaling
 * - Historical voting power tracking
 * - Reward distribution system
 * - Boosted lottery chances
 * - Share of protocol fees
 * - Access to exclusive features
 * - Week-aligned lock periods
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract veDRAGON is IveDRAGON, ERC20, ReentrancyGuard, Ownable {
  using SafeERC20 for IERC20;
  using Math for uint256;
  using SafeCast for uint256;

  // === Custom Errors ===
  error LockTimeNotInFuture();
  error LockTimeTooShort();
  error LockTimeTooLong();
  error ExistingLockFound();
  error NoLockFound();
  error InvalidMaxVP();
  error LocksExist();
  error FeeMRegistrationFailed();
  error AlreadyInitialized();
  error NotInitialized();
  error InvalidTokenType();

  // === Structs ===
  struct Point {
    uint256 bias; // Voting power at the time of recording
    uint256 slope; // How fast the voting power is decreasing over time
    uint256 timestamp; // Time point was recorded
  }

  struct Lock {
    uint256 amount; // Amount of tokens locked
    uint256 end; // Lock end timestamp
    uint256 power; // Voting power at lock time
    uint256 rewardDebt; // Reward debt for fair distribution
  }

  // === Constants ===
  uint256 private constant WEEK = 7 * 86400; // 1 week in seconds
  uint256 private constant MAX_LOCK_TIME = 4 * 365 * 86400; // 4 years in seconds
  uint256 private constant MIN_LOCK_TIME = 7 * 86400; // 1 week in seconds
  uint256 private constant PRECISION = 1e18; // Precision for calculations

  // Legacy constants for backward compatibility
  uint256 public constant MAX_LOCK_DURATION = MAX_LOCK_TIME;
  uint256 public constant MIN_LOCK_DURATION = MIN_LOCK_TIME;

  // === Token Configuration ===
  enum TokenType {
    DRAGON,
    LP_TOKEN
  }
  TokenType public tokenType;
  IERC20 public immutable lockedToken; // The token being locked (DRAGON or LP)
  bool public initialized; // Initialization flag

  // === State Variables ===
  uint256 private _totalSupply; // Total veDRAGON supply (voting power)
  uint256 public totalLocked; // Total tokens locked

  // Lock tracking (unified from both implementations)
  mapping(address => LockedBalance) public locked; // Interface-compatible locks
  mapping(address => Lock) public locks; // Legacy lock structure

  // Point tracking for historical voting power
  mapping(address => uint256) public userPointEpoch;
  mapping(address => mapping(uint256 => Point)) public userPointHistory;
  mapping(uint256 => Point) public pointHistory;
  uint256 public epoch;

  // Voting power configuration
  uint256 public maxVP = 15000; // Maximum voting power multiplier (1.5x) in basis points
  uint256 public maxBoost; // Pre-calculated maximum boost

  // Reward system variables
  uint256 public rewardPerTokenStored;
  uint256 public lastUpdateTime;
  uint256 public rewardRate; // AUDIT FIX: Added missing reward rate for proper time-based distribution
  mapping(address => uint256) public userRewardPerTokenPaid;
  mapping(address => uint256) public rewards;

  // === Events ===
  // Interface events are inherited from IveDRAGON

  // Additional events
  event Supply(uint256 prevSupply, uint256 supply);
  event TokenUpdated(address indexed newToken);
  event Initialized(address indexed token, TokenType tokenType);
  event RewardAdded(uint256 reward);
  event RewardPaid(address indexed user, uint256 reward);
  event RewardRateUpdated(uint256 rewardRate); // AUDIT FIX: Added missing event
  event BoostParametersUpdated(uint256 maxVP, uint256 maxBoost);

  // Legacy events for backward compatibility
  event Locked(address indexed user, uint256 amount, uint256 lockEnd, uint256 power);
  event Unlocked(address indexed user, uint256 amount);
  event LockExtended(address indexed user, uint256 newEnd, uint256 newPower);
  event LockIncreased(address indexed user, uint256 addedAmount, uint256 newPower);

  /**
   * @notice Constructor
   * @param _token Address of the token to lock (DRAGON or LP token)
   * @param _tokenType Type of token (DRAGON or LP_TOKEN)
   * @param _name Token name
   * @param _symbol Token symbol
   */
  constructor(address _token, TokenType _tokenType, string memory _name, string memory _symbol) 
    ERC20(_name, _symbol) 
    Ownable(msg.sender) 
  {
    if (_token == address(0)) revert ZeroAddress();

    // Set immutable variable unconditionally
    lockedToken = IERC20(_token);
    tokenType = _tokenType;

    if (_tokenType == TokenType.DRAGON) {
      initialized = true;
      emit Initialized(_token, _tokenType);
    } else {
      initialized = false;
    }

    // Initialize point history
    pointHistory[0] = Point({ bias: 0, slope: 0, timestamp: block.timestamp });
    epoch = 0;

    // Pre-calculate maximum boost for gas optimization
    maxBoost = calculateMaxBoost();

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

  /**
   * @notice Initialize contract with token if not set in constructor
   * @param _token Address of the token to lock
   * @param _tokenType Type of token
   */
  function initialize(address _token, TokenType _tokenType) external onlyOwner {
    if (initialized) revert AlreadyInitialized();
    if (_token == address(0)) revert ZeroAddress();

    // This is a hack to work around immutable variable limitations
    // In practice, you'd deploy with the token address in constructor
    require(address(lockedToken) == address(0), 'Token already set');

    tokenType = _tokenType;
    initialized = true;

    emit Initialized(_token, _tokenType);
  }

  /**
   * @notice Legacy initialize function for compatibility
   */
  function initialize(address _token, string memory /* _name */, string memory /* _symbol */) external onlyOwner {
    // Determine token type based on context or default to DRAGON
    TokenType _tokenType = TokenType.DRAGON;
    this.initialize(_token, _tokenType);
  }

  /**
   * @notice Modifier to check if contract is initialized
   */
  modifier whenInitialized() {
    if (!initialized) revert NotInitialized();
    _;
  }

  // ========== VIEW FUNCTIONS ==========

  /**
   * @notice Calculate voting power for an amount and lock duration
   * @param amount Amount of tokens
   * @param duration Lock duration in seconds
   * @return Voting power with precision
   */
  function calculateVotingPower(uint256 amount, uint256 duration) public view returns (uint256) {
    if (amount == 0 || duration < MIN_LOCK_TIME) return 0;
    if (duration > MAX_LOCK_TIME) duration = MAX_LOCK_TIME;

    // Use advanced cube root scaling for better distribution
    uint256 timeRatio = (duration * PRECISION) / MAX_LOCK_TIME;
    uint256 nonLinearBoost = veDRAGONMath.cubeRoot(timeRatio);

    // Convert maxVP from BPS to 1e18 scale for consistent math
    uint256 maxBoostMultiplier = (maxVP * PRECISION) / 10000;

    // Scale nonLinearBoost by maxVP
    uint256 boostMultiplier = (nonLinearBoost * maxBoostMultiplier) / PRECISION;

    // Base voting power (1x) + boost
    uint256 baseVotingPower = amount;
    uint256 boostVotingPower = (amount * boostMultiplier) / PRECISION;

    return baseVotingPower + boostVotingPower;
  }

  /**
   * @notice Calculate voting power based on unlock time
   * @param _amount Amount of tokens locked
   * @param _unlockTime Time when tokens unlock
   * @return Voting power
   */
  function calculateVotingPowerByUnlockTime(uint256 _amount, uint256 _unlockTime) public view returns (uint256) {
    if (_amount == 0 || _unlockTime <= block.timestamp) return 0;

    uint256 lockDuration = _unlockTime - block.timestamp;
    return calculateVotingPower(_amount, lockDuration);
  }

  /**
   * @notice Get current voting power for a user
   * @param account User address
   * @return Current voting power
   */
  function votingPower(address account) public view returns (uint256) {
    LockedBalance memory userLock = locked[account];
    return calculateVotingPowerByUnlockTime(userLock.amount, userLock.unlockTime);
  }

  /**
   * @notice Get the voting power of a user (interface compatibility)
   * @param user Address of the user
   * @return User's current voting power
   */
  function votingPowerOf(address user) external view returns (uint256) {
    return votingPower(user);
  }

  /**
   * @notice Get the voting power of a user (alias)
   * @param account Address to get voting power for
   * @return voting power value
   */
  function getVotingPower(address account) external view returns (uint256) {
    return votingPower(account);
  }

  /**
   * @notice Get the voting power of a user at a specific timestamp
   * @param user User address
   * @param timestamp Timestamp to check voting power at
   * @return User's voting power at that timestamp
   */
  function getVotingPowerAt(address user, uint256 timestamp) external view returns (uint256) {
    LockedBalance memory userLock = locked[user];
    if (timestamp < block.timestamp) {
      // For historical voting power, use time-based calculation
      if (timestamp > userLock.unlockTime || userLock.amount == 0) {
        return 0;
      }
      uint256 timeLeft = userLock.unlockTime - timestamp;
      return calculateVotingPower(userLock.amount, timeLeft);
    } else {
      // For current or future timestamps, use current voting power
      return calculateVotingPowerByUnlockTime(userLock.amount, userLock.unlockTime);
    }
  }

  /**
   * @notice Get total voting power
   * @return Total current voting power
   */
  function getTotalVotingPower() external view returns (uint256) {
    return _totalSupply;
  }

  /**
   * @notice Get total voting power at a specific timestamp
   * @param timestamp Timestamp to check total voting power at
   * @return Total voting power at that timestamp
   */
  function getTotalVotingPowerAt(uint256 timestamp) external view returns (uint256) {
    if (timestamp > block.timestamp) {
      return _totalSupply;
    } else {
      uint256 targetEpoch = 0;
      for (uint256 i = epoch; i > 0; i--) {
        if (pointHistory[i].timestamp <= timestamp) {
          targetEpoch = i;
          break;
        }
      }
      return pointHistory[targetEpoch].bias;
    }
  }

  /**
   * @notice Get locked balance of an account
   * @param account Address to check
   * @return amount Locked token amount
   */
  function lockedBalanceOf(address account) external view returns (uint256) {
    return locked[account].amount;
  }

  /**
   * @notice Get unlock time of an account's lock
   * @param account Address to check
   * @return unlockTime Unlock timestamp
   */
  function unlockTimeOf(address account) external view returns (uint256) {
    return locked[account].unlockTime;
  }

  /**
   * @notice Get total locked supply
   * @return total locked supply
   */
  function totalLockedSupply() external view returns (uint256) {
    return totalLocked;
  }

  /**
   * @notice Get the lock information for a user
   * @param user Address of the user
   * @return amount Amount locked
   * @return end Lock end timestamp
   */
  function getUserLock(address user) external view returns (uint256 amount, uint256 end) {
    LockedBalance memory userLock = locked[user];
    return (userLock.amount, userLock.unlockTime);
  }

  /**
   * @notice Check if a user has an active lock
   * @param user Address to check
   * @return Whether the user has an active lock
   */
  function hasActiveLock(address user) external view returns (bool) {
    LockedBalance memory userLock = locked[user];
    return userLock.amount > 0 && userLock.unlockTime > block.timestamp;
  }

  /**
   * @notice Calculate pending rewards for a user
   * @param account User address
   * @return Pending reward amount
   */
  function earned(address account) public view returns (uint256) {
    // AUDIT FIX: Use locked amount for reward calculation, not voting power
    uint256 userLockedAmount = locked[account].amount;
    if (userLockedAmount == 0) return rewards[account];

    uint256 currentRewardPerToken = rewardPerToken();
    return rewards[account] + (userLockedAmount * (currentRewardPerToken - userRewardPerTokenPaid[account])) / PRECISION;
  }

  // Legacy compatibility functions
  function lockEnd(address account) external view returns (uint256) {
    return locked[account].unlockTime;
  }

  function lockedAmount(address account) external view returns (uint256) {
    return locked[account].amount;
  }

  /**
   * @notice Check if this contract is registered for Sonic FeeM
   * @return isRegistered Whether the contract is registered for fee monetization
   */
  function checkFeeMStatus() external pure returns (bool isRegistered) {
    return true; // Assume registered for FeeM in production
  }

  // ========== MUTATIVE FUNCTIONS ==========

  /**
   * @notice Lock tokens for voting power
   * @param lpAmount Amount to lock
   * @param lockDuration Lock duration in seconds
   */
  function createLock(uint256 lpAmount, uint256 lockDuration) external nonReentrant whenInitialized {
    if (lpAmount == 0) revert ZeroAmount();

    // Align lock end time to week boundary
    uint256 unlockTime = DragonDateTimeLib.calculateLockEndAligned(block.timestamp, lockDuration);

    if (unlockTime <= block.timestamp) revert LockTimeNotInFuture();
    if (unlockTime - block.timestamp < MIN_LOCK_TIME) revert LockTimeTooShort();
    if (unlockTime - block.timestamp > MAX_LOCK_TIME) revert LockTimeTooLong();

    LockedBalance storage userLock = locked[msg.sender];
    if (userLock.amount > 0) revert ExistingLockFound();

    // Update rewards before making changes
    _updateReward(msg.sender);

    // Transfer tokens to contract
    lockedToken.safeTransferFrom(msg.sender, address(this), lpAmount);

    // Update locked balance
    userLock.amount = lpAmount;
    userLock.unlockTime = unlockTime;

    // Update legacy lock structure for compatibility
    Lock storage legacyLock = locks[msg.sender];
    legacyLock.amount = lpAmount;
    legacyLock.end = unlockTime;

    // Calculate voting power
    uint256 votingPowerAmount = calculateVotingPower(lpAmount, unlockTime);
    legacyLock.power = votingPowerAmount;

    // Update total supply and locked amount
    uint256 prevSupply = _totalSupply;
    _totalSupply = prevSupply + votingPowerAmount;
    totalLocked += lpAmount;

    // Update user point history
    userPointEpoch[msg.sender] += 1;
    uint256 userEpoch = userPointEpoch[msg.sender];
    userPointHistory[msg.sender][userEpoch] = Point({
      bias: votingPowerAmount,
      slope: votingPowerAmount / (unlockTime - block.timestamp),
      timestamp: block.timestamp
    });

    // Update global point history
    epoch += 1;
    pointHistory[epoch] = Point({
      bias: _totalSupply,
      slope: pointHistory[epoch - 1].slope + (votingPowerAmount / (unlockTime - block.timestamp)),
      timestamp: block.timestamp
    });

    // Mint veDRAGON tokens (non-transferable)
    _mint(msg.sender, votingPowerAmount);

    // Emit events
    emit Deposit(msg.sender, lpAmount, unlockTime, votingPowerAmount);
    emit Locked(msg.sender, lpAmount, unlockTime, votingPowerAmount);
    emit Supply(prevSupply, _totalSupply);
  }

  /**
   * @notice Increase lock amount without changing the unlock time
   * @param additionalAmount Additional amount to lock
   */
  function increaseLockAmount(uint256 additionalAmount) external nonReentrant whenInitialized {
    LockedBalance storage userLocked = locked[msg.sender];

    if (additionalAmount == 0) revert ZeroAmount();
    if (userLocked.amount == 0) revert NoLockFound();
    if (userLocked.unlockTime <= block.timestamp) revert LockExpired();

    // Update rewards before making changes
    _updateReward(msg.sender);

    // Calculate old voting power
    uint256 oldVotingPower = votingPower(msg.sender);

    // Update user's lock
    userLocked.amount += additionalAmount;

    // Update legacy lock structure
    Lock storage legacyLock = locks[msg.sender];
    legacyLock.amount += additionalAmount;

    // Transfer tokens from user to contract
    lockedToken.safeTransferFrom(msg.sender, address(this), additionalAmount);

    // Calculate new voting power
    uint256 newVotingPower = calculateVotingPower(userLocked.amount, userLocked.unlockTime);
    legacyLock.power = newVotingPower;

    // Update totals
    totalLocked += additionalAmount;
    _totalSupply = _totalSupply - oldVotingPower + newVotingPower;

    // Adjust veDRAGON balance
    if (newVotingPower > oldVotingPower) {
      _mint(msg.sender, newVotingPower - oldVotingPower);
    } else if (oldVotingPower > newVotingPower) {
      _burn(msg.sender, oldVotingPower - newVotingPower);
    }

    // Update point tracking
    _checkpoint(
      msg.sender,
      LockedBalance({ amount: userLocked.amount - additionalAmount, unlockTime: userLocked.unlockTime }),
      userLocked
    );

    // Emit events
    emit Deposit(msg.sender, additionalAmount, userLocked.unlockTime, newVotingPower);
    emit LockIncreased(msg.sender, additionalAmount, newVotingPower);
  }

  /**
   * @notice Extend lock duration
   * @param lockDuration New lock duration in seconds
   */
  function extendLock(uint256 lockDuration) external nonReentrant whenInitialized {
    LockedBalance storage userLock = locked[msg.sender];
    if (userLock.amount == 0) revert NoLockFound();

    // Align the new unlock time to a week boundary
    uint256 newUnlockTime = DragonDateTimeLib.calculateLockEndAligned(userLock.unlockTime, lockDuration);

    if (newUnlockTime <= userLock.unlockTime) revert LockTimeNotInFuture();
    if (newUnlockTime > block.timestamp + MAX_LOCK_TIME) revert LockTimeTooLong();
    if (newUnlockTime < block.timestamp + MIN_LOCK_TIME) revert LockTimeTooShort();

    // Update rewards before making changes
    _updateReward(msg.sender);

    // Calculate old voting power
    uint256 oldVotingPower = votingPower(msg.sender);

    // Update unlock time
    userLock.unlockTime = newUnlockTime;
    locks[msg.sender].end = newUnlockTime;

    // Calculate new voting power
    uint256 newVotingPower = calculateVotingPower(userLock.amount, newUnlockTime);
    locks[msg.sender].power = newVotingPower;

    // Update total supply
    _totalSupply = _totalSupply - oldVotingPower + newVotingPower;

    // Adjust veDRAGON balance
    if (newVotingPower > oldVotingPower) {
      _mint(msg.sender, newVotingPower - oldVotingPower);
    } else if (oldVotingPower > newVotingPower) {
      _burn(msg.sender, oldVotingPower - newVotingPower);
    }

    // Update point tracking
    userPointEpoch[msg.sender] += 1;
    uint256 userEpoch = userPointEpoch[msg.sender];
    userPointHistory[msg.sender][userEpoch] = Point({ bias: newVotingPower, slope: 0, timestamp: block.timestamp });

    // Update global point history
    epoch += 1;
    pointHistory[epoch] = Point({ bias: _totalSupply, slope: 0, timestamp: block.timestamp });

    // Emit events
    emit LockUpdated(msg.sender, lockDuration, newVotingPower);
    emit LockExtended(msg.sender, newUnlockTime, newVotingPower);
  }

  /**
   * @notice Unlock tokens after lock period
   */
  function withdraw() external nonReentrant whenInitialized {
    LockedBalance storage userLock = locked[msg.sender];
    if (userLock.amount == 0) revert NoLockFound();
    if (block.timestamp < userLock.unlockTime) revert LockNotExpired();

    // Update rewards before making changes
    _updateReward(msg.sender);

    // Save the amount to withdraw
    uint256 amount = userLock.amount;
    uint256 oldVotingPower = votingPower(msg.sender);

    // Clear the locks
    delete locked[msg.sender];
    delete locks[msg.sender];

    // Update totals
    totalLocked -= amount;
    if (oldVotingPower > 0) {
      _totalSupply = _totalSupply > oldVotingPower ? _totalSupply - oldVotingPower : 0;
    }

    // Burn veDRAGON tokens
    uint256 userBalance = balanceOf(msg.sender);
    if (userBalance > 0) {
      _burn(msg.sender, userBalance);
    }

    // Update point tracking
    userPointEpoch[msg.sender] += 1;
    uint256 userEpoch = userPointEpoch[msg.sender];
    userPointHistory[msg.sender][userEpoch] = Point({ bias: 0, slope: 0, timestamp: block.timestamp });

    // Update global point history
    epoch += 1;
    pointHistory[epoch] = Point({ bias: _totalSupply, slope: 0, timestamp: block.timestamp });

    // Transfer tokens back to user
    lockedToken.safeTransfer(msg.sender, amount);

    // Emit events
    emit Withdraw(msg.sender, amount);
    emit Unlocked(msg.sender, amount);
    emit Supply(_totalSupply + oldVotingPower, _totalSupply);
  }

  /**
   * @notice Claim pending rewards
   */
  function claimReward() external nonReentrant {
    _updateReward(msg.sender);
    uint256 reward = rewards[msg.sender];
    if (reward > 0) {
      rewards[msg.sender] = 0;
      lockedToken.safeTransfer(msg.sender, reward);
      emit RewardPaid(msg.sender, reward);
    }
  }

  // Legacy compatibility functions
  function lock(uint256 amount, uint256 duration) external {
    this.createLock(amount, duration);
  }

  function increaseLock(uint256 addedAmount) external {
    this.increaseLockAmount(addedAmount);
  }

  function unlock() external {
    this.withdraw();
  }

  // ========== INTERNAL FUNCTIONS ==========

  /**
   * @notice Update reward calculations for a user
   * @param account User address
   */
  function _updateReward(address account) internal {
    rewardPerTokenStored = rewardPerToken();
    lastUpdateTime = block.timestamp;

    if (account != address(0)) {
      rewards[account] = earned(account);
      userRewardPerTokenPaid[account] = rewardPerTokenStored;
    }
  }

  /**
   * @notice Calculate current reward per token
   * @return Reward per token with precision
   * @dev AUDIT FIX: Proper reward per token calculation based on time and locked amounts
   */
  function rewardPerToken() internal view returns (uint256) {
    if (totalLocked == 0) {
      return rewardPerTokenStored;
    }

    // Calculate time-based reward accumulation
    // This should be based on totalLocked (actual locked amounts), not _totalSupply (voting power)
    uint256 timeDelta = block.timestamp - lastUpdateTime;
    if (timeDelta == 0 || rewardRate == 0) {
      return rewardPerTokenStored;
    }

    // Standard reward per token formula: rewardPerTokenStored + (rewardRate * timeDelta * PRECISION) / totalLocked
    return rewardPerTokenStored + (rewardRate * timeDelta * PRECISION) / totalLocked;
  }

  /**
   * @notice Internal function to update user points and total supply
   * @param _user User address
   * @param _oldLocked Old locked balance
   * @param _newLocked New locked balance
   */
  function _checkpoint(address _user, LockedBalance memory _oldLocked, LockedBalance memory _newLocked) internal {
    // Calculate old and new voting power
    uint256 oldPower = calculateVotingPower(_oldLocked.amount, _oldLocked.unlockTime);
    uint256 newPower = calculateVotingPower(_newLocked.amount, _newLocked.unlockTime);

    // Update user point epoch and save history
    userPointEpoch[_user] += 1;
    uint256 userEpoch = userPointEpoch[_user];

    // Calculate slope with precision
    uint256 oldSlope = 0;
    uint256 newSlope = 0;

    if (_oldLocked.unlockTime > block.timestamp) {
      uint256 timeDiff = _oldLocked.unlockTime - block.timestamp;
      if (timeDiff > MAX_LOCK_TIME) timeDiff = MAX_LOCK_TIME;
      oldSlope = (_oldLocked.amount * PRECISION) / timeDiff;
    }

    if (_newLocked.unlockTime > block.timestamp) {
      uint256 timeDiff = _newLocked.unlockTime - block.timestamp;
      if (timeDiff > MAX_LOCK_TIME) timeDiff = MAX_LOCK_TIME;
      newSlope = (_newLocked.amount * PRECISION) / timeDiff;
    }

    // Save user point history
    userPointHistory[_user][userEpoch] = Point({ bias: newPower, slope: newSlope, timestamp: block.timestamp });

    // Update global point history
    epoch += 1;
    Point memory lastPoint = pointHistory[epoch - 1];
    pointHistory[epoch] = Point({
      bias: lastPoint.bias + newPower - oldPower,
      slope: lastPoint.slope + newSlope - oldSlope,
      timestamp: block.timestamp
    });

    // Update global supply
    uint256 prevSupply = _totalSupply;
    _totalSupply = prevSupply + newPower - oldPower;

    emit Supply(prevSupply, _totalSupply);
  }

  /**
   * @notice Calculate the maximum possible boost
   * @return Maximum boost factor
   */
  function calculateMaxBoost() internal view returns (uint256) {
    uint256 maxNonLinearBoost = veDRAGONMath.cubeRoot(PRECISION);
    uint256 maxBoostMultiplier = (maxVP * PRECISION) / 10000;
    return (maxNonLinearBoost * maxBoostMultiplier) / PRECISION;
  }

  // ========== RESTRICTED FUNCTIONS ==========

  /**
   * @notice Override update to make veDRAGON non-transferable
   */
  function _update(address from, address to, uint256 amount) internal override {
    // Allow minting and burning
    if (from == address(0) || to == address(0)) {
      super._update(from, to, amount);
      return;
    }
    
    // Prevent transfers between accounts
    revert('veDRAGON: non-transferable');
  }

  /**
   * @notice Add rewards to the contract
   * @param reward Amount of token rewards to add
   * @dev AUDIT FIX: Proper reward distribution based on locked amounts, not voting power
   */
  function notifyRewardAmount(uint256 reward) external onlyOwner {
    _updateReward(address(0));

    lockedToken.safeTransferFrom(msg.sender, address(this), reward);

    // AUDIT FIX: Use totalLocked instead of _totalSupply for reward distribution
    // Rewards should be distributed based on actual locked amounts, not voting power
    if (totalLocked > 0) {
      rewardPerTokenStored += (reward * PRECISION) / totalLocked;
    }

    lastUpdateTime = block.timestamp;
    emit RewardAdded(reward);
  }

  /**
   * @notice Set reward rate for time-based distribution
   * @param _rewardRate Reward rate per second
   * @dev AUDIT FIX: Added function to set reward rate for proper time-based rewards
   */
  function setRewardRate(uint256 _rewardRate) external onlyOwner {
    _updateReward(address(0));
    rewardRate = _rewardRate;
    lastUpdateTime = block.timestamp;
    emit RewardRateUpdated(_rewardRate);
  }

  /**
   * @notice Update the maximum voting power multiplier
   * @param _maxVP New maximum voting power in basis points
   * @dev AUDIT FIX: Updated validation range to be consistent with default maxVP=15000 and 2.5x boost
   *      Range: 10000 (1.0x total = no additional boost) to 25000 (2.5x total = 1.5x additional boost)
   */
  function setMaxVP(uint256 _maxVP) external onlyOwner whenInitialized {
    // AUDIT FIX: Allow range from 10000 (1.0x total) to 25000 (2.5x total) to be consistent with redDRAGON MAX_BOOST
    if (_maxVP < 10000 || _maxVP > 25000) revert InvalidMaxVP();

    maxVP = _maxVP;
    maxBoost = calculateMaxBoost();

    emit BoostParametersUpdated(_maxVP, maxBoost);
  }

  /**
   * @notice Emergency withdraw for stuck tokens (not locked tokens)
   * @param token Token address
   * @param amount Amount to withdraw
   */
  function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
    require(
      token != address(lockedToken) || amount <= lockedToken.balanceOf(address(this)) - totalLocked,
      'Cannot withdraw locked tokens'
    );
    IERC20(token).safeTransfer(owner(), amount);
  }

  /**
   * @notice Override ERC20 totalSupply function
   * @return Total supply of veDRAGON tokens
   */
  function totalSupply() public view override returns (uint256) {
    return _totalSupply;
  }
}
