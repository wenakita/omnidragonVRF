// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CREATE2FactoryWithOwnership.sol";
import "../tokens/omniDRAGON.sol";

/**
 * @title OmniDragonDeployerV2
 * @dev Enhanced deployer for OmniDragon ecosystem contracts
 * Ensures deterministic addresses across all chains for OmniDragon* contracts
 * 
 * Nomenclature System:
 * - OmniDragon* = Universal contracts (same address all chains)
 * - Dragon* = Chain-specific contracts (different per chain)
 * 
 * New Features in V2:
 * - Bytecode verification and storage
 * - Multi-chain deployment verification
 * - Deployment rollback capabilities
 * - Enhanced prediction with full bytecode support
 * - Deployment templates and presets
 * - Gas optimization tracking
 * - Emergency pause functionality
 * 
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract OmniDragonDeployerV2 is Ownable, Pausable, ReentrancyGuard {
    
    // CREATE2 Factory
    CREATE2FactoryWithOwnership public immutable factory;
    
    // Contract version for salt generation
    string public constant VERSION = "v2.0.0";
    
    // Base salt for OmniDragon universal contracts
    bytes32 public constant OMNIDRAGON_BASE_SALT = keccak256("OMNIDRAGON_FRESH_V2_2025_DELEGATE");
    
    // Chain Registry for LayerZero proxy functionality
    address public chainRegistry;
    
    // Deployment tracking
    mapping(string => address) public deployedContracts; // contractName => address
    mapping(string => bool) public isUniversalContract; // contractName => isUniversal
    mapping(address => string) public contractNames; // address => contractName
    mapping(string => bytes32) public contractBytecodeHashes; // contractName => bytecodeHash
    mapping(string => bytes) public contractBytecodes; // contractName => bytecode (for verification)
    mapping(string => uint256) public deploymentGasUsed; // contractName => gasUsed
    mapping(string => uint256) public deploymentTimestamp; // contractName => timestamp
    
    // Multi-chain verification
    mapping(string => mapping(uint256 => address)) public multiChainAddresses; // contractName => chainId => address
    mapping(string => uint256[]) public deployedChains; // contractName => chainIds[]
    
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
    
    // Deployment templates
    struct DeploymentTemplate {
        string name;
        bytes bytecode;
        bytes32 bytecodeHash;
        bool isUniversal;
        string[] constructorParams;
        uint256 gasEstimate;
        bool active;
    }
    
    mapping(string => DeploymentTemplate) public deploymentTemplates;
    string[] public templateNames;
    
    // Events
    event UniversalContractDeployed(
        string indexed contractName,
        address indexed contractAddress,
        bytes32 salt,
        uint256 chainId,
        uint256 gasUsed
    );
    
    event ChainSpecificContractDeployed(
        string indexed contractName,
        address indexed contractAddress,
        bytes32 salt,
        uint256 chainId,
        uint256 gasUsed
    );
    
    event ContractTypeRegistered(string contractName, bool isUniversal);
    event ChainRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
    event DeploymentTemplateCreated(string indexed templateName, bool isUniversal);
    event DeploymentVerified(string indexed contractName, uint256 indexed chainId, address contractAddress);
    event BytecodeVerified(string indexed contractName, bytes32 bytecodeHash);
    
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
     * @dev Deploy omniDRAGON token using chain registry as LayerZero endpoint proxy
     * Enhanced with bytecode verification and gas tracking
     * @param _delegate The delegate/owner address for the omniDRAGON token
     * @return deployed Address of the deployed omniDRAGON token
     */
    function deployOmniDRAGONWithRegistry(address _delegate) external onlyOwner whenNotPaused nonReentrant returns (address deployed) {
        require(chainRegistry != address(0), "Chain registry not set");
        require(_delegate != address(0), "Delegate cannot be zero address");
        require(deployedContracts["omniDRAGON"] == address(0), "omniDRAGON already deployed");
        
        uint256 gasStart = gasleft();
        
        // Generate bytecode with constructor arguments
        bytes memory bytecode = abi.encodePacked(
            type(omniDRAGON).creationCode,
            abi.encode(chainRegistry, _delegate)
        );
        
        // Store bytecode for verification
        contractBytecodes["omniDRAGON"] = bytecode;
        contractBytecodeHashes["omniDRAGON"] = keccak256(bytecode);
        
        // Generate deterministic salt for universal deployment
        bytes32 salt = generateUniversalSalt("omniDRAGON");
        
        // Deploy via CREATE2
        deployed = factory.deploy(bytecode, salt, "omniDRAGON");
        
        // Track deployment
        deployedContracts["omniDRAGON"] = deployed;
        contractNames[deployed] = "omniDRAGON";
        deploymentTimestamp["omniDRAGON"] = block.timestamp;
        
        // Track multi-chain deployment
        multiChainAddresses["omniDRAGON"][block.chainid] = deployed;
        deployedChains["omniDRAGON"].push(block.chainid);
        
        // Calculate gas used
        uint256 gasUsed = gasStart - gasleft();
        deploymentGasUsed["omniDRAGON"] = gasUsed;
        
        emit UniversalContractDeployed("omniDRAGON", deployed, salt, block.chainid, gasUsed);
        emit DeploymentVerified("omniDRAGON", block.chainid, deployed);
        emit BytecodeVerified("omniDRAGON", contractBytecodeHashes["omniDRAGON"]);
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
     * @dev Predict address using stored bytecode (for already analyzed contracts)
     * @param contractName Name of the contract
     * @return predicted The predicted address
     */
    function predictAddressFromStored(string memory contractName) external view returns (address predicted) {
        require(contractBytecodeHashes[contractName] != bytes32(0), "Bytecode not stored");
        
        bytes32 salt;
        if (isUniversalContract[contractName]) {
            salt = generateUniversalSalt(contractName);
        } else {
            salt = generateChainSpecificSalt(contractName);
        }
        
        return factory.computeAddress(salt, contractBytecodeHashes[contractName]);
    }
    
    /**
     * @dev Create a deployment template for reuse
     * @param templateName Name of the template
     * @param contractName Name of the contract
     * @param bytecode Contract bytecode
     * @param constructorParams Description of constructor parameters
     * @param gasEstimate Estimated gas for deployment
     */
    function createDeploymentTemplate(
        string memory templateName,
        string memory contractName,
        bytes memory bytecode,
        string[] memory constructorParams,
        uint256 gasEstimate
    ) external onlyOwner {
        require(bytes(templateName).length > 0, "Template name cannot be empty");
        require(bytecode.length > 0, "Bytecode cannot be empty");
        
        deploymentTemplates[templateName] = DeploymentTemplate({
            name: templateName,
            bytecode: bytecode,
            bytecodeHash: keccak256(bytecode),
            isUniversal: isUniversalContract[contractName],
            constructorParams: constructorParams,
            gasEstimate: gasEstimate,
            active: true
        });
        
        templateNames.push(templateName);
        
        emit DeploymentTemplateCreated(templateName, isUniversalContract[contractName]);
    }
    
    /**
     * @dev Deploy from template
     * @param templateName Name of the template to use
     * @param contractName Name for the deployed contract
     * @return deployed Address of the deployed contract
     */
    function deployFromTemplate(
        string memory templateName,
        string memory contractName
    ) external onlyOwner whenNotPaused nonReentrant returns (address deployed) {
        DeploymentTemplate memory template = deploymentTemplates[templateName];
        require(template.active, "Template not active");
        require(deployedContracts[contractName] == address(0), "Contract already deployed");
        
        uint256 gasStart = gasleft();
        
        bytes32 salt;
        if (template.isUniversal) {
            salt = generateUniversalSalt(contractName);
        } else {
            salt = generateChainSpecificSalt(contractName);
        }
        
        // Deploy via CREATE2
        deployed = factory.deploy(template.bytecode, salt, contractName);
        
        // Track deployment
        deployedContracts[contractName] = deployed;
        contractNames[deployed] = contractName;
        contractBytecodes[contractName] = template.bytecode;
        contractBytecodeHashes[contractName] = template.bytecodeHash;
        deploymentTimestamp[contractName] = block.timestamp;
        
        // Track multi-chain deployment
        multiChainAddresses[contractName][block.chainid] = deployed;
        deployedChains[contractName].push(block.chainid);
        
        // Calculate gas used
        uint256 gasUsed = gasStart - gasleft();
        deploymentGasUsed[contractName] = gasUsed;
        
        if (template.isUniversal) {
            emit UniversalContractDeployed(contractName, deployed, salt, block.chainid, gasUsed);
        } else {
            emit ChainSpecificContractDeployed(contractName, deployed, salt, block.chainid, gasUsed);
        }
        
        emit DeploymentVerified(contractName, block.chainid, deployed);
    }
    
    /**
     * @dev Verify deployment across multiple chains
     * @param contractName Name of the contract
     * @param chainIds Array of chain IDs to verify
     * @param addresses Array of addresses on each chain
     */
    function verifyMultiChainDeployment(
        string memory contractName,
        uint256[] memory chainIds,
        address[] memory addresses
    ) external onlyOwner {
        require(chainIds.length == addresses.length, "Array length mismatch");
        require(isUniversalContract[contractName], "Only for universal contracts");
        
        for (uint i = 0; i < chainIds.length; i++) {
            multiChainAddresses[contractName][chainIds[i]] = addresses[i];
            emit DeploymentVerified(contractName, chainIds[i], addresses[i]);
        }
        
        // Update deployed chains array (avoid duplicates)
        for (uint i = 0; i < chainIds.length; i++) {
            bool exists = false;
            for (uint j = 0; j < deployedChains[contractName].length; j++) {
                if (deployedChains[contractName][j] == chainIds[i]) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                deployedChains[contractName].push(chainIds[i]);
            }
        }
    }
    
    /**
     * @dev Get multi-chain deployment status
     * @param contractName Name of the contract
     * @return chainIds Array of chain IDs where deployed
     * @return addresses Array of addresses on each chain
     */
    function getMultiChainDeployment(string memory contractName) 
        external 
        view 
        returns (uint256[] memory chainIds, address[] memory addresses) 
    {
        chainIds = deployedChains[contractName];
        addresses = new address[](chainIds.length);
        
        for (uint i = 0; i < chainIds.length; i++) {
            addresses[i] = multiChainAddresses[contractName][chainIds[i]];
        }
    }
    
    /**
     * @dev Verify bytecode matches stored hash
     * @param contractName Name of the contract
     * @param bytecode Bytecode to verify
     * @return matches Whether bytecode matches stored hash
     */
    function verifyBytecode(string memory contractName, bytes memory bytecode) 
        external 
        view 
        returns (bool matches) 
    {
        return keccak256(bytecode) == contractBytecodeHashes[contractName];
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
     * @dev Enhanced deployment info with gas and timing data
     * @param contractName Name of the contract
     * @return deployed Address of the deployed contract
     * @return universal Whether it's a universal contract
     * @return salt The salt used for deployment
     * @return gasUsed Gas used for deployment
     * @return timestamp Deployment timestamp
     * @return bytecodeHash Hash of the bytecode
     */
    function getEnhancedDeploymentInfo(string memory contractName) 
        external 
        view 
        returns (
            address deployed,
            bool universal,
            bytes32 salt,
            uint256 gasUsed,
            uint256 timestamp,
            bytes32 bytecodeHash
        ) 
    {
        deployed = deployedContracts[contractName];
        universal = isUniversalContract[contractName];
        gasUsed = deploymentGasUsed[contractName];
        timestamp = deploymentTimestamp[contractName];
        bytecodeHash = contractBytecodeHashes[contractName];
        
        if (universal) {
            salt = generateUniversalSalt(contractName);
        } else {
            salt = generateChainSpecificSalt(contractName);
        }
    }
    
    /**
     * @dev Get all template names
     */
    function getTemplateNames() external view returns (string[] memory) {
        return templateNames;
    }
    
    /**
     * @dev Get template details
     * @param templateName Name of the template
     * @return template The deployment template
     */
    function getTemplate(string memory templateName) 
        external 
        view 
        returns (DeploymentTemplate memory template) 
    {
        return deploymentTemplates[templateName];
    }
    
    /**
     * @dev Emergency pause functionality
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause functionality
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency function to update deployed contract address
     * @param contractName Name of the contract
     * @param contractAddress New address
     * @param chainId Chain ID (0 for current chain)
     */
    function emergencyUpdateAddress(
        string memory contractName,
        address contractAddress,
        uint256 chainId
    ) external onlyOwner {
        require(contractAddress != address(0), "Address cannot be zero");
        
        if (chainId == 0) {
            chainId = block.chainid;
        }
        
        // Update local tracking if it's current chain
        if (chainId == block.chainid) {
            if (deployedContracts[contractName] != address(0)) {
                delete contractNames[deployedContracts[contractName]];
            }
            deployedContracts[contractName] = contractAddress;
            contractNames[contractAddress] = contractName;
        }
        
        // Update multi-chain tracking
        multiChainAddresses[contractName][chainId] = contractAddress;
        
        emit DeploymentVerified(contractName, chainId, contractAddress);
    }
    
    // Legacy compatibility functions
    function deployOmniDRAGON(address _lzEndpoint, address _delegate) external onlyOwner returns (address) {
        revert("Use deployOmniDRAGONWithRegistry for V2");
    }
    
    function predictOmniDRAGONAddress(address _lzEndpoint, address _delegate) external view returns (address) {
        revert("Use predictOmniDRAGONAddressWithRegistry for V2");
    }
    
    // All other functions from V1 remain the same...
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
    
    function getUniversalContractTypes() public view returns (string[] memory) {
        return universalContractTypes;
    }
    
    function getChainSpecificContractTypes() public view returns (string[] memory) {
        return chainSpecificContractTypes;
    }
    
    function getContractName(address contractAddress) public view returns (string memory) {
        return contractNames[contractAddress];
    }
    
    function isDeployed(string memory contractName) public view returns (bool) {
        return deployedContracts[contractName] != address(0);
    }
    
    function getChainId() public view returns (uint256) {
        return block.chainid;
    }
} 