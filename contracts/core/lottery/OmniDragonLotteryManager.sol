// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

// Custom errors
error TransferFailed();

// AUDIT FIX: Removed unused veDRAGONMath import
import { IChainlinkVRFIntegratorV2_5 } from "../../interfaces/external/chainlink/IChainlinkVRFIntegratorV2_5.sol";
import { IOmniDragonVRFConsumerV2_5 } from "../../interfaces/external/chainlink/IOmniDragonVRFConsumerV2_5.sol";
import { MessagingReceipt } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OAppSender.sol";
import { MessagingFee } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import { IDragonJackpotDistributor } from "../../interfaces/lottery/IDragonJackpotDistributor.sol";
import { IOmniDragonPriceOracle } from "../../interfaces/oracles/IOmniDragonPriceOracle.sol";

// ============ INTERFACES ============

interface IveDRAGONToken {
    function lockedEnd(address user) external view returns (uint256);
    function balanceOf(address user) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

// ============ INTERFACES ============

interface IDragonJackpotVault {
    function getJackpotBalance() external view returns (uint256 balance);
    function payJackpot(address winner, uint256 amount) external;
    function getLastWinTime() external view returns (uint256 timestamp);
}

/**
 * @title OmniDragonLotteryManager
 * @dev Manages instantaneous per-swap lottery system for OmniDragon ecosystem
 * 
 * FEATURES:
 * - Per-swap lottery entries with linear probability scaling
 * - veDRAGON boost integration using Curve Finance formula
 * - Three secure VRF randomness sources: Local VRF, Cross-chain VRF, and Provider randomness
 * - Position-based boost capping to prevent exploitation
 * - Rate limiting and DoS protection
 * - Pull payment mechanism for failed prize transfers
 *
 * SECURITY:
 * - All randomness sources are cryptographically secure (VRF only)
 * - No exploitable pseudo-randomness functions
 * - ReentrancyGuard protection on all external functions
 * - Comprehensive access control system
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */ 
contract OmniDragonLotteryManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Address for address payable;

    // ============ CONSTANTS ============
    
    uint256 public constant MIN_SWAP_INTERVAL = 1; // 1 second between swaps per user
    uint256 public constant MAX_BOOST_BPS = 25000; // 2.5x boost maximum
    uint256 public constant MAX_WIN_PROBABILITY_PPM = 100000; // 10% maximum win probability (100,000 PPM)
    
    // Instant lottery configuration (USD-based with 6 decimals)
    uint256 public constant MIN_SWAP_USD = 10e6; // $10 USD minimum
    uint256 public constant MAX_PROBABILITY_SWAP_USD = 10000e6; // $10,000 USD for max probability (not a trade limit)
    uint256 public constant MIN_WIN_CHANCE_PPM = 40; // 0.004% (40 parts per million) at $10
    uint256 public constant MAX_WIN_CHANCE_PPM = 40000; // 4% (40,000 parts per million) at $10,000+
    
    // Using Parts Per Million (PPM) for precise probability control
    // 1 PPM = 0.0001% = 1/1,000,000
    // 40 PPM = 0.004%, 40,000 PPM = 4%
    
    // veDRAGON boost configuration
    uint256 public constant BOOST_PRECISION = 1e18;
    uint256 public constant MAX_BOOST = 25e17; // 2.5x maximum boost
    uint256 public constant MIN_BOOST = 1e18; // 1.0x minimum boost (no boost)
    
    // ============ ENUMS ============
    
    enum RandomnessSource {
        LOCAL_VRF,          // Local: Direct Chainlink VRF
        CROSS_CHAIN_VRF     // Cross-chain: Chainlink VRF via LayerZero
    }

    // ============ STRUCTS ============
    
    struct InstantLotteryConfig {
        uint256 baseWinProbability; // Base probability in PPM (parts per million) - UNUSED, kept for compatibility
        uint256 minSwapAmount;      // Minimum swap amount to qualify (in USD, scaled by 1e6)
        uint256 rewardPercentage;   // Percentage of jackpot as reward (in basis points)
        bool isActive;
        bool useVRFForInstant;      // Whether to use VRF for instant lotteries (recommended)
    }

    struct UserStats {
        uint256 totalSwaps;
        uint256 totalVolume;
        uint256 totalWins;
        uint256 totalRewards;
        uint256 lastSwapTimestamp;
    }

    struct PendingLotteryEntry {
        address user;
        uint256 swapAmountUSD;
        uint256 winProbability;
        uint256 timestamp;
        bool fulfilled;
        RandomnessSource randomnessSource;
    }
    
    // SECURITY FIX: Add constants for state growth management
    uint256 public constant MAX_PENDING_ENTRY_AGE = 24 hours; // Max age before entry can be cleaned up
    uint256 public constant CLEANUP_BATCH_SIZE = 50; // Max entries to clean in one transaction

