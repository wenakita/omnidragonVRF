// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IDragonRevenueDistributor } from "@omnidragon/interfaces/governance/fees/IDragonRevenueDistributor.sol";
import { IOmniDragonLotteryManager } from "@omnidragon/interfaces/lottery/IOmniDragonLotteryManager.sol";
import { IDragonJackpotVault } from "@omnidragon/interfaces/vault/IDragonJackpotVault.sol";
import { IUniswapV2Router02 } from "@omnidragon/interfaces/external/uniswap/v2/IUniswapV2Router02.sol";
import { ILayerZeroEndpointV2, MessagingParams, MessagingReceipt, MessagingFee, Origin } from "@omnidragon/interfaces/external/layerzero/ILayerZeroEndpointV2.sol";
import { IomniDRAGON } from "@omnidragon/interfaces/tokens/IomniDRAGON.sol";

/**
 * @title omniDRAGON
 * @dev Specialized token with built-in fees, lottery entries, and cross-chain functionality
 *
 * IMPORTANT DRAGON PROJECT RULES:
 * - On all DRAGON swaps:
 *   1. 6.9% goes to jackpot
 *   2. 2.41% goes to veDRAGON fee distributor
 *   3. 0.69% is burned
 *   4. Only buys qualify for lottery entries
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */

