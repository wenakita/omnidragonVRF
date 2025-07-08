// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Interfaces
interface IUniswapV2Router {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
}

interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint256) external;
}

interface IredDRAGON is IERC20 {
    function wrap(uint256 lpAmount) external; // Wrap UniV2 LP tokens as redDRAGON (1:1)
    function unwrap(uint256 redDRAGONAmount) external; // Unwrap redDRAGON to LP tokens (1:1)
    function lpToken() external view returns (IERC20); // Returns underlying LP token address
}

interface IOmniDragonToken is IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

// Custom Errors
error ZeroAddress();
error InsufficientBalance();
error LPCreationFailed();
error TransferFailed();
error UnauthorizedCaller();
error InvalidConfiguration();

// Constants
uint256 constant DISTRIBUTION_JACKPOT = 690; // 69%
uint256 constant DISTRIBUTION_VEDRAGON = 310; // 31%

/**
 * @title OmniDragonLPManager
 * @author akita
 * @dev External LP creation manager for omniDRAGON token
 * @notice Handles LP creation, wrapping, and distribution logic to reduce main token contract size
 * 
 * FUNCTIONALITY:
 * 1. LP Creation: Creates DRAGON/WETH LP pairs using accumulated fees
 * 2. LP Wrapping: Wraps LP tokens as redDRAGON (1:1 ratio)
 * 3. Distribution: Distributes redDRAGON to jackpot vault (69%) and veDRAGON holders (31%)
 * 4. Gas Optimization: Reduces main token contract size by ~300+ lines
 */
