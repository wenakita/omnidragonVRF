// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOmniDragonHybridRegistry
 * @dev Interface for hybrid registry and cross-chain verification
 *
 * Manages chain IDs and validates cross-chain operations within the OmniDragon ecosystem
 * Ensures secure LayerZero communication between supported chains
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
interface IOmniDragonHybridRegistry {
    /**
     * @dev Struct to hold chain-specific configuration
     */
    struct ChainConfig {
        uint16 chainId;
        string chainName;
        address wrappedNativeToken;    // WETH, WrappedNativeToken, WSOL, WBERA, etc.
        string wrappedNativeSymbol;    // "WETH", "WAVAX", "WS", "WFTM", "WMATIC", etc.
        address lotteryManager;        // Chain-specific lottery manager (replaces swapTrigger)
        address randomnessProvider;    // Chain-specific randomness provider
        address priceOracle;           // Chain-specific price oracle
        address vrfConsumer;           // Chain-specific VRF consumer
        address dragonToken;           // Dragon token address on this chain
        address jackpotVault;          // Chain-specific jackpot vault
        bool isActive;                 // Whether this chain is active
    }

    /**
     * @notice Register a new chain configuration
     * @param _chainId The LayerZero chain ID
     * @param _chainName The human-readable chain name
     * @param _wrappedNativeToken The wrapped native token address (WETH, WrappedNativeToken, WSOL, WBERA, etc.)
     * @param _wrappedNativeSymbol The wrapped native token symbol ("WETH", "WAVAX", "WS", etc.)
     * @param _lotteryManager The chain-specific lottery manager address
     * @param _randomnessProvider The chain-specific randomness provider address
     * @param _priceOracle The chain-specific price oracle address
     * @param _vrfConsumer The chain-specific VRF consumer address
     * @param _dragonToken The Dragon token address on this chain
     * @param _jackpotVault The chain-specific jackpot vault address
     */
    function registerChain(
        uint16 _chainId,
        string calldata _chainName,
        address _wrappedNativeToken,
        string calldata _wrappedNativeSymbol,
        address _lotteryManager,
        address _randomnessProvider,
        address _priceOracle,
        address _vrfConsumer,
        address _dragonToken,
        address _jackpotVault
    ) external;

    /**
     * @notice Update an existing chain configuration
     * @param _chainId The LayerZero chain ID to update
     * @param _wrappedNativeToken The wrapped native token address
     * @param _wrappedNativeSymbol The wrapped native token symbol
     * @param _lotteryManager The chain-specific lottery manager address
     * @param _randomnessProvider The chain-specific randomness provider address
     * @param _priceOracle The chain-specific price oracle address
     * @param _vrfConsumer The chain-specific VRF consumer address
     * @param _dragonToken The Dragon token address on this chain
     * @param _jackpotVault The chain-specific jackpot vault address
     */
    function updateChain(
        uint16 _chainId,
        address _wrappedNativeToken,
        string calldata _wrappedNativeSymbol,
        address _lotteryManager,
        address _randomnessProvider,
        address _priceOracle,
        address _vrfConsumer,
        address _dragonToken,
        address _jackpotVault
    ) external;

    /**
     * @notice Set chain active status
     * @param _chainId The LayerZero chain ID
     * @param _isActive Whether the chain is active
     */
    function setChainActive(uint16 _chainId, bool _isActive) external;

    /**
     * @notice Set the current chain ID
     * @param _chainId The current chain's LayerZero ID
     */
    function setCurrentChainId(uint16 _chainId) external;

    /**
     * @notice Get chain configuration
     * @param _chainId The LayerZero chain ID
     * @return Chain configuration struct
     */
    function getChainConfig(uint16 _chainId) external view returns (ChainConfig memory);

    /**
     * @dev Get the current chain's LayerZero ID
     * @return The LayerZero chain ID of the current chain
     */
    function getCurrentChainId() external view returns (uint16);

    /**
     * @dev Get the wrapped native token address for a specific chain
     * @param _chainId The LayerZero chain ID
     * @return The wrapped native token address for the specified chain
     */
    function getWrappedNativeToken(uint16 _chainId) external view returns (address);

