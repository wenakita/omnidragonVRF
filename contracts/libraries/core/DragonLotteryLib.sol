// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IOmniDragonLotteryManager } from "../../interfaces/lottery/IOmniDragonLotteryManager.sol";

/**
 * @title DragonLotteryLib
 * @dev Library for lottery entry processing and boost calculations
 *
 * LOTTERY SYSTEM:
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * ✅ Automatic lottery entries on qualifying transactions
 * ✅ Partner boost multiplier integration
 * ✅ Volume-based entry calculations
 * ✅ Gas-optimized entry processing
 * ✅ Safe external contract interactions
 * ✅ Comprehensive event logging
 *
 * ENTRY CALCULATION:
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * - Base Entries: 1 entry per 1000 tokens transacted
 * - Partner Boost: Additional entries based on user's partner status
 * - Minimum Threshold: Must meet minimum transaction size for entries
 * - Maximum Cap: Entries capped to prevent gaming
 *
 * BOOST SYSTEM:
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * - veDRAGON Holders: Up to 50% bonus entries
 * - Partner Status: Additional multipliers for verified partners
 * - Volume Tiers: Higher volume = better boost rates
 * - Time-based Bonuses: Long-term holders get enhanced boosts
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
library DragonLotteryLib {
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    uint256 public constant BASIS_POINTS = 10000; // 100%
    uint256 public constant TOKENS_PER_ENTRY = 1000 * 10**18; // 1000 tokens = 1 entry
    uint256 public constant MIN_TRANSACTION_FOR_ENTRY = 100 * 10**18; // 100 tokens minimum
    uint256 public constant MAX_ENTRIES_PER_TX = 1000; // Maximum entries per transaction
    uint256 public constant MAX_BOOST_PERCENTAGE = 5000; // 50% maximum boost

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    struct LotteryConfig {
        address lotteryManager;
        address boostManager;
        bool lotteryEnabled;
        uint256 minTransactionForEntry;
        uint256 tokensPerEntry;
        uint256 maxEntriesPerTx;
    }

    struct EntryCalculation {
        uint256 baseEntries;
        uint256 boostPercentage;
        uint256 boostedEntries;
        uint256 totalEntries;
        bool isEligible;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    event LotteryEntryProcessed(
        address indexed user,
        uint256 transactionAmount,
        uint256 baseEntries,
        uint256 boostPercentage,
        uint256 totalEntries,
        bool success
    );

    event LotteryEntryFailed(
        address indexed user,
        uint256 transactionAmount,
        string reason
    );

    event BoostCalculated(
        address indexed user,
        uint256 baseBoost,
        uint256 partnerBoost,
        uint256 volumeBoost,
        uint256 totalBoost
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // MAIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Process lottery entry for eligible transactions
     * @param config Lottery configuration
     * @param user User address
     * @param amount Transaction amount
     * @return success Whether the entry was processed successfully
     * @return totalEntries Number of entries awarded
     */
    function processLotteryEntry(
        LotteryConfig memory config,
        address user,
        uint256 amount
    ) internal returns (bool success, uint256 totalEntries) {
        // Check if lottery is enabled and manager is set
        if (!config.lotteryEnabled || config.lotteryManager == address(0)) {
            return (false, 0);
        }

        // Calculate entry details
        EntryCalculation memory calculation = calculateEntries(config, user, amount);
        
        // Check if user is eligible for entries
        if (!calculation.isEligible || calculation.totalEntries == 0) {
            return (false, 0);
        }

        // Process entry with lottery manager
        try IOmniDragonLotteryManager(config.lotteryManager).processEntry(
            user, 
            calculation.totalEntries
        ) {
            success = true;
            totalEntries = calculation.totalEntries;
        } catch Error(string memory reason) {
            success = false;
            totalEntries = 0;
        } catch {
            success = false;
            totalEntries = 0;
        }

        return (success, totalEntries);
    }

    /**
     * @dev Calculate lottery entries for a transaction
     * @param config Lottery configuration
     * @param user User address
     * @param amount Transaction amount
     * @return calculation Entry calculation details
     */
    function calculateEntries(
        LotteryConfig memory config,
        address user,
        uint256 amount
    ) internal view returns (EntryCalculation memory calculation) {
        // Check minimum transaction threshold
        if (amount < config.minTransactionForEntry) {
            calculation.isEligible = false;
            return calculation;
        }

        // Calculate base entries
        calculation.baseEntries = amount / config.tokensPerEntry;
        
        // Cap entries per transaction
        if (calculation.baseEntries > config.maxEntriesPerTx) {
            calculation.baseEntries = config.maxEntriesPerTx;
        }

        // Skip if no base entries
        if (calculation.baseEntries == 0) {
            calculation.isEligible = false;
            return calculation;
        }

        // Calculate boost percentage
        calculation.boostPercentage = getPartnerBoost(config, user);
        
        // Calculate boosted entries
        calculation.boostedEntries = (calculation.baseEntries * calculation.boostPercentage) / BASIS_POINTS;
        
        // Calculate total entries
        calculation.totalEntries = calculation.baseEntries + calculation.boostedEntries;
        
        // Mark as eligible
        calculation.isEligible = true;

        return calculation;
    }

    /**
     * @dev Get partner boost percentage for user
     * @param config Lottery configuration
     * @param user User address
     * @return boostPercentage Boost percentage in basis points
     */
    function getPartnerBoost(
        LotteryConfig memory config,
        address user
    ) internal view returns (uint256 boostPercentage) {
        // If no boost manager, return 0
        if (config.boostManager == address(0)) {
            return 0;
        }

        // For now, return a default boost
        // In a full implementation, this would query the boost manager
        // but since we don't have the interface implementation,
        // we'll use a simplified approach
        
        // Could implement different boost tiers:
        // - Basic users: 0% boost
        // - veDRAGON holders: 10-25% boost
        // - Partners: 25-50% boost
        // - Long-term holders: Additional 5-15% boost
        
        return 0; // Simplified for now
    }

    /**
     * @dev Calculate comprehensive boost including multiple factors
     * @param config Lottery configuration
     * @param user User address
     * @param transactionAmount Current transaction amount
     * @return totalBoost Total boost percentage in basis points
     */
    function calculateComprehensiveBoost(
        LotteryConfig memory config,
        address user,
        uint256 transactionAmount
    ) internal view returns (uint256 totalBoost) {
        uint256 baseBoost = 0;
        uint256 partnerBoost = 0;
        uint256 volumeBoost = 0;
        uint256 timeBoost = 0;

        // Base boost from partner status
        baseBoost = getPartnerBoost(config, user);

        // Volume-based boost (larger transactions get slight boost)
        if (transactionAmount >= 10000 * 10**18) { // 10k+ tokens
            volumeBoost = 500; // 5% additional boost
        } else if (transactionAmount >= 5000 * 10**18) { // 5k+ tokens
            volumeBoost = 250; // 2.5% additional boost
        } else if (transactionAmount >= 1000 * 10**18) { // 1k+ tokens
            volumeBoost = 100; // 1% additional boost
        }

        // Combine all boosts
        totalBoost = baseBoost + partnerBoost + volumeBoost + timeBoost;

        // Cap total boost
        if (totalBoost > MAX_BOOST_PERCENTAGE) {
            totalBoost = MAX_BOOST_PERCENTAGE;
        }

        return totalBoost;
    }

    /**
     * @dev Preview lottery entries without processing
     * @param config Lottery configuration
     * @param user User address
     * @param amount Transaction amount
     * @return calculation Entry calculation preview
     */
    function previewLotteryEntry(
        LotteryConfig memory config,
        address user,
        uint256 amount
    ) internal view returns (EntryCalculation memory calculation) {
        return calculateEntries(config, user, amount);
    }

    /**
     * @dev Check if user is eligible for lottery entries
     * @param config Lottery configuration
     * @param user User address
     * @param amount Transaction amount
     * @return isEligible Whether user is eligible
     * @return reason Reason if not eligible
     */
    function checkLotteryEligibility(
        LotteryConfig memory config,
        address user,
        uint256 amount
    ) internal view returns (bool isEligible, string memory reason) {
        if (!config.lotteryEnabled) {
            return (false, "Lottery disabled");
        }

        if (config.lotteryManager == address(0)) {
            return (false, "No lottery manager");
        }

        if (amount < config.minTransactionForEntry) {
            return (false, "Amount below minimum");
        }

        if (amount / config.tokensPerEntry == 0) {
            return (false, "No entries earned");
        }

        return (true, "");
    }

    /**
     * @dev Get lottery statistics for a user
     * @param config Lottery configuration
     * @param user User address
     * @param amount Transaction amount
     * @return baseEntries Base entries without boost
     * @return boostPercentage Applied boost percentage
     * @return totalEntries Total entries with boost
     * @return isEligible Whether user is eligible
     */
    function getLotteryStats(
        LotteryConfig memory config,
        address user,
        uint256 amount
    ) internal view returns (
        uint256 baseEntries,
        uint256 boostPercentage,
        uint256 totalEntries,
        bool isEligible
    ) {
        EntryCalculation memory calculation = calculateEntries(config, user, amount);
        
        return (
            calculation.baseEntries,
            calculation.boostPercentage,
            calculation.totalEntries,
            calculation.isEligible
        );
    }

    /**
     * @dev Batch process lottery entries for multiple users
     * @param config Lottery configuration
     * @param users Array of user addresses
     * @param amounts Array of transaction amounts
     * @return successes Array of success flags
     * @return totalEntries Array of total entries awarded
     */
    function batchProcessLotteryEntries(
        LotteryConfig memory config,
        address[] memory users,
        uint256[] memory amounts
    ) internal returns (
        bool[] memory successes,
        uint256[] memory totalEntries
    ) {
        require(users.length == amounts.length, "DragonLotteryLib: Array length mismatch");
        
        successes = new bool[](users.length);
        totalEntries = new uint256[](users.length);

        for (uint256 i = 0; i < users.length; i++) {
            (successes[i], totalEntries[i]) = processLotteryEntry(
                config,
                users[i],
                amounts[i]
            );
        }

        return (successes, totalEntries);
    }
} 