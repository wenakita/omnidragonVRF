// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IomniDRAGON } from "../../interfaces/tokens/IomniDRAGON.sol";

// Custom errors
error ArrayTooLarge();

/**
 * @title OmniDragonViewHelper
 * @dev Helper contract for view functions removed from main omniDRAGON contract
 * @notice This contract provides non-essential view functions for external tooling and analytics
 * 
 * Benefits:
 * - Reduces main contract size by ~1-2KB
 * - Keeps analytics functions available for external tools
 * - Cleaner main contract focused on core functionality
 */
contract OmniDragonViewHelper {
    
    // SECURITY FIX: Add maximum array size to prevent DoS attacks
    uint256 public constant MAX_BATCH_SIZE = 100;
    
    /**
     * @notice Get the maximum transaction amount for omniDRAGON
     * @return The maximum single transfer amount
     */
    function maxTransactionAmount() external pure returns (uint256) {
        return 1_000_000 * 10**18; // MAX_SINGLE_TRANSFER constant
    }
    
    /**
     * @notice Get contract balances for a given omniDRAGON contract
     * @param token The omniDRAGON contract address
     * @return tokenBalance The contract's token balance
     * @return nativeBalance The contract's native balance
     */
    function getContractBalance(address token) external view returns (uint256 tokenBalance, uint256 nativeBalance) {
        return (IERC20(token).balanceOf(token), token.balance);
    }
    
    /**
     * @notice Get operational funds balance (wrapped native tokens) for a given omniDRAGON contract
     * @param token The omniDRAGON contract address
     * @return The contract's operational funds balance
     */
    function getWETHBalance(address token) external view returns (uint256) {
        try IomniDRAGON(token).getOperationalFundsBalance() returns (uint256 balance) {
            return balance;
        } catch {
            return 0;
        }
    }
    
    /**
     * @notice Get version information
     * @return The contract version
     */
    function version() external pure returns (string memory) {
        return "2.3.0-optimized";
    }
    
    /**
     * @notice Get comprehensive analytics for omniDRAGON contract
     * @param token The omniDRAGON contract address
     * @return tokenBalance Contract token balance
     * @return nativeBalance Contract native balance
     * @return wethBalance Contract WETH balance
     * @return maxTxAmount Maximum transaction amount
     */
    function getAnalytics(address token) external view returns (
        uint256 tokenBalance,
        uint256 nativeBalance,
        uint256 wethBalance,
        uint256 maxTxAmount
    ) {
        (tokenBalance, nativeBalance) = this.getContractBalance(token);
        wethBalance = this.getWETHBalance(token);
        maxTxAmount = this.maxTransactionAmount();
    }
    
    /**
     * @notice Batch view function to get multiple contract analytics
     * @param tokens Array of omniDRAGON contract addresses
     * @return tokenBalances Array of token balances
     * @return nativeBalances Array of native balances
     * @return wethBalances Array of WETH balances
     * SECURITY FIX: Added array size limit to prevent DoS attacks - CVE-2024-AUDIT-012
     */
    function batchGetAnalytics(address[] calldata tokens) external view returns (
        uint256[] memory tokenBalances,
        uint256[] memory nativeBalances,
        uint256[] memory wethBalances
    ) {
        uint256 length = tokens.length;
        
        // SECURITY FIX: Prevent DoS attacks by limiting array size
        if (length > MAX_BATCH_SIZE) revert ArrayTooLarge();
        
        tokenBalances = new uint256[](length);
        nativeBalances = new uint256[](length);
        wethBalances = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            (tokenBalances[i], nativeBalances[i]) = this.getContractBalance(tokens[i]);
            wethBalances[i] = this.getWETHBalance(tokens[i]);
        }
    }
} 