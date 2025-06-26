// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DragonFeeProcessingLib
 * @dev Complete fee processing library for Dragon ecosystem
 * Handles all fee calculations, distributions, and validations
 */
library DragonFeeProcessingLib {
    using SafeERC20 for IERC20;
    
    // ======== EVENTS ========
    event FeeCalculated(
        address indexed token,
        uint256 amount,
        uint256 jackpotFee,
        uint256 veDRAGONFee,
        uint256 burnFee
    );
    
    event FeeDistributed(
        address indexed recipient,
        address indexed token,
        uint256 amount,
        string feeType
    );
    
    event FeeStructureUpdated(
        string feeType,
        uint256 jackpot,
        uint256 veDRAGON,
        uint256 burn,
        uint256 total
    );
    
    // ======== STRUCTS ========
    
    /**
     * @dev Fee structure for different transaction types
     */
    struct Fees {
        uint256 jackpot;    // Basis points for jackpot
        uint256 veDRAGON;   // Basis points for veDRAGON holders
        uint256 burn;       // Basis points for token burn
        uint256 total;      // Total basis points (sum of above)
    }
    
    /**
     * @dev Fee distribution configuration
     */
    struct FeeDistribution {
        address jackpotVault;
        address revenueDistributor;
        address burnAddress;
        bool distributionEnabled;
    }
    
    /**
     * @dev Fee calculation result
     */
    struct FeeCalculation {
        uint256 jackpotAmount;
        uint256 veDRAGONAmount;
        uint256 burnAmount;
        uint256 totalFeeAmount;
        uint256 transferAmount;
    }
    
    // ======== CONSTANTS ========
    
    uint256 public constant MAX_TOTAL_FEE = 2500; // 25% maximum total fee
    uint256 public constant BASIS_POINTS = 10000; // 100% = 10,000 basis points
    uint256 public constant MIN_FEE_AMOUNT = 1000; // Minimum 0.01% fee
    
    // Default fee structures
    uint256 public constant DEFAULT_BUY_JACKPOT = 690;  // 6.9%
    uint256 public constant DEFAULT_BUY_VEDRAGON = 241; // 2.41%
    uint256 public constant DEFAULT_BUY_BURN = 69;      // 0.69%
    
    uint256 public constant DEFAULT_SELL_JACKPOT = 690; // 6.9%
    uint256 public constant DEFAULT_SELL_VEDRAGON = 241;// 2.41%
    uint256 public constant DEFAULT_SELL_BURN = 69;     // 0.69%
    
    uint256 public constant DEFAULT_TRANSFER_JACKPOT = 0; // 0%
    uint256 public constant DEFAULT_TRANSFER_VEDRAGON = 0;// 0%
    uint256 public constant DEFAULT_TRANSFER_BURN = 69;   // 0.69%
    
    // ======== ERRORS ========
    
    error InvalidFeeStructure();
    error FeeTooHigh();
    error ZeroAmount();
    error ZeroAddress();
    error DistributionFailed();
    error InvalidBasisPoints();
    
    // ======== FUNCTIONS ========
    
    /**
     * @dev Initialize default fee structures
     */
    function initializeDefaultFees() internal pure returns (Fees memory buyFees, Fees memory sellFees, Fees memory transferFees) {
        buyFees = Fees({
            jackpot: DEFAULT_BUY_JACKPOT,
            veDRAGON: DEFAULT_BUY_VEDRAGON,
            burn: DEFAULT_BUY_BURN,
            total: DEFAULT_BUY_JACKPOT + DEFAULT_BUY_VEDRAGON + DEFAULT_BUY_BURN
        });
        
        sellFees = Fees({
            jackpot: DEFAULT_SELL_JACKPOT,
            veDRAGON: DEFAULT_SELL_VEDRAGON,
            burn: DEFAULT_SELL_BURN,
            total: DEFAULT_SELL_JACKPOT + DEFAULT_SELL_VEDRAGON + DEFAULT_SELL_BURN
        });
        
        transferFees = Fees({
            jackpot: DEFAULT_TRANSFER_JACKPOT,
            veDRAGON: DEFAULT_TRANSFER_VEDRAGON,
            burn: DEFAULT_TRANSFER_BURN,
            total: DEFAULT_TRANSFER_JACKPOT + DEFAULT_TRANSFER_VEDRAGON + DEFAULT_TRANSFER_BURN
        });
        
        return (buyFees, sellFees, transferFees);
    }
    
    /**
     * @dev Validate fee structure
     */
    function validateFees(uint256 jackpot, uint256 veDRAGON, uint256 burn) internal pure returns (uint256 total) {
        total = jackpot + veDRAGON + burn;
        
        if (total > MAX_TOTAL_FEE) {
            revert FeeTooHigh();
        }
        
        if (jackpot > BASIS_POINTS || veDRAGON > BASIS_POINTS || burn > BASIS_POINTS) {
            revert InvalidBasisPoints();
        }
        
        return total;
    }
    
    /**
     * @dev Calculate fees for a transaction
     */
    function calculateFees(
        uint256 amount,
        Fees memory feeStructure
    ) internal pure returns (FeeCalculation memory calculation) {
        if (amount == 0) {
            revert ZeroAmount();
        }
        
        uint256 feeBase = amount / BASIS_POINTS;
        
        calculation.jackpotAmount = feeStructure.jackpot * feeBase;
        calculation.veDRAGONAmount = feeStructure.veDRAGON * feeBase;
        calculation.burnAmount = feeStructure.burn * feeBase;
        
        calculation.totalFeeAmount = calculation.jackpotAmount + 
                                   calculation.veDRAGONAmount + 
                                   calculation.burnAmount;
        
        calculation.transferAmount = amount - calculation.totalFeeAmount;
        
        return calculation;
    }
    
    /**
     * @dev Calculate fees with dynamic adjustments
     */
    function calculateDynamicFees(
        uint256 amount,
        Fees memory baseFeeStructure,
        uint256 volumeMultiplier,  // Basis points multiplier based on volume
        uint256 loyaltyDiscount    // Basis points discount for loyal users
    ) internal pure returns (FeeCalculation memory calculation) {
        if (amount == 0) {
            revert ZeroAmount();
        }
        
        // Apply volume multiplier (can increase fees for high volume)
        uint256 adjustedJackpot = (baseFeeStructure.jackpot * volumeMultiplier) / BASIS_POINTS;
        uint256 adjustedVeDRAGON = (baseFeeStructure.veDRAGON * volumeMultiplier) / BASIS_POINTS;
        uint256 adjustedBurn = (baseFeeStructure.burn * volumeMultiplier) / BASIS_POINTS;
        
        // Apply loyalty discount
        adjustedJackpot = adjustedJackpot > loyaltyDiscount ? adjustedJackpot - loyaltyDiscount : 0;
        adjustedVeDRAGON = adjustedVeDRAGON > loyaltyDiscount ? adjustedVeDRAGON - loyaltyDiscount : 0;
        adjustedBurn = adjustedBurn > loyaltyDiscount ? adjustedBurn - loyaltyDiscount : 0;
        
        // Ensure we don't exceed maximum fee
        uint256 totalAdjusted = adjustedJackpot + adjustedVeDRAGON + adjustedBurn;
        if (totalAdjusted > MAX_TOTAL_FEE) {
            // Scale down proportionally
            adjustedJackpot = (adjustedJackpot * MAX_TOTAL_FEE) / totalAdjusted;
            adjustedVeDRAGON = (adjustedVeDRAGON * MAX_TOTAL_FEE) / totalAdjusted;
            adjustedBurn = (adjustedBurn * MAX_TOTAL_FEE) / totalAdjusted;
        }
        
        Fees memory adjustedFees = Fees({
            jackpot: adjustedJackpot,
            veDRAGON: adjustedVeDRAGON,
            burn: adjustedBurn,
            total: adjustedJackpot + adjustedVeDRAGON + adjustedBurn
        });
        
        return calculateFees(amount, adjustedFees);
    }
    
    /**
     * @dev Distribute fees to respective recipients
     */
    function distributeFees(
        FeeCalculation memory calculation,
        FeeDistribution memory distribution,
        address token
    ) internal {
        if (!distribution.distributionEnabled) {
            return;
        }
        
        // Distribute to jackpot vault
        if (calculation.jackpotAmount > 0 && distribution.jackpotVault != address(0)) {
            if (token == address(0)) {
                // Native token transfer
                (bool success, ) = distribution.jackpotVault.call{value: calculation.jackpotAmount}("");
                if (!success) revert DistributionFailed();
            } else {
                // ERC20 token transfer
                IERC20(token).safeTransfer(distribution.jackpotVault, calculation.jackpotAmount);
            }
            
            emit FeeDistributed(distribution.jackpotVault, token, calculation.jackpotAmount, "Jackpot");
        }
        
        // Distribute to veDRAGON revenue distributor
        if (calculation.veDRAGONAmount > 0 && distribution.revenueDistributor != address(0)) {
            if (token == address(0)) {
                // Native token transfer
                (bool success, ) = distribution.revenueDistributor.call{value: calculation.veDRAGONAmount}("");
                if (!success) revert DistributionFailed();
            } else {
                // ERC20 token transfer
                IERC20(token).safeTransfer(distribution.revenueDistributor, calculation.veDRAGONAmount);
            }
            
            emit FeeDistributed(distribution.revenueDistributor, token, calculation.veDRAGONAmount, "veDRAGON");
        }
        
        // Handle burn (transfer to burn address or actual burn)
        if (calculation.burnAmount > 0) {
            if (distribution.burnAddress != address(0)) {
                if (token == address(0)) {
                    // Native token to burn address
                    (bool success, ) = distribution.burnAddress.call{value: calculation.burnAmount}("");
                    if (!success) revert DistributionFailed();
                } else {
                    // ERC20 to burn address
                    IERC20(token).safeTransfer(distribution.burnAddress, calculation.burnAmount);
                }
                
                emit FeeDistributed(distribution.burnAddress, token, calculation.burnAmount, "Burn");
            }
            // If burnAddress is address(0), the tokens are effectively burned by not being transferred
        }
    }
    
    /**
     * @dev Update fee structure with validation
     */
    function updateFeeStructure(
        Fees storage fees,
        uint256 jackpot,
        uint256 veDRAGON,
        uint256 burn,
        string memory feeType
    ) internal {
        uint256 total = validateFees(jackpot, veDRAGON, burn);
        
        fees.jackpot = jackpot;
        fees.veDRAGON = veDRAGON;
        fees.burn = burn;
        fees.total = total;
        
        emit FeeStructureUpdated(feeType, jackpot, veDRAGON, burn, total);
    }
    
    /**
     * @dev Get effective fee rate based on user metrics
     */
    function getEffectiveFeeRate(
        Fees memory baseFees,
        uint256 userVolume,
        uint256 userTransactions,
        uint256 holdingTime
    ) internal pure returns (Fees memory effectiveFees) {
        // Calculate loyalty discount based on metrics
        uint256 volumeDiscount = userVolume > 1000 ether ? 50 : 0; // 0.5% discount for high volume
        uint256 transactionDiscount = userTransactions > 100 ? 25 : 0; // 0.25% discount for frequent users
        uint256 holdingDiscount = holdingTime > 365 days ? 25 : 0; // 0.25% discount for long-term holders
        
        uint256 totalDiscount = volumeDiscount + transactionDiscount + holdingDiscount;
        if (totalDiscount > 100) totalDiscount = 100; // Max 1% total discount
        
        // Apply discount to each fee component
        effectiveFees.jackpot = baseFees.jackpot > totalDiscount ? baseFees.jackpot - totalDiscount : 0;
        effectiveFees.veDRAGON = baseFees.veDRAGON > totalDiscount ? baseFees.veDRAGON - totalDiscount : 0;
        effectiveFees.burn = baseFees.burn > totalDiscount ? baseFees.burn - totalDiscount : 0;
        effectiveFees.total = effectiveFees.jackpot + effectiveFees.veDRAGON + effectiveFees.burn;
        
        return effectiveFees;
    }
    
    /**
     * @dev Calculate total fees for a transaction without distribution
     */
    function calculateTotalFee(uint256 amount, Fees memory feeStructure) internal pure returns (uint256) {
        if (amount == 0) return 0;
        return (amount * feeStructure.total) / BASIS_POINTS;
    }
    
    /**
     * @dev Check if fee structure is valid
     */
    function isValidFeeStructure(Fees memory fees) internal pure returns (bool) {
        return fees.total <= MAX_TOTAL_FEE && 
               fees.total == (fees.jackpot + fees.veDRAGON + fees.burn);
    }
}
