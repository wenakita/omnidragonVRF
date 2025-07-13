// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { MessagingFee, SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Dragon ecosystem interfaces
import { IOmniDragonLotteryManager } from "../../interfaces/lottery/IOmniDragonLotteryManager.sol";
import { IOmniDragonHybridRegistry } from "../../interfaces/config/IOmniDragonHybridRegistry.sol";

// DEX interfaces
/**
 * @dev Generic interface for wrapped native tokens (WETH, WAVAX, WS, WFTM, etc.)
 */
interface IWrappedNative is IERC20 {
    function deposit() external payable;
    function withdraw(uint256) external;
}

// Minimal interface for DEX router (for buyback functionality)
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
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
error UnauthorizedCaller(); 
error ConfigurationSyncFailed(); 

/**
 * @title omniDRAGON
 * @author akita
 * @dev Cross-chain DRAGON token with LayerZero V2 integration and immediate fee distribution
 * @notice Community-driven cross-chain token for the Omnichain ecosystem
 * 
 * FEATURES:
 *  Cross-chain transfers via LayerZero V2 & Registry-based hybrid architecture
 *  Verifiable Randomness Function (VRF) via Chainlink VRF V2.5 (Arbitrum) via LayerZero
 *  Community lottery on purchases & Immediate fee distribution system
 *  Deflationary burn mechanics & Fair launch with transparent fees
 * 
 * TOKENOMICS & FEE DISTRIBUTION:
 *  Buy Fees (Wrapped Native/Native → DRAGON): 10% total
 *    ├── 6.9% → JackpotVault (immediate distribution)
 *    ├── 2.41% → veDRAGONRevenueDistributor (immediate distribution)
 *    └── 0.69% → Contract (operational funds for buyback and burn)
 *  
 *  Sell Fees (DRAGON → Wrapped Native): 10% total
 *    ├── 6.9% → JackpotVault (immediate distribution)
 *    ├── 2.41% → veDRAGONRevenueDistributor (immediate distribution)
 *    └── 0.69% → Dead Address (immediate burn)
 * 
 *  Transfer: 0% fee
 *  Supply: 6.942M fixed (minted only on Sonic chain)
 *  Distribution: Sonic mints → LayerZero bridges to other chains
 *  
 * OPERATIONAL FUNDS USAGE:
 *  - Accumulated 0.69% from buy transactions (Wrapped Native/Native)
 *  - Used for periodic buyback of DRAGON tokens from market
 *  - Buyback tokens can be burned to reduce circulating supply
 *  - Provides additional deflationary pressure beyond direct sell burns
 *  - Controlled by owner via executeBuybackAndBurn() functions
 * 
 * CROSS-CHAIN NATIVE TOKEN SUPPORT:
 *  - Sonic: S (Native) → WS (Wrapped Sonic)
 *  - Arbitrum: ETH (Native) → WETH (Wrapped Ether)
 *  - Avalanche: AVAX (Native) → WAVAX (Wrapped AVAX)
 *  - Fantom: FTM (Native) → WFTM (Wrapped FTM)
 *  - Polygon: MATIC (Native) → WMATIC (Wrapped MATIC)
 *  - BSC: BNB (Native) → WBNB (Wrapped BNB)
 *  - Ethereum: ETH (Native) → WETH (Wrapped Ether)
 * 
 * CHAINS: Sonic (146) - ORIGIN CHAIN | Arbitrum (42161) | Avalanche (43114) | Extensible via registry
 * DEX COMPATIBILITY: Uses Uniswap V2 compatible routers on all chains
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract omniDRAGON is OFT, ReentrancyGuard, IERC165 {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant MAX_SUPPLY = 6_942_000 * 10**18;
    uint256 public constant INITIAL_SUPPLY = 6_942_000 * 10**18;
    uint256 public constant MAX_SINGLE_TRANSFER = 1_000_000 * 10**18;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant SONIC_CHAIN_ID = 146; // Sonic chain ID
    uint256 public constant MAX_FEE_BPS = 2500; // 25% maximum fee
    uint256 public constant FEEM_REGISTRATION_ID = 143; // FeeM registration ID
    
    // Sonic FeeM integration
    address public constant SONIC_FEEM_CONTRACT = 0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830;

    // Dead address for burning
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    // Fee structure (packed for gas efficiency)
    struct Fees {
        uint16 jackpot;
        uint16 veDRAGON;
        uint16 burn;
        uint16 total;
    }
    
    // Pack control flags into a single storage slot for gas efficiency
    struct ControlFlags {
        bool feesEnabled;
        bool tradingEnabled;
        bool initialMintCompleted;
        bool paused;
        bool emergencyMode;
        bool reserveFlag1;
        bool reserveFlag2;
        bool reserveFlag3;
    }
    
    // Registry integration
    IOmniDragonHybridRegistry public immutable registry;
    address public immutable delegate;
    
    // Core addresses
    address public jackpotVault;
    address public revenueDistributor;
    address public lotteryManager;
    
    // DEX integration
    IWrappedNative public wrappedNative;
    string public wrappedNativeSymbol;
    
    // Fee configuration
    Fees public buyFees = Fees(690, 241, 69, 1000);
    Fees public sellFees = Fees(690, 241, 69, 1000);
    
    ControlFlags public controlFlags = ControlFlags(
        true,   // feesEnabled
        true,   // tradingEnabled
        false,  // initialMintCompleted
        false,  // paused
        false,  // emergencyMode
        false,  // reserveFlag1
        false,  // reserveFlag2
        false   // reserveFlag3
    );

    // Mappings
    mapping(address => bool) public isPair;
    mapping(address => bool) public isExcludedFromFees;
    mapping(address => bool) public isExcludedFromMaxTransfer;
    
    // Modifiers
    modifier notPaused() {
        if (controlFlags.paused) revert ContractPaused();
        _;
    }
    
    modifier validAddress(address _addr) {
        if (_addr == address(0)) revert ZeroAddress();
        _;
    }

    modifier onlyValidPair(address _pair) {
        if (!isPair[_pair]) revert UnauthorizedCaller();
        _;
    }
    
    // Events
    event NativeFeeCollected(address indexed buyer, uint256 amount, uint256 timestamp);
    event WETHFeeCollected(address indexed buyer, uint256 amount, uint256 timestamp);
    event FeesUpdated(bool indexed isBuy, uint16 jackpot, uint16 veDRAGON, uint16 burn, uint16 total);
    event PairUpdated(address indexed pair, bool indexed isRemoved, bool indexed isAdded);
    event FeeExclusionUpdated(address indexed account, bool indexed isExcluded);
    event MaxTransferExclusionUpdated(address indexed account, bool indexed isExcluded);
    event TradingToggled(bool indexed enabled);
    event DistributionAddressesUpdated(address indexed jackpotVault, address indexed revenueDistributor);
    event InitialMintCompleted(address indexed to, uint256 amount, uint256 chainId);
    event BuybackAndBurn(uint256 amountBurned, uint256 nativeUsed, uint256 timestamp);
    event WrappedNativeUpdated(address indexed oldWrappedNative, address indexed newWrappedNative, string symbol);
    event OperationalFundsWithdrawn(address indexed to, uint256 amount);
    event EmergencyModeToggled(bool enabled);
    event ContractPausedEvent(bool paused);
    event LotteryManagerUpdated(address indexed oldManager, address indexed newManager);
    event RegistryChainConfigUpdated(uint16 chainId, address wrappedNative, string symbol);
    event ImmediateDistributionExecuted(address indexed recipient, uint256 amount, string distributionType);
    event OperationalFundsUsed(uint256 amount, string purpose);
    event TokensBurned(uint256 amount, string burnType);
    event NativeReceived(address indexed sender, uint256 amount, string reason);
    event FeeDistributed(address indexed recipient, uint256 amount, string distributionType);

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
        
        // Initialize wrapped native token with proper symbol from registry
        address _wrappedNative = registry.getWrappedNativeToken(uint16(block.chainid));
        
        if (_wrappedNative != address(0)) {
            wrappedNative = IWrappedNative(_wrappedNative);
            
            // Get symbol from registry - registry is now the single source of truth
            try registry.getWrappedNativeSymbol(uint16(block.chainid)) returns (string memory symbol) {
                if (bytes(symbol).length > 0) {
                    wrappedNativeSymbol = symbol;
                } else {
                    // If registry returns empty, use a safe default
                    wrappedNativeSymbol = "WETH";
                }
            } catch {
                // If registry call fails, use a safe default
                wrappedNativeSymbol = "WETH";
            }
        } else {
            // Use safe default for unsupported chains
            wrappedNativeSymbol = "WETH";
        }
        
        // Set initial exclusions
        isExcludedFromFees[_owner] = true;
        isExcludedFromFees[address(this)] = true;
        isExcludedFromMaxTransfer[_owner] = true;
        isExcludedFromMaxTransfer[address(this)] = true;

        // Mint initial supply only on Sonic chain
        if (block.chainid == SONIC_CHAIN_ID) {
            _mint(_owner, INITIAL_SUPPLY);
            controlFlags.initialMintCompleted = true;
            emit InitialMintCompleted(_owner, INITIAL_SUPPLY, block.chainid);
            
            // Register with FeeM on Sonic chain
            (bool _success,) = SONIC_FEEM_CONTRACT.call(abi.encodeWithSignature("selfRegister(uint256)", FEEM_REGISTRATION_ID));
            require(_success, "FeeM registration failed");
        }
    }

    function transfer(address to, uint256 amount) public override notPaused returns (bool) {
        if (!isExcludedFromMaxTransfer[msg.sender] && amount > MAX_SINGLE_TRANSFER) {
            revert MaxTransferExceeded();
        }
        return _transferWithFees(msg.sender, to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override notPaused returns (bool) {
        if ((!isExcludedFromMaxTransfer[from] || !isExcludedFromMaxTransfer[msg.sender]) && 
            amount > MAX_SINGLE_TRANSFER) {
            revert MaxTransferExceeded();
        }
        _spendAllowance(from, _msgSender(), amount);
        return _transferWithFees(from, to, amount);
    }

    /**
     * @dev Internal transfer function with fee logic
     */
    function _transferWithFees(address from, address to, uint256 amount) internal returns (bool) {
        if (from == address(0) || to == address(0)) revert ZeroAddress();
        
        // Standard transfer - no fees on regular transfers
        if (!isPair[from] && !isPair[to]) {
            _transfer(from, to, amount);
            return true;
        }
        
        // Buy/sell transactions through DEX pairs
        if (isPair[from]) {
            return _processBuy(from, to, amount);
        } else if (isPair[to]) {
            return _processSell(from, to, amount);
        }
        
        // Fallback to standard transfer
            _transfer(from, to, amount);
            return true;
        }

    /**
     * @dev Process buy transaction with immediate fee distribution
     */
    function _processBuy(address from, address to, uint256 amount) internal returns (bool) {
        if (controlFlags.feesEnabled && !isExcludedFromFees[to]) {
            uint256 feeAmount = (amount * buyFees.total) / BASIS_POINTS;
            uint256 transferAmount = amount - feeAmount;
            
            _transfer(from, to, transferAmount);
            _distributeBuyFees(from, feeAmount);
            
            if (lotteryManager != address(0)) {
                _triggerLottery(to, transferAmount);
            }
        } else {
            _transfer(from, to, amount);
        }

        return true;
    }
    
    /**
     * @dev Process sell transaction with immediate fee distribution and burn
     */
    function _processSell(address from, address to, uint256 amount) internal returns (bool) {
        if (controlFlags.feesEnabled && !isExcludedFromFees[from]) {
            uint256 feeAmount = (amount * sellFees.total) / BASIS_POINTS;
            uint256 transferAmount = amount - feeAmount;
            
            _transfer(from, to, transferAmount);
            _distributeSellFees(from, feeAmount);
        } else {
            _transfer(from, to, amount);
        }
        
        return true;
    }
    
    /**
     * @dev Distribute buy fees immediately from collected DRAGON tokens
     * @param seller The address from which fees are collected (typically the DEX pair)
     * @param feeAmount The total amount of DRAGON tokens to distribute as fees
     */
    function _distributeBuyFees(address seller, uint256 feeAmount) internal {
        if (feeAmount == 0) return;
        
        uint256 jackpotAmount = (feeAmount * buyFees.jackpot) / BASIS_POINTS;
        uint256 revenueAmount = (feeAmount * buyFees.veDRAGON) / BASIS_POINTS;
        uint256 operationalAmount = (feeAmount * buyFees.burn) / BASIS_POINTS;
        
        if (jackpotAmount > 0 && jackpotVault != address(0)) {
            _transfer(seller, jackpotVault, jackpotAmount);
            emit ImmediateDistributionExecuted(jackpotVault, jackpotAmount, "buy_jackpot");
        }
        
        if (revenueAmount > 0 && revenueDistributor != address(0)) {
            _transfer(seller, revenueDistributor, revenueAmount);
            emit ImmediateDistributionExecuted(revenueDistributor, revenueAmount, "buy_revenue");
        }
        
        if (operationalAmount > 0) {
            _transfer(seller, address(this), operationalAmount);
            emit ImmediateDistributionExecuted(address(this), operationalAmount, "buy_operational");
        }
    }
    
    /**
     * @dev Distribute sell fees immediately from collected DRAGON tokens
     * @param seller The address from which fees are collected (the seller)
     * @param feeAmount The total amount of DRAGON tokens to distribute as fees
     */
    function _distributeSellFees(address seller, uint256 feeAmount) internal {
        if (feeAmount == 0) return;
        
        uint256 jackpotAmount = (feeAmount * sellFees.jackpot) / BASIS_POINTS;
        uint256 revenueAmount = (feeAmount * sellFees.veDRAGON) / BASIS_POINTS;
        uint256 burnAmount = (feeAmount * sellFees.burn) / BASIS_POINTS;
        
        if (jackpotAmount > 0 && jackpotVault != address(0)) {
            _transfer(seller, jackpotVault, jackpotAmount);
            emit ImmediateDistributionExecuted(jackpotVault, jackpotAmount, "sell_jackpot");
        }
        
        if (revenueAmount > 0 && revenueDistributor != address(0)) {
            _transfer(seller, revenueDistributor, revenueAmount);
            emit ImmediateDistributionExecuted(revenueDistributor, revenueAmount, "sell_revenue");
        }
        
        if (burnAmount > 0) {
            _transfer(seller, DEAD_ADDRESS, burnAmount);
            emit TokensBurned(burnAmount, "sell_burn");
        }
        
        _triggerLottery(seller, feeAmount);
    }
    
    /**
     * @dev DUPLICATE REMOVED: Lottery trigger function consolidated below
     */
    
    /**
     * @dev Get LayerZero endpoint from registry
     */
    function _getLayerZeroEndpoint(address _registry) internal view returns (address) {
        if (_registry == address(0)) return address(0);
        
        try IOmniDragonHybridRegistry(_registry).getLayerZeroEndpoint(uint16(block.chainid)) returns (address endpoint) {
            return endpoint;
        } catch {
            return address(0);
        }
    }
    
    // ========== ADMIN FUNCTIONS ==========
    
    function setDistributionAddresses(
        address _jackpotVault,
        address _revenueDistributor
    ) external onlyOwner {
        if (_jackpotVault == address(0) || _revenueDistributor == address(0)) {
            revert ZeroAddress();
        }
        
        jackpotVault = _jackpotVault;
        revenueDistributor = _revenueDistributor;
        
        emit DistributionAddressesUpdated(_jackpotVault, _revenueDistributor);
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

    function distributeNativeToLottery(uint256 amount) external payable onlyOwner {
        if (amount == 0) revert AmountBelowMinimum();
        if (amount > address(this).balance) revert InsufficientBalance();
        if (lotteryManager == address(0)) revert ZeroAddress();
        
        (bool success,) = lotteryManager.call{value: amount}("");
        if (!success) revert TransferFailed();
        
        emit FeeDistributed(lotteryManager, amount, "native_lottery_distribution");
    }

    function setLotteryManager(address _lotteryManager) external onlyOwner {
        // Allow setting to zero address to disable lottery functionality
        address oldManager = lotteryManager;
        lotteryManager = _lotteryManager;
        emit LotteryManagerUpdated(oldManager, _lotteryManager);
    }

    function toggleTrading() external onlyOwner {
        controlFlags.tradingEnabled = !controlFlags.tradingEnabled;
        emit TradingToggled(controlFlags.tradingEnabled);
    }

    function toggleFees() external onlyOwner {
        controlFlags.feesEnabled = !controlFlags.feesEnabled;
    }

    function togglePause() external onlyOwner {
        controlFlags.paused = !controlFlags.paused;
        emit ContractPausedEvent(controlFlags.paused);
    }

    function toggleEmergencyMode() external onlyOwner {
        controlFlags.emergencyMode = !controlFlags.emergencyMode;
        emit EmergencyModeToggled(controlFlags.emergencyMode);
    }

    function updateWrappedNative(address _wrappedNative, string calldata _symbol) external onlyOwner {
        if (_wrappedNative == address(0)) revert ZeroAddress();
        
        address oldWrappedNative = address(wrappedNative);
        wrappedNative = IWrappedNative(_wrappedNative);
        wrappedNativeSymbol = _symbol;
        
        emit WrappedNativeUpdated(oldWrappedNative, _wrappedNative, _symbol);
    }
    
    function syncWrappedNativeFromRegistry() external onlyOwner {
        uint16 chainId = uint16(block.chainid);
        
        try registry.getWrappedNativeInfo(chainId) returns (address token, string memory symbol) {
            if (token != address(0) && bytes(symbol).length > 0) {
                address oldToken = address(wrappedNative);
                wrappedNative = IWrappedNative(token);
                wrappedNativeSymbol = symbol;
                
                emit WrappedNativeUpdated(oldToken, token, symbol);
                emit RegistryChainConfigUpdated(chainId, token, symbol);
            }
        } catch {
            revert ConfigurationSyncFailed();
        }
    }
    
    // ========== OPERATIONAL FUNDS FUNCTIONS ==========
    
    function executeBuybackAndBurn(
        uint256 maxWrappedNativeAmount,
        uint256 minTokensOut,
        address router,
        uint256 deadline,
        bool burnDirectly
    ) external onlyOwner {
        if (maxWrappedNativeAmount == 0) revert AmountBelowMinimum();
        if (router == address(0)) revert ZeroAddress();
        if (address(wrappedNative) == address(0)) revert ZeroAddress();
        
        uint256 wrappedBalance = wrappedNative.balanceOf(address(this));
        if (wrappedBalance < 1) revert InsufficientBalance();
        
        uint256 swapAmount = maxWrappedNativeAmount > wrappedBalance ? wrappedBalance : maxWrappedNativeAmount;
        
        // Handle approve return value
        require(wrappedNative.approve(router, swapAmount), "Approve failed");
        
        address[] memory path = new address[](2);
        path[0] = address(wrappedNative);
        path[1] = address(this);
        
        address recipient = burnDirectly ? DEAD_ADDRESS : address(this);
        
        try IUniswapV2Router(router).swapExactTokensForTokens(
            swapAmount,
            minTokensOut,
            path,
            recipient,
            deadline
        ) returns (uint256[] memory amounts) {
            uint256 tokensBought = amounts[1];
            
            // If not burned directly, burn manually
            if (!burnDirectly && tokensBought > 0) {
                _transfer(address(this), DEAD_ADDRESS, tokensBought);
            }
            
            emit BuybackAndBurn(tokensBought, swapAmount, block.timestamp);
            emit OperationalFundsUsed(swapAmount, "buyback_and_burn");
            emit TokensBurned(tokensBought, "buyback_burn");
        } catch {
            // Handle approve return value in catch block
            require(wrappedNative.approve(router, 0), "Reset approve failed");
            revert TransferFailed();
        }
    }
    
    function withdrawOperationalFunds(uint256 amount) external onlyOwner {
        if (amount == 0) revert AmountBelowMinimum();
        if (address(wrappedNative) == address(0)) revert ZeroAddress();

        uint256 balance = wrappedNative.balanceOf(address(this));
        if (balance < amount) revert InsufficientBalance();
        
        IERC20(address(wrappedNative)).safeTransfer(owner(), amount);
        emit OperationalFundsWithdrawn(owner(), amount);
    }
    
    // ========== EMERGENCY FUNCTIONS ==========
    
    function emergencyWithdrawNative(uint256 amount) external onlyOwner {
        if (!controlFlags.emergencyMode) revert UnauthorizedCaller();
        if (amount > address(this).balance) revert InsufficientBalance();
        
        (bool success,) = owner().call{value: amount}("");
        if (!success) revert TransferFailed();
    }
    
    function emergencyWithdrawToken(address token, uint256 amount) external onlyOwner {
        if (!controlFlags.emergencyMode) revert UnauthorizedCaller();
        if (token == address(0)) revert ZeroAddress();
        
        IERC20(token).safeTransfer(owner(), amount);
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    function getFees() external view returns (Fees memory buyFees_, Fees memory sellFees_) {
        return (buyFees, sellFees);
    }
    
    function getControlFlags() external view returns (ControlFlags memory) {
        return controlFlags;
    }
    
    function getWrappedNativeInfo() external view returns (address token, string memory symbol) {
        return (address(wrappedNative), wrappedNativeSymbol);
    }
    
    function getOperationalFundsBalance() external view returns (uint256 balance) {
        if (address(wrappedNative) == address(0)) return 0;
        return wrappedNative.balanceOf(address(this));
    }
    
    function getDistributionAddresses() external view returns (address jackpot, address revenue) {
        return (jackpotVault, revenueDistributor);
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC20).interfaceId || 
               interfaceId == type(IERC20Metadata).interfaceId || 
               interfaceId == type(IERC165).interfaceId;
    }
    
    // ========== LOTTERY INTEGRATION ==========
    /**
     * @dev Trigger lottery entry for a user after buy transaction
     * @param user The user who made the buy transaction
     * @param amount The amount of tokens involved in the transaction
     */
    function _triggerLottery(address user, uint256 amount) internal {
        if (lotteryManager != address(0)) {
            try IOmniDragonLotteryManager(lotteryManager).processEntry(user, amount) {
                // Lottery entry successful
            } catch {
                // Lottery entry failed - continue without lottery
            }
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

    // ========== RECEIVE FUNCTION ==========
    
    receive() external payable nonReentrant {
        if (msg.value > 0) {
            if (address(wrappedNative) != address(0)) {
                try wrappedNative.deposit{value: msg.value}() {
                    emit NativeReceived(msg.sender, msg.value, 
                        string(abi.encodePacked(wrappedNativeSymbol, "_wrapped")));
                } catch {
                    // If wrapping fails, refund to sender to prevent lockup
                    (bool refundSuccess,) = msg.sender.call{value: msg.value}("");
                    if (refundSuccess) {
                        emit NativeReceived(msg.sender, msg.value, "wrap_failed_refunded");
                    } else {
                        // If refund fails, keep in contract and emit event for manual recovery
                        emit NativeReceived(msg.sender, msg.value, "wrap_failed_kept_for_recovery");
                    }
                }
            } else {
                emit NativeReceived(msg.sender, msg.value, "native_no_wrapper");
            }
        }
    }

    // ========== NATIVE RECOVERY FUNCTIONS ==========
    
    /**
     * @dev Withdraw accumulated native balance (for failed wrapping scenarios)
     * @param amount Amount to withdraw
     */
    function withdrawAccumulatedNative(uint256 amount) external onlyOwner {
        if (amount == 0) revert AmountBelowMinimum();
        if (amount > address(this).balance) revert InsufficientBalance();
        
        (bool success,) = owner().call{value: amount}("");
        if (!success) revert TransferFailed();
        
        emit NativeReceived(owner(), amount, "recovered_by_owner");
    }
    
    /**
     * @dev Get current native balance of contract
     * @return Native balance available for recovery
     */
    function getNativeBalance() external view returns (uint256) {
        return address(this).balance;
    }
}