// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import { IDragonRevenueDistributor } from '../../../interfaces/governance/fees/IDragonRevenueDistributor.sol';
import { IveDRAGON } from '../../../interfaces/tokens/IveDRAGON.sol';
import '../../../libraries/core/SonicFeeMHelper.sol';

/**
 * @title veDRAGONRevenueDistributor
 * @dev Revenue distributor for veDRAGON holders based on their voting power
 * Implements epoch-based distribution system for fair fee sharing
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract veDRAGONRevenueDistributor is IDragonRevenueDistributor, Ownable, ReentrancyGuard {
  using SafeERC20 for IERC20;

  // Custom errors
  error ZeroAddress();
  error InsufficientFees();
  error NothingToClaim();
  error InvalidEpoch();

  // State variables
  IveDRAGON public immutable veDRAGON;

  // Epoch tracking
  uint256 public currentEpoch;
  uint256 public epochDuration = 7 days;
  mapping(uint256 => uint256) public epochStartTime;
  mapping(uint256 => uint256) public epochEndTime;

  // Fee tracking per epoch and token
  mapping(uint256 => mapping(address => uint256)) public epochFees; // epoch => token => amount
  mapping(uint256 => uint256) public epochTotalSupply; // epoch => total veDRAGON supply snapshot

  // User claim tracking
  mapping(address => mapping(uint256 => mapping(address => bool))) public hasClaimed; // user => epoch => token => claimed
  mapping(address => mapping(address => uint256)) public totalClaimed; // user => token => total claimed

  // Partner fee tracking (for interface compliance)
  mapping(uint256 => mapping(address => uint256)) public partnerFees; // partnerId => token => amount

  // Wrapped native token address (WETH, WSONIC, etc.)
  address public wrappedNativeToken;

  // Events
  event FeesReceived(uint256 indexed epoch, address indexed token, uint256 amount);
  event FeesClaimed(address indexed user, uint256 indexed epoch, address indexed token, uint256 amount);
  event WrappedTokenSet(address indexed oldToken, address indexed newToken);
  event EpochRolled(uint256 indexed newEpoch, uint256 startTime, uint256 endTime);

  constructor(address _veDRAGON) Ownable(msg.sender) {
    if (_veDRAGON == address(0)) revert ZeroAddress();

    veDRAGON = IveDRAGON(_veDRAGON);

    // Initialize first epoch
    currentEpoch = 1;
    epochStartTime[1] = block.timestamp;
    epochEndTime[1] = block.timestamp + epochDuration;

    // Register for Sonic FeeM automatically
    SonicFeeMHelper.registerForFeeM();
  }

  /**
   * @dev Receive native token fees
   */
  receive() external payable {
    if (msg.value > 0) {
      rollEpoch(); // Ensure we're in the correct epoch
      epochFees[currentEpoch][address(0)] += msg.value;
      emit FeesReceived(currentEpoch, address(0), msg.value);
    }
  }

  // ======== IDragonRevenueDistributor Interface Implementation ========

  /**
   * @dev Distribute general fees not associated with a specific partner
   * @param token Token address (address(0) for native token)
   * @param amount Amount of fees to distribute
   */
  function distributeGeneralFees(address token, uint256 amount) external override nonReentrant {
    require(amount > 0, "Amount must be positive");
    
    rollEpoch(); // Ensure we're in the correct epoch
    
    if (token == address(0)) {
      // Native token - should already be in contract via receive() or direct transfer
      require(address(this).balance >= amount, "Insufficient native balance");
    } else {
      // ERC20 token - transfer from sender
      IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }
    
    epochFees[currentEpoch][token] += amount;
    emit FeesReceived(currentEpoch, token, amount);
  }

  /**
   * @dev Deposit fees for a specific partner (tracked separately)
   * @param partnerId ID of the partner
   * @param token Token address (address(0) for native token)
   * @param amount Amount of fees
   */
  function depositFees(uint256 partnerId, address token, uint256 amount) external payable override nonReentrant {
    require(amount > 0, "Amount must be positive");
    
    if (token == address(0)) {
      // Native token deposit
      require(msg.value == amount, "Incorrect native amount");
      partnerFees[partnerId][address(0)] += amount;
    } else {
      // ERC20 token deposit
      IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
      partnerFees[partnerId][token] += amount;
    }
  }

  /**
   * @dev Claim rewards for a user (uses epoch-based system)
   * @param user User address to claim for
   */
  function claimRewards(address user) external override nonReentrant {
    require(user != address(0), "Zero address: user");
    
    // Auto-claim all available epochs for native token
    uint256 totalClaimedAmount = 0;
    
    for (uint256 epoch = 1; epoch < currentEpoch; epoch++) {
      if (epochEndTime[epoch] <= block.timestamp && !hasClaimed[user][epoch][address(0)]) {
        uint256 claimable = getClaimable(user, epoch, address(0));
        if (claimable > 0) {
          hasClaimed[user][epoch][address(0)] = true;
          totalClaimedAmount += claimable;
        }
      }
    }
    
    require(totalClaimedAmount > 0, "No rewards to claim");
    
    // Transfer native token rewards
    (bool success, ) = user.call{value: totalClaimedAmount}("");
    require(success, "Reward transfer failed");
    
    // Update total claimed tracking
    totalClaimed[user][address(0)] += totalClaimedAmount;
  }

  /**
   * @dev Get claimable rewards for a user (sum of all epochs)
   * @param user User address
   * @return Total claimable reward amount in native token
   */
  function getClaimableRewards(address user) external view override returns (uint256) {
    uint256 totalClaimable = 0;
    
    for (uint256 epoch = 1; epoch < currentEpoch; epoch++) {
      if (epochEndTime[epoch] <= block.timestamp) {
        totalClaimable += getClaimable(user, epoch, address(0));
      }
    }
    
    return totalClaimable;
  }

  // ======== Existing Epoch-Based Distribution System ========

  /**
   * @dev Set the wrapped native token address
   * @param _wrappedToken The new wrapped native token address
   */
  function setWrappedToken(address _wrappedToken) external onlyOwner {
    require(_wrappedToken != address(0), 'Zero address');
    address oldToken = wrappedNativeToken;
    wrappedNativeToken = _wrappedToken;
    emit WrappedTokenSet(oldToken, _wrappedToken);
  }

  /**
   * @dev Roll to next epoch if current epoch has ended
   */
  function rollEpoch() public {
    if (block.timestamp >= epochEndTime[currentEpoch]) {
      // Snapshot total supply for the ending epoch
      epochTotalSupply[currentEpoch] = veDRAGON.getTotalVotingPower();

      // Start new epoch
      currentEpoch++;
      epochStartTime[currentEpoch] = epochEndTime[currentEpoch - 1];
      epochEndTime[currentEpoch] = epochStartTime[currentEpoch] + epochDuration;

      emit EpochRolled(currentEpoch, epochStartTime[currentEpoch], epochEndTime[currentEpoch]);
    }
  }

  /**
   * @dev Receive fees for distribution (legacy function)
   * @param token Token address
   * @param amount Amount of fees
   */
  function receiveFees(address token, uint256 amount) external {
    rollEpoch(); // Ensure we're in the correct epoch

    IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    epochFees[currentEpoch][token] += amount;

    emit FeesReceived(currentEpoch, token, amount);
  }

  /**
   * @dev Calculate user's claimable amount for a specific epoch and token
   * @param user User address
   * @param epoch Epoch number
   * @param token Token address
   * @return Claimable amount
   */
  function getClaimable(address user, uint256 epoch, address token) public view returns (uint256) {
    // Check if epoch is valid and ended
    if (epoch >= currentEpoch || epochEndTime[epoch] > block.timestamp) {
      return 0;
    }

    // Check if already claimed
    if (hasClaimed[user][epoch][token]) {
      return 0;
    }

    // Get user's voting power at epoch end
    uint256 userVotingPower = veDRAGON.getVotingPowerAt(user, epochEndTime[epoch]);
    if (userVotingPower == 0) {
      return 0;
    }

    // Get total supply for the epoch
    uint256 totalSupply = epochTotalSupply[epoch];
    if (totalSupply == 0) {
      return 0;
    }

    // Calculate user's share
    uint256 epochTokenFees = epochFees[epoch][token];
    return (epochTokenFees * userVotingPower) / totalSupply;
  }

  /**
   * @dev Claim fees for a specific epoch and token
   * @param epoch Epoch number
   * @param token Token address
   */
  function claimFees(uint256 epoch, address token) external nonReentrant {
    if (epoch >= currentEpoch) revert InvalidEpoch();
    if (epochEndTime[epoch] > block.timestamp) revert InvalidEpoch();

    uint256 claimable = getClaimable(msg.sender, epoch, token);
    if (claimable == 0) revert NothingToClaim();

    // Mark as claimed
    hasClaimed[msg.sender][epoch][token] = true;
    totalClaimed[msg.sender][token] += claimable;

    // Transfer fees
    if (token == address(0)) {
      (bool success, ) = msg.sender.call{value: claimable}("");
      require(success, "Native transfer failed");
    } else {
      IERC20(token).safeTransfer(msg.sender, claimable);
    }

    emit FeesClaimed(msg.sender, epoch, token, claimable);
  }

  /**
   * @dev Claim fees for multiple epochs and tokens
   * @param epochs Array of epoch numbers
   * @param tokens Array of token addresses
   */
  function claimMultiple(uint256[] calldata epochs, address[] calldata tokens) external nonReentrant {
    for (uint256 i = 0; i < epochs.length; i++) {
      uint256 epoch = epochs[i];

      if (epoch >= currentEpoch || epochEndTime[epoch] > block.timestamp) {
        continue; // Skip invalid epochs
      }

      for (uint256 j = 0; j < tokens.length; j++) {
        address token = tokens[j];
        uint256 claimable = getClaimable(msg.sender, epoch, token);

        if (claimable > 0) {
          // Mark as claimed
          hasClaimed[msg.sender][epoch][token] = true;
          totalClaimed[msg.sender][token] += claimable;

          // Transfer fees
          if (token == address(0)) {
            (bool success, ) = msg.sender.call{value: claimable}("");
            require(success, "Native transfer failed");
          } else {
            IERC20(token).safeTransfer(msg.sender, claimable);
          }

          emit FeesClaimed(msg.sender, epoch, token, claimable);
        }
      }
    }
  }

  // ======== View Functions ========

  /**
   * @dev Get collected fees for an epoch and token
   * @param epoch Epoch number
   * @param token Token address
   * @return Amount of collected fees
   */
  function getEpochFees(uint256 epoch, address token) external view returns (uint256) {
    return epochFees[epoch][token];
  }

  /**
   * @dev Get total claimed fees for a user and token
   * @param user User address
   * @param token Token address
   * @return Amount of total claimed fees
   */
  function getUserTotalClaimed(address user, address token) external view returns (uint256) {
    return totalClaimed[user][token];
  }

  /**
   * @dev Check if user has claimed for a specific epoch and token
   * @param user User address
   * @param epoch Epoch number
   * @param token Token address
   * @return True if claimed
   */
  function hasUserClaimed(address user, uint256 epoch, address token) external view returns (bool) {
    return hasClaimed[user][epoch][token];
  }

  /**
   * @dev Get partner fees for a specific partner and token
   * @param partnerId Partner ID
   * @param token Token address
   * @return Fee amount
   */
  function getPartnerFees(uint256 partnerId, address token) external view returns (uint256) {
    return partnerFees[partnerId][token];
  }

  // ======== Admin Functions ========

  /**
   * @dev Set epoch duration
   * @param _duration New duration in seconds
   */
  function setEpochDuration(uint256 _duration) external onlyOwner {
    require(_duration >= 1 days && _duration <= 30 days, 'Invalid duration');
    epochDuration = _duration;
  }

  /**
   * @notice Check if this contract is registered for Sonic FeeM
   * @return isRegistered Whether the contract is registered for fee monetization
   */
  function checkFeeMStatus() external view returns (bool isRegistered) {
    return SonicFeeMHelper.isRegisteredForFeeM();
  }
}