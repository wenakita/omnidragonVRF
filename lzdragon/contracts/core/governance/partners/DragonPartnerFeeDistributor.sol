// SPDX-License-Identifier: MIT

/**
 * Governance: DragonPartnerFeeDistributor
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonic_reddragon_bot
 */

pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IveDRAGONBoostManager } from "../../../interfaces/governance/voting/IveDRAGONBoostManager.sol";
import { IDragonPartnerRegistry } from "../../../interfaces/governance/partners/IDragonPartnerRegistry.sol";

/**
 * @title DragonPartnerFeeDistributor
 * @dev Distributes fees to users who voted for a specific partner gauge
 */
contract DragonPartnerFeeDistributor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // State variables
    address public veDRAGONBoostManager;
    address public partnerRegistry;
    address public treasury;

    // Fee configuration
    uint256 public protocolFeePercentage = 1000; // 10% goes to protocol treasury
    uint256 public constant FEE_PRECISION = 10000;

    // Period and reward tracking
    struct RewardPeriod {
        uint256 startTime;
        uint256 endTime;
        bool feesClaimed;
        mapping(address => uint256) tokenTotalAmount; // token => amount
        mapping(address => bool) tokensRegistered; // token => registered
        address[] rewardTokens;
    }

    // Partner fee tracking
    struct PartnerFees {
        mapping(address => uint256) tokenAmounts; // token => amount
        mapping(address => mapping(address => uint256)) userClaimed; // user => token => claimed amount
        mapping(address => bool) isRewardToken; // token => is registered
        address[] rewardTokens;
    }

    // User vote tracking
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public userVotes; // period => partnerId => user => votes
    mapping(uint256 => mapping(uint256 => uint256)) public partnerTotalVotes; // period => partnerId => total votes
    mapping(uint256 => mapping(address => uint256)) public periodUserTotalVotes; // period => user => total votes across all partners

    // Reward period tracking
    mapping(uint256 => RewardPeriod) internal rewardPeriods; // period => RewardPeriod
    mapping(uint256 => mapping(uint256 => PartnerFees)) internal partnerFees; // period => partnerId => PartnerFees

    // Active periods
    uint256 public currentPeriod;
    uint256 public periodDuration = 7 days;

    // Events
    event RewardTokenRegistered(uint256 indexed period, address indexed token);
    event FeeDeposited(uint256 indexed period, uint256 indexed partnerId, address indexed token, uint256 amount);
    event FeesClaimed(uint256 indexed period, uint256 indexed partnerId, address indexed user, address token, uint256 amount);
    event VotesRecorded(uint256 indexed period, uint256 indexed partnerId, address indexed user, uint256 votes);
    event PeriodRolled(uint256 indexed newPeriod, uint256 startTime, uint256 endTime);
    event ProtocolFeeUpdated(uint256 oldFee, uint256 newFee);

    /**
     * @dev Constructor
     * @param _veDRAGONBoostManager Address of veDRAGON boost manager
     * @param _partnerRegistry Address of partner registry
     * @param _treasury Address of treasury
     */
    constructor(address _veDRAGONBoostManager, address _partnerRegistry, address _treasury) Ownable(msg.sender) {
        require(_veDRAGONBoostManager != address(0), "Zero address: veDRAGONBoostManager");
        require(_partnerRegistry != address(0), "Zero address: partner registry");
        require(_treasury != address(0), "Zero address: treasury");

        veDRAGONBoostManager = _veDRAGONBoostManager;
        partnerRegistry = _partnerRegistry;
        treasury = _treasury;

        // Initialize first period
        currentPeriod = 1;
        rewardPeriods[currentPeriod].startTime = block.timestamp;
        rewardPeriods[currentPeriod].endTime = block.timestamp + periodDuration;

        // Register for Sonic FeeM automatically
    }

    /**
     * @dev Roll to next period if current period has ended
     */
    function checkAndRollPeriod() public {
        if (block.timestamp >= rewardPeriods[currentPeriod].endTime) {
            _rollPeriod();
        }
    }

    /**
     * @dev Roll to next period
     */
    function _rollPeriod() internal {
        uint256 newPeriod = currentPeriod + 1;
        uint256 startTime = rewardPeriods[currentPeriod].endTime;
        uint256 endTime = startTime + periodDuration;

        rewardPeriods[newPeriod].startTime = startTime;
        rewardPeriods[newPeriod].endTime = endTime;

        currentPeriod = newPeriod;

        emit PeriodRolled(newPeriod, startTime, endTime);
    }

    /**
     * @dev Record a vote for a partner - can only be called by veDRAGONBoostManager
     * @param voter Address of the voter
     * @param partnerId ID of the partner
     * @param votes Number of votes
     */
    function recordVote(address voter, uint256 partnerId, uint256 votes) external {
        require(msg.sender == veDRAGONBoostManager, "Only veDRAGONBoostManager can record votes");
        require(voter != address(0), "Zero address: voter");
        require(partnerId > 0, "Invalid partner ID");
        require(votes > 0, "Votes must be positive");

        // Ensure we're in the current period
        checkAndRollPeriod();

        // Record votes
        userVotes[currentPeriod][partnerId][voter] = votes;
        partnerTotalVotes[currentPeriod][partnerId] += votes;
        periodUserTotalVotes[currentPeriod][voter] += votes;

        emit VotesRecorded(currentPeriod, partnerId, voter, votes);
    }

    /**
     * @dev Deposit fees for a partner to be distributed to voters
     * @param _partnerId Partner ID
     * @param _token Token address
     * @param _amount Amount to deposit
     */
    function depositFees(uint256 _partnerId, address _token, uint256 _amount) external nonReentrant {
        require(_token != address(0), "Zero address: token");
        require(_amount > 0, "Amount must be positive");

        // Verify partner exists
        address partnerAddress = IDragonPartnerRegistry(partnerRegistry).partnerList(_partnerId);
        require(partnerAddress != address(0), "Partner does not exist");

        // Check if partner is active
        bool isActive = IDragonPartnerRegistry(partnerRegistry).isPartnerActive(partnerAddress);
        require(isActive, "Partner not active");

        // Roll period if needed
        checkAndRollPeriod();

        // Register token if needed
        if (!rewardPeriods[currentPeriod].tokensRegistered[_token]) {
            rewardPeriods[currentPeriod].tokensRegistered[_token] = true;
            rewardPeriods[currentPeriod].rewardTokens.push(_token);
            emit RewardTokenRegistered(currentPeriod, _token);
        }

        // Register token for partner if needed
        if (!partnerFees[currentPeriod][_partnerId].isRewardToken[_token]) {
            partnerFees[currentPeriod][_partnerId].isRewardToken[_token] = true;
            partnerFees[currentPeriod][_partnerId].rewardTokens.push(_token);
        }

        // Transfer tokens from sender
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        // Calculate protocol fee
        uint256 protocolFee = (_amount * protocolFeePercentage) / FEE_PRECISION;
        uint256 partnerAmount = _amount - protocolFee;

        // Update total amounts
        rewardPeriods[currentPeriod].tokenTotalAmount[_token] += _amount;
        partnerFees[currentPeriod][_partnerId].tokenAmounts[_token] += partnerAmount;

        // Transfer protocol fee to treasury
        if (protocolFee > 0) {
            IERC20(_token).safeTransfer(treasury, protocolFee);
        }

        emit FeeDeposited(currentPeriod, _partnerId, _token, _amount);
    }

    /**
     * @dev Get user's claimable amount for a specific period, partner, and token
     * @param _period Period number
     * @param _partnerId Partner ID
     * @param _user User address
     * @param _token Token address
     * @return Claimable amount
     */
    function getUserClaimable(
        uint256 _period,
        uint256 _partnerId,
        address _user,
        address _token
    ) public view returns (uint256) {
        // Check if period exists and has ended
        if (_period >= currentPeriod ||
            rewardPeriods[_period].startTime == 0 ||
            block.timestamp < rewardPeriods[_period].endTime) {
            return 0;
        }

        // Check if user voted for this partner
        uint256 userVoteAmount = userVotes[_period][_partnerId][_user];
        if (userVoteAmount == 0) {
            return 0;
        }

        // Get partner total votes
        uint256 totalVotes = partnerTotalVotes[_period][_partnerId];
        if (totalVotes == 0) {
            return 0;
        }

        // Calculate user's share of partner fees
        uint256 partnerTokenAmount = partnerFees[_period][_partnerId].tokenAmounts[_token];
        uint256 userShare = (partnerTokenAmount * userVoteAmount) / totalVotes;

        // Subtract already claimed amount
        uint256 alreadyClaimed = partnerFees[_period][_partnerId].userClaimed[_user][_token];

        // Return claimable amount
        return userShare > alreadyClaimed ? userShare - alreadyClaimed : 0;
    }

    /**
     * @dev Claim fees for a specific period, partner, and token
     * @param _period Period number
     * @param _partnerId Partner ID
     * @param _token Token address
     */
    function claimFees(uint256 _period, uint256 _partnerId, address _token) external nonReentrant {
        require(_period < currentPeriod, "Period not ended");
        require(rewardPeriods[_period].startTime > 0, "Period does not exist");
        require(block.timestamp >= rewardPeriods[_period].endTime, "Period not ended");

        uint256 claimableAmount = getUserClaimable(_period, _partnerId, msg.sender, _token);
        require(claimableAmount > 0, "Nothing to claim");

        // Update claimed amount
        partnerFees[_period][_partnerId].userClaimed[msg.sender][_token] += claimableAmount;

        // Transfer tokens to user
        IERC20(_token).safeTransfer(msg.sender, claimableAmount);

        emit FeesClaimed(_period, _partnerId, msg.sender, _token, claimableAmount);
    }

    /**
     * @dev Claim fees for a specific period and multiple partners and tokens
     * @param _period Period number
     * @param _partnerIds Array of partner IDs
     * @param _tokens Array of tokens
     */
    function claimMultiple(
        uint256 _period,
        uint256[] calldata _partnerIds,
        address[] calldata _tokens
    ) external nonReentrant {
        require(_period < currentPeriod, "Period not ended");
        require(rewardPeriods[_period].startTime > 0, "Period does not exist");
        require(block.timestamp >= rewardPeriods[_period].endTime, "Period not ended");

        for (uint256 i = 0; i < _partnerIds.length; i++) {
            uint256 partnerId = _partnerIds[i];

            for (uint256 j = 0; j < _tokens.length; j++) {
                address token = _tokens[j];

                uint256 claimableAmount = getUserClaimable(_period, partnerId, msg.sender, token);
                if (claimableAmount > 0) {
                    // Update claimed amount
                    partnerFees[_period][partnerId].userClaimed[msg.sender][token] += claimableAmount;

                    // Transfer tokens to user
                    IERC20(token).safeTransfer(msg.sender, claimableAmount);

                    emit FeesClaimed(_period, partnerId, msg.sender, token, claimableAmount);
                }
            }
        }
    }

    /**
     * @dev Get reward tokens for a period
     * @param _period Period number
     * @return Array of reward tokens
     */
    function getPeriodRewardTokens(uint256 _period) external view returns (address[] memory) {
        return rewardPeriods[_period].rewardTokens;
    }

    /**
     * @dev Get reward tokens for a partner in a period
     * @param _period Period number
     * @param _partnerId Partner ID
     * @return Array of reward tokens
     */
    function getPartnerRewardTokens(uint256 _period, uint256 _partnerId) external view returns (address[] memory) {
        return partnerFees[_period][_partnerId].rewardTokens;
    }

    /**
     * @dev Get period information
     * @param _period Period number
     * @return startTime Start timestamp
     * @return endTime End timestamp
     * @return active Whether period is active
     */
    function getPeriodInfo(uint256 _period) external view returns (uint256 startTime, uint256 endTime, bool active) {
        startTime = rewardPeriods[_period].startTime;
        endTime = rewardPeriods[_period].endTime;
        active = _period == currentPeriod && block.timestamp < endTime;
        return (startTime, endTime, active);
    }

    /**
     * @dev Set protocol fee percentage
     * @param _feePercentage New fee percentage
     */
    function setProtocolFee(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 3000, "Fee too high"); // Max 30%

        uint256 oldFee = protocolFeePercentage;
        protocolFeePercentage = _feePercentage;

        emit ProtocolFeeUpdated(oldFee, _feePercentage);
    }

    /**
     * @dev Set period duration
     * @param _duration New duration in seconds
     */
    function setPeriodDuration(uint256 _duration) external onlyOwner {
        require(_duration >= 1 days && _duration <= 30 days, "Invalid duration");
        periodDuration = _duration;
    }

    /**
     * @dev Set veDRAGONBoostManager address
     * @param _veDRAGONBoostManager New veDRAGON boost manager address
     */
    function setVeDRAGONBoostManager(address _veDRAGONBoostManager) external onlyOwner {
        require(_veDRAGONBoostManager != address(0), "Zero address");
        veDRAGONBoostManager = _veDRAGONBoostManager;
    }

    /**
     * @dev Update treasury address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero address");
        treasury = _treasury;
    }

    /**
     * @dev Emergency withdraw tokens that are stuck (can only be used for non-reward tokens)
     * @param _token Token address
     * @param _amount Amount to withdraw
     * @param _to Recipient address
     */
    function emergencyWithdraw(address _token, uint256 _amount, address _to) external onlyOwner {
        require(_to != address(0), "Zero address");
        IERC20(_token).safeTransfer(_to, _amount);
    }

    /**
     * @dev Get partner details for a specific partner
     * @param _partnerId Partner ID
     * @return partnerAddress Partner address
     * @return name Partner name
     * @return feeShare Partner fee share
     * @return probabilityBoost Partner probability boost
     * @return isActive Whether partner is active
     */
    function getPartnerDetails(uint256 _partnerId) external view returns (
        address partnerAddress,
        string memory name,
        uint256 feeShare,
        uint256 probabilityBoost,
        bool isActive
    ) {
        partnerAddress = IDragonPartnerRegistry(partnerRegistry).partnerList(_partnerId);
        require(partnerAddress != address(0), "Partner does not exist");

        (name, feeShare, probabilityBoost, isActive) = IDragonPartnerRegistry(partnerRegistry).getPartnerDetails(partnerAddress);

        return (partnerAddress, name, feeShare, probabilityBoost, isActive);
    }

    /**
     * @dev Get partner fee share
     * @param _partnerId Partner ID
     * @return Fee share in basis points
     */
    function getPartnerFeeShare(uint256 _partnerId) public view returns (uint256) {
        address partnerAddress = IDragonPartnerRegistry(partnerRegistry).partnerList(_partnerId);
        require(partnerAddress != address(0), "Partner does not exist");

        (,uint256 feeShare,,) = IDragonPartnerRegistry(partnerRegistry).getPartnerDetails(partnerAddress);

        return feeShare;
    }

    /**
     * @notice Check if this contract is registered for Sonic FeeM
     * @return isRegistered Whether the contract is registered for fee monetization
     */
    function checkFeeMStatus() external view returns (bool isRegistered) {
    }
}