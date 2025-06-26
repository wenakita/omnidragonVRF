// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CREATE2FactoryWithOwnership
 * @notice CREATE2 factory that automatically transfers ownership of deployed contracts
 * @dev Includes deployment tracking and salt management
 */
contract CREATE2FactoryWithOwnership is Ownable {
    // Events
    event ContractDeployed(
        address indexed deployer,
        address indexed deployed,
        bytes32 indexed salt,
        string contractType
    );
    
    // Tracking
    mapping(address => address[]) public deploymentsByDeployer;
    mapping(address => bool) public isDeployedContract;
    mapping(bytes32 => address) public deploymentBySalt;
    mapping(address => string) public contractTypes;
    
    // Salt counter for automatic salt generation
    uint256 private saltCounter;
    
    constructor() Ownable(msg.sender) {}
    
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
    ) public returns (address deployed) {
        // Check if already deployed with this salt
        require(deploymentBySalt[salt] == address(0), "Salt already used");
        
        // Deploy using CREATE2
        assembly {
            deployed := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            if iszero(extcodesize(deployed)) {
                revert(0, 0)
            }
        }
        
        // Try to transfer ownership to the deployer
        (bool success,) = deployed.call(
            abi.encodeWithSignature("transferOwnership(address)", msg.sender)
        );
        
        // If ownership transfer fails, try to set admin
        if (!success) {
            (success,) = deployed.call(
                abi.encodeWithSignature("setAdmin(address)", msg.sender)
            );
        }
        
        // Track deployment
        deploymentsByDeployer[msg.sender].push(deployed);
        isDeployedContract[deployed] = true;
        deploymentBySalt[salt] = deployed;
        contractTypes[deployed] = contractType;
        
        emit ContractDeployed(msg.sender, deployed, salt, contractType);
    }
    
    /**
     * @notice Deploy with auto-generated salt
     * @param bytecode The bytecode of the contract to deploy
     * @param contractType A string identifier for the contract type
     * @return deployed The address of the deployed contract
     */
    function deployWithAutoSalt(
        bytes memory bytecode,
        string memory contractType
    ) public returns (address deployed) {
        bytes32 salt = keccak256(abi.encodePacked(msg.sender, saltCounter++));
        return deploy(bytecode, salt, contractType);
    }
    
    /**
     * @notice Compute the deployment address for given bytecode and salt
     * @param salt The salt for deterministic deployment
     * @param bytecodeHash The keccak256 hash of the bytecode
     * @return The computed address
     */
    function computeAddress(
        bytes32 salt,
        bytes32 bytecodeHash
    ) public view returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            bytecodeHash
        )))));
    }
    
    /**
     * @notice Get all deployments by a specific deployer
     * @param deployer The address of the deployer
     * @return An array of deployed contract addresses
     */
    function getDeployments(address deployer) public view returns (address[] memory) {
        return deploymentsByDeployer[deployer];
    }
    
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
    ) public returns (address[] memory deployed) {
        require(
            bytecodes.length == salts.length && salts.length == types.length,
            "Array length mismatch"
        );
        
        deployed = new address[](bytecodes.length);
        for (uint256 i = 0; i < bytecodes.length; i++) {
            deployed[i] = deploy(bytecodes[i], salts[i], types[i]);
        }
    }
    
    /**
     * @notice Emergency function to transfer ownership of a deployed contract
     * @dev Only callable by factory owner
     * @param deployed The deployed contract address
     * @param newOwner The new owner address
     */
    function emergencyTransferOwnership(
        address deployed,
        address newOwner
    ) public onlyOwner {
        require(isDeployedContract[deployed], "Not a deployed contract");
        
        (bool success,) = deployed.call(
            abi.encodeWithSignature("transferOwnership(address)", newOwner)
        );
        require(success, "Ownership transfer failed");
    }
} 