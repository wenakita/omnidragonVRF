// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CREATE2FactoryWithOwnership.sol";

/**
 * @title OmniDragonDeployer (Minimal)
 * @dev Ultra-minimal deployer for omniDRAGON with deterministic addresses
 */
contract OmniDragonDeployer is Ownable {
    
    CREATE2FactoryWithOwnership public immutable factory;
    bytes32 public constant OMNIDRAGON_SALT = keccak256("OMNIDRAGON_HYBRID_V9");
    
    address public chainRegistry;
    address public deployedOmniDRAGON;
    
    event OmniDRAGONDeployed(address indexed contractAddress);
    
    constructor(address _factory) Ownable(msg.sender) {
        factory = CREATE2FactoryWithOwnership(_factory);
    }
    
    function setChainRegistry(address _chainRegistry) external onlyOwner {
        chainRegistry = _chainRegistry;
    }
    
    function deployOmniDRAGON(
        bytes calldata bytecode
    ) external onlyOwner returns (address deployed) {
        require(chainRegistry != address(0) && deployedOmniDRAGON == address(0));
        
        deployed = factory.deploy(bytecode, OMNIDRAGON_SALT, "omniDRAGON");
        deployedOmniDRAGON = deployed;
        
        emit OmniDRAGONDeployed(deployed);
    }
    
    function computeOmniDRAGONAddress(
        bytes32 bytecodeHash
    ) external view returns (address) {
        return factory.computeAddress(OMNIDRAGON_SALT, bytecodeHash);
    }
} 