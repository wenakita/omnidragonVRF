// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CREATE2FactoryWithOwnership (Optimized)
 * @notice Minimal CREATE2 factory for omniDRAGON deployment
 */
contract CREATE2FactoryWithOwnership is Ownable {
    
    event ContractDeployed(address indexed deployed, bytes32 indexed salt, string contractType);
    
    mapping(bytes32 => address) public deploymentBySalt;
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Deploy a contract using CREATE2 with automatic ownership transfer
     */
    function deploy(
        bytes memory bytecode,
        bytes32 salt,
        string memory contractType
    ) public returns (address deployed) {
        require(deploymentBySalt[salt] == address(0), "Salt used");
        
        assembly {
            deployed := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            if iszero(extcodesize(deployed)) {
                revert(0, 0)
            }
        }
        
        // Transfer ownership to deployer
        (bool success,) = deployed.call(
            abi.encodeWithSignature("transferOwnership(address)", msg.sender)
        );
        
        // Fallback to setAdmin if transferOwnership fails
        if (!success) {
            deployed.call(abi.encodeWithSignature("setAdmin(address)", msg.sender));
        }
        
        deploymentBySalt[salt] = deployed;
        emit ContractDeployed(deployed, salt, contractType);
    }
    
    /**
     * @notice Compute the deployment address for given bytecode and salt
     */
    function computeAddress(bytes32 salt, bytes32 bytecodeHash) public view returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            bytecodeHash
        )))));
    }
} 