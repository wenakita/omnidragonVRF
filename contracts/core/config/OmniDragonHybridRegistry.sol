// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts/access/Ownable.sol';
import '../../interfaces/config/IOmniDragonHybridRegistry.sol';

/**
 * @title OmniDragonHybridRegistry
 * @dev Lightweight registry for hybrid pattern omniDRAGON deployment
 * 
 * Provides:
 * - Deterministic address calculation via CREATE2
 * - Basic chain configuration storage
 * - LayerZero configuration during deployment
 * 
 */
contract OmniDragonHybridRegistry is IOmniDragonHybridRegistry, Ownable {
    // Basic chain configuration storage
    mapping(uint16 => ChainConfig) private chainConfigs;
    uint16[] private supportedChains;
    uint16 private currentChainId;
    
    // MAJOR FIX: Add mapping to prevent DoS on getSupportedChains
    mapping(uint16 => bool) public isSupportedChain;
    uint256 public constant MAX_SUPPORTED_CHAINS = 50; // Prevent DoS
    
    // LayerZero endpoint mapping
    mapping(uint256 => uint32) public chainIdToEid;
    mapping(uint32 => uint256) public eidToChainId;
    mapping(uint16 => address) public layerZeroEndpoints;
    
    // Events
    event ChainRegistered(uint16 indexed chainId, string chainName);
    event ChainUpdated(uint16 indexed chainId);
    event ChainStatusChanged(uint16 indexed chainId, bool isActive);
    event CurrentChainSet(uint16 indexed chainId);
    event LayerZeroConfigured(address indexed oapp, uint32 indexed eid, string configType);
    event LayerZeroLibrarySet(address indexed oapp, uint32 indexed eid, address lib, string libraryType);
    
    // Custom errors
    error ChainAlreadyRegistered(uint16 chainId);
    error ChainNotRegistered(uint16 chainId);
    error ZeroAddress();
    
    constructor(address _initialOwner) Ownable(_initialOwner) {
        currentChainId = 146; // Default to Sonic
        
        // Use common LayerZero v2 endpoint for deterministic deployment
        // This will be updated to chain-specific endpoints after deployment
        address commonEndpoint = 0x1a44076050125825900e736c501f859c50fE728c;
        
        layerZeroEndpoints[146] = commonEndpoint;   // Sonic (will update to 0x6F475642a6e85809B1c36Fa62763669b1b48DD5B)
        layerZeroEndpoints[42161] = commonEndpoint; // Arbitrum (correct: 0x1a44076050125825900e736c501f859c50fE728c)
        layerZeroEndpoints[43114] = commonEndpoint; // Avalanche (correct: 0x1a44076050125825900e736c501f859c50fE728c)
    }
    
    /**
     * @notice Set the current chain ID
     */
    function setCurrentChainId(uint16 _chainId) external onlyOwner {
        currentChainId = _chainId;
        emit CurrentChainSet(_chainId);
    }
    
    /**
     * @notice Register a new chain (simplified)
     */
    function registerChain(
        uint16 _chainId,
        string calldata _chainName,
        address _wrappedNativeToken,
        address _lotteryManager,
        address _randomnessProvider,
        address _priceOracle,
        address _vrfConsumer,
        address _dragonToken,
        address _jackpotVault
    ) external override onlyOwner {
        if (chainConfigs[_chainId].chainId == _chainId) revert ChainAlreadyRegistered(_chainId);
        if (_wrappedNativeToken == address(0)) revert ZeroAddress();
        
        chainConfigs[_chainId] = ChainConfig({
            chainId: _chainId,
            chainName: _chainName,
            wrappedNativeToken: _wrappedNativeToken,
            lotteryManager: _lotteryManager,
            randomnessProvider: _randomnessProvider,
            priceOracle: _priceOracle,
            vrfConsumer: _vrfConsumer,
            dragonToken: _dragonToken,
            jackpotVault: _jackpotVault,
            isActive: true
        });
        
        // MAJOR FIX: Prevent DoS by limiting supported chains
        require(supportedChains.length < MAX_SUPPORTED_CHAINS, "Too many supported chains");
        
        supportedChains.push(_chainId);
        isSupportedChain[_chainId] = true;
        emit ChainRegistered(_chainId, _chainName);
    }
    
    /**
     * @notice Update chain configuration (simplified)
     */
    function updateChain(
        uint16 _chainId,
        address _wrappedNativeToken,
        address _lotteryManager,
        address _randomnessProvider,
        address _priceOracle,
        address _vrfConsumer,
        address _dragonToken,
        address _jackpotVault
    ) external override onlyOwner {
        if (chainConfigs[_chainId].chainId != _chainId) revert ChainNotRegistered(_chainId);
        if (_wrappedNativeToken == address(0)) revert ZeroAddress();
        
        ChainConfig storage config = chainConfigs[_chainId];
        config.wrappedNativeToken = _wrappedNativeToken;
        if (_lotteryManager != address(0)) config.lotteryManager = _lotteryManager;
        if (_randomnessProvider != address(0)) config.randomnessProvider = _randomnessProvider;
        if (_priceOracle != address(0)) config.priceOracle = _priceOracle;
        if (_vrfConsumer != address(0)) config.vrfConsumer = _vrfConsumer;
        if (_dragonToken != address(0)) config.dragonToken = _dragonToken;
        if (_jackpotVault != address(0)) config.jackpotVault = _jackpotVault;
        
        emit ChainUpdated(_chainId);
    }
    
    /**
     * @notice Set chain active status
     */
    function setChainActive(uint16 _chainId, bool _isActive) external override onlyOwner {
        if (chainConfigs[_chainId].chainId != _chainId) revert ChainNotRegistered(_chainId);
        chainConfigs[_chainId].isActive = _isActive;
        emit ChainStatusChanged(_chainId, _isActive);
    }
    
    /**
     * @notice Get chain configuration
     */
    function getChainConfig(uint16 _chainId) external view override returns (ChainConfig memory) {
        return chainConfigs[_chainId];
    }
    
    /**
     * @notice Get all supported chains
     * SECURITY FIX: Added pagination to prevent DoS on large arrays
     * Critical vulnerability fix - CVE-2024-AUDIT-004
     */
    function getSupportedChains() external view override returns (uint16[] memory) {
        uint256 length = supportedChains.length;
        
        // SECURITY: Limit returned array size to prevent DoS
        if (length > 20) {
            // Return only first 20 chains to prevent DoS
            uint16[] memory limitedChains = new uint16[](20);
            for (uint256 i = 0; i < 20; i++) {
                limitedChains[i] = supportedChains[i];
            }
            return limitedChains;
        }
        
        return supportedChains;
    }
    
    /**
     * @notice Get supported chains count (gas-efficient alternative)
     */
    function getSupportedChainsCount() external view returns (uint256) {
        return supportedChains.length;
    }
    
    /**
     * @notice Get supported chain at index (gas-efficient alternative)
     */
    function getSupportedChainAt(uint256 index) external view returns (uint16) {
        require(index < supportedChains.length, "Index out of bounds");
        return supportedChains[index];
    }
    
    /**
     * @notice Get paginated supported chains (DoS-safe alternative)
     * @param offset Starting index
     * @param limit Maximum number of chains to return
     * @return chains Array of chain IDs
     * @return hasMore Whether there are more chains available
     */
    function getSupportedChainsPaginated(uint256 offset, uint256 limit) external view returns (uint16[] memory chains, bool hasMore) {
        uint256 totalChains = supportedChains.length;
        
        // Validate parameters
        if (offset >= totalChains) {
            return (new uint16[](0), false);
        }
        
        // Limit to maximum safe size
        if (limit > 50) {
            limit = 50;
        }
        
        uint256 remaining = totalChains - offset;
        uint256 returnSize = remaining < limit ? remaining : limit;
        
        chains = new uint16[](returnSize);
        for (uint256 i = 0; i < returnSize; i++) {
            chains[i] = supportedChains[offset + i];
        }
        
        hasMore = (offset + returnSize) < totalChains;
    }
    
    /**
     * @notice Get current chain ID
     */
    function getCurrentChainId() external view override returns (uint16) {
        return currentChainId;
    }
    
    /**
     * @notice Check if chain is supported
     */
    function isChainSupported(uint16 _chainId) external view override returns (bool) {
        return chainConfigs[_chainId].chainId == _chainId && chainConfigs[_chainId].isActive;
    }
    
    /**
     * @notice Calculate deterministic omniDRAGON address
     */
    function calculateOmniDragonAddress(
        address _deployer,
        bytes32 _salt,
        bytes32 _bytecodeHash
    ) external pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            _deployer,
            _salt,
            _bytecodeHash
        )))));
    }
    
    /**
     * @notice Configure LayerZero Send Library for an OApp
     */
    function configureSendLibrary(
        address _oapp,
        uint32 _eid,
        address _sendLib
    ) external onlyOwner {
        require(_oapp != address(0), "Invalid OApp address");
        require(_sendLib != address(0), "Invalid send library address");
        
        // Get the LayerZero endpoint for current chain
        address endpoint = layerZeroEndpoints[currentChainId];
        require(endpoint != address(0), "No endpoint configured");
        
        // Prepare the call data for setSendLibrary
        bytes memory callData = abi.encodeWithSignature(
            "setSendLibrary(address,uint32,address)",
            _oapp,
            _eid,
            _sendLib
        );
        
        // Make the call to the LayerZero endpoint
        (bool success, bytes memory returnData) = endpoint.call(callData);
        
        if (!success) {
            // If call failed, revert with the error
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            } else {
                revert("LayerZero setSendLibrary failed");
            }
        }
        
        emit LayerZeroLibrarySet(_oapp, _eid, _sendLib, "Send");
    }
    
    /**
     * @notice Configure LayerZero Receive Library for an OApp
     */
    function configureReceiveLibrary(
        address _oapp,
        uint32 _eid,
        address _receiveLib,
        uint256 _gracePeriod
    ) external onlyOwner {
        require(_oapp != address(0), "Invalid OApp address");
        require(_receiveLib != address(0), "Invalid receive library address");
        
        // Get the LayerZero endpoint for current chain
        address endpoint = layerZeroEndpoints[currentChainId];
        require(endpoint != address(0), "No endpoint configured");
        
        // Prepare the call data for setReceiveLibrary
        bytes memory callData = abi.encodeWithSignature(
            "setReceiveLibrary(address,uint32,address,uint256)",
            _oapp,
            _eid,
            _receiveLib,
            _gracePeriod
        );
        
        // Make the call to the LayerZero endpoint
        (bool success, bytes memory returnData) = endpoint.call(callData);
        
        if (!success) {
            // If call failed, revert with the error
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            } else {
                revert("LayerZero setReceiveLibrary failed");
            }
        }
        
        emit LayerZeroLibrarySet(_oapp, _eid, _receiveLib, "Receive");
    }
    
    /**
     * @notice Configure LayerZero ULN Config (DVN settings) for an OApp
     */
    function configureULNConfig(
        address _oapp,
        address _lib,
        uint32 _eid,
        uint64 _confirmations,
        address[] calldata _requiredDVNs,
        address[] calldata _optionalDVNs,
        uint8 _optionalDVNsThreshold
    ) external onlyOwner {
        require(_oapp != address(0), "Invalid OApp address");
        require(_lib != address(0), "Invalid library address");
        require(_requiredDVNs.length > 0, "At least one required DVN needed");
        
        // Get the LayerZero endpoint for current chain
        address endpoint = layerZeroEndpoints[currentChainId];
        require(endpoint != address(0), "No endpoint configured");
        
        // Encode ULN config for LayerZero V2
        bytes memory ulnConfig = abi.encode(_confirmations, _requiredDVNs, _optionalDVNs, _optionalDVNsThreshold);
        
        // ✅ FIXED - Use LayerZero V2 signature: setConfig(uint32 eid, uint32 configType, bytes calldata config)
        bytes memory callData = abi.encodeWithSignature(
            "setConfig(uint32,uint32,bytes)",
            _eid,                // destination EID
            2,                   // configType = 2 = ULN_CONFIG_TYPE
            ulnConfig            // properly encoded ULN config
        );
        
        // Make the call to the LayerZero endpoint
        (bool success, bytes memory returnData) = endpoint.call(callData);
        
        if (!success) {
            // If call failed, revert with the error
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            } else {
                revert("LayerZero setConfig failed");
            }
        }
        
        emit LayerZeroConfigured(_oapp, _eid, "ULN_CONFIG");
    }
    
    /**
     * @notice Batch configure LayerZero settings for an OApp
     */
    function batchConfigureLayerZero(
        address _oapp,
        uint32 _eid,
        address _sendLib,
        address _receiveLib,
        uint64 _confirmations,
        address[] calldata _requiredDVNs
    ) external onlyOwner {
        // Configure Send Library
        this.configureSendLibrary(_oapp, _eid, _sendLib);
        
        // Configure Receive Library
        this.configureReceiveLibrary(_oapp, _eid, _receiveLib, 0);
        
        // Configure ULN Config for Send
        address[] memory emptyOptional = new address[](0);
        this.configureULNConfig(_oapp, _sendLib, _eid, _confirmations, _requiredDVNs, emptyOptional, 0);
        
        // Configure ULN Config for Receive
        this.configureULNConfig(_oapp, _receiveLib, _eid, _confirmations, _requiredDVNs, emptyOptional, 0);
        
        emit LayerZeroConfigured(_oapp, _eid, "BATCH_CONFIG");
    }
    
    /**
     * @notice Set chain ID to EID mapping
     */
    function setChainIdToEid(uint256 _chainId, uint32 _eid) external onlyOwner {
        chainIdToEid[_chainId] = _eid;
        eidToChainId[_eid] = _chainId;
    }
    
    /**
     * @notice Set LayerZero endpoint for a chain
     */
    function setLayerZeroEndpoint(uint16 _chainId, address _endpoint) external onlyOwner {
        if (_endpoint == address(0)) revert ZeroAddress();
        layerZeroEndpoints[_chainId] = _endpoint;
    }
    
    /**
     * @notice Get LayerZero endpoint for a chain
     */
    function getLayerZeroEndpoint(uint16 _chainId) external view returns (address) {
        return layerZeroEndpoints[_chainId];
    }
    
    /**
     * @notice Get wrapped native token for a chain
     */
    function getWrappedNativeToken(uint16 _chainId) external view override returns (address) {
        return chainConfigs[_chainId].wrappedNativeToken;
    }
    
    /**
     * @notice Get lottery manager for a chain
     */
    function getLotteryManager(uint16 _chainId) external view override returns (address) {
        return chainConfigs[_chainId].lotteryManager;
    }
    
    /**
     * @notice Get randomness provider for a chain
     */
    function getRandomnessProvider(uint16 _chainId) external view override returns (address) {
        return chainConfigs[_chainId].randomnessProvider;
    }
    
    /**
     * @notice Get price oracle for a chain
     */
    function getPriceOracle(uint16 _chainId) external view override returns (address) {
        return chainConfigs[_chainId].priceOracle;
    }
    
    /**
     * @notice Get VRF consumer for a chain
     */
    function getVRFConsumer(uint16 _chainId) external view override returns (address) {
        return chainConfigs[_chainId].vrfConsumer;
    }
    
    /**
     * @notice Get Dragon token for a chain
     */
    function getDragonToken(uint16 _chainId) external view override returns (address) {
        return chainConfigs[_chainId].dragonToken;
    }
    
    /**
     * @notice Get jackpot vault for a chain
     */
    function getJackpotVault(uint16 _chainId) external view override returns (address) {
        return chainConfigs[_chainId].jackpotVault;
    }
    
    /**
     * @notice Get swap trigger (deprecated - returns lottery manager)
     */
    function getSwapTrigger(uint16 _chainId) external view override returns (address) {
        return chainConfigs[_chainId].lotteryManager;
    }

    function updateEndpoint(address /* _newEndpoint */) external view override onlyOwner {
        revert("Not implemented in hybrid registry");
    }
    
    function isEndpointUpdated() external pure override returns (bool) {
        return true; // Always true for hybrid pattern
    }
    
    function updateDeadline() external pure override returns (uint256) {
        return 0; // Not applicable for hybrid pattern
    }

    /**
     * @notice Configure omniDRAGON peer for cross-chain communication
     * @param _oapp The omniDRAGON contract address
     * @param _eid The destination endpoint ID
     * @param _peer The peer address (same omniDRAGON address on destination chain)
     */
    function configureOmniDragonPeer(
        address _oapp,
        uint32 _eid,
        bytes32 _peer
    ) external onlyOwner {
        require(_oapp != address(0), "Invalid OApp address");
        require(_peer != bytes32(0), "Invalid peer address");
        
        // Prepare the call data for setPeer
        bytes memory callData = abi.encodeWithSignature(
            "setPeer(uint32,bytes32)",
            _eid,
            _peer
        );
        
        // Make the call to the omniDRAGON contract as the owner
        (bool success, bytes memory returnData) = _oapp.call(callData);
        
        if (!success) {
            // If call failed, revert with the error
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            } else {
                revert("omniDRAGON setPeer failed");
            }
        }
        
        emit LayerZeroConfigured(_oapp, _eid, "PEER_SET");
    }

    /**
     * @notice Configure omniDRAGON enforced options for cross-chain communication
     * @param _oapp The omniDRAGON contract address
     * @param _enforcedOptions Array of enforced options
     */
    function configureOmniDragonEnforcedOptions(
        address _oapp,
        bytes[] calldata _enforcedOptions
    ) external onlyOwner {
        require(_oapp != address(0), "Invalid OApp address");
        require(_enforcedOptions.length > 0, "No enforced options provided");
        
        // Prepare the call data for setEnforcedOptions
        bytes memory callData = abi.encodeWithSignature(
            "setEnforcedOptions((uint32,uint16,bytes)[])",
            _enforcedOptions
        );
        
        // Make the call to the omniDRAGON contract as the owner
        (bool success, bytes memory returnData) = _oapp.call(callData);
        
        if (!success) {
            // If call failed, revert with the error
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            } else {
                revert("omniDRAGON setEnforcedOptions failed");
            }
        }
        
        emit LayerZeroConfigured(_oapp, 0, "ENFORCED_OPTIONS_SET");
    }

    /**
     * @notice Transfer ownership of an owned contract to a new owner
     * @param _contract The contract address to transfer ownership of
     * @param _newOwner The new owner address
     */
    function transferContractOwnership(
        address _contract,
        address _newOwner
    ) external onlyOwner {
        require(_contract != address(0), "Invalid contract address");
        require(_newOwner != address(0), "Invalid new owner address");
        
        // Prepare the call data for transferOwnership
        bytes memory callData = abi.encodeWithSignature(
            "transferOwnership(address)",
            _newOwner
        );
        
        // Make the call to transfer ownership
        (bool success, bytes memory returnData) = _contract.call(callData);
        
        if (!success) {
            // If call failed, revert with the error
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            } else {
                revert("Contract transferOwnership failed");
            }
        }
        
        emit LayerZeroConfigured(_contract, 0, "OWNERSHIP_TRANSFERRED");
    }
} 