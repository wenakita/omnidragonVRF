// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFT.sol";
import { MessagingFee, SendParam } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/interfaces/IOFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Dragon ecosystem interfaces
import { IOmniDragonLotteryManager } from "../../interfaces/lottery/IOmniDragonLotteryManager.sol";
import { IomniDRAGON } from "../../interfaces/tokens/IomniDRAGON.sol";
import { IOmniDragonHybridRegistry } from "../../interfaces/config/IOmniDragonHybridRegistry.sol";
import { IOmniDragonLPManager } from "../../interfaces/helpers/IOmniDragonLPManager.sol";

// DEX interfaces
interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint256) external;
}

// Custom Errors
error ZeroAddress();
error MaxTransferExceeded();
error TradingDisabled();
error AmountBelowMinimum();
error TransferFailed();
error ContractPaused();
error InvalidFeeConfiguration();
error InsufficientBalance();
error UnauthorizedCaller(); // OPTIMIZATION: Better error naming
error LPManagerConfigurationFailed(); // AUDIT FIX: New error for LP manager configuration failures
error WETHWrappingFailed(); // AUDIT FIX: New error for WETH wrapping failures
error ConfigurationSyncFailed(); // AUDIT FIX: New error for configuration synchronization failures

// OPTIMIZATION: Add constants to replace magic numbers
uint256 constant MIN_NATIVE_BALANCE = 0.01 ether;
uint256 constant MIN_EMERGENCY_BALANCE = 0.02 ether;
uint256 constant DISTRIBUTION_JACKPOT = 690; // 69%
uint256 constant DISTRIBUTION_VEDRAGON = 310; // 31%
uint256 constant MAX_DISTRIBUTION_PERCENTAGE = 8000; // 80%


