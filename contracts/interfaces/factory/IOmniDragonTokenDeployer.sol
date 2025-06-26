// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOmniDragonTokenDeployer
 * @dev Interface for the specialized omniDRAGON token deployer
 */
interface IOmniDragonTokenDeployer {
    
    // ======== STRUCTS ========
    struct DeploymentResult {
        address deployedAddress;
        bytes32 salt;
        bool ownershipTransferred;
    }
    
    // ======== EVENTS ========
    event TokenDeployed(
        address indexed token,
        address indexed owner,
        bytes32 indexed salt,
        string deploymentType
    );
    
    event OwnershipTransferred(
        address indexed token,
        address indexed previousOwner,
        address indexed newOwner
    );
    
    // ======== CORE DEPLOYMENT FUNCTIONS ========
    
    /**
     * @dev Deploy omniDRAGON token with immediate ownership transfer
     * @param bytecode The compiled bytecode of the omniDRAGON contract
     * @param newOwner The address that should own the deployed token
     * @param salt Custom salt for CREATE2 (use 0x0 for auto-generated)
     * @return result Deployment result with address and ownership status
     */
    function deployWithOwnership(
        bytes memory bytecode,
        address newOwner,
        bytes32 salt
    ) external returns (DeploymentResult memory result);
    
    /**
     * @dev Deploy universal omniDRAGON (same address on all chains)
     * @param bytecode The compiled bytecode of the omniDRAGON contract
     * @param newOwner The address that should own the deployed token
     * @return result Deployment result with address and ownership status
     */
    function deployUniversal(
        bytes memory bytecode,
        address newOwner
    ) external returns (DeploymentResult memory result);
    
    /**
     * @dev Deploy chain-specific omniDRAGON (different address per chain)
     * @param bytecode The compiled bytecode of the omniDRAGON contract
     * @param newOwner The address that should own the deployed token
     * @return result Deployment result with address and ownership status
     */
    function deployChainSpecific(
        bytes memory bytecode,
        address newOwner
    ) external returns (DeploymentResult memory result);
    
    // ======== SALT GENERATION ========
    
    /**
     * @dev Generate universal salt (same on all chains)
     * @param contractName Name of the contract
     * @param version Version string
     * @return salt Universal salt
     */
    function generateUniversalSalt(
        string memory contractName,
        string memory version
    ) external pure returns (bytes32 salt);
    
    /**
     * @dev Generate chain-specific salt
     * @param contractName Name of the contract
     * @param version Version string
     * @param chainId Chain ID
     * @return salt Chain-specific salt
     */
    function generateChainSpecificSalt(
        string memory contractName,
        string memory version,
        uint256 chainId
    ) external pure returns (bytes32 salt);
    
    /**
     * @dev Generate custom salt with timestamp
     * @param owner Owner address
     * @param timestamp Timestamp
     * @return salt Custom salt
     */
    function generateSalt(address owner, uint256 timestamp) external pure returns (bytes32 salt);
    
    // ======== PREDICTION FUNCTIONS ========
    
    /**
     * @dev Predict deployment address
     * @param bytecode Contract bytecode
     * @param salt Salt for CREATE2
     * @return predicted Predicted deployment address
     */
    function predictAddress(
        bytes memory bytecode,
        bytes32 salt
    ) external view returns (address predicted);
    
    /**
     * @dev Predict universal deployment address
     * @param bytecode Contract bytecode
     * @return predicted Predicted address
     * @return salt Universal salt used
     */
    function predictUniversalAddress(
        bytes memory bytecode
    ) external view returns (address predicted, bytes32 salt);
    
    /**
     * @dev Predict chain-specific deployment address
     * @param bytecode Contract bytecode
     * @return predicted Predicted address
     * @return salt Chain-specific salt used
     */
    function predictChainSpecificAddress(
        bytes memory bytecode
    ) external view returns (address predicted, bytes32 salt);
    
    // ======== VIEW FUNCTIONS ========
    
    /**
     * @dev Check if token was deployed by this contract
     * @param token Token address
     * @return deployed Whether token was deployed by us
     */
    function isTokenDeployedByUs(address token) external view returns (bool deployed);
    
    /**
     * @dev Get deployment info by salt
     * @param salt Deployment salt
     * @return tokenAddress Address of deployed token
     */
    function getDeploymentBySalt(bytes32 salt) external view returns (address tokenAddress);
    
    /**
     * @dev Get deployment count
     * @return count Number of tokens deployed
     */
    function deploymentCount() external view returns (uint256 count);
    
    // ======== EMERGENCY FUNCTIONS ========
    
    /**
     * @dev Emergency function to transfer ownership of a token we deployed
     * @param token Token address
     * @param newOwner New owner address
     */
    function emergencyTransferOwnership(
        address token,
        address newOwner
    ) external;
} 