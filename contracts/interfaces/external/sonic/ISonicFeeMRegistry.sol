// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISonicFeeMRegistry
 * @dev Interface for Sonic FeeM (Fee Monetization) Registry
 */
interface ISonicFeeMRegistry {
    /**
     * @dev Self-register for fee monetization
     * @param registrationValue Magic value required for registration (143)
     */
    function selfRegister(uint256 registrationValue) external;
    
    /**
     * @dev Check if a contract is registered for fee monetization
     * @param contractAddress Contract to check
     * @return registered Whether the contract is registered
     */
    function isRegistered(address contractAddress) external view returns (bool registered);
    
    /**
     * @dev Get registration details
     * @param contractAddress Contract to check
     * @return registrationBlock Block number when registered
     * @return isActive Whether the registration is active
     */
    function getRegistrationDetails(address contractAddress) 
        external 
        view 
        returns (uint256 registrationBlock, bool isActive);
} 