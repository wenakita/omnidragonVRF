// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICREATE2FactoryWithOwnership
 * @notice Interface for CREATE2 factory that automatically transfers ownership of deployed contracts
 */
interface ICREATE2FactoryWithOwnership {
    // Events
    event ContractDeployed(
        address indexed deployer,
        address indexed deployed,
        bytes32 indexed salt,
        string contractType
    );
    
    /**
     * @notice Deploy a contract using CREATE2 with automatic ownership transfer
     * @param bytecode The bytecode of the contract to deploy
     * @param salt The salt for deterministic deployment
     * @param contractType A string identifier for the contract type
     * @return deployed The address of the deployed contract
     */
    function deploy(
        bytes memory bytecode,
        bytes32 salt,
        string memory contractType
    ) external returns (address deployed);
    
    /**
     * @notice Deploy with auto-generated salt
     * @param bytecode The bytecode of the contract to deploy
     * @param contractType A string identifier for the contract type
     * @return deployed The address of the deployed contract
     */
    function deployWithAutoSalt(
        bytes memory bytecode,
        string memory contractType
    ) external returns (address deployed);
    
    /**
     * @notice Compute the deployment address for given bytecode and salt
     * @param salt The salt for deterministic deployment
     * @param bytecodeHash The keccak256 hash of the bytecode
     * @return The computed address
     */
    function computeAddress(
        bytes32 salt,
        bytes32 bytecodeHash
    ) external view returns (address);
    
    /**
     * @notice Get all deployments by a specific deployer
     * @param deployer The address of the deployer
     * @return An array of deployed contract addresses
     */
    function getDeployments(address deployer) external view returns (address[] memory);
    
    /**
     * @notice Batch deploy multiple contracts
     * @param bytecodes Array of bytecodes to deploy
     * @param salts Array of salts for each deployment
     * @param types Array of contract type identifiers
     * @return deployed Array of deployed contract addresses
     */
    function batchDeploy(
        bytes[] memory bytecodes,
        bytes32[] memory salts,
        string[] memory types
    ) external returns (address[] memory deployed);
    
    /**
     * @notice Emergency function to transfer ownership of a deployed contract
     * @dev Only callable by factory owner
     * @param deployed The deployed contract address
     * @param newOwner The new owner address
     */
    function emergencyTransferOwnership(
        address deployed,
        address newOwner
    ) external;
    
    // View functions for tracking
    function deploymentsByDeployer(address deployer, uint256 index) external view returns (address);
    function isDeployedContract(address deployed) external view returns (bool);
    function deploymentBySalt(bytes32 salt) external view returns (address);
    function contractTypes(address deployed) external view returns (string memory);
} 