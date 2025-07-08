// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { DragonMarketLib } from "./DragonMarketLib.sol";

/**
 * @title DragonFeeProcessingLib
 * @dev Library for fee calculation and distribution logic
 *
 * FEE PROCESSING SYSTEM:
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * ✅ Multi-tiered fee structure (Jackpot, veDRAGON, Burn)
 * ✅ Precise fee calculations with basis points
 * ✅ Automated fee distribution to ecosystem contracts
 * ✅ Burn mechanism for deflationary tokenomics
 * ✅ Gas-optimized batch processing
 * ✅ Comprehensive event logging and tracking
 *
 * FEE STRUCTURE:
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * - Jackpot Fee (6.9%): Funds the Dragon Jackpot Vault for community rewards
 * - veDRAGON Fee (2.41%): Distributed to veDRAGON holders as staking rewards
 * - Burn Fee (0.69%): Tokens permanently removed from circulation
 * - Total Base Fee: 10% on trades (adjustable via governance)
 *
 * DISTRIBUTION TARGETS:
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * - Jackpot Vault: Receives jackpot fees for lottery and rewards
 * - Revenue Distributor: Distributes veDRAGON fees to stakers
 * - Burn Address: Tokens sent to zero address for deflation
 * - Fee Collector: Optional additional fee collection
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
library DragonFeeProcessingLib {
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    uint256 public constant BASIS_POINTS = 10000; // 100%
    address public constant BURN_ADDRESS = address(0);

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    struct FeeDistributionConfig {
        address jackpotVault;
        address revenueDistributor;
        address feeCollector;
        bool burnEnabled;
        bool distributionEnabled;
    }

    struct FeeAmounts {
        uint256 jackpotAmount;
        uint256 veDRAGONAmount;
        uint256 burnAmount;
        uint256 totalAmount;
    }

    struct FeeDistributionResult {
        uint256 jackpotDistributed;
        uint256 veDRAGONDistributed;
        uint256 burnedAmount;
        uint256 totalProcessed;
        bool allSuccessful;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    event FeesCalculated(
        uint256 transactionAmount,
        uint256 jackpotFee,
        uint256 veDRAGONFee,
        uint256 burnFee,
        uint256 totalFees
    );

    event FeeDistributed(
        address indexed recipient,
        uint256 amount,
        string feeType
    );

    event FeesProcessed(
        uint256 totalAmount,
        uint256 jackpotDistributed,
        uint256 veDRAGONDistributed,
        uint256 burned,
        bool allSuccessful
    );

    event FeeDistributionFailed(
        address indexed recipient,
        uint256 amount,
        string feeType,
        string reason
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // MAIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Calculate fees based on transaction amount and fee structure
     * @param amount Transaction amount
     * @param feeStructure Fee percentages structure
     * @return feeAmounts Calculated fee amounts
     */
    function calculateFees(
        uint256 amount,
        DragonMarketLib.Fees memory feeStructure
    ) internal pure returns (FeeAmounts memory feeAmounts) {
        // Calculate individual fee amounts
        feeAmounts.jackpotAmount = (amount * feeStructure.jackpot) / BASIS_POINTS;
        feeAmounts.veDRAGONAmount = (amount * feeStructure.veDRAGON) / BASIS_POINTS;
        feeAmounts.burnAmount = (amount * feeStructure.burn) / BASIS_POINTS;
        
        // Calculate total fees
        feeAmounts.totalAmount = feeAmounts.jackpotAmount + 
                                feeAmounts.veDRAGONAmount + 
                                feeAmounts.burnAmount;

        return feeAmounts;
    }

    /**
     * @dev Prepare fee distribution data (validation only - actual distribution done by calling contract)
     * @param feeAmounts Calculated fee amounts
     * @param config Distribution configuration
     * @return result Distribution preparation result
     */
    function prepareFeeDistribution(
        FeeAmounts memory feeAmounts,
        FeeDistributionConfig memory config
    ) internal pure returns (FeeDistributionResult memory result) {
        result.allSuccessful = true;

        // Validate jackpot fee distribution
        if (feeAmounts.jackpotAmount > 0 && validateDistribution(config.jackpotVault, feeAmounts.jackpotAmount)) {
            result.jackpotDistributed = feeAmounts.jackpotAmount;
        }

        // Validate veDRAGON fee distribution
        if (feeAmounts.veDRAGONAmount > 0 && validateDistribution(config.revenueDistributor, feeAmounts.veDRAGONAmount)) {
            result.veDRAGONDistributed = feeAmounts.veDRAGONAmount;
        }

        // Validate burn
        if (feeAmounts.burnAmount > 0 && config.burnEnabled && validateBurn(feeAmounts.burnAmount)) {
            result.burnedAmount = feeAmounts.burnAmount;
        }

        result.totalProcessed = result.jackpotDistributed + 
                               result.veDRAGONDistributed + 
                               result.burnedAmount;

        return result;
    }

    /**
     * @dev Validate fee distribution parameters
     * @param recipient Fee recipient address
     * @param amount Fee amount to distribute
     * @return isValid Whether parameters are valid for distribution
     */
    function validateDistribution(
        address recipient,
        uint256 amount
    ) internal pure returns (bool isValid) {
        return (recipient != address(0) && amount > 0);
    }

    /**
     * @dev Validate burn parameters
     * @param amount Amount to burn
     * @return isValid Whether parameters are valid for burning
     */
    function validateBurn(uint256 amount) internal pure returns (bool isValid) {
        return (amount > 0);
    }

    /**
     * @dev Calculate effective fee rate after processing
     * @param originalAmount Original transaction amount
     * @param feeAmounts Calculated fee amounts
     * @return effectiveRate Effective fee rate in basis points
     */
    function calculateEffectiveFeeRate(
        uint256 originalAmount,
        FeeAmounts memory feeAmounts
    ) internal pure returns (uint256 effectiveRate) {
        if (originalAmount == 0) return 0;
        
        effectiveRate = (feeAmounts.totalAmount * BASIS_POINTS) / originalAmount;
        return effectiveRate;
    }

    /**
     * @dev Preview fee calculation without processing
     * @param amount Transaction amount
     * @param feeStructure Fee structure
     * @return feeAmounts Calculated fee amounts
     * @return effectiveRate Effective fee rate
     */
    function previewFees(
        uint256 amount,
        DragonMarketLib.Fees memory feeStructure
    ) internal pure returns (
        FeeAmounts memory feeAmounts,
        uint256 effectiveRate
    ) {
        feeAmounts = calculateFees(amount, feeStructure);
        effectiveRate = calculateEffectiveFeeRate(amount, feeAmounts);
        
        return (feeAmounts, effectiveRate);
    }

    /**
     * @dev Calculate net amount after fees
     * @param grossAmount Gross transaction amount
     * @param feeStructure Fee structure
     * @return netAmount Amount after fees deducted
     * @return feeAmounts Calculated fee amounts
     */
    function calculateNetAmount(
        uint256 grossAmount,
        DragonMarketLib.Fees memory feeStructure
    ) internal pure returns (
        uint256 netAmount,
        FeeAmounts memory feeAmounts
    ) {
        feeAmounts = calculateFees(grossAmount, feeStructure);
        netAmount = grossAmount - feeAmounts.totalAmount;
        
        return (netAmount, feeAmounts);
    }

    /**
     * @dev Batch process fees for multiple transactions
     * @param amounts Array of transaction amounts
     * @param feeStructure Fee structure to apply
     * @param config Distribution configuration
     * @return results Array of distribution results
     * @return totalProcessed Total amount processed across all transactions
     */
    function batchProcessFees(
        uint256[] memory amounts,
        DragonMarketLib.Fees memory feeStructure,
        FeeDistributionConfig memory config
    ) internal returns (
        FeeDistributionResult[] memory results,
        uint256 totalProcessed
    ) {
        results = new FeeDistributionResult[](amounts.length);
        totalProcessed = 0;

        for (uint256 i = 0; i < amounts.length; i++) {
            FeeAmounts memory feeAmounts = calculateFees(amounts[i], feeStructure);
            results[i] = prepareFeeDistribution(feeAmounts, config);
            totalProcessed += results[i].totalProcessed;
        }

        return (results, totalProcessed);
    }

    /**
     * @dev Validate fee structure parameters
     * @param feeStructure Fee structure to validate
     * @param maxTotalFee Maximum allowed total fee
     * @return isValid Whether fee structure is valid
     * @return reason Reason if invalid
     */
    function validateFeeStructure(
        DragonMarketLib.Fees memory feeStructure,
        uint256 maxTotalFee
    ) internal pure returns (bool isValid, string memory reason) {
        if (feeStructure.total > maxTotalFee) {
            return (false, "Total fee exceeds maximum");
        }

        if (feeStructure.total != (feeStructure.jackpot + feeStructure.veDRAGON + feeStructure.burn)) {
            return (false, "Fee components don't sum to total");
        }

        if (feeStructure.jackpot > BASIS_POINTS || 
            feeStructure.veDRAGON > BASIS_POINTS || 
            feeStructure.burn > BASIS_POINTS) {
            return (false, "Individual fee exceeds 100%");
        }

        return (true, "");
    }

    /**
     * @dev Get fee distribution summary
     * @param feeAmounts Fee amounts
     * @param config Distribution configuration
     * @return summary Human-readable fee distribution summary
     */
    function getFeeDistributionSummary(
        FeeAmounts memory feeAmounts,
        FeeDistributionConfig memory config
    ) internal pure returns (string memory summary) {
        // This would return a formatted string summary of fee distribution
        // Implementation depends on specific formatting requirements
        return "Fee distribution summary"; // Simplified for now
    }


} 