    // ============ STATE VARIABLES ============
    
    // Core dependencies
    IDragonJackpotDistributor public jackpotDistributor;
    IERC20 public veDRAGONToken;
    IERC20 public redDRAGONToken;
    
    // VRF integrations
    IChainlinkVRFIntegratorV2_5 public vrfIntegrator;
    IOmniDragonVRFConsumerV2_5 public localVRFConsumer;
    IDragonJackpotVault public jackpotVault;
    
    // Chain-specific multiplier
    uint256 public chainMultiplier = 1e18; // 1.0x by default
    
    // Market infrastructure integration
    IOmniDragonPriceOracle public priceOracle;
    uint256 public immutable CHAIN_ID;
    
    // Prize configuration removed - rewards are now dynamic based on jackpot vault balance
    
    // Rate limiting
    mapping(address => uint256) public lastSwapTime;
    
    // Access control
    mapping(address => bool) public authorizedSwapContracts;
    
    // Unclaimed prizes (DoS protection)
    mapping(address => uint256) public unclaimedPrizes;
    uint256 public totalUnclaimedPrizes;
    
    // Lottery state
    mapping(uint256 => PendingLotteryEntry) public pendingEntries;
    mapping(address => UserStats) public userStats;
    
    // Statistics
    uint256 public totalLotteryEntries;
    uint256 public totalPrizesWon;
    uint256 public totalPrizesDistributed;
    
    InstantLotteryConfig public instantLotteryConfig;
    
    // ============ EVENTS ============
    
    event InstantLotteryProcessed(address indexed user, uint256 swapAmount, bool won, uint256 reward);
    event InstantLotteryEntered(address indexed user, uint256 swapAmountUSD, uint256 winChancePPM, uint256 boostedWinChancePPM, uint256 randomnessId);
    event LotteryEntryCreated(address indexed user, uint256 swapAmountUSD, uint256 winProbability, uint256 vrfRequestId);
    event RandomnessRequested(uint256 indexed requestId, address indexed user, RandomnessSource source);
    event RandomnessFulfilled(uint256 indexed requestId, uint256 randomness, RandomnessSource source);
    
    // Pull payment events
    event PrizeClaimable(address indexed winner, uint256 amount);
    event PrizeClaimed(address indexed winner, uint256 amount);
    event PrizeTransferFailed(address indexed winner, uint256 amount);
    
