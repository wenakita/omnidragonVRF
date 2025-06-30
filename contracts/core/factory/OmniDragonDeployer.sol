// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CREATE2FactoryWithOwnership.sol";
import "../tokens/omniDRAGON.sol";

/**
 * @title OmniDragonDeployer
 * @dev Specialized deployer for OmniDragon ecosystem contracts
 * Ensures deterministic addresses across all chains for OmniDragon* contracts
 * 
 * Nomenclature System:
 * - OmniDragon* = Universal contracts (same address all chains)
 * - Dragon* = Chain-specific contracts (different per chain)
 * 
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract OmniDragonDeployer is Ownable {
    
    // CREATE2 Factory
    CREATE2FactoryWithOwnership public immutable factory;
    
    // Contract version for salt generation
    string public constant VERSION = "v1.0.0";
    
    // Base salt for OmniDragon universal contracts
    bytes32 public constant OMNIDRAGON_BASE_SALT = keccak256("OMNIDRAGON_FRESH_V2_2025_DELEGATE");
    
    // Chain Registry for LayerZero proxy functionality
    address public chainRegistry;
    
    // Deployment tracking
    mapping(string => address) public deployedContracts; // contractName => address
    mapping(string => bool) public isUniversalContract; // contractName => isUniversal
    mapping(address => string) public contractNames; // address => contractName
    
    // Universal contract types (same address across all chains)
    string[] public universalContractTypes = [
        "OmniDragonChainRegistry",
        "OmniDragonLotteryManager", 
        "omniDRAGON",
        "OmniDragonPriceOracle"
    ];
    
    // Chain-specific contract types (different address per chain)
    string[] public chainSpecificContractTypes = [
        "DragonRevenueDistributor",
        "DragonFeeManager",
        "DragonJackpotVault",
        "DragonJackpotDistributor"
    ];
    
    // Events
    event UniversalContractDeployed(
        string indexed contractName,
        address indexed contractAddress,
        bytes32 salt,
        uint256 chainId
    );
    
    event ChainSpecificContractDeployed(
        string indexed contractName,
        address indexed contractAddress,
        bytes32 salt,
        uint256 chainId
    );
    
    event ContractTypeRegistered(string contractName, bool isUniversal);
    
    event ChainRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
    
    constructor(address _factory) Ownable(msg.sender) {
        require(_factory != address(0), "Factory cannot be zero address");
        factory = CREATE2FactoryWithOwnership(_factory);
        
        // Register universal contract types
        for (uint i = 0; i < universalContractTypes.length; i++) {
            isUniversalContract[universalContractTypes[i]] = true;
            emit ContractTypeRegistered(universalContractTypes[i], true);
        }
        
        // Register chain-specific contract types
        for (uint i = 0; i < chainSpecificContractTypes.length; i++) {
            isUniversalContract[chainSpecificContractTypes[i]] = false;
            emit ContractTypeRegistered(chainSpecificContractTypes[i], false);
        }
    }
    
    /**
     * @dev Set the chain registry address for LayerZero proxy functionality
     * @param _chainRegistry Address of the OmniDragonChainRegistry
     */
    function setChainRegistry(address _chainRegistry) external onlyOwner {
        require(_chainRegistry != address(0), "Chain registry cannot be zero address");
        address oldRegistry = chainRegistry;
        chainRegistry = _chainRegistry;
        emit ChainRegistryUpdated(oldRegistry, _chainRegistry);
    }
    
    /**
     * @dev Deploy omniDRAGON token using a specified LayerZero endpoint
     * This allows flexible endpoint configuration while maintaining deterministic addresses
     * @param _lzEndpoint The LayerZero endpoint address to use
     * @param _delegate The delegate/owner address for the omniDRAGON token
     * @return deployed Address of the deployed omniDRAGON token
     */
    function deployOmniDRAGON(address _lzEndpoint, address _delegate) external onlyOwner returns (address deployed) {
        require(_lzEndpoint != address(0), "LayerZero endpoint cannot be zero address");
        require(_delegate != address(0), "Delegate cannot be zero address");
        require(deployedContracts["omniDRAGON"] == address(0), "omniDRAGON already deployed");
        
        // Generate bytecode with constructor arguments
        // Constructor: constructor(address _lzEndpoint, address _delegate)
        bytes memory bytecode = abi.encodePacked(
            type(omniDRAGON).creationCode,
            abi.encode(_lzEndpoint, _delegate)
        );
        
        // Generate deterministic salt for universal deployment
        bytes32 salt = generateUniversalSalt("omniDRAGON");
        
        // Deploy via CREATE2
        deployed = factory.deploy(bytecode, salt, "omniDRAGON");
        
        // Track deployment
        deployedContracts["omniDRAGON"] = deployed;
        contractNames[deployed] = "omniDRAGON";
        
        emit UniversalContractDeployed("omniDRAGON", deployed, salt, block.chainid);
    }
    
    /**
     * @dev Deploy omniDRAGON token using chain registry as LayerZero endpoint proxy
     * This ensures identical addresses across chains while using chain-specific endpoints
     * @param _delegate The delegate/owner address for the omniDRAGON token
     * @return deployed Address of the deployed omniDRAGON token
     */
    function deployOmniDRAGONWithRegistry(address _delegate) external onlyOwner returns (address deployed) {
        require(chainRegistry != address(0), "Chain registry not set");
        require(_delegate != address(0), "Delegate cannot be zero address");
        require(deployedContracts["omniDRAGON"] == address(0), "omniDRAGON already deployed");
        
        // Generate bytecode with constructor arguments
        bytes memory bytecode = abi.encodePacked(
            type(omniDRAGON).creationCode,
            abi.encode(chainRegistry, _delegate)
        );
        
        // Generate deterministic salt for universal deployment
        bytes32 salt = generateUniversalSalt("omniDRAGON");
        
        // Deploy via CREATE2
        deployed = factory.deploy(bytecode, salt, "omniDRAGON");
        
        // Track deployment
        deployedContracts["omniDRAGON"] = deployed;
        contractNames[deployed] = "omniDRAGON";
        
        emit UniversalContractDeployed("omniDRAGON", deployed, salt, block.chainid);
    }
    
    /**
     * @dev Predict the address of omniDRAGON token across all chains
     * @param _lzEndpoint The LayerZero endpoint address to use
     * @param _delegate The delegate/owner address for the omniDRAGON token
     * @return predicted The predicted address (same across all chains if same endpoint used)
     */
    function predictOmniDRAGONAddress(address _lzEndpoint, address _delegate) external view returns (address predicted) {
        require(_lzEndpoint != address(0), "LayerZero endpoint cannot be zero address");
        require(_delegate != address(0), "Delegate cannot be zero address");
        
        // Generate bytecode with constructor arguments
        bytes memory bytecode = abi.encodePacked(
            type(omniDRAGON).creationCode,
            abi.encode(_lzEndpoint, _delegate)
        );
        
        // Calculate bytecode hash
        bytes32 bytecodeHash = keccak256(bytecode);
        
        // Generate deterministic salt
        bytes32 salt = generateUniversalSalt("omniDRAGON");
        
        return factory.computeAddress(salt, bytecodeHash);
    }
    
    /**
     * @dev Predict the address of omniDRAGON token using chain registry as endpoint
     * @param _delegate The delegate/owner address for the omniDRAGON token
     * @return predicted The predicted address (same across all chains)
     */
    function predictOmniDRAGONAddressWithRegistry(address _delegate) external view returns (address predicted) {
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
        bytes32 salt = generateUniversalSalt("omniDRAGON");
        
        return factory.computeAddress(salt, bytecodeHash);
    }
    
    /**
     * @dev Generate deterministic salt for universal contracts
     * @param contractName Name of the contract (e.g., "OmniDragonToken")
     * @return Deterministic salt that will be the same across all chains
     */
    function generateUniversalSalt(string memory contractName) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            OMNIDRAGON_BASE_SALT,
            contractName,
            VERSION
        ));
    }
    
    /**
     * @dev Generate chain-specific salt for Dragon* contracts
     * @param contractName Name of the contract (e.g., "DragonFeeManager")
     * @return Chain-specific salt that will be different per chain
     */
    function generateChainSpecificSalt(string memory contractName) public view returns (bytes32) {
        return keccak256(abi.encodePacked(
            OMNIDRAGON_BASE_SALT,
            contractName,
            VERSION,
            block.chainid, // Makes it chain-specific
            block.timestamp / 86400 // Daily rotation for additional uniqueness
        ));
    }
    
    /**
     * @dev Deploy a universal OmniDragon contract (same address across chains)
     * @param contractName Name of the contract
     * @param bytecode Contract bytecode
     * @return deployed Address of the deployed contract
     */
    function deployUniversalContract(
        string memory contractName,
        bytes memory bytecode
    ) public onlyOwner returns (address deployed) {
        require(isUniversalContract[contractName], "Not a universal contract type");
        require(deployedContracts[contractName] == address(0), "Contract already deployed");
        
        bytes32 salt = generateUniversalSalt(contractName);
        deployed = factory.deploy(bytecode, salt, contractName);
        
        // Track deployment
        deployedContracts[contractName] = deployed;
        contractNames[deployed] = contractName;
        
        emit UniversalContractDeployed(contractName, deployed, salt, block.chainid);
    }
    
    /**
     * @dev Deploy a chain-specific Dragon contract
     * @param contractName Name of the contract
     * @param bytecode Contract bytecode
     * @return deployed Address of the deployed contract
     */
    function deployChainSpecificContract(
        string memory contractName,
        bytes memory bytecode
    ) public onlyOwner returns (address deployed) {
        require(!isUniversalContract[contractName], "Use deployUniversalContract for universal types");
        require(deployedContracts[contractName] == address(0), "Contract already deployed");
        
        bytes32 salt = generateChainSpecificSalt(contractName);
        deployed = factory.deploy(bytecode, salt, contractName);
        
        // Track deployment
        deployedContracts[contractName] = deployed;
        contractNames[deployed] = contractName;
        
        emit ChainSpecificContractDeployed(contractName, deployed, salt, block.chainid);
    }
    
    /**
     * @dev Predict the address of a universal contract across all chains
     * @param contractName Name of the contract
     * @param bytecodeHash Keccak256 hash of the contract bytecode
     * @return predicted The predicted address (same across all chains)
     */
    function predictUniversalAddress(
        string memory contractName,
        bytes32 bytecodeHash
    ) public view returns (address predicted) {
        require(isUniversalContract[contractName], "Not a universal contract type");
        
        bytes32 salt = generateUniversalSalt(contractName);
        return factory.computeAddress(salt, bytecodeHash);
    }
    
    /**
     * @dev Predict the address of a chain-specific contract
     * @param contractName Name of the contract
     * @param bytecodeHash Keccak256 hash of the contract bytecode
     * @return predicted The predicted address (chain-specific)
     */
    function predictChainSpecificAddress(
        string memory contractName,
        bytes32 bytecodeHash
    ) public view returns (address predicted) {
        require(!isUniversalContract[contractName], "Use predictUniversalAddress for universal types");
        
        bytes32 salt = generateChainSpecificSalt(contractName);
        return factory.computeAddress(salt, bytecodeHash);
    }
    
    /**
     * @dev Batch deploy multiple contracts
     * @param _contractNames Array of contract names
     * @param bytecodes Array of contract bytecodes
     * @return deployed Array of deployed addresses
     */
    function batchDeploy(
        string[] memory _contractNames,
        bytes[] memory bytecodes
    ) public onlyOwner returns (address[] memory deployed) {
        require(_contractNames.length == bytecodes.length, "Array length mismatch");
        
        deployed = new address[](_contractNames.length);
        
        for (uint i = 0; i < _contractNames.length; i++) {
            if (isUniversalContract[_contractNames[i]]) {
                deployed[i] = deployUniversalContract(_contractNames[i], bytecodes[i]);
            } else {
                deployed[i] = deployChainSpecificContract(_contractNames[i], bytecodes[i]);
            }
        }
    }
    
    /**
     * @dev Register a new contract type
     * @param contractName Name of the contract
     * @param universal Whether it's a universal contract
     */
    function registerContractType(
        string memory contractName,
        bool universal
    ) public onlyOwner {
        isUniversalContract[contractName] = universal;
        
        if (universal) {
            universalContractTypes.push(contractName);
        } else {
            chainSpecificContractTypes.push(contractName);
        }
        
        emit ContractTypeRegistered(contractName, universal);
    }
    
    /**
     * @dev Get deployment info for a contract
     * @param contractName Name of the contract
     * @return deployed Address of the deployed contract
     * @return universal Whether it's a universal contract
     * @return salt The salt used for deployment
     */
    function getDeploymentInfo(string memory contractName) 
        public 
        view 
        returns (
            address deployed,
            bool universal,
            bytes32 salt
        ) 
    {
        deployed = deployedContracts[contractName];
        universal = isUniversalContract[contractName];
        
        if (universal) {
            salt = generateUniversalSalt(contractName);
        } else {
            salt = generateChainSpecificSalt(contractName);
        }
    }
    
    /**
     * @dev Get all universal contract types
     */
    function getUniversalContractTypes() public view returns (string[] memory) {
        return universalContractTypes;
    }
    
    /**
     * @dev Get all chain-specific contract types
     */
    function getChainSpecificContractTypes() public view returns (string[] memory) {
        return chainSpecificContractTypes;
    }
    
    /**
     * @dev Get contract name by address
     * @param contractAddress Address of the contract
     * @return Contract name
     */
    function getContractName(address contractAddress) public view returns (string memory) {
        return contractNames[contractAddress];
    }
    
    /**
     * @dev Check if a contract is deployed
     * @param contractName Name of the contract
     * @return Whether the contract is deployed
     */
    function isDeployed(string memory contractName) public view returns (bool) {
        return deployedContracts[contractName] != address(0);
    }
    
    /**
     * @dev Get the current chain ID
     * @return Current chain ID
     */
    function getChainId() public view returns (uint256) {
        return block.chainid;
    }
    
    /**
     * @dev Manually set a deployed contract address (emergency function)
     * @param contractName Name of the contract
     * @param contractAddress Address of the deployed contract
     */
    function setDeployedContract(string memory contractName, address contractAddress) public onlyOwner {
        require(contractAddress != address(0), "Contract address cannot be zero");
        
        // Remove old tracking if exists
        if (deployedContracts[contractName] != address(0)) {
            delete contractNames[deployedContracts[contractName]];
        }
        
        // Set new tracking
        deployedContracts[contractName] = contractAddress;
        contractNames[contractAddress] = contractName;
        
        emit UniversalContractDeployed(contractName, contractAddress, bytes32(0), block.chainid);
    }
} 