// Sources flattened with hardhat v2.24.3 https://hardhat.org

// SPDX-License-Identifier: MIT

// File lib/openzeppelin-contracts/contracts/utils/Context.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}


// File lib/openzeppelin-contracts/contracts/access/Ownable.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File contracts/core/factory/CREATE2FactoryWithOwnership.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.20;

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