contract OmniDragonLPManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Core token and DEX integration
    IOmniDragonToken public immutable dragonToken;
    IUniswapV2Router public swapRouter;
    IWETH public wrappedNative;
    IredDRAGON public redDRAGON;
    address public lpPair;
    
    // Distribution addresses
    address public jackpotVault;
    address public revenueDistributor;
    
    // LP creation configuration
    uint256 public lpCreationThreshold = 500 * 10**18; // Min DRAGON for LP creation
    uint256 public minWETHForLP = 0.1 ether; // Min WETH needed for LP creation
    bool public lpCreationEnabled = true;
    
    // Authorization - only omniDRAGON token can call LP creation
    modifier onlyDragonToken() {
        if (msg.sender != address(dragonToken)) {
            revert UnauthorizedCaller();
        }
        _;
    }
    
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
    event NativeReceived(address indexed sender, uint256 amount, string reason);
    
    /**
     * @dev Constructor
     * @param _dragonToken Address of the omniDRAGON token contract
     * @param _owner Owner address for admin functions
     */
    constructor(
        address _dragonToken,
        address _owner
    ) Ownable(_owner) {
        if (_dragonToken == address(0)) revert ZeroAddress();
        dragonToken = IOmniDragonToken(_dragonToken);
    }
    
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
    ) external onlyOwner {
        if (_router == address(0) || _wrapped == address(0) || 
            _redDRAGON == address(0) || _lpPair == address(0)) {
            revert ZeroAddress();
        }
        
        swapRouter = IUniswapV2Router(_router);
        wrappedNative = IWETH(_wrapped);
        redDRAGON = IredDRAGON(_redDRAGON);
        lpPair = _lpPair;
        
        emit LPManagerConfigured(_router, _wrapped, _redDRAGON, _lpPair);
    }
    
    /**
     * @dev Set distribution addresses
     * @param _jackpotVault Jackpot vault address (receives 69% of redDRAGON)
     * @param _revenueDistributor Revenue distributor address (receives 31% of redDRAGON)
     */
    function setDistributionAddresses(
        address _jackpotVault,
        address _revenueDistributor
    ) external onlyOwner {
        if (_jackpotVault == address(0) || _revenueDistributor == address(0)) {
            revert ZeroAddress();
        }
        
        address oldJackpot = jackpotVault;
        address oldRevenue = revenueDistributor;
        
        jackpotVault = _jackpotVault;
        revenueDistributor = _revenueDistributor;
        
        emit JackpotVaultUpdated(oldJackpot, _jackpotVault);
        emit RevenueDistributorUpdated(oldRevenue, _revenueDistributor);
    }
    
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
    ) external onlyOwner {
        if (_lpThreshold > 0) lpCreationThreshold = _lpThreshold;
        if (_minWETH > 0) minWETHForLP = _minWETH;
        lpCreationEnabled = _lpEnabled;
        
        emit LPCreationConfigUpdated(_lpThreshold, _minWETH, _lpEnabled);
    }
    
    /**
     * @dev Check if LP creation conditions are met
     * @return bool Whether LP creation should proceed
     */
    function shouldCreateLP() external view returns (bool) {
        return lpCreationEnabled && 
               address(swapRouter) != address(0) && 
               address(wrappedNative) != address(0) &&
               address(redDRAGON) != address(0) && 
               lpPair != address(0) &&
               dragonToken.balanceOf(address(dragonToken)) >= lpCreationThreshold &&
               wrappedNative.balanceOf(address(dragonToken)) >= minWETHForLP;
    }
    
    /**
     * @dev Create LP and distribute redDRAGON
     * @dev Can only be called by the omniDRAGON token contract
     */
    function createLPAndDistribute() external onlyDragonToken nonReentrant {
        if (!lpCreationEnabled) revert InvalidConfiguration();
        
        uint256 dragonBalance = dragonToken.balanceOf(address(dragonToken));
        uint256 wethBalance = wrappedNative.balanceOf(address(dragonToken));
        
        if (dragonBalance == 0 || wethBalance == 0) return;
        if (dragonBalance < lpCreationThreshold || wethBalance < minWETHForLP) return;
        
        // Transfer tokens from dragon contract to this manager
        dragonToken.transferFrom(address(dragonToken), address(this), dragonBalance);
        wrappedNative.transferFrom(address(dragonToken), address(this), wethBalance);
        
        // Create LP
        _createLP(dragonBalance, wethBalance);
    }
    
    /**
     * @dev Internal function to create LP
     * @param dragonAmount Amount of DRAGON tokens
     * @param wethAmount Amount of WETH tokens
     */
    function _createLP(uint256 dragonAmount, uint256 wethAmount) internal {
        // Approve tokens to router
        dragonToken.approve(address(swapRouter), dragonAmount);
        wrappedNative.approve(address(swapRouter), wethAmount);
        
        try swapRouter.addLiquidity(
            address(dragonToken),    // tokenA (DRAGON)
            address(wrappedNative),  // tokenB (WETH)
            dragonAmount,            // amountADesired
            wethAmount,              // amountBDesired
            0,                       // amountAMin (accept any amount)
            0,                       // amountBMin (accept any amount)
            address(this),           // to (receive LP tokens)
            block.timestamp + 300    // deadline
        ) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
            
            emit LPCreated(amountA, amountB, liquidity, block.timestamp);
            
            // Wrap LP tokens as redDRAGON (1:1) and distribute to rewards
            _wrapAndDistributeLP(liquidity);
            
        } catch {
            // LP creation failed - return tokens to dragon contract
            dragonToken.transfer(address(dragonToken), dragonToken.balanceOf(address(this)));
            wrappedNative.transfer(address(dragonToken), wrappedNative.balanceOf(address(this)));
            
            emit LPCreated(0, 0, 0, block.timestamp);
        }
    }
    
    /**
     * @dev Wrap LP tokens as redDRAGON and distribute
     * @param lpTokens Amount of LP tokens to wrap
     */
    function _wrapAndDistributeLP(uint256 lpTokens) internal {
        if (lpTokens == 0 || address(redDRAGON) == address(0)) return;
        
        // Approve LP tokens to redDRAGON contract for 1:1 wrapping
        IERC20(lpPair).approve(address(redDRAGON), lpTokens);
        
        try redDRAGON.wrap(lpTokens) { // Wrap LP tokens as redDRAGON (1:1, no locking)
            // LP tokens successfully wrapped as redDRAGON (1:1 ratio)
            emit LPTokensWrapped(lpTokens, lpTokens, block.timestamp);
            
            // Now distribute redDRAGON to jackpot vault and veDRAGON holders
            _distributeRedDRAGON();
        } catch {
            // Wrapping failed - LP tokens remain in this contract
            // Send LP tokens back to dragon contract
            IERC20(lpPair).safeTransfer(address(dragonToken), lpTokens);
        }
    }
    
    /**
     * @dev Distribute redDRAGON to jackpot vault and veDRAGON holders
     */
    function _distributeRedDRAGON() internal {
        uint256 redDRAGONBalance = redDRAGON.balanceOf(address(this));
        if (redDRAGONBalance == 0) return;
        
        // Calculate distribution: 69% to jackpot vault, 31% to veDRAGON holders
        uint256 jackpotShare = (redDRAGONBalance * DISTRIBUTION_JACKPOT) / 1000; // 69%
        uint256 veDRAGONShare = (redDRAGONBalance * DISTRIBUTION_VEDRAGON) / 1000; // 31%
        
        // Distribute to jackpot vault (for lottery rewards)
        if (jackpotShare > 0 && jackpotVault != address(0)) {
            IERC20(address(redDRAGON)).safeTransfer(jackpotVault, jackpotShare);
            emit RedDRAGONDistributed(jackpotVault, jackpotShare, "jackpot_distribution");
        }
        
        // Distribute to veDRAGON revenue distributor (for veDRAGON holders)
        if (veDRAGONShare > 0 && revenueDistributor != address(0)) {
            IERC20(address(redDRAGON)).safeTransfer(revenueDistributor, veDRAGONShare);
            emit RedDRAGONDistributed(revenueDistributor, veDRAGONShare, "veDRAGON_distribution");
        }
    }
    
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
    ) {
        return (lpCreationThreshold, minWETHForLP, lpCreationEnabled);
    }
    
    /**
     * @dev Get current redDRAGON balance in this contract
     * @return redDRAGON balance
     */
    function getRedDRAGONBalance() external view returns (uint256) {
        if (address(redDRAGON) == address(0)) return 0;
        return redDRAGON.balanceOf(address(this));
    }
    
    /**
     * @dev Get current LP token balance in this contract
     * @return LP token balance
     */
    function getLPTokenBalance() external view returns (uint256) {
        if (lpPair == address(0)) return 0;
        return IERC20(lpPair).balanceOf(address(this));
    }
    
    /**
     * @dev Emergency function to recover stuck tokens
     * @param token Token address to recover
     * @param amount Amount to recover
     */
    function emergencyRecoverTokens(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            // Recover native tokens
            (bool success, ) = payable(owner()).call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // Recover ERC20 tokens
            IERC20(token).safeTransfer(owner(), amount);
        }
    }
    
    /**
     * @dev AUDIT FIX: Proper ETH handling with automatic wrapping
     * @notice Wraps received ETH as WETH for LP creation
     * Critical vulnerability fix - prevents permanently locked funds
     */
    receive() external payable nonReentrant {
        if (msg.value > 0) {
            if (address(wrappedNative) != address(0)) {
                try wrappedNative.deposit{value: msg.value}() {
                    emit NativeReceived(msg.sender, msg.value, "WETH_wrapped");
                } catch {
                    // If wrapping fails, revert to prevent locked funds
                    revert("WETH wrapping failed - ETH would be locked");
                }
            } else {
                revert("No WETH wrapper configured - ETH would be locked");
            }
        }
    }
} 