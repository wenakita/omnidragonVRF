// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOmniDragonLPManager
 * @author akita
 * @dev Interface for the external LP Manager used by omniDRAGON token
 * @notice Defines the methods for LP creation, wrapping, and distribution
 */
interface IOmniDragonLPManager {
    
    // Events
    event LPCreated(uint256 dragonAmount, uint256 wethAmount, uint256 lpTokens, uint256 timestamp);
    event LPTokensWrapped(uint256 lpTokens, uint256 redDRAGONAmount, uint256 timestamp);
    event RedDRAGONDistributed(address indexed recipient, uint256 amount, string recipientType);
    event LPCreationConfigUpdated(uint256 lpThreshold, uint256 minWETH, bool lpEnabled);
    event JackpotVaultUpdated(address indexed oldVault, address indexed newVault);
    event RevenueDistributorUpdated(address indexed oldDistributor, address indexed newDistributor);
    event LPManagerConfigured(
        address indexed router,
        address indexed wrapped,
        address indexed redDRAGON,
        address lpPair
    );
    
    /**
     * @dev Check if LP creation conditions are met
     * @return bool Whether LP creation should proceed
     */
    function shouldCreateLP() external view returns (bool);
    
    /**
     * @dev Create LP and distribute redDRAGON
     * @dev Can only be called by the omniDRAGON token contract
     */
    function createLPAndDistribute() external;
    
    /**
     * @dev Configure LP manager settings
     * @param _router Uniswap V2 compatible router address
     * @param _wrapped WETH token address
     * @param _redDRAGON redDRAGON wrapper contract address
     * @param _lpPair DRAGON/WETH LP pair address
     */
    function configureLPManager(
        address _router,
        address _wrapped,
        address _redDRAGON,
        address _lpPair
    ) external;
    
    /**
     * @dev Set distribution addresses
     * @param _jackpotVault Jackpot vault address (receives 69% of redDRAGON)
     * @param _revenueDistributor Revenue distributor address (receives 31% of redDRAGON)
     */
    function setDistributionAddresses(
        address _jackpotVault,
        address _revenueDistributor
    ) external;
    
    /**
     * @dev Configure LP creation settings
     * @param _lpThreshold Minimum DRAGON tokens needed for LP creation
     * @param _minWETH Minimum WETH needed for LP creation
     * @param _lpEnabled Whether LP creation is enabled
     */
    function configureLPSettings(
        uint256 _lpThreshold,
        uint256 _minWETH,
        bool _lpEnabled
    ) external;
    
    /**
     * @dev Get LP configuration
     * @return _lpThreshold LP creation threshold
     * @return _minWETH Minimum WETH required
     * @return _lpEnabled Whether LP creation is enabled
     */
    function getLPConfig() external view returns (
        uint256 _lpThreshold,
        uint256 _minWETH,
        bool _lpEnabled
    );
    
    /**
     * @dev Get current redDRAGON balance in LP manager
     * @return redDRAGON balance
     */
    function getRedDRAGONBalance() external view returns (uint256);
    
    /**
     * @dev Get current LP token balance in LP manager
     * @return LP token balance
     */
    function getLPTokenBalance() external view returns (uint256);
    
    /**
     * @dev Emergency function to recover stuck tokens
     * @param token Token address to recover
     * @param amount Amount to recover
     */
    function emergencyRecoverTokens(address token, uint256 amount) external;
} 