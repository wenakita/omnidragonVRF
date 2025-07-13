// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IOmniDragonHybridRegistry } from "../../interfaces/config/IOmniDragonHybridRegistry.sol";

/**
 * @title DragonFeeMHelper
 * @dev Dedicated helper contract for Sonic FeeM integration and revenue routing
 * @notice Handles FeeM registration and routes all revenue to jackpot vault
 * 
 * Benefits:
 * - Separates FeeM logic from main omniDRAGON contract
 * - Reduces main contract size by ~500 bytes
 * - Centralizes fee routing logic
 * - Can be upgraded independently
 * - Chain-specific deployment (only needed on Sonic)
 * 
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract DragonFeeMHelper is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Constants
    uint256 public constant SONIC_CHAIN_ID = 146;
    address public constant SONIC_FEEM_CONTRACT = 0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830;
    
    // State variables
    IOmniDragonHybridRegistry public immutable registry;
    uint256 public feeMRegistrationId;
    bool public autoForwardEnabled = true;
    
    // Statistics
    uint256 public totalFeeMRevenue;
    uint256 public totalForwarded;
    uint256 public lastForwardTime;
    
    // Events
    event FeeMRegistered(uint256 indexed registrationId, bool success);
    event FeeMRevenueReceived(uint256 amount, uint256 timestamp);
    event FeeMRevenueForwarded(address indexed jackpot, uint256 amount, uint256 timestamp);
    event AutoForwardToggled(bool enabled);
    event RegistrationIdUpdated(uint256 oldId, uint256 newId);
    event EmergencyWithdraw(address indexed token, uint256 amount, address indexed to);
    
    // Errors
    error NotSonicChain();
    error ZeroAddress();
    error TransferFailed();
    error RegistrationFailed();
    error InsufficientBalance();
    error AmountBelowMinimum();
    
    /**
     * @dev Constructor
     * @param _registry Registry contract address
     * @param _registrationId Initial FeeM registration ID
     * @param _owner Owner address
     */
    constructor(
        address _registry,
        uint256 _registrationId,
        address _owner
    ) Ownable(_owner) {
        if (_registry == address(0)) revert ZeroAddress();
        if (_owner == address(0)) revert ZeroAddress();
        
        // Only deploy on Sonic chain
        if (block.chainid != SONIC_CHAIN_ID) revert NotSonicChain();
        
        registry = IOmniDragonHybridRegistry(_registry);
        feeMRegistrationId = _registrationId;
        
        // Auto-register on deployment
        _registerForFeeM();
    }
    
    /**
     * @dev Register contract for Sonic FeeM
     */
    function registerForFeeM() external onlyOwner {
        _registerForFeeM();
    }
    
    /**
     * @dev Internal FeeM registration
     */
    function _registerForFeeM() internal {
        (bool success,) = SONIC_FEEM_CONTRACT.call(
            abi.encodeWithSignature("selfRegister(uint256)", feeMRegistrationId)
        );
        
        emit FeeMRegistered(feeMRegistrationId, success);
        
        if (!success) revert RegistrationFailed();
    }
    
    /**
     * @dev Update FeeM registration ID
     * @param _newId New registration ID
     */
    function setFeeMRegistrationId(uint256 _newId) external onlyOwner {
        uint256 oldId = feeMRegistrationId;
        feeMRegistrationId = _newId;
        emit RegistrationIdUpdated(oldId, _newId);
        
        // Re-register with new ID
        _registerForFeeM();
    }
    
    /**
     * @dev Toggle auto-forward functionality
     * @param _enabled Whether to auto-forward revenue
     */
    function setAutoForward(bool _enabled) external onlyOwner {
        autoForwardEnabled = _enabled;
        emit AutoForwardToggled(_enabled);
    }
    
    /**
     * @dev Receive FeeM revenue and auto-forward to jackpot
     * SECURITY FIX: Added reentrancy protection for external calls safety
     * Critical vulnerability fix - CVE-2024-AUDIT-007
     */
    receive() external payable nonReentrant {
        if (msg.value > 0) {
            totalFeeMRevenue += msg.value;
            emit FeeMRevenueReceived(msg.value, block.timestamp);
            
            if (autoForwardEnabled) {
                _forwardToJackpot(msg.value);
            }
        }
    }
    
    /**
     * @dev Manually forward accumulated revenue to jackpot
     * @param amount Amount to forward (0 = all)
     */
    function forwardToJackpot(uint256 amount) external nonReentrant {
        uint256 balance = address(this).balance;
        if (balance == 0) revert InsufficientBalance();
        
        uint256 forwardAmount = amount == 0 ? balance : amount;
        if (forwardAmount > balance) revert InsufficientBalance();
        
        _forwardToJackpot(forwardAmount);
    }
    
    /**
     * @dev Internal function to forward revenue to jackpot
     * @param amount Amount to forward
     */
    function _forwardToJackpot(uint256 amount) internal {
        address jackpotVault = registry.getJackpotVault(uint16(block.chainid));
        if (jackpotVault == address(0)) revert ZeroAddress();
        
        (bool success,) = payable(jackpotVault).call{value: amount}("");
        if (!success) revert TransferFailed();
        
        totalForwarded += amount;
        lastForwardTime = block.timestamp;
        
        emit FeeMRevenueForwarded(jackpotVault, amount, block.timestamp);
    }
    
    /**
     * @dev Emergency withdraw function
     * @param token Token address (address(0) for native)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (amount == 0) revert AmountBelowMinimum();
        
        if (token == address(0)) {
            // Native token withdrawal
            uint256 balance = address(this).balance;
            if (balance < amount) revert InsufficientBalance();
            
            (bool success,) = payable(owner()).call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // SECURITY FIX: Use SafeERC20 instead of raw transfer
            IERC20(token).safeTransfer(owner(), amount);
        }
        
        emit EmergencyWithdraw(token, amount, owner());
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @dev Get current jackpot vault address
     */
    function getJackpotVault() external view returns (address) {
        return registry.getJackpotVault(uint16(block.chainid));
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get revenue statistics
     */
    function getStats() external view returns (
        uint256 totalRevenue,
        uint256 totalForwardedAmount,
        uint256 pendingAmount,
        uint256 lastForward
    ) {
        return (
            totalFeeMRevenue,
            totalForwarded,
            address(this).balance,
            lastForwardTime
        );
    }
    
    /**
     * @dev Check if contract is registered for FeeM
     */
    function isRegisteredForFeeM() external view returns (bool) {
        try this._checkRegistration() returns (bool registered) {
            return registered;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Internal function to check FeeM registration
     */
    function _checkRegistration() external view returns (bool) {
        (bool success, bytes memory data) = SONIC_FEEM_CONTRACT.staticcall(
            abi.encodeWithSignature("isRegistered(address)", address(this))
        );
        
        if (!success || data.length == 0) return false;
        return abi.decode(data, (bool));
    }
} 