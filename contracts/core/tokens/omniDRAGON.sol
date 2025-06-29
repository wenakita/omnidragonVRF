// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

// LayerZero V2 imports - Following OFTCore pattern for diamond inheritance resolution
import { OApp } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

// OmniDragon interfaces
import { IOmniDragonFeeManager } from "../../interfaces/oracles/IOmniDragonFeeManager.sol";
import { IOmniDragonLotteryManager } from "../../interfaces/lottery/IOmniDragonLotteryManager.sol";
import { IDragonJackpotVault } from "../../interfaces/lottery/IDragonJackpotVault.sol";
import { IUniswapV2Router02 } from "../../interfaces/external/uniswap/v2/IUniswapV2Router02.sol";
import { IomniDRAGON } from "../../interfaces/tokens/IomniDRAGON.sol";

/**
 * @title omniDRAGON
 * @dev Cross-chain DRAGON token implementing LayerZero V2 OFT functionality
 *
 * DIAMOND INHERITANCE SOLUTION:
 * Following the proven OFTCore pattern: OApp, OAppOptionsType3
 * This resolves the "Linearization of inheritance graph impossible" error
 * by using the same inheritance order that LayerZero uses in their own contracts.
 *
 * IMPORTANT DRAGON PROJECT RULES:
 * - On all DRAGON swaps:
 *   1. 6.9% goes to jackpot
 *   2. 2.41% goes to veDRAGON fee distributor
 *   3. 0.69% is burned
 *   4. Only buys qualify for lottery entries
 *
 * LayerZero OFT Features:
 * - Cross-chain token transfers with burn-and-mint mechanism
 * - Unified token supply across all chains
 * - Native LayerZero V2 integration with enforced options
 * - Enhanced security with DVN configuration
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract omniDRAGON is ERC20, ReentrancyGuard, OApp, OAppOptionsType3, IomniDRAGON {
    using SafeERC20 for IERC20;

    // ======== LAYERZERO OFT CONFIGURATION ========
    
    // Cross-chain configuration
    uint256 public constant SHARED_DECIMALS = 6;
    uint256 public immutable decimalConversionRate;
    
    // LayerZero message types
    uint16 public constant SEND = 1;
    uint16 public constant SEND_AND_CALL = 2;

    // ======== DRAGON ECOSYSTEM STORAGE ========
    
    // Core addresses
    address public jackpotVault;
    address public revenueDistributor;
    address public wrappedNativeTokenAddress;
    address public uniswapRouter;
    address public lotteryManager;
    address public emergencyTreasury;
    address public emergencyPauser;

    // Packed configuration values
    struct PackedConfig {
        uint128 swapThreshold;           // 128 bits
        uint128 minimumAmountForProcessing; // 128 bits
    }
    PackedConfig public config;

    // Packed limits and thresholds
    struct PackedLimits {
        uint64 maxSingleTransfer;        // 64 bits
        uint64 minSlippageProtectionBps; // 64 bits
        uint64 maxSlippageProtectionBps; // 64 bits
        uint64 minSwapDelay;             // 64 bits
    }
    PackedLimits public limits;

    // Packed flags and version
    struct PackedFlags {
        bool transfersPaused;            // 1 bit
        bool feesEnabled;                // 1 bit
        bool swapEnabled;                // 1 bit
        bool inSwap;                     // 1 bit
        bool initialMintingDone;         // 1 bit
        bool emergencyPaused;            // 1 bit
        uint8 configurationVersion;      // 8 bits
        uint240 reserved;                // 240 bits for future flags
    }
    PackedFlags public flags;

    // Timelock configuration
    struct PackedTimelock {
        uint128 timelockDelay;           // 128 bits
        uint128 lastSwapTimestamp;       // 128 bits
    }
    PackedTimelock public timelock;

    // Fee structures
    struct Fees {
        uint256 jackpot;
        uint256 veDRAGON;
        uint256 burn;
        uint256 total;
    }
    
    Fees public buyFees;
    Fees public sellFees;
    Fees public transferFees;

    // Constants
    uint256 public constant MAX_SUPPLY = 6942000 * 10 ** 18;
    uint256 public constant INITIAL_SUPPLY = 6942000 * 10 ** 18;
    uint256 public constant MAX_FEE_BASIS_POINTS = 1500;
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant TIMELOCK_DELAY = 48 hours;
    uint256 public constant MAX_BATCH_SIZE = 50;

    // Multi-DEX support
    enum DexType {
        UNKNOWN,
        UNISWAP_V2,
        UNISWAP_V3,
        BALANCER,
        CURVE
    }

    // Mappings
    mapping(address => bool) public isExcludedFromFees;
    mapping(address => bool) public isPair;
    mapping(address => DexType) public pairToDexType;
    mapping(address => bool) public isPartnerPool;
    mapping(address => uint256) public partnerPoolIds;
    mapping(address => bool) public authorizedCallers;

    // Additional configuration
    uint256 public allowedInitialMintingChainId = 146; // Default to Sonic

    // ======== CUSTOM ERRORS ========
    error ZeroAddress();
    error ZeroAmount();
    error NotAuthorized();
    error AlreadyConfigured();
    error MaxSupplyExceeded();
    error TransfersPaused();
    error EmergencyPaused();
    error FeesTooHigh();
    error InvalidConfiguration();
    error ExternalContractFailure();
    error MaxSingleTransferExceeded();
    error InsufficientBalance();
    error InvalidLocalDecimals();

    // ======== EVENTS ========
    event ConfigurationUpdated(string indexed component, address indexed newValue);
    event FeesUpdated(string indexed feeType, uint256 totalFee);
    event FeeDistributed(address indexed recipient, uint256 amount, string indexed feeType);
    event TokensBurned(uint256 amount);
    event LotteryEntry(address indexed user, uint256 amount);
    event EmergencyAction(string indexed action, address indexed actor);
    event SwapExecuted(uint256 tokensSwapped, uint256 nativeReceived);
    
    // LayerZero events
    event OFTSent(bytes32 indexed guid, uint32 dstEid, address indexed fromAddress, uint256 amountSentLD, uint256 amountReceivedLD);
    event OFTReceived(bytes32 indexed guid, uint32 srcEid, address indexed toAddress, uint256 amountReceivedLD);

    // ======== MODIFIERS ========
    modifier lockTheSwap() {
        flags.inSwap = true;
        _;
        flags.inSwap = false;
    }

    modifier notEmergencyPaused() {
        if (flags.emergencyPaused) revert EmergencyPaused();
        _;
    }

    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != owner()) revert NotAuthorized();
        _;
    }

    modifier validAddress(address addr) {
        if (addr == address(0)) revert ZeroAddress();
        _;
    }

    modifier nonZeroAmount(uint256 amount) {
        if (amount == 0) revert ZeroAmount();
        _;
    }

    // ======== CONSTRUCTOR ========
    // Following OFTCore pattern with OpenZeppelin v5 compatibility
    constructor(
        address _lzEndpoint,
        address _delegate
    ) ERC20("Dragon", "DRAGON") Ownable(_delegate) OApp(_lzEndpoint, _delegate) {
        // Calculate decimal conversion rate for cross-chain compatibility
        uint8 localDecimals = decimals();
        if (localDecimals < SHARED_DECIMALS) revert InvalidLocalDecimals();
        decimalConversionRate = 10 ** (localDecimals - SHARED_DECIMALS);
        
        // Set authorized caller
        authorizedCallers[_delegate] = true;

        // Initialize fee structures
        buyFees = Fees({
            jackpot: 690,   // 6.9%
            veDRAGON: 241,  // 2.41%
            burn: 69,       // 0.69%
            total: 1000     // 10%
        });

        sellFees = Fees({
            jackpot: 690,  // 6.9%
            veDRAGON: 241,  // 2.41%
            burn: 69,      // 0.69%
            total: 1000     // 10%
        });

        transferFees = Fees({
            jackpot: 0,    // 0.00%
            veDRAGON: 0,   // 0.00%
            burn: 0,        // 0.00%
            total: 0      // 0.00%
        });

        // Initialize packed configuration
        config = PackedConfig({
            swapThreshold: 10_000 * 1e18,
            minimumAmountForProcessing: 100 * 1e18
        });

        // Initialize packed limits
        limits = PackedLimits({
            maxSingleTransfer: 1000000,  // 1M tokens
            minSlippageProtectionBps: 500,
            maxSlippageProtectionBps: 1000,
            minSwapDelay: 60
        });

        // Initialize flags
        flags = PackedFlags({
            transfersPaused: false,
            feesEnabled: true,
            swapEnabled: true,
            inSwap: false,
            initialMintingDone: false,
            emergencyPaused: false,
            configurationVersion: 0,
            reserved: 0
        });

        // Initialize timelock
        timelock = PackedTimelock({
            timelockDelay: uint128(TIMELOCK_DELAY),
            lastSwapTimestamp: 0
        });

        // Set initial addresses
        emergencyTreasury = _delegate;
        emergencyPauser = _delegate;
        
        // Exclude important addresses from fees
        isExcludedFromFees[_delegate] = true;
        isExcludedFromFees[address(this)] = true;

        // Register with FeeM if on Sonic
        if (block.chainid == 146) {
            registerMe();
        }
    }

    // ======== LAYERZERO OFT IMPLEMENTATION ========

    /**
     * @dev Returns the shared decimals for cross-chain compatibility
     */
    function sharedDecimals() public pure returns (uint8) {
        return uint8(SHARED_DECIMALS);
    }

    /**
     * @dev Convert local decimals to shared decimals
     */
    function _toSharedDecimals(uint256 _amountLD) internal view returns (uint256) {
        return _amountLD / decimalConversionRate;
    }

    /**
     * @dev Convert shared decimals to local decimals
     */
    function _toLocalDecimals(uint256 _amountSD) internal view returns (uint256) {
        return _amountSD * decimalConversionRate;
    }

    /**
     * @dev Internal LayerZero receive function - handles incoming cross-chain messages
     * This is the correct implementation following OApp pattern
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address /* _executor */,
        bytes calldata /* _extraData */
    ) internal override {
        // Decode message
        (uint16 msgType, bytes32 toBytes32, uint256 amountSD) = abi.decode(_message, (uint16, bytes32, uint256));
        
        if (msgType == SEND) {
            address to = bytes32ToAddress(toBytes32);
            uint256 amountLD = _toLocalDecimals(amountSD);
            
            // Mint tokens on destination chain
            _mint(to, amountLD);
            
            emit OFTReceived(_guid, _origin.srcEid, to, amountLD);
        }
    }

    /**
     * @dev Override nextNonce to return 0 (no nonce ordering enforcement)
     * This is the correct implementation following OAppReceiver pattern
     */
    function nextNonce(uint32 /*_srcEid*/, bytes32 /*_sender*/) public pure override returns (uint64 nonce) {
        return 0;
    }

    /**
     * @dev Convert address to bytes32
     */
    function addressToBytes32(address _addr) public pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    /**
     * @dev Convert bytes32 to address
     */
    function bytes32ToAddress(bytes32 _bytes) public pure returns (address) {
        return address(uint160(uint256(_bytes)));
    }

    // ======== INTERFACE IMPLEMENTATIONS ========
    
    /**
     * @dev Process swap of native tokens ($S) to Dragon tokens and apply fees
     */
    function processNativeSwapFees(address /* _user */, uint256 _nativeAmount) external view override onlyAuthorized returns (uint256 swappableAmount, uint256 nativeFeeAmount, uint256 jackpotFeeAmount, uint256 veDRAGONFeeAmount) {
        // Calculate fees based on buy fees structure
        nativeFeeAmount = (_nativeAmount * buyFees.total) / 10000;
        jackpotFeeAmount = (_nativeAmount * buyFees.jackpot) / 10000;
        veDRAGONFeeAmount = (_nativeAmount * buyFees.veDRAGON) / 10000;
        swappableAmount = _nativeAmount - nativeFeeAmount;
        
        return (swappableAmount, nativeFeeAmount, jackpotFeeAmount, veDRAGONFeeAmount);
    }

    /**
     * @dev Distribute fees to jackpot and veDRAGON without triggering lottery entry
     */
    function distributeFees(uint256 jackpotAmount, uint256 veDRAGONAmount) external override onlyAuthorized {
        if (jackpotAmount > 0 && jackpotVault != address(0)) {
            _mint(jackpotVault, jackpotAmount);
            emit FeeDistributed(jackpotVault, jackpotAmount, "Jackpot");
        }

        if (veDRAGONAmount > 0 && revenueDistributor != address(0)) {
            _mint(revenueDistributor, veDRAGONAmount);
            emit FeeDistributed(revenueDistributor, veDRAGONAmount, "veDRAGON");
        }
    }

    /**
     * @dev Get wrapped native token address
     */
    function wrappedNativeToken() external view override returns (address) {
        return wrappedNativeTokenAddress;
    }

    // ======== INITIAL MINTING ========
    function initialMint() external onlyOwner {
        if (flags.initialMintingDone) revert AlreadyConfigured();
        if (block.chainid != allowedInitialMintingChainId) revert InvalidConfiguration();
        
        flags.initialMintingDone = true;
        _mint(msg.sender, INITIAL_SUPPLY);
        
        emit ConfigurationUpdated("InitialMint", msg.sender);
    }

    // ======== FEE OVERRIDE FUNCTIONS ========
    
    /**
     * @dev Override _update to apply fees on transfers
     */
    function _update(address from, address to, uint256 value) internal override notEmergencyPaused {
        if (flags.transfersPaused && from != address(0) && to != address(0)) {
            revert TransfersPaused();
        }

        // Apply fees if enabled and not excluded
        if (flags.feesEnabled && !flags.inSwap && from != address(0) && to != address(0)) {
            if (!isExcludedFromFees[from] && !isExcludedFromFees[to]) {
                value = _applyFees(from, to, value);
            }
        }

        super._update(from, to, value);

        // Handle lottery entries for buys
        if (isPair[from] && to != address(0) && lotteryManager != address(0)) {
            try IOmniDragonLotteryManager(lotteryManager).processEntry(to, value) {
                emit LotteryEntry(to, value);
            } catch {
                // Fail silently to not block transfers
            }
        }

        // Auto-swap if threshold reached
        if (_shouldSwap(from, to)) {
            _swapTokensForNative();
        }
    }

    /**
     * @dev Apply fees based on transaction type
     */
    function _applyFees(address from, address to, uint256 amount) internal returns (uint256) {
        Fees memory currentFees;
        
        if (isPair[from]) {
            // Buy transaction
            currentFees = buyFees;
        } else if (isPair[to]) {
            // Sell transaction
            currentFees = sellFees;
        } else {
            // Transfer transaction
            currentFees = transferFees;
        }

        if (currentFees.total == 0) {
            return amount;
        }

        uint256 totalFeeAmount = (amount * currentFees.total) / 10000;
        uint256 jackpotAmount = (amount * currentFees.jackpot) / 10000;
        uint256 veDRAGONAmount = (amount * currentFees.veDRAGON) / 10000;
        uint256 burnAmount = (amount * currentFees.burn) / 10000;

        // Transfer fees to appropriate recipients
        if (jackpotAmount > 0 && jackpotVault != address(0)) {
            super._update(from, jackpotVault, jackpotAmount);
            emit FeeDistributed(jackpotVault, jackpotAmount, "Jackpot");
        }

        if (veDRAGONAmount > 0 && revenueDistributor != address(0)) {
            super._update(from, revenueDistributor, veDRAGONAmount);
            emit FeeDistributed(revenueDistributor, veDRAGONAmount, "veDRAGON");
        }

        if (burnAmount > 0) {
            super._update(from, DEAD_ADDRESS, burnAmount);
            emit TokensBurned(burnAmount);
        }

        return amount - totalFeeAmount;
    }

    /**
     * @dev Check if should trigger auto-swap
     */
    function _shouldSwap(address /* from */, address to) internal view returns (bool) {
        return !flags.inSwap &&
               flags.swapEnabled &&
               to != address(0) &&
               isPair[to] &&
               balanceOf(address(this)) >= config.swapThreshold &&
               block.timestamp >= timelock.lastSwapTimestamp + limits.minSwapDelay;
    }

    /**
     * @dev Swap tokens for native currency
     */
    function _swapTokensForNative() internal lockTheSwap {
        uint256 tokenAmount = balanceOf(address(this));
        if (tokenAmount < config.minimumAmountForProcessing) return;

        timelock.lastSwapTimestamp = uint128(block.timestamp);

        if (uniswapRouter == address(0)) return;

        try this._performSwap(tokenAmount) {
            emit SwapExecuted(tokenAmount, address(this).balance);
        } catch {
            // Fail silently to not block transfers
        }
    }

    /**
     * @dev Perform the actual swap (external for try-catch)
     */
    function _performSwap(uint256 tokenAmount) external {
        require(msg.sender == address(this), "Internal only");
        
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = wrappedNativeTokenAddress;

        _approve(address(this), uniswapRouter, tokenAmount);

        IUniswapV2Router02(uniswapRouter).swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0,
            path,
            address(this),
            block.timestamp
        );
    }

    // ======== CONFIGURATION FUNCTIONS ========

    /**
     * @dev Set core addresses
     */
    function setCoreAddresses(
        address _jackpotVault,
        address _revenueDistributor,
        address _wrappedNativeTokenAddress,
        address _uniswapRouter,
        address _lotteryManager,
        address _emergencyTreasury,
        address _emergencyPauser
    ) external onlyOwner {
        jackpotVault = _jackpotVault;
        revenueDistributor = _revenueDistributor;
        wrappedNativeTokenAddress = _wrappedNativeTokenAddress;
        uniswapRouter = _uniswapRouter;
        lotteryManager = _lotteryManager;
        emergencyTreasury = _emergencyTreasury;
        emergencyPauser = _emergencyPauser;
        
        emit ConfigurationUpdated("CoreAddresses", address(0));
    }

    /**
     * @dev Add liquidity pair
     */
    function addPair(address pair, DexType dexType) external onlyOwner validAddress(pair) {
        isPair[pair] = true;
        pairToDexType[pair] = dexType;
        emit ConfigurationUpdated("Pair", pair);
    }

    /**
     * @dev Set authorized caller
     */
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
        emit ConfigurationUpdated("AuthorizedCaller", caller);
    }

    /**
     * @dev Set excluded from fees
     */
    function setExcludedFromFees(address account, bool excluded) external onlyOwner {
        isExcludedFromFees[account] = excluded;
        emit ConfigurationUpdated("ExcludedFromFees", account);
    }

    /**
     * @dev Toggle flags
     */
    function setFlags(
        bool _feesEnabled,
        bool _swapEnabled,
        bool _transfersPaused
    ) external onlyOwner {
        flags.feesEnabled = _feesEnabled;
        flags.swapEnabled = _swapEnabled;
        flags.transfersPaused = _transfersPaused;
        
        emit ConfigurationUpdated("Flags", address(0));
    }

    // ======== EMERGENCY FUNCTIONS ========

    /**
     * @dev Emergency pause
     */
    function emergencyPause() external {
        if (msg.sender != emergencyPauser && msg.sender != owner()) revert NotAuthorized();
        flags.emergencyPaused = true;
        emit EmergencyAction("Pause", msg.sender);
    }

    /**
     * @dev Emergency unpause
     */
    function emergencyUnpause() external onlyOwner {
        flags.emergencyPaused = false;
        emit EmergencyAction("Unpause", msg.sender);
    }

    // ======== UTILITY FUNCTIONS ========

    /**
     * @dev Register with FeeM on Sonic
     */
    function registerMe() public {
        (bool _success,) = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830).call(
            abi.encodeWithSignature("selfRegister(uint256)", 143)
        );
        require(_success, "FeeM registration failed");
    }

    // ======== RECEIVE FUNCTION ========
    receive() external payable {
        // Allow receiving ETH for swap operations
    }
}

