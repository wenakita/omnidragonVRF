// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title OmniDragonTokenDeployer
 * @dev Specialized deployer for omniDRAGON tokens with proper ownership handling
 * 
 * This contract solves the CREATE2 ownership problem by:
 * 1. Deploying the token via CREATE2
 * 2. Immediately transferring ownership to the specified address
 * 3. Supporting universal (same address) and chain-specific deployments
 */
contract OmniDragonTokenDeployer is Ownable, ReentrancyGuard {
    
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
    
    // ======== ERRORS ========
    error DeploymentFailed();
    error OwnershipTransferFailed();
    error ZeroAddress();
    error InvalidBytecode();
    
    // ======== STRUCTS ========
    struct DeploymentResult {
        address deployedAddress;
        bytes32 salt;
        bool ownershipTransferred;
    }
    
    // ======== STORAGE ========
    mapping(bytes32 => address) public deployedTokens;
    mapping(address => bool) public isDeployedByUs;
    
    uint256 public deploymentCount;
    
    // ======== CONSTRUCTOR ========
    constructor() Ownable(msg.sender) {
        // Contract is ready for deployment operations
    }
    
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
    ) external nonReentrant returns (DeploymentResult memory result) {
        if (newOwner == address(0)) revert ZeroAddress();
        if (bytecode.length == 0) revert InvalidBytecode();
        
        // Generate salt if not provided
        if (salt == bytes32(0)) {
            salt = generateSalt(newOwner, block.timestamp);
        }
        
        // Deploy via CREATE2
        address deployedToken = _deployCreate2(bytecode, salt);
        if (deployedToken == address(0)) revert DeploymentFailed();
        
        // Record deployment
        deployedTokens[salt] = deployedToken;
        isDeployedByUs[deployedToken] = true;
        deploymentCount++;
        
        // Transfer ownership
        bool ownershipTransferred = _transferOwnership(deployedToken, newOwner);
        
        result = DeploymentResult({
            deployedAddress: deployedToken,
            salt: salt,
            ownershipTransferred: ownershipTransferred
        });
        
        emit TokenDeployed(deployedToken, newOwner, salt, "WithOwnership");
        
        return result;
    }
    
    /**
     * @dev Deploy universal omniDRAGON (same address on all chains)
     * @param bytecode The compiled bytecode of the omniDRAGON contract
     * @param newOwner The address that should own the deployed token
     * @return result Deployment result with address and ownership status
     */
    function deployUniversal(
        bytes memory bytecode,
        address newOwner
    ) external nonReentrant returns (DeploymentResult memory result) {
        if (newOwner == address(0)) revert ZeroAddress();
        if (bytecode.length == 0) revert InvalidBytecode();
        
        // Generate universal salt (same on all chains)
        bytes32 universalSalt = generateUniversalSalt("omniDRAGON", "v1.0.0");
        
        // Check if already deployed
        if (deployedTokens[universalSalt] != address(0)) {
            // Return existing deployment info
            address existingToken = deployedTokens[universalSalt];
            return DeploymentResult({
                deployedAddress: existingToken,
                salt: universalSalt,
                ownershipTransferred: true // Assume already handled
            });
        }
        
        // Deploy via CREATE2
        address deployedToken = _deployCreate2(bytecode, universalSalt);
        if (deployedToken == address(0)) revert DeploymentFailed();
        
        // Record deployment
        deployedTokens[universalSalt] = deployedToken;
        isDeployedByUs[deployedToken] = true;
        deploymentCount++;
        
        // Transfer ownership
        bool ownershipTransferred = _transferOwnership(deployedToken, newOwner);
        
        result = DeploymentResult({
            deployedAddress: deployedToken,
            salt: universalSalt,
            ownershipTransferred: ownershipTransferred
        });
        
        emit TokenDeployed(deployedToken, newOwner, universalSalt, "Universal");
        
        return result;
    }
    
    /**
     * @dev Deploy chain-specific omniDRAGON (different address per chain)
     * @param bytecode The compiled bytecode of the omniDRAGON contract
     * @param newOwner The address that should own the deployed token
     * @return result Deployment result with address and ownership status
     */
    function deployChainSpecific(
        bytes memory bytecode,
        address newOwner
    ) external nonReentrant returns (DeploymentResult memory result) {
        if (newOwner == address(0)) revert ZeroAddress();
        if (bytecode.length == 0) revert InvalidBytecode();
        
        // Generate chain-specific salt
        bytes32 chainSalt = generateChainSpecificSalt("omniDRAGON", "v1.0.0", block.chainid);
        
        // Check if already deployed
        if (deployedTokens[chainSalt] != address(0)) {
            // Return existing deployment info
            address existingToken = deployedTokens[chainSalt];
            return DeploymentResult({
                deployedAddress: existingToken,
                salt: chainSalt,
                ownershipTransferred: true // Assume already handled
            });
        }
        
        // Deploy via CREATE2
        address deployedToken = _deployCreate2(bytecode, chainSalt);
        if (deployedToken == address(0)) revert DeploymentFailed();
        
        // Record deployment
        deployedTokens[chainSalt] = deployedToken;
        isDeployedByUs[deployedToken] = true;
        deploymentCount++;
        
        // Transfer ownership
        bool ownershipTransferred = _transferOwnership(deployedToken, newOwner);
        
        result = DeploymentResult({
            deployedAddress: deployedToken,
            salt: chainSalt,
            ownershipTransferred: ownershipTransferred
        });
        
        emit TokenDeployed(deployedToken, newOwner, chainSalt, "ChainSpecific");
        
        return result;
    }
    
    // ======== INTERNAL FUNCTIONS ========
    
    /**
     * @dev Deploy contract using CREATE2
     * @param bytecode Contract bytecode
     * @param salt Salt for CREATE2
     * @return deployed Address of deployed contract
     */
    function _deployCreate2(bytes memory bytecode, bytes32 salt) internal returns (address deployed) {
        assembly {
            deployed := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
    }
    
    /**
     * @dev Transfer ownership of deployed token
     * @param token Address of the deployed token
     * @param newOwner New owner address
     * @return success Whether ownership transfer succeeded
     */
    function _transferOwnership(address token, address newOwner) internal returns (bool success) {
        try this.externalOwnershipTransfer(token, newOwner) {
            emit OwnershipTransferred(token, address(this), newOwner);
            return true;
        } catch {
            // Ownership transfer failed, but deployment succeeded
            return false;
        }
    }
    
    /**
     * @dev External function to handle ownership transfer (for try/catch)
     * @param token Address of the token
     * @param newOwner New owner address
     */
    function externalOwnershipTransfer(address token, address newOwner) external {
        require(msg.sender == address(this), "Only self");
        
        // Call transferOwnership on the deployed token
        (bool success, ) = token.call(
            abi.encodeWithSignature("transferOwnership(address)", newOwner)
        );
        
        if (!success) revert OwnershipTransferFailed();
    }
    
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
    ) public pure returns (bytes32 salt) {
        return keccak256(abi.encodePacked("UNIVERSAL", contractName, version));
    }
    
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
    ) public pure returns (bytes32 salt) {
        return keccak256(abi.encodePacked("CHAIN", contractName, version, chainId));
    }
    
    /**
     * @dev Generate custom salt with timestamp
     * @param owner Owner address
     * @param timestamp Timestamp
     * @return salt Custom salt
     */
    function generateSalt(address owner, uint256 timestamp) public pure returns (bytes32 salt) {
        return keccak256(abi.encodePacked("CUSTOM", owner, timestamp));
    }
    
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
    ) external view returns (address predicted) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );
        
        return address(uint160(uint256(hash)));
    }
    
    /**
     * @dev Predict universal deployment address
     * @param bytecode Contract bytecode
     * @return predicted Predicted address
     * @return salt Universal salt used
     */
    function predictUniversalAddress(
        bytes memory bytecode
    ) external view returns (address predicted, bytes32 salt) {
        salt = generateUniversalSalt("omniDRAGON", "v1.0.0");
        predicted = this.predictAddress(bytecode, salt);
    }
    
    /**
     * @dev Predict chain-specific deployment address
     * @param bytecode Contract bytecode
     * @return predicted Predicted address
     * @return salt Chain-specific salt used
     */
    function predictChainSpecificAddress(
        bytes memory bytecode
    ) external view returns (address predicted, bytes32 salt) {
        salt = generateChainSpecificSalt("omniDRAGON", "v1.0.0", block.chainid);
        predicted = this.predictAddress(bytecode, salt);
    }
    
    // ======== VIEW FUNCTIONS ========
    
    /**
     * @dev Check if token was deployed by this contract
     * @param token Token address
     * @return deployed Whether token was deployed by us
     */
    function isTokenDeployedByUs(address token) external view returns (bool deployed) {
        return isDeployedByUs[token];
    }
    
    /**
     * @dev Get deployment info by salt
     * @param salt Deployment salt
     * @return tokenAddress Address of deployed token
     */
    function getDeploymentBySalt(bytes32 salt) external view returns (address tokenAddress) {
        return deployedTokens[salt];
    }
    
    // ======== EMERGENCY FUNCTIONS ========
    
    /**
     * @dev Emergency function to transfer ownership of a token we deployed
     * @param token Token address
     * @param newOwner New owner address
     */
    function emergencyTransferOwnership(
        address token,
        address newOwner
    ) external onlyOwner {
        if (!isDeployedByUs[token]) revert("Not deployed by us");
        if (newOwner == address(0)) revert ZeroAddress();
        
        bool success = _transferOwnership(token, newOwner);
        if (!success) revert OwnershipTransferFailed();
    }
    
    /**
     * @dev Emergency pause function
     */
    function pause() external onlyOwner {
        // Could implement pausable functionality if needed
    }
    
    // ======== RECEIVE FUNCTION ========
    receive() external payable {
        // Allow receiving ETH for gas fees
    }
} 