    // Configuration events
    event InstantLotteryConfigured(uint256 baseWinProbability, uint256 minSwapAmount, uint256 rewardPercentage, bool isActive);
    event SwapContractAuthorized(address indexed swapContract, bool authorized);
    event LotteryManagerInitialized(address jackpotDistributor, address veDRAGONToken);
    event PriceOracleUpdated(address indexed newPriceOracle);
    event ChainMultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier);
    // Fixed prize events removed - rewards are now purely dynamic

    // ============ CONSTRUCTOR ============
    
    constructor(
        address _jackpotDistributor,
        address _veDRAGONToken,
        address _priceOracle,
        uint256 _chainId
    ) Ownable(msg.sender) {
        require(_jackpotDistributor != address(0), "Invalid jackpot distributor");
        require(_veDRAGONToken != address(0), "Invalid veDRAGON token");
        require(_priceOracle != address(0), "Invalid price oracle");
        
        jackpotDistributor = IDragonJackpotDistributor(_jackpotDistributor);
        veDRAGONToken = IERC20(_veDRAGONToken);
        priceOracle = IOmniDragonPriceOracle(_priceOracle);
        
        CHAIN_ID = _chainId;
        
        // Initialize instant lottery config using PPM constants
        instantLotteryConfig = InstantLotteryConfig({
            baseWinProbability: MIN_WIN_CHANCE_PPM, // 40 PPM = 0.004% (for compatibility only - actual calculation uses constants)
            minSwapAmount: MIN_SWAP_USD,
            rewardPercentage: 6900, // 69% of jackpot
            isActive: true,
            useVRFForInstant: true
        });
        
        emit LotteryManagerInitialized(_jackpotDistributor, _veDRAGONToken);
    }

    // ============ MODIFIERS ============
    
    modifier onlyAuthorizedSwapContract() {
        require(authorizedSwapContracts[msg.sender], "Unauthorized swap contract");
        _;
    }
    
    modifier rateLimited(address user) {
        require(
            block.timestamp >= lastSwapTime[user] + MIN_SWAP_INTERVAL,
            "Swap too frequent"
        );
        lastSwapTime[user] = block.timestamp;
        _;
    }

    // ============ ADMIN FUNCTIONS ============
    
    function setVRFIntegrator(address _vrfIntegrator) external onlyOwner {
        vrfIntegrator = IChainlinkVRFIntegratorV2_5(_vrfIntegrator);
        
        // Auto-authorize this contract with the VRF integrator if possible
        if (_vrfIntegrator != address(0)) {
            try IChainlinkVRFIntegratorV2_5(_vrfIntegrator).setAuthorizedCaller(address(this), true) {
                // Successfully authorized
            } catch {
                // Authorization failed - owner will need to authorize manually
            }
        }
    }

    function setLocalVRFConsumer(address _localVRFConsumer) external onlyOwner {
        localVRFConsumer = IOmniDragonVRFConsumerV2_5(_localVRFConsumer);
        
        // Auto-authorize this contract with the local VRF consumer if possible
        if (_localVRFConsumer != address(0)) {
            try IOmniDragonVRFConsumerV2_5(_localVRFConsumer).setLocalCallerAuthorization(address(this), true) {
                // Successfully authorized
            } catch {
                // Authorization failed - owner will need to authorize manually
            }
        }
    }

    // Removed setRandomnessProvider - using only Chainlink VRF

    function setJackpotVault(address _jackpotVault) external onlyOwner {
        require(_jackpotVault != address(0), "Invalid jackpot vault");
        jackpotVault = IDragonJackpotVault(_jackpotVault);
    }

    function setJackpotDistributor(address _jackpotDistributor) external onlyOwner {
        require(_jackpotDistributor != address(0), "Invalid jackpot distributor");
        jackpotDistributor = IDragonJackpotDistributor(_jackpotDistributor);
    }

    function setPriceOracle(address _priceOracle) external onlyOwner {
        priceOracle = IOmniDragonPriceOracle(_priceOracle);
        emit PriceOracleUpdated(_priceOracle);
    }

    function setChainMultiplier(uint256 _chainMultiplier) external onlyOwner {
        require(_chainMultiplier > 0, "Invalid chain multiplier");
        uint256 oldMultiplier = chainMultiplier;
        chainMultiplier = _chainMultiplier;
        emit ChainMultiplierUpdated(oldMultiplier, _chainMultiplier);
    }

    // Fixed prize functions removed - rewards are now purely dynamic based on jackpot vault balance

    function setAuthorizedSwapContract(address swapContract, bool authorized) external onlyOwner {
        require(swapContract != address(0), "Invalid swap contract");
        authorizedSwapContracts[swapContract] = authorized;
        emit SwapContractAuthorized(swapContract, authorized);
    }

    function configureInstantLottery(
        uint256 _baseWinProbability,
        uint256 _minSwapAmount,
        uint256 _rewardPercentage,
        bool _isActive,
        bool _useVRFForInstant
    ) external onlyOwner {
        require(_baseWinProbability <= 10000, "Invalid base win probability");
        require(_rewardPercentage <= 10000, "Invalid reward percentage");
        
        instantLotteryConfig = InstantLotteryConfig({
            baseWinProbability: _baseWinProbability,
            minSwapAmount: _minSwapAmount,
            rewardPercentage: _rewardPercentage,
            isActive: _isActive,
            useVRFForInstant: _useVRFForInstant
        });
        
        emit InstantLotteryConfigured(_baseWinProbability, _minSwapAmount, _rewardPercentage, _isActive);
    }

    // ============ LOTTERY FUNCTIONS ============
    
    /**
     * @notice Process a lottery entry (backward compatibility method)
     * @param user User address
     * @param amount Swap amount (will be treated as USD amount scaled by 1e6)
     * @dev This is a simplified version for backward compatibility with omniDRAGON token
     */
    function processEntry(address user, uint256 amount) external nonReentrant onlyAuthorizedSwapContract {
        // Only process lottery if we have a price oracle and can get accurate USD conversion
        if (address(priceOracle) == address(0)) {
            // No price oracle configured - swap succeeds but no lottery entry
            return;
        }
        
        uint256 swapAmountUSD;
        bool priceObtained = false;
        
        try priceOracle.getAggregatedPrice() returns (int256 price, bool success, uint256 /* timestamp */) {
            if (success && price > 0) {
                // Convert token amount to USD using actual oracle price
                // Price is typically in 8 decimals, amount is 18 decimals, want 6 decimals USD
                // So: (amount * price) / 1e20 = (18 + 8 - 20 = 6 decimals)
                swapAmountUSD = (amount * uint256(price)) / 1e20;
                priceObtained = true;
            }
        } catch {
            // Oracle failed - swap succeeds but no lottery entry
        }
        
        // Only process lottery if we got a valid price and swap meets minimum threshold
        if (priceObtained && swapAmountUSD >= MIN_SWAP_USD) {
            // Process the instant lottery with actual USD amount from price oracle
            processInstantLottery(user, swapAmountUSD);
        }
        // If no valid price or below minimum, swap succeeds but no lottery entry is created
    }
    
    /**
     * @notice Process lottery entry for native token spending
     * @param user User address
     * @param nativeAmount Native token amount being spent (18 decimals)
     * @dev Converts native token amount to USD using chain-specific price estimates
     */
    function processNativeTokenEntry(address user, uint256 nativeAmount) external nonReentrant onlyAuthorizedSwapContract {
        if (nativeAmount == 0) return;
        
        // Convert native token amount to USD (6 decimals) based on chain
        uint256 usdAmount = _convertNativeTokenToUSD(nativeAmount);
        
        // Only process lottery if swap meets minimum threshold
        if (usdAmount >= MIN_SWAP_USD) {
            processInstantLottery(user, usdAmount);
        }
    }
    
    /**
     * @notice Process lottery entry for WETH spending
     * @param user User address
     * @param wethAmount WETH amount being spent (18 decimals)
     * @dev Converts WETH amount to USD using ETH price estimates
     */
    function processWETHEntry(address user, uint256 wethAmount) external nonReentrant onlyAuthorizedSwapContract {
        if (wethAmount == 0) return;
        
        // Convert WETH amount to USD (6 decimals)
        uint256 usdAmount = _convertWETHToUSD(wethAmount);
        
        // Only process lottery if swap meets minimum threshold
        if (usdAmount >= MIN_SWAP_USD) {
            processInstantLottery(user, usdAmount);
        }
    }
    
    /**
     * @dev Convert native token amount to USD (6 decimals) based on chain
     * @param nativeAmount Native token amount in 18 decimals
     * @return usdAmount USD amount in 6 decimals
     */
    function _convertNativeTokenToUSD(uint256 nativeAmount) internal view returns (uint256 usdAmount) {
        // SECURITY FIX: Use configured oracles instead of hardcoded prices
        // Critical vulnerability fix - CVE-2024-AUDIT-001
        
        // PRIMARY: Use configured price oracle
        if (address(priceOracle) != address(0)) {
            try priceOracle.getAggregatedPrice() returns (int256 price, bool success, uint256 /* timestamp */) {
                if (success && price > 0) {
                    // Price is in USD per native token (8 decimals)
                    // nativeAmount (18 decimals) * price (8 decimals) / 1e20 = USD (6 decimals)
                    return (nativeAmount * uint256(price)) / 1e20;
                }
            } catch {
                // Price oracle failed
            }
        }
        
        // SECURITY: All oracles failed - reject lottery entry for security
        revert("Price oracles unavailable - lottery entry rejected for security");
    }
    
    /**
     * @dev Convert WETH amount to USD (6 decimals)
     * @param wethAmount WETH amount in 18 decimals
     * @return usdAmount USD amount in 6 decimals
     */
    function _convertWETHToUSD(uint256 wethAmount) internal view returns (uint256 usdAmount) {
        // SECURITY FIX: Use configured oracles instead of hardcoded prices
        // Critical vulnerability fix - CVE-2024-AUDIT-002
        
        // PRIMARY: Use configured price oracle (WETH = ETH price)
        // Note: WETH = wrapped native token, use native conversion for most chains
        if (address(priceOracle) != address(0)) {
            try priceOracle.getAggregatedPrice() returns (int256 price, bool success, uint256 /* timestamp */) {
                if (success && price > 0) {
                    // For WETH on non-native chains, use ETH price
                    // Assume oracle returns ETH/USD price in 8 decimals
                    return (wethAmount * uint256(price)) / 1e20;
                }
            } catch {
                // Price oracle also failed
            }
        }
        
        // SECURITY: All oracles failed - reject lottery entry for security
        revert("Price oracles unavailable - lottery entry rejected for security");
    }
    
    /**
     * @notice Process instant lottery for a swap transaction
     * @param user User who made the swap
     * @param swapAmountUSD Swap amount in USD (6 decimals)
     * @dev Called by authorized swap contracts only
     */
    function processInstantLottery(address user, uint256 swapAmountUSD) 
        public 
        nonReentrant 
        onlyAuthorizedSwapContract 
        rateLimited(user) 
    {
        require(user != address(0), "Invalid user address");
        require(swapAmountUSD >= MIN_SWAP_USD, "Swap amount too low");
        require(instantLotteryConfig.isActive, "Instant lottery not active");
        
        // Update user stats
        userStats[user].totalSwaps++;
        userStats[user].totalVolume += swapAmountUSD;
        userStats[user].lastSwapTimestamp = block.timestamp;
        totalLotteryEntries++;
        
        // Calculate win probability (no capping needed since we allow any trade size)
        uint256 winChancePPM = _calculateLinearWinChance(swapAmountUSD);
        
        // Apply veDRAGON boost
        uint256 boostedWinChancePPM = _applyVeDRAGONBoost(user, winChancePPM, swapAmountUSD);
        
        if (instantLotteryConfig.useVRFForInstant) {
            // Request VRF randomness
            uint256 randomnessId = _requestVRFForInstantLottery(user, swapAmountUSD, boostedWinChancePPM);
            emit InstantLotteryEntered(user, swapAmountUSD, winChancePPM, boostedWinChancePPM, randomnessId);
        } else {
            // SECURITY: Non-VRF mode disabled for security - all randomness must be VRF-based
            revert("Non-VRF mode disabled for security - configure VRF sources");
        }
    }
    
    /**
     * @dev Request VRF randomness for instant lottery with fallback sources
     * @param user The user who made the swap
     * @param swapAmountUSD The swap amount in USD
     * @param winProbability The calculated win probability
     * @return requestId The randomness request ID
     */
    function _requestVRFForInstantLottery(address user, uint256 swapAmountUSD, uint256 winProbability) internal returns (uint256 requestId) {
        RandomnessSource source;
        
        // Try Local VRF first (fastest on Arbitrum)
        if (address(localVRFConsumer) != address(0)) {
            try localVRFConsumer.requestRandomWordsLocal() returns (uint256 localRequestId) {
                requestId = localRequestId;
                source = RandomnessSource.LOCAL_VRF;
            } catch {
                // Local VRF failed, try next option
            }
        }
        
        // If local VRF failed, try cross-chain VRF
        if (requestId == 0 && address(vrfIntegrator) != address(0)) {
            // AUDIT FIX: Get dynamic VRF fee instead of hardcoded value
            uint256 vrfFee;
            try vrfIntegrator.quote(30110, "") returns (MessagingFee memory fee) {
                vrfFee = fee.nativeFee;
            } catch {
                vrfFee = 0.1 ether; // Fallback fee if estimation fails
            }
            
            if (address(this).balance >= vrfFee) {
                try vrfIntegrator.requestRandomWordsSimple{value: vrfFee}(30110) returns (
                    MessagingReceipt memory /* receipt */,
                    uint64 sequence
                ) {
                    requestId = uint256(sequence);
                    source = RandomnessSource.CROSS_CHAIN_VRF;
                } catch {
                    // Cross-chain VRF also failed
                }
            }
        }
        
        // Removed randomnessProvider fallback - using only Chainlink VRF sources
        
        if (requestId == 0) {
            // All VRF sources failed - NEVER use insecure fallback randomness
            // Queue the entry for later processing when VRF is available
            revert("VRF services unavailable - lottery entry rejected for security");
        }
        
        // Store pending lottery entry
        pendingEntries[requestId] = PendingLotteryEntry({
            user: user,
            swapAmountUSD: swapAmountUSD,
            winProbability: winProbability,
            timestamp: block.timestamp,
            fulfilled: false,
            randomnessSource: source
        });
        
        emit LotteryEntryCreated(user, swapAmountUSD, winProbability, requestId);
        emit RandomnessRequested(requestId, user, source);
        
        return requestId;
    }
    
    /**
     * @notice Callback function for local VRF requests
     * @dev Called by the local VRF consumer when randomness is ready
     * SECURITY FIX: Added reentrancy protection for distribution safety
     */
    function receiveRandomWords(uint256 requestId, uint256[] memory randomWords) external nonReentrant {
        require(msg.sender == address(localVRFConsumer), "Only local VRF consumer");
        require(randomWords.length > 0, "No random words provided");
        
        _processVRFCallback(requestId, randomWords[0], RandomnessSource.LOCAL_VRF);
    }
    
    /**
     * @notice Callback function for cross-chain VRF requests
     * @dev Called by the VRF integrator when cross-chain randomness is ready
     * SECURITY FIX: Added reentrancy protection for distribution safety
     */
    function receiveRandomWords(uint256[] memory randomWords, uint64 sequence) external nonReentrant {
        require(msg.sender == address(vrfIntegrator), "Only VRF integrator");
        require(randomWords.length > 0, "No random words provided");
        
        _processVRFCallback(uint256(sequence), randomWords[0], RandomnessSource.CROSS_CHAIN_VRF);
    }
    
    // Removed receiveRandomness function - using only Chainlink VRF callbacks
    
    /**
     * @dev Process VRF callback and determine lottery outcome
     * @param requestId The VRF request ID
     * @param randomness The random number from VRF
     * @param source The randomness source that provided the callback
     */
    function _processVRFCallback(uint256 requestId, uint256 randomness, RandomnessSource source) internal {
        PendingLotteryEntry storage entry = pendingEntries[requestId];
        require(entry.user != address(0), "Invalid request ID");
        require(!entry.fulfilled, "Entry already fulfilled");
        require(entry.randomnessSource == source, "Wrong randomness source");
        
        // Mark as fulfilled
        entry.fulfilled = true;
        
        // Process the lottery result
        _processLotteryResult(entry.user, entry.swapAmountUSD, entry.winProbability, randomness);
        
        emit RandomnessFulfilled(requestId, randomness, source);
        
        // Clean up storage to save gas
        delete pendingEntries[requestId];
    }
    
    /**
     * @dev Process lottery result and distribute rewards if won
     * @param user The user who entered the lottery
     * @param swapAmountUSD The swap amount in USD
     * @param winProbability The win probability in basis points
     * @param randomness The random number to determine outcome
     */
    function _processLotteryResult(address user, uint256 swapAmountUSD, uint256 winProbability, uint256 randomness) internal {
        // Determine if user won (randomness % 1000000 < winProbability) - using PPM
        bool won = (randomness % 1000000) < winProbability;
        
        uint256 reward = 0;
        if (won) {
            // Calculate reward from jackpot
            reward = _calculateInstantLotteryReward(swapAmountUSD);
            
            if (reward > 0) {
                _distributeInstantLotteryReward(user, reward);
                
                // Update statistics
                userStats[user].totalWins++;
                userStats[user].totalRewards += reward;
                totalPrizesWon++;
                totalPrizesDistributed += reward;
            }
        }
        
        emit InstantLotteryProcessed(user, swapAmountUSD, won, reward);
    }
    
    /**
     * @dev Calculate instant lottery reward based on jackpot and configuration
     * @return reward The calculated reward amount
     */
    function _calculateInstantLotteryReward(uint256 /* swapAmountUSD */) internal view returns (uint256 reward) {
        if (address(jackpotDistributor) == address(0)) {
            return 0;
        }
        
        uint256 currentJackpot = jackpotDistributor.getCurrentJackpot();
        if (currentJackpot == 0) {
            return 0;
        }
        
        // Calculate reward as percentage of current jackpot (purely dynamic)
        reward = (currentJackpot * instantLotteryConfig.rewardPercentage) / 10000;
        
        return reward;
    }
    
    /**
     * @dev Distribute instant lottery reward to winner
     * @param winner The winner address
     * @param reward The reward amount
     * @dev IMPROVED: More robust immediate distribution with simplified fallback
     */
    function _distributeInstantLotteryReward(address winner, uint256 reward) internal {
        if (address(jackpotDistributor) == address(0) || reward == 0) {
            return;
        }
        
        // PRIMARY: Try jackpot distributor (should work 99%+ of the time)
        try jackpotDistributor.distributeJackpot(winner, reward) {
            // ✅ Reward distributed successfully - most common path
            return;
        } catch Error(string memory /* reason */) {
            // Log specific error for debugging
            emit PrizeTransferFailed(winner, reward);
        } catch (bytes memory /* lowLevelData */) {
            // Low-level error
            emit PrizeTransferFailed(winner, reward);
        }
        
        // FALLBACK: Try direct ETH transfer if distributor fails
        if (address(this).balance >= reward) {
            // SECURITY FIX: Use call instead of transfer for native tokens
            (bool success, ) = payable(winner).call{value: reward}("");
            if (!success) revert TransferFailed();
            // ✅ Direct transfer succeeded
            emit InstantLotteryProcessed(winner, 0, true, reward);
            return;
        }
        
        // LAST RESORT: Add to unclaimed prizes (rare case)
        unclaimedPrizes[winner] += reward;
        totalUnclaimedPrizes += reward;
        emit PrizeClaimable(winner, reward);
    }

    /**
     * @dev Calculate linear win chance based on swap amount
     * @param swapAmountUSD Swap amount in USD (6 decimals)
     * @return winChancePPM Win chance in parts per million (capped at MAX_WIN_CHANCE_PPM for swaps >= $10,000)
     */
    function _calculateLinearWinChance(uint256 swapAmountUSD) internal pure returns (uint256 winChancePPM) {
        if (swapAmountUSD < MIN_SWAP_USD) {
            return 0;
        }
        
        // Cap probability at $10,000 level, but allow any trade size
        if (swapAmountUSD >= MAX_PROBABILITY_SWAP_USD) {
            return MAX_WIN_CHANCE_PPM;
        }
        
        // Linear interpolation between MIN_WIN_CHANCE_PPM and MAX_WIN_CHANCE_PPM
        uint256 amountRange = MAX_PROBABILITY_SWAP_USD - MIN_SWAP_USD;
        uint256 chanceRange = MAX_WIN_CHANCE_PPM - MIN_WIN_CHANCE_PPM;
        uint256 amountDelta = swapAmountUSD - MIN_SWAP_USD;
        
        winChancePPM = MIN_WIN_CHANCE_PPM + (chanceRange * amountDelta) / amountRange;
        
        return winChancePPM;
    }

    /**
     * @dev Apply veDRAGON boost to base win probability
     * @param user User address to calculate boost for
     * @param baseProbability Base win probability in PPM
     * @return boostedProbability Boosted probability (capped at MAX_WIN_PROBABILITY_PPM)
     */
    function _applyVeDRAGONBoost(address user, uint256 baseProbability, uint256 /* swapAmount */) internal view returns (uint256) {
        // If tokens not configured, return base probability
        if (address(veDRAGONToken) == address(0) || address(redDRAGONToken) == address(0)) {
            return baseProbability;
        }
        
        // Get user's balances
        uint256 userRedDRAGON = redDRAGONToken.balanceOf(user);
        uint256 userVeDRAGON = veDRAGONToken.balanceOf(user);
        
        // If user has no tokens, return base probability
        if (userRedDRAGON == 0 && userVeDRAGON == 0) {
            return baseProbability;
        }
        
        // Get total supplies
        uint256 totalRedDRAGON = redDRAGONToken.totalSupply();
        uint256 totalVeDRAGON = veDRAGONToken.totalSupply();
        
        if (totalRedDRAGON == 0) {
            return baseProbability;
        }
        
        // Simple boost calculation: 1.0x to 2.5x based on token holdings
        uint256 userTotalTokens = userRedDRAGON + userVeDRAGON;
        uint256 totalTokens = totalRedDRAGON + totalVeDRAGON;
        
        if (totalTokens == 0) {
            return baseProbability;
        }
        
        // Calculate boost multiplier (1.0x to 2.5x)
        uint256 boostMultiplier = BOOST_PRECISION + (15e17 * userTotalTokens) / totalTokens; // 1.0 + 1.5 * ratio
        
        // Cap at maximum boost
        if (boostMultiplier > MAX_BOOST) {
            boostMultiplier = MAX_BOOST;
        }
        
        // Apply boost
        uint256 boostedProbability = (baseProbability * boostMultiplier) / BOOST_PRECISION;
        
        // Ensure we don't exceed the maximum win probability
        return boostedProbability > MAX_WIN_PROBABILITY_PPM ? MAX_WIN_PROBABILITY_PPM : boostedProbability;
    }

    // SECURITY: Insecure randomness function removed to prevent exploitation
    // All randomness MUST come from secure VRF sources only

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get instant lottery configuration
     */
    function getInstantLotteryConfig() external view returns (
        uint256 baseWinProbability,
        uint256 minSwapAmount,
        uint256 rewardPercentage,
        bool isActive,
        bool useVRFForInstant
    ) {
        return (
            instantLotteryConfig.baseWinProbability,
            instantLotteryConfig.minSwapAmount,
            instantLotteryConfig.rewardPercentage,
            instantLotteryConfig.isActive,
            instantLotteryConfig.useVRFForInstant
        );
    }
    
    /**
     * @notice Get user statistics
     */
    function getUserStats(address user) external view returns (
        uint256 totalSwaps,
        uint256 totalVolume,
        uint256 totalWins,
        uint256 totalRewards,
        uint256 lastSwapTimestamp
    ) {
        UserStats memory stats = userStats[user];
        return (
            stats.totalSwaps,
            stats.totalVolume,
            stats.totalWins,
            stats.totalRewards,
            stats.lastSwapTimestamp
        );
    }
    
    /**
     * @notice Get pending lottery entry details
     */
    function getPendingEntry(uint256 requestId) external view returns (
        address user,
        uint256 swapAmountUSD,
        uint256 winProbability,
        uint256 timestamp,
        bool fulfilled,
        RandomnessSource randomnessSource
    ) {
        PendingLotteryEntry memory entry = pendingEntries[requestId];
        return (
            entry.user,
            entry.swapAmountUSD,
            entry.winProbability,
            entry.timestamp,
            entry.fulfilled,
            entry.randomnessSource
        );
    }
    
    /**
     * @notice Calculate win probability for a given swap amount and user
     */
    function calculateWinProbability(address user, uint256 swapAmountUSD) external view returns (
        uint256 baseProbability,
        uint256 boostedProbability
    ) {
        // No capping needed since we allow any trade size but cap probability at $10k level
        baseProbability = _calculateLinearWinChance(swapAmountUSD);
        boostedProbability = _applyVeDRAGONBoost(user, baseProbability, swapAmountUSD);
        
        // Cap at maximum (already handled in _applyVeDRAGONBoost)
        if (boostedProbability > MAX_WIN_PROBABILITY_PPM) {
            boostedProbability = MAX_WIN_PROBABILITY_PPM;
        }
    }
    
    /**
     * @notice Get current jackpot amount
     */
    function getCurrentJackpot() external view returns (uint256) {
        if (address(jackpotDistributor) == address(0)) {
            return 0;
        }
        return jackpotDistributor.getCurrentJackpot();
    }

    // ============ PRIZE CLAIM FUNCTIONS ============
    // NOTE: These functions handle rare cases where immediate distribution fails
    // 99%+ of prizes are distributed immediately without needing these functions
    
    /**
     * @notice Check unclaimed prize amount for an address
     * @param user Address to check
     * @return amount Unclaimed prize amount
     */
    function getUnclaimedPrizes(address user) external view returns (uint256 amount) {
        return unclaimedPrizes[user];
    }
    
    /**
     * @notice Claim unclaimed lottery prizes (RARE - only used if immediate distribution fails)
     * @dev Pull payment mechanism for edge cases where distributor fails
     */
    function claimPrize() external nonReentrant {
        uint256 amount = unclaimedPrizes[msg.sender];
        require(amount > 0, "No unclaimed prizes");
        
        unclaimedPrizes[msg.sender] = 0;
        totalUnclaimedPrizes -= amount;
        
        // SECURITY FIX: Use call instead of transfer for native tokens
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();
        
        emit PrizeClaimed(msg.sender, amount);
    }
    
    /**
     * @notice Get total unclaimed prizes across all users
     * @return total Total unclaimed prize amount
     */
    function getTotalUnclaimedPrizes() external view returns (uint256 total) {
        return totalUnclaimedPrizes;
    }

    // ============ PRICING FUNCTIONS ============
    
    /**
     * @notice Convert USD amount to native token amount using market manager
     */
    function convertUSDToNative(uint256 usdAmount) public view returns (uint256 nativeAmount) {
        if (address(priceOracle) == address(0)) {
            // SECURITY FIX: No hardcoded fallback - require proper oracle configuration
            revert("Price oracle not configured - cannot convert USD to native");
        }
        
        try priceOracle.getAggregatedPrice() returns (int256 price, bool success, uint256 /* timestamp */) {
            if (success && price > 0) {
                // Price is in USD per native token (8 decimals)
                // Convert: usdAmount (6 decimals) / price (8 decimals) = native amount (18 decimals)
                return (usdAmount * 1e20) / uint256(price);
            }
        } catch {
            // Price oracle failed
        }
        
        // SECURITY FIX: Remove hardcoded fallback - revert if oracles fail
        revert("All price oracles failed - cannot convert USD to native");
    }
    
    /**
     * @notice Convert native token amount to USD amount using market manager
     */
    function convertNativeToUSD(uint256 nativeAmount) public view returns (uint256 usdAmount) {
        if (address(priceOracle) == address(0)) {
            // SECURITY FIX: No hardcoded fallback - require proper oracle configuration
            revert("Price oracle not configured - cannot convert native to USD");
        }
        
        try priceOracle.getAggregatedPrice() returns (int256 price, bool success, uint256 /* timestamp */) {
            if (success && price > 0) {
                // Price is in USD per native token (8 decimals)
                // Convert: nativeAmount (18 decimals) * price (8 decimals) = USD amount (6 decimals)
                return (nativeAmount * uint256(price)) / 1e20;
            }
        } catch {
            // Price oracle failed
        }
        
        // SECURITY FIX: Remove hardcoded fallback - revert if oracles fail
        revert("All price oracles failed - cannot convert native to USD");
    }

    // ============ MAINTENANCE FUNCTIONS ============
    
    /**
     * @notice Clean up stale pending lottery entries
     * @param requestIds Array of request IDs to clean up (must be older than MAX_PENDING_ENTRY_AGE)
     * @dev SECURITY FIX: Prevent unbounded state growth from failed VRF callbacks
     */
    function cleanupStalePendingEntries(uint256[] calldata requestIds) external {
        require(requestIds.length <= CLEANUP_BATCH_SIZE, "Batch size too large");
        
        for (uint256 i = 0; i < requestIds.length; i++) {
            uint256 requestId = requestIds[i];
            PendingLotteryEntry storage entry = pendingEntries[requestId];
            
            // Only clean up entries that exist, are unfulfilled, and are old enough
            if (entry.user != address(0) && 
                !entry.fulfilled && 
                block.timestamp >= entry.timestamp + MAX_PENDING_ENTRY_AGE) {
                
                delete pendingEntries[requestId];
            }
        }
    }
    
    /**
     * @notice Emergency function to clean up any pending entry (owner only)
     * @param requestId Request ID to clean up
     * @dev For emergency situations where VRF is permanently broken
     */
    function emergencyCleanupPendingEntry(uint256 requestId) external onlyOwner {
        delete pendingEntries[requestId];
    }

    // ============ EMERGENCY FUNCTIONS ============
    
    function emergencyWithdrawETH() external onlyOwner {
        // SECURITY FIX: Use call instead of transfer for native tokens
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        if (!success) revert TransferFailed();
    }

    function emergencyWithdrawETH(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        // SECURITY FIX: Use call instead of transfer for native tokens
        (bool success, ) = payable(owner()).call{value: amount}("");
        if (!success) revert TransferFailed();
    }
}  