    /**
     * @dev Get the wrapped native token symbol for a specific chain
     * @param _chainId The LayerZero chain ID
     * @return The wrapped native token symbol (e.g., "WETH", "WAVAX", "WS")
     */
    function getWrappedNativeSymbol(uint16 _chainId) external view returns (string memory);

    /**
     * @dev Get both wrapped native token address and symbol for a specific chain
     * @param _chainId The LayerZero chain ID
     * @return tokenAddress The wrapped native token address
     * @return symbol The wrapped native token symbol
     */
    function getWrappedNativeInfo(uint16 _chainId) external view returns (address tokenAddress, string memory symbol);

    /**
     * @dev Get the lottery manager address for a specific chain
     * @param _chainId The LayerZero chain ID
     * @return The lottery manager address
     */
    function getLotteryManager(uint16 _chainId) external view returns (address);

    /**
     * @dev Get the randomness provider address for a specific chain
     * @param _chainId The LayerZero chain ID
     * @return The randomness provider address
     */
    function getRandomnessProvider(uint16 _chainId) external view returns (address);

    /**
     * @dev Get the price oracle address for a specific chain
     * @param _chainId The LayerZero chain ID
     * @return The price oracle address
     */
    function getPriceOracle(uint16 _chainId) external view returns (address);

    /**
     * @dev Get the swap trigger address for a specific chain (deprecated - returns lottery manager)
     * @param _chainId The LayerZero chain ID
     * @return The lottery manager address (for backward compatibility)
     */
    function getSwapTrigger(uint16 _chainId) external view returns (address);

    /**
     * @dev Get the VRF consumer address for a specific chain
     * @param _chainId The LayerZero chain ID
     * @return The VRF consumer address
     */
    function getVRFConsumer(uint16 _chainId) external view returns (address);

    /**
     * @dev Get the Dragon token address for a specific chain
     * @param _chainId The LayerZero chain ID
     * @return The Dragon token address
     */
    function getDragonToken(uint16 _chainId) external view returns (address);

    /**
     * @dev Get the jackpot vault address for a specific chain
     * @param _chainId The LayerZero chain ID
     * @return The jackpot vault address
     */
    function getJackpotVault(uint16 _chainId) external view returns (address);

    /**
     * @dev Get all supported chain IDs
     * @return Array of supported chain IDs
     */
    function getSupportedChains() external view returns (uint16[] memory);

    /**
     * @dev Check if a chain is supported
     * @param _chainId The LayerZero chain ID to check
     * @return True if the chain is supported, false otherwise
     */
    function isChainSupported(uint16 _chainId) external view returns (bool);

    /**
     * @notice Updates the chain-specific LZ endpoint address
     * @param _newEndpoint The new chain-specific LZ endpoint address
     */
    function updateEndpoint(address _newEndpoint) external;

    /**
     * @dev Returns whether the endpoint has been updated
     * @return True if updated, false otherwise
     */
    function isEndpointUpdated() external view returns (bool);

    /**
     * @dev Returns the deadline for updating the endpoint
     * @return Timestamp of the update deadline
     */
    function updateDeadline() external view returns (uint256);

    /**
     * @notice Get LayerZero endpoint for a specific chain
     * @param _chainId The chain ID
     * @return The LayerZero endpoint address
     */
    function getLayerZeroEndpoint(uint16 _chainId) external view returns (address);

    /**
     * @notice Batch configure LayerZero settings for an OApp
     * @param _oapp The OApp contract address (e.g., omniDRAGON)
     * @param _eid The destination endpoint ID
     * @param _sendLib The send library address
     * @param _receiveLib The receive library address
     * @param _confirmations Number of block confirmations
     * @param _requiredDVNs Array of required DVN addresses
     */
    function batchConfigureLayerZero(
        address _oapp,
        uint32 _eid,
        address _sendLib,
        address _receiveLib,
        uint64 _confirmations,
        address[] calldata _requiredDVNs
    ) external;
} 