contract omniDRAGON is ERC20, Ownable, ReentrancyGuard, IomniDRAGON {
    using SafeERC20 for IERC20;

    // ======== STORAGE LAYOUT ========
    
    // Slot 1-2: Core addresses
    address public jackpotVault;
    address public revenueDistributor;
    
    // Slot 3-4: Core addresses continued
    address public wrappedNativeTokenAddress;
    address public uniswapRouter;
    
    // Slot 5-6: LayerZero and lottery
    address public lzEndpoint;
    address public lotteryManager;
    
    // Slot 7-8: Emergency and treasury
    address public emergencyTreasury;
    address public emergencyPauser;

    // Slot 9: Packed configuration values (256 bits total)
    struct PackedConfig {
        uint128 swapThreshold;           // 128 bits
        uint128 minimumAmountForProcessing; // 128 bits
    }
    PackedConfig public config;

    // Slot 10: Packed limits and thresholds
    struct PackedLimits {
        uint64 maxSingleTransfer;        // 64 bits - sufficient for token amounts
        uint64 minSlippageProtectionBps; // 64 bits
        uint64 maxSlippageProtectionBps; // 64 bits
        uint64 minSwapDelay;             // 64 bits
    }
    PackedLimits public limits;

    // Slot 11: Packed flags and version (256 bits total)
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

    // Slot 12: Timelock configuration
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

    // Constants (no storage cost)
    uint256 public constant MAX_SUPPLY = 6942000 * 10 ** 18;
    uint256 public constant INITIAL_SUPPLY = 6942000 * 10 ** 18;
    uint32 public constant SONIC_EID = 30332;
    uint32 public constant ARBITRUM_EID = 30110;
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

    // Mappings (each takes a full slot when first used)
    mapping(address => bool) public isExcludedFromFees;
    mapping(address => bool) public isPair;
    mapping(address => DexType) public pairToDexType;
    mapping(uint32 => bytes32) public peers; // LayerZero V2 peer management
    mapping(address => bool) public isPartnerPool;
    mapping(address => uint256) public partnerPoolIds;
    mapping(address => bool) public isAuthorizedCaller;

    // Additional configuration
    uint256 public allowedInitialMintingChainId = 146; // Default to Sonic

    // ======== CUSTOM ERRORS (Gas Optimized) ========
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
    error InvalidEndpoint();
    error InvalidSource();

    // ======== OPTIMIZED EVENTS ========
    event ConfigurationUpdated(string indexed component, address indexed newValue);
    event FeesUpdated(string indexed feeType, uint256 totalFee);
    event FeeDistributed(address indexed recipient, uint256 amount, string indexed feeType);
    event TokensBurned(uint256 amount);
    event CrossChainTransfer(uint32 indexed dstEid, address indexed from, address indexed to, uint256 amount);
    event LotteryEntry(address indexed user, uint256 amount);
    event EmergencyAction(string indexed action, address indexed actor);
    event SwapExecuted(uint256 tokensSwapped, uint256 nativeReceived);

    // ======== MODIFIERS (Optimized) ========
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
        if (!isAuthorizedCaller[msg.sender] && msg.sender != owner()) revert NotAuthorized();
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
    constructor() ERC20("Dragon", "DRAGON") Ownable(msg.sender) {
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
            burn: 69,        // 0.69%
            total: 69      // 0.69%
        });

        // Initialize packed configuration
        config = PackedConfig({
            swapThreshold: 10_000 * 1e18,
            minimumAmountForProcessing: 100 * 1e18
        });

        // Initialize packed limits
        limits = PackedLimits({
            maxSingleTransfer: 1000000,  // 1M tokens (without decimals to fit in uint64)
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

        // Set emergency treasury to owner initially
        emergencyTreasury = msg.sender;
        emergencyPauser = msg.sender;

        // Exclude owner from fees
        isExcludedFromFees[msg.sender] = true;
        isExcludedFromFees[address(this)] = true;
    }

    // ======== INTERFACE IMPLEMENTATION (REQUIRED) ========

    /**
     * @dev Process swap of native tokens ($S) to Dragon tokens and apply fees
     * @param _user The user who is swapping
     * @param _nativeAmount The amount of native tokens ($S) being swapped
     * @return swappableAmount The amount to be used for the actual swap after fees
     * @return nativeFeeAmount Total native amount that should be converted to fees
     * @return jackpotFeeAmount Native amount for jackpot (within nativeFeeAmount)
     * @return veDRAGONFeeAmount Native amount for veDRAGON (within nativeFeeAmount)
     */
    function processNativeSwapFees(
        address _user, 
        uint256 _nativeAmount
    ) external override onlyAuthorized nonZeroAmount(_nativeAmount) returns (
        uint256 swappableAmount,
        uint256 nativeFeeAmount,
        uint256 jackpotFeeAmount,
        uint256 veDRAGONFeeAmount
    ) {
        // Get current buy fees (since this is a native -> DRAGON swap)
        Fees memory currentFees = buyFees;
        
        // Calculate fee amounts
        jackpotFeeAmount = (_nativeAmount * currentFees.jackpot) / 10000;
        veDRAGONFeeAmount = (_nativeAmount * currentFees.veDRAGON) / 10000;
        nativeFeeAmount = jackpotFeeAmount + veDRAGONFeeAmount;
        swappableAmount = _nativeAmount - nativeFeeAmount;
        
        // Emit event for tracking
        emit FeeDistributed(_user, nativeFeeAmount, "NativeSwap");
        
        return (swappableAmount, nativeFeeAmount, jackpotFeeAmount, veDRAGONFeeAmount);
    }

    /**
     * @dev Distribute fees to jackpot and veDRAGON without triggering lottery entry
     * @param jackpotAmount Amount to send to jackpot
     * @param veDRAGONAmount Amount to send to veDRAGON
     */
    function distributeFees(
        uint256 jackpotAmount, 
        uint256 veDRAGONAmount
    ) external override onlyAuthorized {
        if (jackpotAmount > 0 && jackpotVault != address(0)) {
            _safeTransferNative(jackpotVault, jackpotAmount);
            emit FeeDistributed(jackpotVault, jackpotAmount, "Jackpot");
        }
        
        if (veDRAGONAmount > 0 && revenueDistributor != address(0)) {
            _safeTransferNative(revenueDistributor, veDRAGONAmount);
            // Call the proper interface method to notify the distributor
            try IDragonRevenueDistributor(revenueDistributor).distributeGeneralFees(address(0), veDRAGONAmount) {
                emit FeeDistributed(revenueDistributor, veDRAGONAmount, "veDRAGON");
            } catch {
                // Silent failure to prevent transaction reversion - funds already transferred
                emit FeeDistributed(revenueDistributor, veDRAGONAmount, "veDRAGON");
            }
        }
    }

    /**
     * @dev Get wrapped native token address
     * @return Address of the wrapped native token (WETH, wS, etc.)
     */
    function wrappedNativeToken() external view override returns (address) {
        return wrappedNativeTokenAddress;
    }

    // ======== CORE FUNCTIONALITY (Optimized) ========

    /**
     * @dev Optimized transfer function with reduced gas usage
     */
    function transfer(address to, uint256 amount) public override nonReentrant notEmergencyPaused returns (bool) {
        _optimizedTransfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @dev Optimized transferFrom function
     */
    function transferFrom(address from, address to, uint256 amount) public override nonReentrant notEmergencyPaused returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        _optimizedTransfer(from, to, amount);
        return true;
    }

    /**
     * @dev Optimized internal transfer function
     */
    function _optimizedTransfer(address from, address to, uint256 amount) internal {
        // Quick validation
        if (amount == 0) return;
        if (amount > uint256(limits.maxSingleTransfer) * 1e18 && from != owner() && to != owner()) {
            revert MaxSingleTransferExceeded();
        }
        if (flags.transfersPaused && !isExcludedFromFees[from]) {
            revert TransfersPaused();
        }

        // Skip fees for excluded addresses or during swaps
        if (isExcludedFromFees[from] || isExcludedFromFees[to] || flags.inSwap) {
            super._transfer(from, to, amount);
            return;
        }

        // Skip processing for small amounts
        if (amount < config.minimumAmountForProcessing) {
            super._transfer(from, to, amount);
            return;
        }

        // Handle swap if needed
        _handleSwapIfNeeded(from);

        // Process transfer with fees
        _processTransferWithFees(from, to, amount);
    }

    /**
     * @dev Handle token swap if conditions are met
     */
    function _handleSwapIfNeeded(address from) internal {
        if (!flags.swapEnabled || flags.inSwap || from == owner()) return;
        
        uint256 contractBalance = balanceOf(address(this));
        if (contractBalance >= config.swapThreshold) {
            // MEV protection
            if (block.timestamp < timelock.lastSwapTimestamp + limits.minSwapDelay) return;
            
            _swapTokensForWrappedNative(config.swapThreshold);
            timelock.lastSwapTimestamp = uint128(block.timestamp);
        }
    }

    /**
     * @dev Process transfer with fees (optimized)
     */
    function _processTransferWithFees(address from, address to, uint256 amount) internal {
        // Determine transaction type efficiently
        uint8 transactionType = _getTransactionType(from, to);
        
        // Get fees
        Fees memory currentFees = _getCurrentFees(transactionType);
        
        if (!flags.feesEnabled || currentFees.total == 0) {
            super._transfer(from, to, amount);
            _postTransferProcessing(to, amount, transactionType);
            return;
        }
        
        // Calculate and apply fees
        _applyFeesAndTransfer(from, to, amount, currentFees);
        
        // Post-transfer processing
        _postTransferProcessing(to, amount, transactionType);
    }

    /**
     * @dev Get transaction type efficiently
     */
    function _getTransactionType(address from, address to) internal view returns (uint8) {
        bool fromPair = isPair[from] || isPartnerPool[from];
        bool toPair = isPair[to] || isPartnerPool[to];
        
        if (fromPair && !toPair) return 0; // Buy
        if (!fromPair && toPair) return 1; // Sell
        return 2; // Transfer
    }

    /**
     * @dev Get current fees based on transaction type
     */
    function _getCurrentFees(uint8 transactionType) internal view returns (Fees memory) {
        if (transactionType == 0) {
            return buyFees;
        } else if (transactionType == 1) {
            return sellFees;
        } else {
            return transferFees;
        }
    }

    /**
     * @dev Apply fees and transfer (optimized)
     */
    function _applyFeesAndTransfer(
        address from,
        address to,
        uint256 amount,
        Fees memory currentFees
    ) internal {
        uint256 burnAmount = (amount * currentFees.burn) / 10000;
        uint256 jackpotAmount = (amount * currentFees.jackpot) / 10000;
        uint256 veDRAGONAmount = (amount * currentFees.veDRAGON) / 10000;
        uint256 totalFeeAmount = burnAmount + jackpotAmount + veDRAGONAmount;

        // Burn tokens
        if (burnAmount > 0) {
            super._transfer(from, DEAD_ADDRESS, burnAmount);
            emit TokensBurned(burnAmount);
        }

        // Transfer fees to contract
        uint256 contractFeeAmount = jackpotAmount + veDRAGONAmount;
        if (contractFeeAmount > 0) {
            super._transfer(from, address(this), contractFeeAmount);
        }

        // Transfer remaining to recipient
        super._transfer(from, to, amount - totalFeeAmount);
    }

    /**
     * @dev Post-transfer processing (optimized)
     */
    function _postTransferProcessing(address to, uint256 amount, uint8 transactionType) internal {
        // Only process lottery for buys
        if (transactionType == 0 && lotteryManager != address(0)) {
            _tryProcessLotteryEntry(to, amount);
        }
    }

    /**
     * @dev Try to process lottery entry (with gas limit)
     */
    function _tryProcessLotteryEntry(address user, uint256 amount) internal {
        try IOmniDragonLotteryManager(lotteryManager).processEntry(user, amount) {
            emit LotteryEntry(user, amount);
        } catch {
            // Silent failure to prevent transaction reversion
        }
    }

    /**
     * @dev Swap tokens for wrapped native (optimized)
     */
    function _swapTokensForWrappedNative(uint256 tokenAmount) internal lockTheSwap {
        if (uniswapRouter == address(0) || wrappedNativeTokenAddress == address(0)) return;

        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = wrappedNativeTokenAddress;

        _approve(address(this), uniswapRouter, tokenAmount);

        try IUniswapV2Router02(uniswapRouter).swapExactTokensForTokensSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // Accept any amount of wrapped native
            path,
            address(this),
            block.timestamp + 300
        ) {
            emit SwapExecuted(tokenAmount, IERC20(wrappedNativeTokenAddress).balanceOf(address(this)));
        } catch {
            // Silent failure
        }
    }

    /**
     * @dev Safe transfer of native tokens
     */
    function _safeTransferNative(address to, uint256 amount) internal {
        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) revert ExternalContractFailure();
    }

    // ======== CONFIGURATION FUNCTIONS (Optimized) ========

    /**
     * @dev Set core addresses (batch function for gas efficiency)
     */
    function setCoreAddresses(
        address _jackpotVault,
        address _revenueDistributor,
        address _wrappedNativeToken,
        address _uniswapRouter
    ) external onlyOwner {
        if (flags.configurationVersion >= 1) revert AlreadyConfigured();
        
        if (_jackpotVault != address(0)) {
            jackpotVault = _jackpotVault;
            isExcludedFromFees[_jackpotVault] = true;
        }
        
        if (_revenueDistributor != address(0)) {
            revenueDistributor = _revenueDistributor;
            isExcludedFromFees[_revenueDistributor] = true;
        }
        
        if (_wrappedNativeToken != address(0)) {
            wrappedNativeTokenAddress = _wrappedNativeToken;
            isExcludedFromFees[_wrappedNativeToken] = true;
        }
        
        if (_uniswapRouter != address(0)) {
            uniswapRouter = _uniswapRouter;
            isExcludedFromFees[_uniswapRouter] = true;
        }
        
        emit ConfigurationUpdated("CoreAddresses", address(0));
    }

    /**
     * @dev Set LayerZero configuration
     */
    function setLayerZeroConfig(address _lzEndpoint) external onlyOwner validAddress(_lzEndpoint) {
        if (flags.configurationVersion >= 1) revert AlreadyConfigured();
        lzEndpoint = _lzEndpoint;
        emit ConfigurationUpdated("LayerZero", _lzEndpoint);
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
     * @dev Set fees (optimized)
     */
    function setFees(
        uint256[3] calldata buyFeesBps,    // [jackpot, veDRAGON, burn]
        uint256[3] calldata sellFeesBps,   // [jackpot, veDRAGON, burn]
        uint256[3] calldata transferFeesBps // [jackpot, veDRAGON, burn]
    ) external onlyOwner {
        _validateAndSetFees(buyFeesBps, "Buy");
        _validateAndSetFees(sellFeesBps, "Sell");
        _validateAndSetFees(transferFeesBps, "Transfer");
    }

    /**
     * @dev Validate and set fees
     */
    function _validateAndSetFees(uint256[3] calldata feesBps, string memory feeType) internal {
        uint256 total = feesBps[0] + feesBps[1] + feesBps[2];
        if (total > MAX_FEE_BASIS_POINTS) revert FeesTooHigh();
        
        if (keccak256(bytes(feeType)) == keccak256(bytes("Buy"))) {
            buyFees = Fees(feesBps[0], feesBps[1], feesBps[2], total);
        } else if (keccak256(bytes(feeType)) == keccak256(bytes("Sell"))) {
            sellFees = Fees(feesBps[0], feesBps[1], feesBps[2], total);
        } else {
            transferFees = Fees(feesBps[0], feesBps[1], feesBps[2], total);
        }
        
        emit FeesUpdated(feeType, total);
    }

    /**
     * @dev Set configuration parameters
     */
    function setConfigParameters(
        uint128 _swapThreshold,
        uint128 _minimumAmountForProcessing,
        uint64 _maxSingleTransfer,
        uint64 _minSwapDelay
    ) external onlyOwner {
        config.swapThreshold = _swapThreshold;
        config.minimumAmountForProcessing = _minimumAmountForProcessing;
        limits.maxSingleTransfer = _maxSingleTransfer;
        limits.minSwapDelay = _minSwapDelay;
        
        emit ConfigurationUpdated("Parameters", address(0));
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

    /**
     * @dev Set authorized caller
     */
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        isAuthorizedCaller[caller] = authorized;
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
     * @dev Mark configuration as complete
     */
    function markConfigurationComplete(uint8 version) external onlyOwner {
        flags.configurationVersion = version;
        emit ConfigurationUpdated("Version", address(uint160(version)));
    }

    // ======== LAYERZERO V2 FUNCTIONS (Optimized) ========

    /**
     * @dev Set peer for LayerZero
     */
    function setPeer(uint32 eid, bytes32 peer) external onlyOwner {
        peers[eid] = peer;
        emit ConfigurationUpdated("Peer", address(uint160(uint256(peer))));
    }

    /**
     * @dev Send tokens cross-chain
     */
    function send(
        uint32 dstEid,
        bytes32 toAddress,
        uint256 amount,
        bytes calldata options,
        MessagingFee calldata fee
    ) external payable nonReentrant {
        if (peers[dstEid] == bytes32(0)) revert InvalidEndpoint();
        
        // Debit tokens
        _transfer(msg.sender, DEAD_ADDRESS, amount);
        
        // Send via LayerZero
        bytes memory payload = abi.encode(toAddress, amount);
        ILayerZeroEndpointV2(lzEndpoint).send{value: msg.value}(
            MessagingParams(dstEid, peers[dstEid], payload, options, fee.lzTokenFee > 0),
            payable(msg.sender)
        );
        
        emit CrossChainTransfer(dstEid, msg.sender, address(uint160(uint256(toAddress))), amount);
    }

    /**
     * @dev Receive tokens from LayerZero
     */
    function lzReceive(
        Origin calldata origin,
        bytes32 /* guid */,
        bytes calldata message,
        address /* executor */,
        bytes calldata /* extraData */
    ) external payable {
        if (msg.sender != lzEndpoint) revert InvalidSource();
        if (peers[origin.srcEid] != origin.sender) revert InvalidSource();
        
        (bytes32 toAddressBytes32, uint256 amount) = abi.decode(message, (bytes32, uint256));
        address toAddress = address(uint160(uint256(toAddressBytes32)));
        
        // Mint tokens (with supply check)
        if (totalSupply() + amount > MAX_SUPPLY) revert MaxSupplyExceeded();
        _mint(toAddress, amount);
        
        emit CrossChainTransfer(origin.srcEid, address(uint160(uint256(origin.sender))), toAddress, amount);
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

    /**
     * @dev Recover native tokens
     */
    function recoverNativeTokens() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            _safeTransferNative(emergencyTreasury, balance);
        }
    }

    /**
     * @dev Recover ERC20 tokens (except DRAGON)
     */
    function recoverERC20(address token, uint256 amount) external onlyOwner {
        if (token == address(this)) revert InvalidConfiguration();
        IERC20(token).safeTransfer(emergencyTreasury, amount);
    }

    // ======== VIEW FUNCTIONS ========

    /**
     * @dev Get current configuration
     */
    function getConfiguration() external view returns (
        PackedConfig memory,
        PackedLimits memory,
        PackedFlags memory,
        PackedTimelock memory
    ) {
        return (config, limits, flags, timelock);
    }

    /**
     * @dev Get fee information
     */
    function getFeeInfo() external view returns (
        Fees memory,
        Fees memory,
        Fees memory
    ) {
        return (buyFees, sellFees, transferFees);
    }

    /**
     * @dev Get contract size information for deployment verification
     */
    function getContractInfo() external pure returns (string memory) {
        return "omniDRAGON v2.0 - Optimized for production deployment";
    }

    // ======== UTILITY FUNCTIONS ========

    /**
     * @dev Convert address to bytes32 for LayerZero V2
     */
    function addressToBytes32(address _addr) public pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    /**
     * @dev Convert bytes32 to address for LayerZero V2
     */
    function bytes32ToAddress(bytes32 _b) public pure returns (address) {
        return address(uint160(uint256(_b)));
    }

    // ======== RECEIVE FUNCTION ========
    receive() external payable {
        // Accept native tokens for fee distribution
    }
}

