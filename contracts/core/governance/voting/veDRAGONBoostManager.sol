// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import { IveDRAGON } from '../../../interfaces/tokens/IveDRAGON.sol';
import { IJackpot } from '../../../interfaces/shared/IJackpot.sol';
import { IveDRAGONBoostManager } from '../../../interfaces/governance/partners/IveDRAGONBoostManager.sol';
import { IDragonPartnerRegistry } from '../../../interfaces/governance/partners/IDragonPartnerRegistry.sol';
import { DragonDateTimeLib } from '../../../libraries/core/DragonDateTimeLib.sol';
import { veDRAGONMath } from '../../../libraries/math/veDRAGONMath.sol';

/**
 * @title veDRAGONBoostManager
 * @dev Unified contract for veDRAGON boost and voting functionality for partner systems
 *
 * Combines boost calculation for jackpot entries and partner pool voting mechanisms
 * Provides voting power-based probability boosts and democratic partner selection
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
abstract contract veDRAGONBoostManager is Ownable, ReentrancyGuard, IveDRAGONBoostManager {
  // === Custom Errors ===
  error ZeroAddress();
  error ZeroAmount();
  error BaseBoostMustBePositive();
  error MaxBoostMustBeGreaterThanBase();
  error UnauthorizedCaller();
  error PartnerDoesNotExist();
  error PartnerNotActive();
  error InsufficientVotingPower();
  error NoVotesForOldPartner();
  error TooSoonToRecalculate();
  error PeriodTooShort();
  error FeeMRegistrationFailed();
  error InvalidMultiplier();

  // Core contract references
  IveDRAGON public immutable veDRAGON;
  IJackpot public jackpot;
  IDragonPartnerRegistry public partnerRegistry;

  // ===== BOOST PARAMETERS =====
  /// @dev Precision for boost calculations (10000 = 100%)
  uint256 public constant BOOST_PRECISION = 10000;

  /// @dev Base boost value (10000 = 100%)
  uint256 public baseBoost = 10000;

  /// @dev Maximum boost value (25000 = 250%)
  uint256 public maxBoost = 25000;

  // Optional parameters for refined boost calculation (packed into single storage slot)
  uint64 public minLockDuration = 7 days; // Minimum lock duration for boost
  uint64 public maxLockDuration = 4 * 365 days; // Maximum lock duration (4 years)

  // ===== VOTING PARAMETERS =====
  /// @dev Voting period length in seconds
  uint64 public votingPeriodLength = 7 days;

  /// @dev Current voting period
  uint64 private _currentPeriod;

  /// @dev Maximum total probability boost (6.9% expressed in basis points)
  uint256 public constant MAX_TOTAL_BOOST = 690;

  /// @dev Minimum voting power to participate
  uint256 public minVotingPower = 0.1 ether; // 0.1 veDRAGON

  // Track votes for each partner in each period
  // period => partnerId => votes
  mapping(uint256 => mapping(uint256 => uint256)) public partnerVotes;

  // Track total votes in each period
  // period => totalVotes
  mapping(uint256 => uint256) public periodTotalVotes;

  // Track if a user has voted in current period
  // period => user => hasVoted
  mapping(uint256 => mapping(address => bool)) public hasVoted;

  // Track votes by user
  // period => user => partnerId => votes
  mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public userVotes;

  // Track allocated probability boost
  // partnerId => probabilityBoost (in basis points)
  mapping(uint256 => uint256) public partnerProbabilityBoost;

  // Last calculation timestamp
  uint64 public lastCalculation;

  // Flash loan protection
  mapping(address => uint256) public lastBalanceUpdateBlock;
  uint256 public constant MIN_HOLDING_BLOCKS = 10; // ~2 minutes on most chains

  // Timelock for critical parameters
  bool public boostTimelockInitialized;
  uint256 public constant BOOST_TIMELOCK_DELAY = 24 hours; // 24 hour delay for boost changes

  struct BoostTimelockProposal {
    uint256 newBaseBoost;
    uint256 newMaxBoost;
    uint256 executeTime;
    bool executed;
    bool exists;
  }

  mapping(bytes32 => BoostTimelockProposal) public boostTimelockProposals;
  bool public boostParametersSetOnce;

  // ===== EVENTS =====
  // Boost Events (BoostCalculated is inherited from interface)
  event BoostParametersUpdated(uint256 baseBoost, uint256 maxBoost);
  event JackpotAddressUpdated(address indexed newJackpot);
  event JackpotEntryWithBoost(address indexed user, uint256 amount, uint256 boostedAmount);

  // Voting Events
  event VoteCast(address indexed user, uint256 indexed partnerId, uint256 votes, uint256 period);
  event VoteChanged(
    address indexed user,
    uint256 indexed oldPartnerId,
    uint256 indexed newPartnerId,
    uint256 votes,
    uint256 period
  );
  event VoteRemoved(address indexed user, uint256 indexed partnerId, uint256 votes, uint256 period);
  event PartnersBoostCalculated(uint256 period, uint256 totalVotes);
  event PartnerBoostUpdated(uint256 indexed partnerId, uint256 probabilityBoost);
  event VotingPeriodChanged(uint256 newPeriodLength);
  event MinVotingPowerChanged(uint256 newMinVotingPower);
  event PartnerRegistryUpdated(address indexed newRegistry);

  event BoostProposalCreated(
    bytes32 indexed proposalId,
    uint256 newBaseBoost,
    uint256 newMaxBoost,
    uint256 executeTime
  );
  event BoostProposalExecuted(bytes32 indexed proposalId);
  event BoostTimelockInitialized();

  /**
   * @dev Constructor
   * @param _veDRAGON Address of the veDRAGON token
   * @param _jackpot Address of the jackpot contract
   * @param _partnerRegistry Address of the partner registry
   */
  constructor(address _veDRAGON, address _jackpot, address _partnerRegistry) {
    if (_veDRAGON == address(0)) revert ZeroAddress();
    if (_jackpot == address(0)) revert ZeroAddress();
    if (_partnerRegistry == address(0)) revert ZeroAddress();

    veDRAGON = IveDRAGON(_veDRAGON);
    jackpot = IJackpot(_jackpot);
    partnerRegistry = IDragonPartnerRegistry(_partnerRegistry);

    // Initialize period and calculation timestamp
    _currentPeriod = uint64(block.timestamp / votingPeriodLength);
    lastCalculation = uint64(block.timestamp);

    // Register for Sonic FeeM automatically
  }

  /**
   * @dev Get the current voting period
   * @return Current period ID
   */
  function currentPeriod() external view returns (uint256) {
    return _currentPeriod;
  }

  // ============================================================
  // ==================== BOOST FUNCTIONS =======================
  // ============================================================

  /**
   * @dev Calculate boost multiplier based on user's veDRAGON balance with cubic root normalization
   * @param _user Address of the user
   * @return boostMultiplier Boost multiplier in BOOST_PRECISION (10000 = 100%)
   */
  function calculateBoost(address _user) public view returns (uint256 boostMultiplier) {
    // Use secure calculation with flash loan protection
    return calculateBoostWithProtection(_user);
  }

  /**
   * @dev Calculate boost with flash loan protection
   */
  function calculateBoostWithProtection(address _user) public view returns (uint256 boostMultiplier) {
    // Check if user has held tokens for minimum duration
    if (block.number < lastBalanceUpdateBlock[_user] + MIN_HOLDING_BLOCKS) {
      return baseBoost; // Only base boost for recent holders
    }

    // Get user's time-weighted veDRAGON voting power
    uint256 userVeDRAGONBalance = veDRAGON.getVotingPower(_user);
    uint256 totalVeDRAGONSupply = veDRAGON.getTotalVotingPower();

    // Use the veDRAGONMath library for boost calculation
    uint256 standardBoost = veDRAGONMath.calculateNormalizedBoostMultiplier(
      userVeDRAGONBalance,
      totalVeDRAGONSupply,
      maxBoost
    );

    // Check if today is a special event day for additional boost
    (bool isSpecialEvent, uint256 eventMultiplier) = DragonDateTimeLib.checkForSpecialEvent(block.timestamp);

    if (isSpecialEvent) {
      return (standardBoost * eventMultiplier) / 10000;
    }

    return standardBoost;
  }

  /**
   * @dev Calculate boost and emit event (non-view version)
   * @param _user Address of the user
   * @return boostMultiplier Boost multiplier
   */
  function getBoostWithEvent(address _user) public override returns (uint256 boostMultiplier) {
    boostMultiplier = calculateBoost(_user);
    emit BoostCalculated(_user, boostMultiplier);
    return boostMultiplier;
  }

  /**
   * @dev Enter jackpot with a boosted amount based on veDRAGON holdings
   * @param _user Address of the user entering the jackpot
   * @param _amount Base amount for jackpot entry
   * @return boostedAmount The amount after applying the boost
   */
  function enterJackpotWithBoost(address _user, uint256 _amount) external override returns (uint256 boostedAmount) {
    // Only authorized integrators can call this function
    if (msg.sender != owner() && msg.sender != address(jackpot)) revert UnauthorizedCaller();

    // Calculate boost
    uint256 boostMultiplier = calculateBoost(_user);

    // Apply boost to amount
    boostedAmount = (_amount * boostMultiplier) / BOOST_PRECISION;

    // Enter jackpot with boosted amount
    jackpot.enterJackpotWithWrappedNativeToken(_user, boostedAmount);

    // Emit events
    emit BoostCalculated(_user, boostMultiplier);
    emit JackpotEntryWithBoost(_user, _amount, boostedAmount);

    return boostedAmount;
  }

  /**
   * @dev Update boost parameters (with timelock protection after first use)
   * @param _baseBoost New base boost (10000 = 100%)
   * @param _maxBoost New max boost (25000 = 250%)
   */
  function setBoostParameters(uint256 _baseBoost, uint256 _maxBoost) external onlyOwner {
    if (_baseBoost == 0) revert BaseBoostMustBePositive();
    if (_maxBoost <= _baseBoost) revert MaxBoostMustBeGreaterThanBase();

    // First time can be set immediately
    if (!boostParametersSetOnce) {
      boostParametersSetOnce = true;
      boostTimelockInitialized = true;

      baseBoost = _baseBoost;
      maxBoost = _maxBoost;

      emit BoostParametersUpdated(_baseBoost, _maxBoost);
      emit BoostTimelockInitialized();
      return;
    }

    // Subsequent changes require timelock
    revert('Use proposeBoostParameterChange');
  }

  /**
   * @dev Propose boost parameter changes (required after first use)
   */
  function proposeBoostParameterChange(
    uint256 _baseBoost,
    uint256 _maxBoost
  ) external onlyOwner returns (bytes32 proposalId) {
    require(boostTimelockInitialized, 'Timelock not initialized');
    if (_baseBoost == 0) revert BaseBoostMustBePositive();
    if (_maxBoost <= _baseBoost) revert MaxBoostMustBeGreaterThanBase();

    proposalId = keccak256(abi.encode(_baseBoost, _maxBoost, block.timestamp));
    require(!boostTimelockProposals[proposalId].exists, 'Proposal already exists');

    uint256 executeTime = block.timestamp + BOOST_TIMELOCK_DELAY;

    boostTimelockProposals[proposalId] = BoostTimelockProposal({
      newBaseBoost: _baseBoost,
      newMaxBoost: _maxBoost,
      executeTime: executeTime,
      executed: false,
      exists: true
    });

    emit BoostProposalCreated(proposalId, _baseBoost, _maxBoost, executeTime);
    return proposalId;
  }

  /**
   * @dev Execute boost parameter change after timelock
   */
  function executeBoostParameterChange(bytes32 proposalId) external onlyOwner {
    BoostTimelockProposal storage proposal = boostTimelockProposals[proposalId];
    require(proposal.exists, 'Proposal does not exist');
    require(!proposal.executed, 'Proposal already executed');
    require(block.timestamp >= proposal.executeTime, 'Timelock not expired');

    proposal.executed = true;

    baseBoost = proposal.newBaseBoost;
    maxBoost = proposal.newMaxBoost;

    emit BoostParametersUpdated(proposal.newBaseBoost, proposal.newMaxBoost);
    emit BoostProposalExecuted(proposalId);
  }

  /**
   * @dev Update jackpot address
   * @param _jackpot New jackpot address
   */
  function setJackpot(address _jackpot) external onlyOwner {
    if (_jackpot == address(0)) revert ZeroAddress();
    jackpot = IJackpot(_jackpot);
    emit JackpotAddressUpdated(_jackpot);
  }

  // ============================================================
  // =================== VOTING FUNCTIONS =======================
  // ============================================================

  /**
   * @dev Vote for a partner to receive probability boost
   * @param _partnerId ID of the partner to vote for
   * @param _weight Voting weight to allocate (not used, for interface compatibility)
   */
  function voteForPartner(uint256 _partnerId, uint256 _weight) external override {
    // _weight parameter is not used in this implementation but is included for interface compatibility
    _weight; // Silence unused variable warning

    // Get partner address from ID
    address partnerAddress = partnerRegistry.partnerList(_partnerId);

    // Verify partner exists and is active
    bool isActive = partnerRegistry.isPartnerActive(partnerAddress);
    if (partnerAddress == address(0)) revert PartnerDoesNotExist();
    if (!isActive) revert PartnerNotActive();

    // Check if we need to move to a new period
    updatePeriodIfNeeded();

    // Get user's voting power
    uint256 votingPower = veDRAGON.getVotingPower(msg.sender);
    if (votingPower < minVotingPower) revert InsufficientVotingPower();

    // If user has already voted in this period, remove their previous vote
    if (hasVoted[_currentPeriod][msg.sender]) {
      removeVote(msg.sender);
    }

    // Record the new vote
    partnerVotes[_currentPeriod][_partnerId] += votingPower;
    periodTotalVotes[_currentPeriod] += votingPower;
    hasVoted[_currentPeriod][msg.sender] = true;
    userVotes[_currentPeriod][msg.sender][_partnerId] = votingPower;

    emit VoteCast(msg.sender, _partnerId, votingPower, _currentPeriod);
  }

  /**
   * @dev Change vote from one partner to another
   * @param _oldPartnerId Current partner ID the user is voting for
   * @param _newPartnerId New partner ID to vote for
   */
  function changeVote(uint256 _oldPartnerId, uint256 _newPartnerId) external {
    // Get partner address from ID
    address newPartnerAddress = partnerRegistry.partnerList(_newPartnerId);

    // Verify new partner exists and is active
    bool isActive = partnerRegistry.isPartnerActive(newPartnerAddress);
    if (newPartnerAddress == address(0)) revert PartnerDoesNotExist();
    if (!isActive) revert PartnerNotActive();

    // Check if we need to move to a new period
    updatePeriodIfNeeded();

    // Check if user has voted for the old partner
    uint256 oldVotes = userVotes[_currentPeriod][msg.sender][_oldPartnerId];
    if (oldVotes == 0) revert NoVotesForOldPartner();

    // Remove old vote
    partnerVotes[_currentPeriod][_oldPartnerId] -= oldVotes;
    userVotes[_currentPeriod][msg.sender][_oldPartnerId] = 0;

    // Add new vote
    partnerVotes[_currentPeriod][_newPartnerId] += oldVotes;
    userVotes[_currentPeriod][msg.sender][_newPartnerId] = oldVotes;

    emit VoteChanged(msg.sender, _oldPartnerId, _newPartnerId, oldVotes, _currentPeriod);
  }

  /**
   * @dev Remove a user's vote
   * @param user Address of the user
   */
  function removeVote(address user) internal {
    // Find all partners the user voted for
    for (uint256 i = 0; i < partnerRegistry.getPartnerCount(); i++) {
      uint256 userVoteAmount = userVotes[_currentPeriod][user][i];
      if (userVoteAmount > 0) {
        // Remove votes
        partnerVotes[_currentPeriod][i] -= userVoteAmount;
        periodTotalVotes[_currentPeriod] -= userVoteAmount;
        userVotes[_currentPeriod][user][i] = 0;

        emit VoteRemoved(user, i, userVoteAmount, _currentPeriod);
      }
    }

    // Mark user as not having voted
    hasVoted[_currentPeriod][user] = false;
  }

  /**
   * @dev Calculate probability boosts based on votes
   * Can be called by anyone, but has a time restriction
   */
  function calculatePartnersBoost() external {
    // Check if 24 hours have passed since last calculation
    if (block.timestamp < lastCalculation + 1 days) revert TooSoonToRecalculate();

    // Update period if needed
    updatePeriodIfNeeded();

    // Get total votes in the current period
    uint256 totalVotes = periodTotalVotes[_currentPeriod];

    // If no votes, reset all boosts
    if (totalVotes == 0) {
      for (uint256 i = 0; i < partnerRegistry.getPartnerCount(); i++) {
        if (partnerProbabilityBoost[i] > 0) {
          partnerProbabilityBoost[i] = 0;
          emit PartnerBoostUpdated(i, 0);
        }
      }
    } else {
      // Calculate boost for each partner
      for (uint256 i = 0; i < partnerRegistry.getPartnerCount(); i++) {
        uint256 votes = partnerVotes[_currentPeriod][i];

        // Calculate partner's share of the boost
        uint256 boost = (votes * MAX_TOTAL_BOOST) / totalVotes;

        // Update partner's probability boost if changed
        if (boost != partnerProbabilityBoost[i]) {
          partnerProbabilityBoost[i] = boost;
          emit PartnerBoostUpdated(i, boost);
        }
      }
    }

    // Update last calculation timestamp
    lastCalculation = uint64(block.timestamp);

    emit PartnersBoostCalculated(_currentPeriod, totalVotes);
  }

  /**
   * @dev Get probability boost for a partner
   * @param _partnerId ID of the partner
   * @return Probability boost in basis points (e.g., 100 = 1%)
   */
  function getPartnerProbabilityBoost(uint256 _partnerId) external view override returns (uint256) {
    return partnerProbabilityBoost[_partnerId];
  }

  /**
   * @dev Get probability boost for a partner address
   * @param _partner Address of the partner
   * @return Probability boost in basis points (e.g., 100 = 1%)
   */
  function getPartnerProbabilityBoostByAddress(address _partner) external view returns (uint256) {
    // Iterate through partner list to find matching address
    for (uint256 i = 0; i < partnerRegistry.getPartnerCount(); i++) {
      if (partnerRegistry.partnerList(i) == _partner) {
        return partnerProbabilityBoost[i];
      }
    }
    return 0;
  }

  /**
   * @dev Update current period if needed
   */
  function updatePeriodIfNeeded() internal {
    uint64 calculatedPeriod = uint64(block.timestamp / votingPeriodLength);
    if (calculatedPeriod > _currentPeriod) {
      _currentPeriod = calculatedPeriod;
    }
  }

  /**
   * @dev Set minimum voting power required to participate
   * @param _minVotingPower New minimum voting power
   */
  function setMinVotingPower(uint256 _minVotingPower) external onlyOwner {
    minVotingPower = _minVotingPower;
    emit MinVotingPowerChanged(_minVotingPower);
  }

  /**
   * @dev Set voting period length
   * @param _votingPeriodLength New voting period length in seconds
   */
  function setVotingPeriodLength(uint256 _votingPeriodLength) external onlyOwner {
    if (_votingPeriodLength < 1 days) revert PeriodTooShort();
    votingPeriodLength = uint64(_votingPeriodLength);
    emit VotingPeriodChanged(_votingPeriodLength);
  }

  /**
   * @dev Update partner registry address
   * @param _partnerRegistry New partner registry address
   */
  function setPartnerRegistry(address _partnerRegistry) external onlyOwner {
    if (_partnerRegistry == address(0)) revert ZeroAddress();
    partnerRegistry = IDragonPartnerRegistry(_partnerRegistry);
    emit PartnerRegistryUpdated(_partnerRegistry);
  }

  /**
   * @dev Update balance tracking (should be called on veDRAGON transfers)
   */
  function updateBalanceTracking(address user) external {
    require(msg.sender == address(veDRAGON), 'Only veDRAGON can update');
    lastBalanceUpdateBlock[user] = block.number;
  }

  /**
   * @dev Check if a special event is active
   * @return Whether a special event is currently active
   */
  function isSpecialEventActive() external view returns (bool) {
    (bool isActive, ) = DragonDateTimeLib.checkForSpecialEvent(block.timestamp);
    return isActive;
  }

  /**
   * @dev Get normalized boost multiplier for a user
   * @param user User address
   * @return Normalized boost multiplier
   */
  function getNormalizedBoostMultiplier(address user) external view returns (uint256) {
    return calculateBoost(user);
  }

  /**
   * @notice Check if this contract is registered for Sonic FeeM
   * @return isRegistered Whether the contract is registered for fee monetization
   */
  function checkFeeMStatus() external view returns (bool isRegistered) {
  }
}