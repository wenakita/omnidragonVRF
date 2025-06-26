// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOmniDragonLotteryManager
 * @dev Interface for the unified OmniDragon Lottery Manager
 */
interface IOmniDragonLotteryManager {
    /**
     * @dev Lottery entry structure
     */
    struct LotteryEntry {
        address user;                    // User address
        uint256 swapAmountUSD;          // Swap amount in USD (scaled by 1e18)
        uint256 userVotingPower;        // User's veDRAGON voting power
        uint256 probabilityBps;         // Calculated win probability in basis points
        uint256 timestamp;              // Entry timestamp
        uint256 randomnessRequestId;    // Request ID for randomness
        bool processed;                 // Whether entry has been processed
        bool won;                       // Whether user won the lottery
        uint256 payoutAmount;           // Payout amount if won
    }

    /**
     * @dev Create a lottery entry for a user's swap
     * @param user User address
     * @param swapAmountUSD Swap amount in USD (scaled by 1e18)
     * @param userVotingPower User's veDRAGON voting power
     * @return entryId The created lottery entry ID (0 if entry not created)
     */
    function createLotteryEntry(
        address user,
        uint256 swapAmountUSD,
        uint256 userVotingPower
    ) external returns (uint256 entryId);

    /**
     * @dev Process a lottery entry (backward compatibility method)
     * @param user User address
     * @param amount Swap amount (will be treated as USD amount)
     * @dev This is a simplified version for backward compatibility
     */
    function processEntry(address user, uint256 amount) external;

    /**
     * @dev Process a lottery entry with randomness (called by RandomnessProvider)
     * @param randomnessRequestId The randomness request ID
     * @param randomValue Secure random value from VRF
     */
    function fulfillRandomness(uint256 randomnessRequestId, uint256 randomValue) external;

    /**
     * @dev Get lottery entry details
     * @param entryId Lottery entry ID
     * @return entry Lottery entry details
     */
    function getLotteryEntry(uint256 entryId) external view returns (LotteryEntry memory entry);

    /**
     * @dev Get user's lottery entries
     * @param user User address
     * @return entryIds Array of entry IDs for the user
     */
    function getUserEntries(address user) external view returns (uint256[] memory entryIds);

    /**
     * @dev Get user's pending entries count
     * @param user User address
     * @return count Number of pending entries
     */
    function getUserPendingEntries(address user) external view returns (uint256 count);

    /**
     * @dev Get lottery statistics
     * @return totalEntries Total entries created
     * @return totalWins Total wins
     * @return totalPayouts Total payout amount
     * @return winRate Win rate in basis points
     */
    function getLotteryStats() external view returns (
        uint256 totalEntries,
        uint256 totalWins,
        uint256 totalPayouts,
        uint256 winRate
    );

    /**
     * @dev Check if user can create lottery entry
     * @param user User address
     * @return canCreate Whether user can create entry
     * @return reason Reason if cannot create
     */
    function canCreateEntry(address user) external view returns (bool canCreate, string memory reason);

    // Events
    event LotteryEntryCreated(
        uint256 indexed entryId,
        address indexed user,
        uint256 swapAmountUSD,
        uint256 probabilityBps,
        uint256 randomnessRequestId
    );

    event LotteryProcessed(
        uint256 indexed entryId,
        address indexed user,
        bool won,
        uint256 randomValue,
        uint256 payoutAmount
    );

    event LotteryWin(
        uint256 indexed entryId,
        address indexed winner,
        uint256 swapAmountUSD,
        uint256 probabilityBps,
        uint256 payoutAmount
    );
}