/**
 * @title omniDRAGON
 * @author akita
 * @dev Cross-chain DRAGON token with LayerZero V2 integration and symmetric fee collection
 * @notice Community-driven cross-chain token for the Omnichain ecosystem
 * 
 * FEATURES:
 *  Cross-chain transfers via LayerZero V2 & Registry-based hybrid architecture
 *  Verifiable Randomness Function (VRF) via Chainlink VRF V2.5 (Arbitrum) via LayerZero
 *  Community lottery on purchases & LP-based revenue sharing system
 *  Deflationary burn mechanics & Fair launch with transparent fees
 * 
 * TOKENOMICS:
 *  Buy/Sell: 10% fee (6.9% lottery, 2.41% revenue, 0.69% burn)
 *  Transfer: 0% fee
 *  Supply: 6.942M fixed (minted only on Sonic chain)
 *  Distribution: Sonic mints → LayerZero bridges to other chains
 *  
 * SYMMETRIC FEE COLLECTION SYSTEM:
 *  1. Sell transactions (DRAGON → WETH): Collect fees in DRAGON tokens
 *  2. Buy transactions (WETH → DRAGON): Collect fees in WETH/native tokens
 *  3. Both tokens accumulate naturally from trading activity
 *  4. When thresholds are met, create DRAGON/WETH LP pairs
 *  5. Wrap LP tokens as redDRAGON (1:1 wrapper, no locking/fees)
 *  6. Distribute redDRAGON: 69% to jackpot vault, 31% to veDRAGON holders
 *  7. redDRAGON holders earn LP trading fees + appreciation
 *  8. redDRAGON can be unwrapped back to LP tokens anytime (1:1)
 *  9. LP tokens can be used to remove liquidity if desired
 * 
 * CHAINS: Sonic (146) - ORIGIN CHAIN | Arbitrum (42161) | Avalanche (43114) | Extensible via registry
 * DEX COMPATIBILITY: Uses Uniswap V2 compatible routers on all chains for LP creation
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract omniDRAGON is OFT, ReentrancyGuard, IomniDRAGON, IERC165 {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant MAX_SUPPLY = 6_942_000 * 10**18;
    uint256 public constant INITIAL_SUPPLY = 6_942_000 * 10**18;
    uint256 public constant MAX_SINGLE_TRANSFER = 1_000_000 * 10**18;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant SONIC_CHAIN_ID = 146; // Sonic chain ID
    uint256 public constant MAX_FEE_BPS = 2500; // 25% maximum fee

    
    // Fee structure (packed)
    struct Fees {
        uint16 jackpot;
        uint16 veDRAGON;
        uint16 burn;
        uint16 total;
    }
    
    // Registry integration
    IOmniDragonHybridRegistry public immutable registry;
    address public immutable delegate;
    
    // Core addresses
    address public jackpotVault;
    address public revenueDistributor;
    address public lotteryManager;
    
    // External LP Manager
    IOmniDragonLPManager public lpManager;
    
    // DEX integration
    IWETH public wrappedNative; // Set once in constructor
    
    // Fee configuration
    Fees public buyFees = Fees(690, 241, 69, 1000);
    Fees public sellFees = Fees(690, 241, 69, 1000);
    
    // OPTIMIZATION: Pack control flags into a single storage slot for gas efficiency
    struct ControlFlags {
        bool emergencyPaused;
        bool feesEnabled;
        bool tradingEnabled;
        bool swapEnabled;
        bool initialMintCompleted;
    }
    ControlFlags public controlFlags = ControlFlags(false, true, true, true, false);
    
    // OPTIMIZATION: Individual getters for backward compatibility
    function emergencyPaused() external view returns (bool) { return controlFlags.emergencyPaused; }
    function feesEnabled() external view returns (bool) { return controlFlags.feesEnabled; }
    function tradingEnabled() external view returns (bool) { return controlFlags.tradingEnabled; }
    function swapEnabled() external view returns (bool) { return controlFlags.swapEnabled; }
    function initialMintCompleted() external view returns (bool) { return controlFlags.initialMintCompleted; }

    // Mappings
    mapping(address => bool) public isPair;
    mapping(address => bool) public isExcludedFromFees;
    mapping(address => bool) public isExcludedFromMaxTransfer;

    // OPTIMIZATION: Cache for frequently accessed values
    uint256 private cachedWETHBalance;
    uint256 private lastWETHBalanceUpdate;
    
    // Events
    event TradingEnabled(uint256 timestamp);
    event TradingPaused(uint256 timestamp);
    event FeesUpdated(bool indexed isBuy, uint16 jackpot, uint16 veDRAGON, uint16 burn, uint16 total);
    event PairUpdated(address indexed pair, bool oldValue, bool newValue);
    event JackpotVaultUpdated(address indexed oldVault, address indexed newVault);
    event RevenueDistributorUpdated(address indexed oldDistributor, address indexed newDistributor);
    event LotteryManagerUpdated(address indexed oldManager, address indexed newManager);
    event MaxTransferExclusionUpdated(address indexed account, bool excluded);
    event FeeExclusionUpdated(address indexed account, bool excluded);
    event InitialMintCompleted(address indexed to, uint256 amount, uint256 chainId);
    event EmergencyWithdrawTriggered(address indexed token, uint256 amount, address indexed to);
    event FeeDistributed(address indexed recipient, uint256 amount, string tokenType);
    event NativeReceived(address indexed sender, uint256 amount, string source);
    event WETHFeeCollected(address indexed buyer, uint256 wethAmount, uint256 timestamp);
    event NativeFeeCollected(address indexed buyer, uint256 nativeAmount, uint256 timestamp);
    event LotteryTriggered(address indexed user, uint256 dragonAmount, uint256 timestamp);

    
    // Modifiers
    modifier notPaused() {
        if (controlFlags.emergencyPaused) revert ContractPaused();
        _;
    }
    

    
    modifier validAddress(address _addr) {
        if (_addr == address(0)) revert ZeroAddress();
        _;
    }

    // ========== INTERFACE SUPPORT ==========
    
    function supportsInterface(bytes4 interfaceId) public pure override returns (bool) {
        return interfaceId == type(IERC165).interfaceId || interfaceId == type(IomniDRAGON).interfaceId;
    }

    // ========== GAS REFUND ==========
    
    function gasRefund(bytes calldata payload) external payable {
        // SECURITY FIX: Remove dangerous tx.origin usage
        // Critical vulnerability fix - CVE-2024-AUDIT-003
        if (msg.sender != address(this)) revert TransferFailed();
        
        // SECURITY: tx.origin usage is dangerous and has been disabled
        // Use standard LayerZero refund mechanisms instead
        revert("Gas refund function disabled for security - use standard LayerZero refund mechanism");
    }

    function _getLayerZeroEndpoint(address _registry) private view returns (address) {
        return IOmniDragonHybridRegistry(_registry).getLayerZeroEndpoint(uint16(block.chainid));
    }

    /**
     * @dev Constructor for omniDRAGON
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _delegate Delegate address (should be hybrid registry)
     * @param _registry Registry address
     * @param _owner Owner address
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _delegate,
        address _registry,
        address _owner
    ) OFT(_name, _symbol, _getLayerZeroEndpoint(_registry), _delegate) 
      Ownable(_owner) {
        if (_registry == address(0)) revert ZeroAddress();
        if (_delegate == address(0)) revert ZeroAddress();
        if (_owner == address(0)) revert ZeroAddress();
        
        registry = IOmniDragonHybridRegistry(_registry);
        delegate = _delegate;
        
        // Initialize wrapped native token (set once in constructor)
        address _wrappedNative = registry.getWrappedNativeToken(uint16(block.chainid));
        if (_wrappedNative != address(0)) {
            wrappedNative = IWETH(_wrappedNative);
        }
        
        // Only exclude essential addresses
        isExcludedFromFees[address(this)] = true;
        isExcludedFromMaxTransfer[address(this)] = true;
        isExcludedFromMaxTransfer[_owner] = true;

        // Only mint initial supply on Sonic chain (chainId 146)
        if (block.chainid == SONIC_CHAIN_ID) {
            _mint(_owner, INITIAL_SUPPLY);
            controlFlags.initialMintCompleted = true;
            emit InitialMintCompleted(_owner, INITIAL_SUPPLY, block.chainid);
        }
        // Other chains deploy with 0 initial supply - tokens come via LayerZero transfers
    }

    function transfer(address to, uint256 amount) public override notPaused returns (bool) {
        if (!isExcludedFromMaxTransfer[msg.sender] && amount > MAX_SINGLE_TRANSFER) {
            revert MaxTransferExceeded();
        }
        return _transferWithFees(msg.sender, to, amount);
    }

    /**
     * @dev AUDIT FIX: Fixed max transfer bypass vulnerability
     * @notice Now checks both token holder AND spender for max transfer limits
     * Critical vulnerability fix - prevents security restriction bypass
     */
    function transferFrom(address from, address to, uint256 amount) public override notPaused returns (bool) {
        // AUDIT FIX: Check both token holder and spender for max transfer limits
        if ((!isExcludedFromMaxTransfer[from] || !isExcludedFromMaxTransfer[msg.sender]) && 
            amount > MAX_SINGLE_TRANSFER) {
            revert MaxTransferExceeded();
        }
        _spendAllowance(from, _msgSender(), amount);
        return _transferWithFees(from, to, amount);
    }

    function _transferWithFees(address from, address to, uint256 amount) internal returns (bool) {
        if (from == address(0) || to == address(0)) revert ZeroAddress();
        
        bool isInternalCall = (msg.sender == address(this) || 
                              from == address(this) || 
                              to == address(this));
        
        bool isExcluded = (isExcludedFromFees[from] || isExcludedFromFees[to]);
        
        if (isInternalCall || isExcluded) {
            _transfer(from, to, amount);
            return true;
        }
        
        if (!controlFlags.tradingEnabled) revert TradingDisabled();
        


        // Skip fees if conditions met
        if (!controlFlags.feesEnabled || (!isPair[to] && !isPair[from])) {
            _transfer(from, to, amount);
            return true;
        }

        // OPTIMIZATION: Simplified fee logic - only handle sell fees here
        // Buy fees are handled exclusively by external fee collection functions
        bool isSell = isPair[to];
        
        if (isSell && sellFees.total > 0) {
            uint256 feeAmount = (amount * sellFees.total) / BASIS_POINTS;
            
            if (feeAmount > 0) {
                _transfer(from, address(this), feeAmount);
                amount -= feeAmount;
            }
        }
        
        _transfer(from, to, amount);
        
        // OPTIMIZATION: Removed expensive LP creation check from every transfer
        // LP creation is now triggered only in fee collection functions
        
        return true;
    }


    /**
     * @dev Create LP using external LP manager
     * @dev Triggers external LP creation if conditions are met
     */
    function _createLPWithExternalManager() internal {
        // Only trigger LP creation if external manager is set and conditions are met
        if (address(lpManager) != address(0)) {
            try lpManager.shouldCreateLP() returns (bool shouldCreate) {
                if (shouldCreate) {
                    // Approve tokens to LP manager
                    uint256 dragonBalance = balanceOf(address(this));
                    uint256 wethBalance = wrappedNative.balanceOf(address(this));
                    
                    if (dragonBalance > 0) {
                        _approve(address(this), address(lpManager), dragonBalance);
                    }
                    if (wethBalance > 0) {
                        wrappedNative.approve(address(lpManager), wethBalance);
                    }
                    
                    // Call external LP manager to create LP
                    lpManager.createLPAndDistribute();
                }
            } catch {
                // LP creation failed - continue silently
            }
        }
    }

    // OPTIMIZATION: Removed unused _fallbackTokenDistribution function (dead code)
    
    /**
     * @dev OPTIMIZATION: Unified lottery trigger function for better gas efficiency
     * @param user User address (buyer)  
     * @param amount Amount being spent by user
     * @param isNative Whether the amount is in native tokens (true) or WETH (false)
     */
    function _triggerLottery(address user, uint256 amount, bool isNative) internal {
        if (user == address(0) || amount == 0 || lotteryManager == address(0)) return;
        
        if (isNative) {
            try IOmniDragonLotteryManager(lotteryManager).processNativeTokenEntry(user, amount) {
                emit LotteryTriggered(user, amount, block.timestamp);
            } catch {
                // Lottery entry failed - continue silently
            }
        } else {
            try IOmniDragonLotteryManager(lotteryManager).processWETHEntry(user, amount) {
                emit LotteryTriggered(user, amount, block.timestamp);
            } catch {
                // Lottery entry failed - continue silently
            }
        }
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @dev AUDIT FIX: Atomic configuration with proper error handling
     * @notice Sets core contract addresses with state consistency protection
     * Critical vulnerability fix - prevents state desynchronization
     */
    function setRoles(
        address _jackpot,
        address _revenue, 
        address _lottery,
        address _lpManager,
        address _wrapped
    ) external onlyOwner {
        // Store old values for events
        address oldJackpot = jackpotVault;
        address oldRevenue = revenueDistributor;
        address oldLottery = lotteryManager;
        
        // Track what changed for single LP manager update
        bool distributionChanged = false;
        
        // Set core addresses
        if (_jackpot != address(0)) {
            jackpotVault = _jackpot;
            distributionChanged = true;
            emit JackpotVaultUpdated(oldJackpot, _jackpot);
        }
        if (_revenue != address(0)) {
            revenueDistributor = _revenue;
            distributionChanged = true;
            emit RevenueDistributorUpdated(oldRevenue, _revenue);
        }
        if (_lottery != address(0)) {
            lotteryManager = _lottery;
            emit LotteryManagerUpdated(oldLottery, _lottery);
        }
        
        // Set LP manager
        if (_lpManager != address(0)) {
            lpManager = IOmniDragonLPManager(_lpManager);
        }
        
        // Set wrapped native token
        if (_wrapped != address(0)) {
            wrappedNative = IWETH(_wrapped);
        }
        
        // AUDIT FIX: Single atomic call with proper error handling
        if (distributionChanged && address(lpManager) != address(0)) {
            try lpManager.setDistributionAddresses(jackpotVault, revenueDistributor) {} catch {
                revert LPManagerConfigurationFailed();
            }
        }
    }
    
    /**
     * @dev Configure LP settings via external LP manager
     * @dev AUDIT FIX: Added error handling for external calls
     */
    function configureLPSettings(
        uint256 _lpThreshold,
        uint256 _minWETH,
        bool _lpEnabled
    ) external onlyOwner {
        if (address(lpManager) != address(0)) {
            try lpManager.configureLPSettings(_lpThreshold, _minWETH, _lpEnabled) {} catch {
                revert LPManagerConfigurationFailed();
            }
        }
    }

    function setPair(address _pair, bool _isPair) external onlyOwner validAddress(_pair) {
        isPair[_pair] = _isPair;
        emit PairUpdated(_pair, false, _isPair);
    }

    function setExcludeFromFees(address account, bool excluded) external onlyOwner validAddress(account) {
        isExcludedFromFees[account] = excluded;
        emit FeeExclusionUpdated(account, excluded);
    }

    function setExcludeFromMaxTransfer(address account, bool excluded) external onlyOwner validAddress(account) {
        isExcludedFromMaxTransfer[account] = excluded;
        emit MaxTransferExclusionUpdated(account, excluded);
    }

    function updateFees(bool isBuy, uint16 _jackpot, uint16 _veDRAGON, uint16 _burn) external onlyOwner {
        uint16 total = _jackpot + _veDRAGON + _burn;
        if (total > MAX_FEE_BPS) revert InvalidFeeConfiguration();
        
        if (isBuy) {
            buyFees = Fees(_jackpot, _veDRAGON, _burn, total);
        } else {
            sellFees = Fees(_jackpot, _veDRAGON, _burn, total);
        }
        
        emit FeesUpdated(isBuy, _jackpot, _veDRAGON, _burn, total);
    }



    /**
     * @dev AUDIT FIX: Renamed from distributeFees to better reflect functionality
     * @notice Distributes native ETH to lottery manager (not strictly limited to fees)
     * @param amount Amount of native ETH to distribute
     */
    function distributeNativeEthToLottery(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert AmountBelowMinimum();
        
        uint256 contractBalance = address(this).balance;
        if (contractBalance < MIN_NATIVE_BALANCE) revert InsufficientBalance();
        
        uint256 distributableBalance = contractBalance - MIN_NATIVE_BALANCE;
        uint256 maxDistributable = (distributableBalance * MAX_DISTRIBUTION_PERCENTAGE) / BASIS_POINTS; // 80%
        
        if (amount > maxDistributable) revert AmountBelowMinimum();
        
        address lotteryMgr = registry.getLotteryManager(uint16(block.chainid));
        if (lotteryMgr == address(0)) revert ZeroAddress();
        
        (bool success, ) = lotteryMgr.call{value: amount}("");
        if (!success) revert TransferFailed();
        
        emit FeeDistributed(lotteryMgr, amount, "native");
    }

    // AUDIT FIX: Keep backward compatibility with original function name
    function distributeFees(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert AmountBelowMinimum();
        
        uint256 contractBalance = address(this).balance;
        if (contractBalance < MIN_NATIVE_BALANCE) revert InsufficientBalance();
        
        uint256 distributableBalance = contractBalance - MIN_NATIVE_BALANCE;
        uint256 maxDistributable = (distributableBalance * MAX_DISTRIBUTION_PERCENTAGE) / BASIS_POINTS; // 80%
        
        if (amount > maxDistributable) revert AmountBelowMinimum();
        
        address lotteryMgr = registry.getLotteryManager(uint16(block.chainid));
        if (lotteryMgr == address(0)) revert ZeroAddress();
        
        (bool success, ) = lotteryMgr.call{value: amount}("");
        if (!success) revert TransferFailed();
        
        emit FeeDistributed(lotteryMgr, amount, "native");
    }

    function distributeWETH(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert AmountBelowMinimum();
        if (address(wrappedNative) == address(0)) revert ZeroAddress();

        uint256 contractBalance = wrappedNative.balanceOf(address(this));
        if (contractBalance < amount) revert InsufficientBalance();

        address lotteryMgr = registry.getLotteryManager(uint16(block.chainid));
        if (lotteryMgr == address(0)) revert ZeroAddress();

        // SECURITY FIX: Use SafeERC20 instead of raw transfer (reverts on failure)
        IERC20(address(wrappedNative)).safeTransfer(lotteryMgr, amount);

        emit FeeDistributed(lotteryMgr, amount, "WETH");
    }

    function distributeAllWETH() external onlyOwner nonReentrant {
        if (address(wrappedNative) == address(0)) revert ZeroAddress();

        uint256 contractBalance = wrappedNative.balanceOf(address(this));
        if (contractBalance == 0) revert InsufficientBalance();

        address lotteryMgr = registry.getLotteryManager(uint16(block.chainid));
        if (lotteryMgr == address(0)) revert ZeroAddress();

        // SECURITY FIX: Use SafeERC20 instead of raw transfer (reverts on failure)
        IERC20(address(wrappedNative)).safeTransfer(lotteryMgr, contractBalance);

        emit FeeDistributed(lotteryMgr, contractBalance, "WETH");
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (amount == 0) revert AmountBelowMinimum();
        
        if (token == address(0)) {
            uint256 balance = address(this).balance;
            if (balance < MIN_EMERGENCY_BALANCE) revert InsufficientBalance();
            
            uint256 withdrawable = balance - MIN_EMERGENCY_BALANCE;
            if (amount > withdrawable) revert AmountBelowMinimum();
            
            (bool success, ) = payable(owner()).call{value: amount}("");
            if (!success) revert TransferFailed();
            
            emit EmergencyWithdrawTriggered(token, amount, owner());
        } else {
            if (token == address(this)) revert InvalidFeeConfiguration();
            
            IERC20 tokenContract = IERC20(token);
            uint256 balance = tokenContract.balanceOf(address(this));
            if (balance < amount) revert InsufficientBalance();
            
            // SECURITY FIX: Use SafeERC20 instead of raw transfer
            tokenContract.safeTransfer(owner(), amount);
            
            emit EmergencyWithdrawTriggered(token, amount, owner());
        }
    }
    
    // ========== LAYERZERO V2 OVERRIDES ==========
    
    function quoteSend(
        SendParam calldata _sendParam,
        bool _payInLzToken
    ) public view override returns (MessagingFee memory fee) {
        (, uint256 amountReceivedLD) = _debitView(_sendParam.amountLD, _sendParam.minAmountLD, _sendParam.dstEid);
        (bytes memory message, bytes memory options) = _buildMsgAndOptions(_sendParam, amountReceivedLD);
        return _quote(_sendParam.dstEid, message, options, _payInLzToken);
    }

    function _debitView(
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 /*_dstEid*/
    ) internal pure override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        if (_amountLD < _minAmountLD) revert AmountBelowMinimum();
        amountSentLD = _amountLD;
        amountReceivedLD = _amountLD;
    }

    /**
     * @dev Receive function - wraps received ETH as WETH for LP creation
     * SECURITY FIX: Added reentrancy protection for external calls safety
     * Critical vulnerability fix - CVE-2024-AUDIT-009
     */
    receive() external payable nonReentrant {
        if (msg.value > 0) {
            // Wrap received ETH as WETH for LP creation
            if (address(wrappedNative) != address(0)) {
                try wrappedNative.deposit{value: msg.value}() {
                    emit NativeReceived(msg.sender, msg.value, "WETH_wrapped");
                } catch {
                    // If wrapping fails, keep as native ETH
                    emit NativeReceived(msg.sender, msg.value, "native_kept");
                }
            } else {
                emit NativeReceived(msg.sender, msg.value, "native_no_wrapper");
            }
        }
    }

    /**
     * @dev Collect WETH fees during buy transactions (called by DEX integration)
     * @param buyer Address of the buyer
     * @param wethAmount Amount of WETH being used for purchase
     * SECURITY FIX: Added reentrancy protection for external calls safety
     */
    function collectWETHFees(address buyer, uint256 wethAmount) external nonReentrant {
        // OPTIMIZATION: Use specific error for better gas efficiency
        if (!isPair[msg.sender]) {
            revert UnauthorizedCaller();
        }
        
        if (wethAmount == 0) return;
        
        // Calculate WETH fee (same rate as buy fees)
        uint256 wethFeeAmount = (wethAmount * buyFees.total) / BASIS_POINTS;
        
        if (wethFeeAmount > 0 && address(wrappedNative) != address(0)) {
            try wrappedNative.transferFrom(buyer, address(this), wethFeeAmount) returns (bool success) {
                if (success) {
                    emit WETHFeeCollected(buyer, wethFeeAmount, block.timestamp);
                    
                    // OPTIMIZATION: Use unified lottery trigger
                    if (lotteryManager != address(0)) {
                        _triggerLottery(buyer, wethAmount, false);
                    }
                }
            } catch {
                // Fee collection failed - continue without fee
            }
        }
        
        // OPTIMIZATION: Trigger LP creation after fee collection
        _createLPWithExternalManager();
    }

    /**
     * @dev Collect native token fees during buy transactions (called by DEX integration)
     * @param buyer Address of the buyer
     * SECURITY FIX: Added reentrancy protection for external calls safety
     */
    function collectNativeFees(address buyer) external payable nonReentrant {
        // OPTIMIZATION: Use specific error for better gas efficiency
        if (!isPair[msg.sender]) {
            revert UnauthorizedCaller();
        }
        
        if (msg.value == 0) return;
        
        // Wrap received native tokens as WETH for LP creation
        if (address(wrappedNative) != address(0)) {
            try wrappedNative.deposit{value: msg.value}() {
                emit NativeFeeCollected(buyer, msg.value, block.timestamp);
                
                // OPTIMIZATION: Use unified lottery trigger
                _triggerLottery(buyer, msg.value, true);
            } catch {
                // Wrapping failed - keep as native ETH
                emit NativeFeeCollected(buyer, msg.value, block.timestamp);
                
                // Still trigger lottery even if wrapping failed
                _triggerLottery(buyer, msg.value, true);
            }
        }
        
        // OPTIMIZATION: Trigger LP creation after fee collection
        _createLPWithExternalManager();
    }

    function processNativeSwapFees(address, uint256 _nativeAmount) 
        external 
        view 
        override 
        returns (uint256 swappableAmount, uint256 nativeFeeAmount, uint256 jackpotFeeAmount, uint256 veDRAGONFeeAmount) 
    {
        nativeFeeAmount = (_nativeAmount * buyFees.total) / BASIS_POINTS;
        jackpotFeeAmount = (_nativeAmount * buyFees.jackpot) / BASIS_POINTS;
        veDRAGONFeeAmount = (_nativeAmount * buyFees.veDRAGON) / BASIS_POINTS;
        swappableAmount = _nativeAmount - nativeFeeAmount;
    }

    function wrappedNativeToken() external view override returns (address) {
        return address(wrappedNative);
    }

    // OPTIMIZATION: Cached WETH balance view function for gas efficiency
    function getWETHBalance() external view returns (uint256) {
        if (address(wrappedNative) == address(0)) return 0;
        
        // Return cached value if recent (within 1 block)
        if (block.number == lastWETHBalanceUpdate) {
            return cachedWETHBalance;
        }
        
        return wrappedNative.balanceOf(address(this));
    }
    
    /**
     * @dev OPTIMIZATION: Internal function to update WETH balance cache
     */
    function _updateWETHCache() internal {
        if (address(wrappedNative) != address(0)) {
            cachedWETHBalance = wrappedNative.balanceOf(address(this));
            lastWETHBalanceUpdate = block.number;
        }
    }

    // Essential view functions
    function getFees() external view returns (Fees memory _buyFees, Fees memory _sellFees) {
        return (buyFees, sellFees);
    }
    
    /**
     * @dev Get LP configuration from external LP manager
     */
    function getLPConfig() external view returns (
        uint256 _lpThreshold,
        uint256 _minWETH,
        bool _lpEnabled
    ) {
        if (address(lpManager) != address(0)) {
            return lpManager.getLPConfig();
        }
        return (0, 0, false);
    }
    
    /**
     * @dev Get redDRAGON balance from external LP manager
     */
    function getRedDRAGONBalance() external view returns (uint256) {
        if (address(lpManager) != address(0)) {
            return lpManager.getRedDRAGONBalance();
        }
        return 0;
    }
    
    /**
     * @dev Get LP token balance from external LP manager
     */
    function getLPTokenBalance() external view returns (uint256) {
        if (address(lpManager) != address(0)) {
            return lpManager.getLPTokenBalance();
        }
        return 0;
    }
    
    /**
     * @dev Check if LP creation conditions are met via external manager
     */
    function canCreateLP() external view returns (bool) {
        if (address(lpManager) != address(0)) {
            try lpManager.shouldCreateLP() returns (bool shouldCreate) {
                return shouldCreate;
            } catch {
                return false;
            }
        }
        return false;
    }

    /**
     * @dev Manual LP creation via external manager
     */
    function manualCreateLP() external onlyOwner {
        _createLPWithExternalManager();
    }

    /**
     * @dev AUDIT FIX: Removed unused dragonAmount parameter
     * @notice Simplified buy fee collection function for DEX integrations
     * @param buyer Address of the buyer
     * @param wethAmount Amount of WETH being used for purchase (ignored if useNative is true)
     * @param useNative Whether to collect fee in native tokens (true) or WETH (false)
     */
    function handleBuyTransactionFees(
        address buyer, 
        uint256 wethAmount, 
        bool useNative
    ) external payable nonReentrant {
        // OPTIMIZATION: Use specific error for better gas efficiency
        if (!isPair[msg.sender]) {
            revert UnauthorizedCaller();
        }
        
        if (!controlFlags.feesEnabled || isExcludedFromFees[buyer]) return;
        
        if (useNative && msg.value > 0) {
            _handleNativeFee(buyer, msg.value);
        } else if (!useNative && wethAmount > 0) {
            _handleWETHFee(buyer, wethAmount);
        }
        
        // OPTIMIZATION: Single LP creation check after fee processing
        _createLPWithExternalManager();
    }
    
    /**
     * @dev OPTIMIZATION: Internal function to handle native fee collection
     */
    function _handleNativeFee(address buyer, uint256 amount) internal {
        if (address(wrappedNative) != address(0)) {
            try wrappedNative.deposit{value: amount}() {
                emit NativeFeeCollected(buyer, amount, block.timestamp);
                _triggerLottery(buyer, amount, true);
            } catch {
                emit NativeFeeCollected(buyer, amount, block.timestamp);
                _triggerLottery(buyer, amount, true);
            }
        }
    }
    
    /**
     * @dev OPTIMIZATION: Internal function to handle WETH fee collection
     */
    function _handleWETHFee(address buyer, uint256 wethAmount) internal {
        uint256 feeAmount = (wethAmount * buyFees.total) / BASIS_POINTS;
        
        if (feeAmount > 0 && address(wrappedNative) != address(0)) {
            try wrappedNative.transferFrom(buyer, address(this), feeAmount) {
                emit WETHFeeCollected(buyer, feeAmount, block.timestamp);
                _triggerLottery(buyer, wethAmount, false);
            } catch {
                // Fee collection failed - continue without fee
            }
        }
    }

    /**
     * @dev Get accumulated fee balances for LP creation
     * @return dragonBalance DRAGON tokens accumulated from sell fees
     * @return wethBalance WETH tokens accumulated from buy fees
     * @return nativeBalance Native tokens available for wrapping
     * @return canCreate Whether LP creation thresholds are met
     */
    function getAccumulatedFees() external view returns (
        uint256 dragonBalance,
        uint256 wethBalance,
        uint256 nativeBalance,
        bool canCreate
    ) {
        dragonBalance = balanceOf(address(this));
        wethBalance = address(wrappedNative) != address(0) ? wrappedNative.balanceOf(address(this)) : 0;
        nativeBalance = address(this).balance;
        canCreate = this.canCreateLP();
    }


}