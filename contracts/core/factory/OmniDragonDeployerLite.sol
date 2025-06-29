// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CREATE2FactoryWithOwnership.sol";
import "../tokens/omniDRAGON.sol";

/**
 * @title OmniDragonDeployerLite
 * @dev Lightweight version of OmniDragonDeployer for chains with low gas limits (like Sonic)
 * Contains only essential functions for omniDRAGON deployment
 */
contract OmniDragonDeployerLite is Ownable {
    
    // CREATE2 Factory
    CREATE2FactoryWithOwnership public immutable factory;
    
    // Chain Registry for LayerZero proxy functionality
    address public chainRegistry;
    
    // Base salt for deterministic deployment
    bytes32 public constant OMNIDRAGON_BASE_SALT = keccak256("OMNIDRAGON");
    string public constant VERSION = "v1.0.0";
    
    // Track omniDRAGON deployment
    address public omniDRAGONAddress;
    
    // Events
    event ChainRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
    event OmniDRAGONDeployed(address indexed omniDRAGON, bytes32 salt);
    
    constructor(address _factory) Ownable(msg.sender) {
        require(_factory != address(0), "Factory cannot be zero address");
        factory = CREATE2FactoryWithOwnership(_factory);
    }
    
    /**
     * @dev Set the chain registry address for LayerZero proxy functionality
     */
    function setChainRegistry(address _chainRegistry) external onlyOwner {
        require(_chainRegistry != address(0), "Chain registry cannot be zero address");
        address oldRegistry = chainRegistry;
        chainRegistry = _chainRegistry;
        emit ChainRegistryUpdated(oldRegistry, _chainRegistry);
    }
    
    /**
     * @dev Deploy omniDRAGON token
     */
    function deployOmniDRAGON(address _delegate) external onlyOwner returns (address deployed) {
        require(chainRegistry != address(0), "Chain registry not set");
        require(_delegate != address(0), "Delegate cannot be zero address");
        require(omniDRAGONAddress == address(0), "omniDRAGON already deployed");
        
        // Generate bytecode with constructor arguments
        bytes memory bytecode = abi.encodePacked(
            type(omniDRAGON).creationCode,
            abi.encode(chainRegistry, _delegate)
        );
        
        // Generate deterministic salt
        bytes32 salt = keccak256(abi.encodePacked(
            OMNIDRAGON_BASE_SALT,
            "omniDRAGON",
            VERSION
        ));
        
        // Deploy via CREATE2
        deployed = factory.deploy(bytecode, salt, "omniDRAGON");
        omniDRAGONAddress = deployed;
        
        emit OmniDRAGONDeployed(deployed, salt);
    }
    
    /**
     * @dev Predict the address of omniDRAGON token
     */
    function predictOmniDRAGONAddress(address _delegate) external view returns (address predicted) {
        require(chainRegistry != address(0), "Chain registry not set");
        require(_delegate != address(0), "Delegate cannot be zero address");
        
        // Generate bytecode with constructor arguments
        bytes memory bytecode = abi.encodePacked(
            type(omniDRAGON).creationCode,
            abi.encode(chainRegistry, _delegate)
        );
        
        // Calculate bytecode hash
        bytes32 bytecodeHash = keccak256(bytecode);
        
        // Generate deterministic salt
        bytes32 salt = keccak256(abi.encodePacked(
            OMNIDRAGON_BASE_SALT,
            "omniDRAGON",
            VERSION
        ));
        
        return factory.computeAddress(salt, bytecodeHash);
    }
} 