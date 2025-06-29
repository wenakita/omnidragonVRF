// SPDX-License-Identifier: MIT

/**
 * @title IveDRAGONBoostManager
 * @dev Interface for the veDRAGON boost manager contract
 *
 * Provides additional functionality for veDRAGON holders including boosts for protocol actions
 * Manages partner probability boosts and voting-based lottery enhancements
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */

pragma solidity ^0.8.20;

/**
 * @title IveDRAGONBoostManager
 * @dev Interface for the veDRAGON boost manager contract
 *
 * Provides additional functionality for veDRAGON holders including boosts for protocol actions
 * Manages partner probability boosts and voting-based lottery enhancements
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
interface IveDRAGONBoostManager {
    // === Events ===
    event BoostCalculated(address indexed user, uint256 boost);

    // === View Functions ===
    /**
     * @dev Get the probability boost for a partner
     * @param partnerId Partner ID
     * @return Probability boost in basis points (e.g., 100 = 1%)
     */
    function getPartnerProbabilityBoost(uint256 partnerId) external view returns (uint256);

    // === Action Functions ===
    /**
     * @dev Calculate boost for a user and emit an event
     * @param user User address
     * @return Boost multiplier
     */
    function getBoostWithEvent(address user) external returns (uint256);

    /**
     * @dev Enter jackpot with a boosted amount
     * @param user User address
     * @param amount Base amount to boost
     * @return Boosted amount
     */
    function enterJackpotWithBoost(address user, uint256 amount) external returns (uint256);

    /**
     * @dev Vote for a partner to allocate probability boost
     * @param partnerId Partner ID
     * @param weight Voting weight (optional, may be unused in some implementations)
     */
    function voteForPartner(uint256 partnerId, uint256 weight) external;
}
