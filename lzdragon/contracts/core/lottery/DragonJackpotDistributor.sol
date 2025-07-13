// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";


/**
 * @title DragonJackpotDistributor
 * @dev Contract for distributing jackpot prizes using optimized token utils
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
interface IDragonJackpotDistributor {
    function addToJackpot(uint256 amount) external;
    function distributeJackpot(address winner, uint256 amount) external;
    function getCurrentJackpot() external view returns (uint256);
}

contract DragonJackpotDistributor is IDragonJackpotDistributor, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant PERCENTAGE_DENOMINATOR = 10000; // 100% = 10000
    uint256 public constant MAX_BATCH_SIZE = 100; // Maximum array size for batch operations
    uint256 public constant MAX_RECIPIENTS = 50; // Maximum recipients for reward distribution

    // State variables
    IERC20 public immutable token; // The token to distribute (made immutable for security)
    address public treasury; // Treasury wallet for emergency functions
    address public swapTrigger; // The swap trigger oracle contract
    uint256 public distributionPercentage = 6900; // 69% of jackpot per win
    uint256 public jackpotBalance; // Current jackpot balance
    uint256 public lastDistributionTime; // Last time a jackpot was distributed

    // Mapping of authorized distributors
    mapping(address => bool) public authorizedDistributors;

    // History of jackpot wins
    struct JackpotWin {
        address winner;
        uint256 amount;
        uint256 timestamp;
    }
    JackpotWin[] public jackpotHistory;

    // Counters
    uint256 public totalDistributed;

    // Events
    event JackpotAdded(uint256 amount, uint256 newTotal);
    event JackpotDistributed(address indexed winner, uint256 amount, uint256 timestamp);
    event DistributionPercentageUpdated(uint256 oldPercentage, uint256 newPercentage);
    event AuthorizedDistributorUpdated(address distributor, bool authorized);
    event EmergencyWithdrawal(address indexed to, uint256 amount);
    event RewardsDistributed(uint256 totalAmount, uint256 recipientCount);
    event BatchTransferCompleted(uint256 tokenCount, address indexed treasury);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event SwapTriggerUpdated(address indexed oldSwapTrigger, address indexed newSwapTrigger);

    /**
     * @dev Constructor
     * @param _token The token to distribute
     * @param _swapTrigger The swap trigger oracle contract
     * @param _treasury Treasury address for emergency functions
     */
    constructor(
        address _token,
        address _swapTrigger,
        address _treasury
    ) Ownable(msg.sender) {
        require(_token != address(0), "Token cannot be zero address");
        require(_swapTrigger != address(0), "Swap trigger oracle cannot be zero address");
        require(_treasury != address(0), "Treasury cannot be zero address");

        token = IERC20(_token);
        swapTrigger = _swapTrigger;
        treasury = _treasury;

        authorizedDistributors[_swapTrigger] = true;

        // Register for Sonic FeeM automatically
    }

    /**
     * @dev Modifier to only allow authorized contracts to call function
     */
    modifier onlyAuthorized() {
        require(
            msg.sender == swapTrigger ||
            authorizedDistributors[msg.sender],
            "Not authorized"
        );
        _;
    }

    /**
     * @notice Add funds to the jackpot
     * @dev Caller must have pre-approved this contract to spend `amount` tokens
     * using IERC20.approve() before calling this function
     * @param amount Amount to add
     */
    function addToJackpot(uint256 amount) external override {
        require(amount > 0, "Amount must be > 0");

        // Transfer tokens from sender to contract
        token.safeTransferFrom(msg.sender, address(this), amount);

        // Update jackpot balance
        jackpotBalance += amount;

        emit JackpotAdded(amount, jackpotBalance);
    }

    /**
     * @dev Distribute a jackpot to a winner
     * @param winner Address of the winner
     * @param amount Amount to distribute
     */
    function distributeJackpot(address winner, uint256 amount) external override onlyAuthorized nonReentrant whenNotPaused {
        require(winner != address(0), "Winner cannot be zero address");
        require(amount > 0, "Amount must be > 0");

        // Calculate distribution amount (capped by percentage)
        uint256 maxDistribution = (jackpotBalance * distributionPercentage) / PERCENTAGE_DENOMINATOR;
        uint256 distributionAmount = amount > maxDistribution ? maxDistribution : amount;

        require(distributionAmount > 0, "No distribution amount");
        // Note: This check is technically redundant since distributionAmount <= maxDistribution <= jackpotBalance
        // but kept for defensive programming
        require(jackpotBalance >= distributionAmount, "Insufficient balance");

        // Update balances and counters
        jackpotBalance -= distributionAmount;
        totalDistributed += distributionAmount;
        lastDistributionTime = block.timestamp;

        // Record win in history
        jackpotHistory.push(JackpotWin({
            winner: winner,
            amount: distributionAmount,
            timestamp: block.timestamp
        }));

        // Transfer tokens to winner
        token.safeTransfer(winner, distributionAmount);

        emit JackpotDistributed(winner, distributionAmount, block.timestamp);
    }

    /**
     * @notice Distribute rewards to multiple recipients by basis points
     * @dev Gas limit warning: Large arrays may exceed block gas limit.
     * Maximum recipients limited to MAX_RECIPIENTS to prevent gas issues.
     * @param amount Amount to distribute
     * @param recipients Array of recipient addresses (max MAX_RECIPIENTS)
     * @param basisPoints Array of basis points for each recipient (totaling 10000)
     */
    function distributeRewards(
        uint256 amount,
        address[] memory recipients,
        uint256[] memory basisPoints
    ) external onlyOwner nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(jackpotBalance >= amount, "Insufficient balance");
        require(recipients.length == basisPoints.length, "Array length mismatch");
        require(recipients.length > 0, "Empty arrays");
        require(recipients.length <= MAX_RECIPIENTS, "Too many recipients");

        uint256 totalBasisPoints = 0;
        for (uint256 i = 0; i < basisPoints.length; i++) {
            require(recipients[i] != address(0), "Zero address recipient");
            totalBasisPoints += basisPoints[i];
        }
        require(totalBasisPoints == PERCENTAGE_DENOMINATOR, "Basis points must total 10000");

        // Update jackpot balance
        jackpotBalance -= amount;

        // Distribute to each recipient based on their basis points
        // Note: Due to integer division, small fractions may remain in contract
        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 recipientAmount = (amount * basisPoints[i]) / PERCENTAGE_DENOMINATOR;
            if (recipientAmount > 0) {
                token.safeTransfer(recipients[i], recipientAmount);
            }
        }

        emit RewardsDistributed(amount, recipients.length);
    }

    /**
     * @notice Emergency withdraw all funds to treasury
     * @dev Administrative function to rescue all main token funds in emergency situations
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");

        // Transfer tokens to treasury
        token.safeTransfer(treasury, balance);

        jackpotBalance = 0;

        emit EmergencyWithdrawal(treasury, balance);
    }

    /**
     * @notice Batch transfer multiple tokens to the treasury
     * @dev Administrative function for rescuing various tokens (excluding main jackpot token).
     * Gas limit warning: Large arrays may exceed block gas limit.
     * Maximum batch size limited to MAX_BATCH_SIZE to prevent gas issues.
     * Use emergencyWithdraw for the main jackpot token.
     * @param tokens Array of token addresses (max MAX_BATCH_SIZE)
     * @param amounts Array of amounts to transfer
     */
    function batchTransferToTreasury(
        address[] memory tokens,
        uint256[] memory amounts
    ) external onlyOwner {
        require(tokens.length == amounts.length, "Array length mismatch");
        require(tokens.length > 0, "Empty arrays");
        require(tokens.length <= MAX_BATCH_SIZE, "Batch size too large");

        for (uint256 i = 0; i < tokens.length; i++) {
            require(tokens[i] != address(0), "Cannot batch transfer zero address token");
            require(tokens[i] != address(token), "Use emergencyWithdraw for main token");
            require(amounts[i] > 0, "Amount must be > 0");

            IERC20 tokenContract = IERC20(tokens[i]);
            tokenContract.safeTransfer(treasury, amounts[i]);
        }

        emit BatchTransferCompleted(tokens.length, treasury);
    }

    // Admin functions

    /**
     * @dev Set distribution percentage
     * @param _percentage New distribution percentage (in basis points, 10000 = 100%)
     */
    function setDistributionPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage <= PERCENTAGE_DENOMINATOR, "Percentage too high");
        require(_percentage > 0, "Percentage must be > 0");
        uint256 oldPercentage = distributionPercentage;
        distributionPercentage = _percentage;
        emit DistributionPercentageUpdated(oldPercentage, _percentage);
    }

    /**
     * @dev Set authorized distributor
     * @param _distributor Distributor address
     * @param _authorized Whether the distributor is authorized
     */
    function setAuthorizedDistributor(address _distributor, bool _authorized) external onlyOwner {
        require(_distributor != address(0), "Distributor cannot be zero address");
        authorizedDistributors[_distributor] = _authorized;
        emit AuthorizedDistributorUpdated(_distributor, _authorized);
    }

    /**
     * @dev Set treasury address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Treasury cannot be zero address");
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    /**
     * @dev Set swap trigger address
     * @param _swapTrigger New swap trigger address
     */
    function setSwapTrigger(address _swapTrigger) external onlyOwner {
        require(_swapTrigger != address(0), "Swap trigger cannot be zero address");

        // Remove authorization from old swap trigger
        if (swapTrigger != address(0)) {
            authorizedDistributors[swapTrigger] = false;
        }

        address oldSwapTrigger = swapTrigger;
        swapTrigger = _swapTrigger;

        // Authorize new swap trigger
        authorizedDistributors[_swapTrigger] = true;

        emit SwapTriggerUpdated(oldSwapTrigger, _swapTrigger);
        emit AuthorizedDistributorUpdated(oldSwapTrigger, false);
        emit AuthorizedDistributorUpdated(_swapTrigger, true);
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

    // View functions

    /**
     * @dev Get the current jackpot balance
     * @return Current jackpot balance
     */
    function getCurrentJackpot() external view override returns (uint256) {
        return jackpotBalance;
    }

    /**
     * @dev Get a jackpot win by index
     * @param index Index of the win
     * @return winner The address of the winner
     * @return amount The amount won
     * @return timestamp The time when the jackpot was won
     */
    function getJackpotHistory(uint256 index) external view returns (
        address winner,
        uint256 amount,
        uint256 timestamp
    ) {
        require(index < jackpotHistory.length, "Invalid index");
        JackpotWin memory win = jackpotHistory[index];
        return (win.winner, win.amount, win.timestamp);
    }

    /**
     * @dev Get jackpot history count
     * @return Number of jackpot history entries
     */
    function getJackpotHistoryCount() external view returns (uint256) {
        return jackpotHistory.length;
    }

    /**
     * @dev Get a slice of jackpot history to avoid gas limit issues
     * @param startIndex Starting index (inclusive)
     * @param endIndex Ending index (exclusive)
     * @return winners Array of winner addresses
     * @return amounts Array of amounts won
     * @return timestamps Array of win timestamps
     */
    function getJackpotHistorySlice(
        uint256 startIndex,
        uint256 endIndex
    ) external view returns (
        address[] memory winners,
        uint256[] memory amounts,
        uint256[] memory timestamps
    ) {
        require(startIndex < jackpotHistory.length, "Start index out of bounds");
        require(endIndex <= jackpotHistory.length, "End index out of bounds");
        require(startIndex < endIndex, "Invalid range");
        require(endIndex - startIndex <= MAX_BATCH_SIZE, "Range too large");

        uint256 length = endIndex - startIndex;
        winners = new address[](length);
        amounts = new uint256[](length);
        timestamps = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            JackpotWin memory win = jackpotHistory[startIndex + i];
            winners[i] = win.winner;
            amounts[i] = win.amount;
            timestamps[i] = win.timestamp;
        }

        return (winners, amounts, timestamps);
    }

    /**
     * @dev Get the token address
     * @return The token contract address
     */
    function getToken() external view returns (address) {
        return address(token);
    }

    /**
     * @notice Check if this contract is registered for Sonic FeeM
     * @return isRegistered Whether the contract is registered for fee monetization
     */
    function checkFeeMStatus() external view returns (bool isRegistered) {
    }

    /// @dev Register my contract on Sonic FeeM
    function registerMe() external {
        (bool _success,) = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830).call(
            abi.encodeWithSignature("selfRegister(uint256)", 143)
        );
        require(_success, "FeeM registration failed");
    }
}
