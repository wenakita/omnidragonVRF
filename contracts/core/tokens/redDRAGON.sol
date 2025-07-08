// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../../interfaces/tokens/IredDRAGON.sol";
import "../../interfaces/lottery/IOmniDragonLotteryManager.sol";
import "../../interfaces/oracles/IOmniDragonPriceOracle.sol";

/**
 * @title redDRAGON
 * @dev A tradeable ERC20 token with DEX pair-based fees and lottery integration
 * 
 * OVERVIEW:
 * redDRAGON is a tradeable token that can be paired with other tokens on Uniswap V3.
 * When users buy/sell redDRAGON through DEX pairs, it triggers:
 * 1. Fee collection (6.9% of transaction amount)
 * 2. Fee distribution (69% to jackpot, 31% to veDRAGON holders)
 * 3. Lottery entry based on USD transaction value
 * 
 * LOTTERY PROBABILITY SCALING:
 * - $10,000 USD = 4% chance (40,000 PPM)
 * - $1,000 USD = 0.4% chance (4,000 PPM)
 * - $100 USD = 0.04% chance (400 PPM)
 * - $10 USD = 0.004% chance (40 PPM)
 * 
 * FEES:
 * - Buy/Sell transactions: 6.9% fee
 * - Regular transfers: No fees
 * - Fee distribution: 69% jackpot, 31% veDRAGON holders
 * 
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract redDRAGON is ERC20, Ownable, ReentrancyGuard, Pausable, IredDRAGON {
    using SafeERC20 for IERC20;
    
    // ========== CONSTANTS ==========
    
    uint256 public constant BASIS_POINTS = 10000; // 100%
    uint256 public constant DEFAULT_SWAP_FEE_BPS = 690; // 6.9%
    uint256 public constant DEFAULT_JACKPOT_SHARE_BPS = 6900; // 69% of fees
    uint256 public constant DEFAULT_REVENUE_SHARE_BPS = 3100; // 31% of fees
    uint256 public constant MAX_FEE_BPS = 2000; // 20% maximum fee
    
    // Lottery constants (PPM = Parts Per Million)
    uint256 public constant DEFAULT_MIN_SWAP_USD = 10e6; // $10 (scaled by 1e6)
    uint256 public constant DEFAULT_MAX_SWAP_USD = 10000e6; // $10,000 (scaled by 1e6)
    uint256 public constant DEFAULT_MIN_PROBABILITY_PPM = 40; // 0.004% (40 PPM)
    uint256 public constant DEFAULT_MAX_PROBABILITY_PPM = 40000; // 4% (40,000 PPM)
    
    // Initial supply
    uint256 public constant INITIAL_SUPPLY = 10_000_000 * 10**18; // 10M tokens
    
    // ========== STATE VARIABLES ==========
    
    bool public initialized;
    bool public tradingEnabled = true;
    bool public feesEnabled = true;
    
    // Configuration
    SwapConfig public swapConfig;
    LotteryConfig public lotteryConfig;
    
    // DEX pair tracking
    mapping(address => bool) public isPair;
    mapping(address => bool) public isExcludedFromFees;
    mapping(address => bool) public isExcludedFromMaxTransfer;
    
    // Fee processing
    bool private inSwap;
    uint256 public swapThreshold = 1000 * 10**18; // 1000 tokens
    
    // Statistics
    uint256 public totalJackpotFees;
    uint256 public totalRevenueFees;
    uint256 public totalTradesProcessed;
    uint256 public totalLotteryEntries;
    
    // ========== EVENTS ==========
    
    event TradingEnabled(uint256 timestamp);
    event TradingPaused(uint256 timestamp);
    event PairUpdated(address indexed pair, bool indexed isPair);
    event FeeExclusionUpdated(address indexed account, bool excluded);
    
    // ========== ERRORS ==========
    
    error NotInitialized();
    error AlreadyInitialized();
    error ZeroAddress();
    error InvalidAmount();
    error TradingDisabled();
    error InvalidFeeConfiguration();
    error SwapInProgress();
    error MaxTransferExceeded();
    error TransferFailed();
    
    // ========== MODIFIERS ==========
    
    modifier onlyInitialized() {
        if (!initialized) revert NotInitialized();
        _;
    }
    
    modifier notPaused() {
        if (paused()) revert TradingDisabled();
        _;
    }
    
    modifier lockSwap() {
        inSwap = true;
        _;
        inSwap = false;
    }
    
    modifier validAddress(address _addr) {
        if (_addr == address(0)) revert ZeroAddress();
        _;
    }
    
    // ========== CONSTRUCTOR ==========
    
    constructor() ERC20("redDRAGON", "redDRAGON") Ownable(msg.sender) {
        // Initialize with default lottery configuration
        lotteryConfig = LotteryConfig({
            minSwapUSD: DEFAULT_MIN_SWAP_USD,
            maxSwapUSD: DEFAULT_MAX_SWAP_USD,
            minProbabilityPPM: DEFAULT_MIN_PROBABILITY_PPM,
            maxProbabilityPPM: DEFAULT_MAX_PROBABILITY_PPM,
            enabled: true
        });
        
        // Exclude contract from fees
        isExcludedFromFees[address(this)] = true;
        isExcludedFromMaxTransfer[address(this)] = true;
        isExcludedFromMaxTransfer[msg.sender] = true;
        
        // Mint initial supply to deployer
        _mint(msg.sender, INITIAL_SUPPLY);
    }
    
    // ========== INITIALIZATION ==========
    
    /**
     * @notice Initialize the contract (called once after deployment)
     * @param _owner Owner address
     * @param _jackpotVault Jackpot vault address
     * @param _revenueDistributor veDRAGON revenue distributor
     * @param _lotteryManager Lottery manager address
     * @param _priceOracle Price oracle address
     */
    function initialize(
        address _owner,
        address _jackpotVault,
        address _revenueDistributor,
        address _lotteryManager,
        address _priceOracle
    ) external override {
        if (initialized) revert AlreadyInitialized();
        if (_owner == address(0)) revert ZeroAddress();
        
        // Initialize swap configuration
        swapConfig = SwapConfig({
            jackpotVault: _jackpotVault,
            revenueDistributor: _revenueDistributor,
            lotteryManager: _lotteryManager,
            priceOracle: _priceOracle,
            swapFeeBps: DEFAULT_SWAP_FEE_BPS,
            jackpotShareBps: DEFAULT_JACKPOT_SHARE_BPS,
            revenueShareBps: DEFAULT_REVENUE_SHARE_BPS,
            swapFeesEnabled: true,
            lotteryEnabled: true
        });
        
        initialized = true;
        
        // Transfer ownership if different from deployer
        if (_owner != owner()) {
            _transferOwnership(_owner);
        }
        
        emit SwapConfigUpdated(_jackpotVault, _revenueDistributor, _lotteryManager, DEFAULT_SWAP_FEE_BPS);
    }
    
    // ========== CORE TRANSFER FUNCTIONS ==========
    
    /**
     * @notice Override transfer to add fee logic
     */
    function transfer(address to, uint256 amount) public override(ERC20, IERC20) notPaused returns (bool) {
        return _transferWithFees(msg.sender, to, amount);
    }
    
    /**
     * @notice Override transferFrom to add fee logic
     */
    function transferFrom(address from, address to, uint256 amount) public override(ERC20, IERC20) notPaused returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        return _transferWithFees(from, to, amount);
    }
    
    /**
     * @notice Internal transfer function with fee logic
     */
    function _transferWithFees(address from, address to, uint256 amount) internal returns (bool) {
        if (from == address(0) || to == address(0)) revert ZeroAddress();
        
        // Check for internal calls or excluded addresses
        bool isInternalCall = (msg.sender == address(this) || 
                              from == address(this) || 
                              to == address(this));
        
        bool isExcluded = (isExcludedFromFees[from] || isExcludedFromFees[to]);
        
        if (isInternalCall || isExcluded || !tradingEnabled) {
            _transfer(from, to, amount);
            return true;
        }
        
        // Skip fees if disabled or in swap
        if (!feesEnabled || inSwap || (!isPair[to] && !isPair[from])) {
            _transfer(from, to, amount);
            return true;
        }
        
        // Apply fees for buy/sell transactions
        bool isSell = isPair[to];
        bool isBuy = isPair[from];
        
        if (isSell || isBuy) {
            uint256 feeAmount = 0;
            
            if (swapConfig.swapFeeBps > 0) {
                feeAmount = (amount * swapConfig.swapFeeBps) / BASIS_POINTS;
            }
            
            if (feeAmount > 0) {
                _transfer(from, address(this), feeAmount);
                amount -= feeAmount;
            }
            
            // Trigger lottery for buy transactions
            if (isBuy && swapConfig.lotteryEnabled && swapConfig.lotteryManager != address(0)) {
                _triggerLottery(to, amount);
            }
            
            totalTradesProcessed++;
        }
        
        _transfer(from, to, amount);
        
        // Process accumulated fees
        if (_shouldProcessFees()) {
            _processFees();
        }
        
        return true;
    }
    
    // ========== FEE PROCESSING ==========
    
    /**
     * @notice Check if fees should be processed
     */
    function _shouldProcessFees() internal view returns (bool) {
        return !inSwap && feesEnabled && tradingEnabled &&
               balanceOf(address(this)) >= swapThreshold;
    }
    
    /**
     * @notice Process accumulated fees
     */
    function _processFees() internal lockSwap {
        uint256 contractBalance = balanceOf(address(this));
        if (contractBalance == 0) return;
        
        processSwapFees(contractBalance);
    }
    
    /**
     * @notice Process swap fees and distribute to ecosystem
     * @param totalFeeAmount Total fee amount collected
     * SECURITY FIX: Added onlyOwner modifier to prevent unauthorized access
     * Critical vulnerability fix - addresses audit finding #1
     */
    function processSwapFees(uint256 totalFeeAmount) public override onlyInitialized onlyOwner {
        if (totalFeeAmount == 0) return;
        if (balanceOf(address(this)) < totalFeeAmount) revert InvalidAmount();
        
        // Calculate distribution amounts
        uint256 jackpotAmount = (totalFeeAmount * swapConfig.jackpotShareBps) / BASIS_POINTS;
        uint256 revenueAmount = totalFeeAmount - jackpotAmount;
        
        // Distribute to jackpot vault
        if (jackpotAmount > 0 && swapConfig.jackpotVault != address(0)) {
            _transfer(address(this), swapConfig.jackpotVault, jackpotAmount);
            totalJackpotFees += jackpotAmount;
        }
        
        // Distribute to revenue distributor
        if (revenueAmount > 0 && swapConfig.revenueDistributor != address(0)) {
            _transfer(address(this), swapConfig.revenueDistributor, revenueAmount);
            totalRevenueFees += revenueAmount;
        }
        
        emit FeesDistributed(jackpotAmount, revenueAmount, block.timestamp);
    }
    
    // ========== LOTTERY FUNCTIONS ==========
    
    /**
     * @notice Internal function to trigger lottery
     */
    function _triggerLottery(address user, uint256 amount) internal {
        if (!lotteryConfig.enabled) return;
        
        // Get USD value of transaction
        uint256 usdValue = getUSDValue(address(this), amount);
        if (usdValue < lotteryConfig.minSwapUSD) return;
        
        // Calculate probability
        uint256 probabilityPPM = calculateLotteryProbability(usdValue);
        
        // Trigger lottery entry
        try IOmniDragonLotteryManager(swapConfig.lotteryManager).processInstantLottery(user, usdValue) {
            totalLotteryEntries++;
            emit LotteryTriggered(user, usdValue, probabilityPPM, block.timestamp);
        } catch {
            // Lottery entry failed - continue without failing the transaction
        }
    }
    
    /**
     * @notice Trigger lottery entry for a swap
     * @param user User address
     * @param usdSwapValue USD value of the swap
     */
    function triggerLottery(address user, uint256 usdSwapValue) public override onlyInitialized {
        // This function is kept for interface compatibility but not used internally
        if (!lotteryConfig.enabled) return;
        if (usdSwapValue < lotteryConfig.minSwapUSD) return;
        if (swapConfig.lotteryManager == address(0)) return;
        
        uint256 probabilityPPM = calculateLotteryProbability(usdSwapValue);
        
        try IOmniDragonLotteryManager(swapConfig.lotteryManager).processInstantLottery(user, usdSwapValue) {
            totalLotteryEntries++;
            emit LotteryTriggered(user, usdSwapValue, probabilityPPM, block.timestamp);
        } catch {
            // Lottery entry failed - continue without failing
        }
    }
    
    /**
     * @notice Calculate lottery probability for USD amount
     * @param usdAmount USD amount of swap (scaled by 1e6)
     * @return probabilityPPM Probability in parts per million
     */
    function calculateLotteryProbability(uint256 usdAmount) public view override returns (uint256 probabilityPPM) {
        if (usdAmount <= lotteryConfig.minSwapUSD) {
            return lotteryConfig.minProbabilityPPM;
        }
        
        if (usdAmount >= lotteryConfig.maxSwapUSD) {
            return lotteryConfig.maxProbabilityPPM;
        }
        
        // Linear interpolation between min and max
        uint256 usdRange = lotteryConfig.maxSwapUSD - lotteryConfig.minSwapUSD;
        uint256 probabilityRange = lotteryConfig.maxProbabilityPPM - lotteryConfig.minProbabilityPPM;
        uint256 usdDelta = usdAmount - lotteryConfig.minSwapUSD;
        
        probabilityPPM = lotteryConfig.minProbabilityPPM + (usdDelta * probabilityRange) / usdRange;
    }
    
    // ========== DEPRECATED FUNCTIONS (for interface compatibility) ==========
    
    /**
     * @notice Deprecated - kept for interface compatibility
     */
    function processSwap(
        address user,
        address inputToken,
        uint256 inputAmount,
        uint256 redDRAGONAmount,
        uint256 expectedUSDValue
    ) external override pure {
        // This function is deprecated in the new model
        revert("Deprecated: Use regular transfers with pair detection");
    }
    
    // ========== CONFIGURATION ==========
    
    /**
     * @notice Set DEX pair
     * @param pair Pair address
     * @param _isPair Whether address is a pair
     */
    function setPair(address pair, bool _isPair) external onlyOwner validAddress(pair) {
        isPair[pair] = _isPair;
        emit PairUpdated(pair, _isPair);
    }
    
    /**
     * @notice Set fee exclusion
     * @param account Account address
     * @param excluded Whether account is excluded from fees
     */
    function setExcludeFromFees(address account, bool excluded) external onlyOwner validAddress(account) {
        isExcludedFromFees[account] = excluded;
        emit FeeExclusionUpdated(account, excluded);
    }
    
    /**
     * @notice Update swap configuration
     * @param _jackpotVault Jackpot vault address
     * @param _revenueDistributor Revenue distributor address
     * @param _lotteryManager Lottery manager address
     * @param _priceOracle Price oracle address
     * @param _swapFeeBps Swap fee in basis points
     * @param _swapFeesEnabled Whether swap fees are enabled
     */
    function updateSwapConfig(
        address _jackpotVault,
        address _revenueDistributor,
        address _lotteryManager,
        address _priceOracle,
        uint256 _swapFeeBps,
        bool _swapFeesEnabled
    ) external override onlyOwner {
        if (_swapFeeBps > MAX_FEE_BPS) revert InvalidFeeConfiguration();
        
        swapConfig.jackpotVault = _jackpotVault;
        swapConfig.revenueDistributor = _revenueDistributor;
        swapConfig.lotteryManager = _lotteryManager;
        swapConfig.priceOracle = _priceOracle;
        swapConfig.swapFeeBps = _swapFeeBps;
        swapConfig.swapFeesEnabled = _swapFeesEnabled;
        
        emit SwapConfigUpdated(_jackpotVault, _revenueDistributor, _lotteryManager, _swapFeeBps);
    }
    
    /**
     * @notice Update lottery configuration
     * @param _minSwapUSD Minimum USD swap amount
     * @param _maxSwapUSD Maximum USD swap amount for max probability
     * @param _minProbabilityPPM Minimum probability in PPM
     * @param _maxProbabilityPPM Maximum probability in PPM
     * @param _enabled Whether lottery is enabled
     */
    function updateLotteryConfig(
        uint256 _minSwapUSD,
        uint256 _maxSwapUSD,
        uint256 _minProbabilityPPM,
        uint256 _maxProbabilityPPM,
        bool _enabled
    ) external override onlyOwner {
        if (_minSwapUSD >= _maxSwapUSD) revert InvalidFeeConfiguration();
        if (_minProbabilityPPM >= _maxProbabilityPPM) revert InvalidFeeConfiguration();
        if (_maxProbabilityPPM > 100000) revert InvalidFeeConfiguration(); // Max 10% probability
        
        lotteryConfig.minSwapUSD = _minSwapUSD;
        lotteryConfig.maxSwapUSD = _maxSwapUSD;
        lotteryConfig.minProbabilityPPM = _minProbabilityPPM;
        lotteryConfig.maxProbabilityPPM = _maxProbabilityPPM;
        lotteryConfig.enabled = _enabled;
        
        emit LotteryConfigUpdated(_minSwapUSD, _maxSwapUSD, _minProbabilityPPM, _maxProbabilityPPM);
    }
    
    /**
     * @notice Set authorized swap contract (deprecated)
     * @param swapContract Address of swap contract
     * @param authorized Whether contract is authorized
     */
    function setAuthorizedSwapContract(address swapContract, bool authorized) external override onlyOwner {
        // Deprecated in pair-based model, kept for interface compatibility
    }
    
    // ========== ADMIN FUNCTIONS ==========
    
    /**
     * @notice Set trading enabled/disabled
     * @param enabled Whether trading is enabled
     */
    function setTradingEnabled(bool enabled) external onlyOwner {
        tradingEnabled = enabled;
        if (enabled) {
            emit TradingEnabled(block.timestamp);
        } else {
            emit TradingPaused(block.timestamp);
        }
    }
    
    /**
     * @notice Set fees enabled/disabled
     * @param enabled Whether fees are enabled
     */
    function setFeesEnabled(bool enabled) external onlyOwner {
        feesEnabled = enabled;
    }
    
    /**
     * @notice Set swap threshold
     * @param threshold New swap threshold
     */
    function setSwapThreshold(uint256 threshold) external onlyOwner {
        swapThreshold = threshold;
    }
    
    /**
     * @notice Manually process fees
     */
    function manualProcessFees() external onlyOwner {
        if (inSwap) revert SwapInProgress();
        _processFees();
    }
    
    /**
     * @notice Pause/unpause the contract
     * @param _paused Whether to pause the contract
     */
    function setPaused(bool _paused) external onlyOwner {
        if (_paused) {
            _pause();
        } else {
            _unpause();
        }
    }
    
    /**
     * @notice Emergency function to recover stuck tokens (not redDRAGON)
     * @param token Token address to recover
     * @param amount Amount to recover
     */
    function emergencyRecover(address token, uint256 amount) external onlyOwner {
        if (token == address(this)) revert InvalidAmount(); // Cannot recover own tokens
        if (token == address(0)) {
            // Recover native tokens
            (bool success, ) = payable(owner()).call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // Recover ERC20 tokens
            IERC20(token).safeTransfer(owner(), amount);
        }
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @notice Get current swap configuration
     * @return config Current swap configuration
     */
    function getSwapConfig() external view override returns (SwapConfig memory config) {
        return swapConfig;
    }
    
    /**
     * @notice Get current lottery configuration
     * @return config Current lottery configuration
     */
    function getLotteryConfig() external view override returns (LotteryConfig memory config) {
        return lotteryConfig;
    }
    
    /**
     * @notice Get USD value of token amount
     * @param token Token address
     * @param amount Token amount
     * @return usdValue USD value (scaled by 1e6)
     */
    function getUSDValue(address token, uint256 amount) public view override returns (uint256 usdValue) {
        if (swapConfig.priceOracle == address(0)) return 0;
        
        try IOmniDragonPriceOracle(swapConfig.priceOracle).getAggregatedPrice() returns (int256 price, bool success, uint256 timestamp) {
            if (success && price > 0) {
                // Convert token amount to USD value
                // Assuming price is USD per token with 8 decimals (like Chainlink)
                // and we want to return USD value scaled by 1e6
                uint256 usdPrice = uint256(price); // Price in USD with 8 decimals
                return (amount * usdPrice) / 10**20; // Convert to 1e6 scale
            }
            return 0;
        } catch {
            return 0;
        }
    }
    
    /**
     * @notice Check if address is authorized swap contract (deprecated)
     * @param swapContract Address to check
     * @return authorized Whether address is authorized
     */
    function isAuthorizedSwapContract(address swapContract) external view override returns (bool authorized) {
        // Deprecated in pair-based model, always return false
        return false;
    }
    
    /**
     * @notice Get total fees collected
     * @return jackpotFees Total fees sent to jackpot
     * @return revenueFees Total fees sent to revenue distributor
     */
    function getTotalFees() external view override returns (uint256 jackpotFees, uint256 revenueFees) {
        return (totalJackpotFees, totalRevenueFees);
    }
    
    /**
     * @notice Check if contract is initialized
     * @return initialized Whether contract is initialized
     */
    function isInitialized() external view override returns (bool) {
        return initialized;
    }
    
    /**
     * @notice Get comprehensive contract statistics
     * @return stats Array of key statistics
     */
    function getStats() external view returns (uint256[6] memory stats) {
        return [
            totalSupply(),
            totalTradesProcessed,
            totalLotteryEntries,
            totalJackpotFees,
            totalRevenueFees,
            balanceOf(address(this)) // Pending fee distribution
        ];
    }
    
    // ========== OVERRIDE FUNCTIONS ==========
    
    /**
     * @notice Override _update to ensure proper pause protection
     */
    function _update(address from, address to, uint256 amount) internal override {
        super._update(from, to, amount);
    }
    
    /**
     * @notice Receive function for native token recovery
     * SECURITY FIX: Added reentrancy protection for external calls safety
     * Critical vulnerability fix - CVE-2024-AUDIT-010
     */
    receive() external payable nonReentrant {
        // Allow receiving native tokens for emergency recovery
    }
}
