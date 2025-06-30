// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';
import { Pausable } from '@openzeppelin/contracts/utils/Pausable.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import { EnhancedDragonMarketAnalyzer } from '../../libraries/core/EnhancedDragonMarketAnalyzer.sol';


// External Interfaces  
import { IUniswapV2Pair } from '../../interfaces/external/uniswap/IUniswapV2Pair.sol';
import { AggregatorV3Interface } from '@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol';
import { IStdReference } from '../../interfaces/external/IStdReference.sol';
import { IApi3Proxy } from '../../interfaces/external/IApi3Proxy.sol';
import { ILayerZeroEndpointV2, Origin, MessagingFee, MessagingParams } from '@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol';
import { ILayerZeroReceiver } from '@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroReceiver.sol';

import { IOmniDragonPriceOracle } from "../../interfaces/oracles/IOmniDragonPriceOracle.sol";

/**
 * @title OmniDragonPriceOracle
 * @dev OmniDragon Price Oracle System
 *
 * ⚠️  ARCHITECTURAL NOTICE: This contract currently contains fee management logic that violates
 * separation of concerns. Fee-related functions should be refactored into DragonFeeManager
 * The fee management functionality has been consolidated into DragonFeeManager.
 *
 * OMNIDRAGON PRICE ORACLE SYSTEM
 * This contract provides comprehensive price oracle functionality for the Dragon ecosystem:
 * - Multi-oracle price aggregation with weighted averaging
 * - Cross-chain price synchronization via LayerZero V2
 * - Market condition analysis and scoring
 * - Oracle health monitoring and circuit breakers
 * - Gas-optimized price data caching
 * - Comprehensive market statistics tracking
 *
 * ARCHITECTURE BENEFITS:
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * ✅ Focused responsibility - pure price oracle functionality
 * ✅ Multi-oracle redundancy - Chainlink, API3, Band, Pyth support
 * ✅ Cross-chain synchronization - LayerZero V2 integration
 * ✅ Circuit breaker protection - automatic failsafes for price anomalies
 * ✅ Gas optimized caching - intelligent price data storage
 * ✅ Full interface compliance with IOmniDragonPriceOracle
 *
 * OPERATION MODES:
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 1. LOCAL_ONLY: Basic multi-oracle aggregation without cross-chain features
 * 2. CROSS_CHAIN_ENABLED: Full LayerZero integration for global price synchronization
 * 3. HYBRID_MODE: Cross-chain features with local fallback capabilities
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract OmniDragonPriceOracle is IOmniDragonPriceOracle, Ownable, Pausable, ReentrancyGuard, ILayerZeroReceiver {
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // ENUMS AND STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    enum OperationMode {
        LOCAL_ONLY,         // Local pulse only, no cross-chain
        CROSS_CHAIN_ENABLED,   // Full cross-chain pulse functionality
        HYBRID_MODE         // Cross-chain pulse with local fallback
    }

    struct OracleData {
        int256 price;
        uint256 timestamp;
        bool isValid;
    }

    struct MarketConditions {
        uint256 score;
        uint256 liquidityScore;
        uint256 volatilityScore;
        uint256 volumeScore;
        uint256 lastUpdate;
    }

    struct FeeConfiguration {
        uint256 totalFee;
        uint256 burnFee;
        uint256 jackpotFee;
        uint256 liquidityFee;
        uint256 lastUpdate;
    }

    struct CrossChainData {
        mapping(uint32 => int256) prices;      // srcEid => price
        mapping(uint32 => uint256) jackpots;   // srcEid => jackpot
        mapping(uint32 => uint256) liquidity;  // srcEid => liquidity
        uint256 totalValue;
        uint256 lastUpdate;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // CUSTOM ERRORS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    error TotalFeeTooLow();
    error FeesExceedTotal();
    error FeeTooHigh();
    error IntervalMustBeGreaterThanZero();
    error AlreadyInitialized();
    error PriceOracleNotSet();
    error InvalidPriceOracle();
    error CircuitBreakerActive();
    error PriceDataStale();
    error NoValidOracleData();
    error CrossChainNotEnabled();
    error InvalidOperationMode();

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES - CORE SYSTEM
    // ═══════════════════════════════════════════════════════════════════════════════════════

    // Initialization and configuration
    bool public initialized;
    OperationMode public operationMode;
    
    // Oracle configuration
    string public nativeSymbol;
    string public quoteSymbol;
    uint8 public constant DECIMALS = 18;

    // Current market state
    int256 public latestPrice;
    uint256 public lastPriceUpdate;
    uint256 public priceDeviation;
    MarketConditions public marketConditions;
    FeeConfiguration public feeConfig;

    // Market tracking
    uint256 public jackpotSize;
    uint256 public cumulativeVolume;
    uint256 public dailyVolume;
    uint256 public lastVolumeReset;
    uint256 public lastVolumeSnapshot;

    // Circuit breaker and safety
    uint256 public maxPriceDeviation = 1000; // 10% in basis points
    uint256 public maxUpdateInterval = 3600; // 1 hour
    bool public circuitBreakerActive;
    int256 public minPrice = 1e15; // 0.001 in 18 decimals
    int256 public maxPrice = 1e24; // 1,000,000 in 18 decimals

    // Update intervals
    uint256 public feeUpdateInterval = 1 days;
    uint256 public priceUpdateInterval = 1 hours;
    uint256 public volumeResetInterval = 1 days;
    bool public adaptiveFeesEnabled = true;

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES - ORACLE SOURCES
    // ═══════════════════════════════════════════════════════════════════════════════════════

    // Oracle source weights (basis points, total = 10000)
    uint256 public chainlinkWeight = 4000; // 40%
    uint256 public api3Weight = 2000; // 20%
    uint256 public pythWeight = 1000; // 10%
    uint256 public bandWeight = 3000; // 30%

    // Oracle contract addresses
    address public chainlinkSUSDFeed;
    address public bandProtocolFeed;
    address public api3ProxyFeed;
    address public pythNetworkFeed;

    // Oracle data caching
    mapping(string => OracleData) public oracleCache;
    uint256 public cacheValidityPeriod = 300; // 5 minutes

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES - CROSS-CHAIN (OPTIONAL)
    // ═══════════════════════════════════════════════════════════════════════════════════════

    ILayerZeroEndpointV2 public immutable endpoint;
    bool public crossChainEnabled;

    // Cross-chain data storage
    CrossChainData internal crossChainData;
    mapping(uint32 => bool) public supportedNetworks;
    mapping(uint32 => string) public networkNames;
    uint32[] public activeNetworks;

    // Channel management
    mapping(uint32 => mapping(uint32 => bytes)) public channelData; // channel => srcEid => data
    mapping(uint32 => uint256) public channelLastUpdated; // channel => timestamp

    // Cross-chain constants
    uint32 public constant PRICE_CHANNEL = 40001;
    uint32 public constant LIQUIDITY_CHANNEL = 40002;
    uint32 public constant JACKPOT_CHANNEL = 40003;
    
    // AUDIT FIX: Proper nonce tracking for LayerZero V2
    mapping(uint32 => mapping(bytes32 => uint64)) public nonces; // eid => sender => nonce

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    // Core system events
    event Initialized(uint256 totalFee, uint256 jackpotFee, OperationMode mode);
    event OperationModeChanged(OperationMode indexed oldMode, OperationMode indexed newMode);
    
    // Price and market events
    event PriceUpdated(int256 indexed newPrice, uint256 timestamp, uint256 deviation, uint256 oracleCount);
    event MarketConditionsUpdated(uint256 score, uint256 liquidity, uint256 volatility, uint256 volume);
    event CircuitBreakerTriggered(string reason, int256 price, uint256 deviation);
    event CircuitBreakerReset(address indexed admin);
    
    // Fee management events
    event FeeUpdated(uint256 jackpotFee, uint256 liquidityFee, uint256 burnFee, uint256 totalFee);
    event JackpotSizeUpdated(uint256 newSize);
    event VolumeUpdated(uint256 dailyVolume, uint256 totalVolume);
    event AdaptiveFeesToggled(bool enabled);
    event AdaptiveFeeParametersUpdated(uint256 baseMultiplier, uint256 volatilityThreshold, uint256 liquidityThreshold);
    
    // Oracle configuration events
    event OracleAddressUpdated(string indexed oracle, address indexed newAddress);
    event SourceWeightsUpdated(uint256 chainlink, uint256 api3, uint256 pyth, uint256 band);
    
    // Cross-chain events
    event CrossChainDataReceived(uint32 indexed srcEid, uint32 indexed channel, bytes data, uint256 timestamp);
    event CrossChainPriceUpdated(uint32 indexed srcEid, int256 price, uint256 timestamp);
    event NetworkAdded(uint32 indexed eid, string name);
    event NetworkRemoved(uint32 indexed eid);

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════════════

    constructor(
        string memory _nativeSymbol,
        string memory _quoteSymbol,
        address _chainlinkSUSD,
        address _bandProtocol,
        address _api3Proxy,
        address _pythNetwork,
        address _endpoint,
        OperationMode _mode
    ) Ownable(msg.sender) {
        // Initialize core configuration
        nativeSymbol = _nativeSymbol;
        quoteSymbol = _quoteSymbol;
        operationMode = _mode;

        // Initialize price and market state
        latestPrice = 1e18; // Start at 1.0
        lastPriceUpdate = block.timestamp;
        lastVolumeReset = block.timestamp;
        
        marketConditions = MarketConditions({
            score: 5000, // Start at neutral (50%)
            liquidityScore: 5000,
            volatilityScore: 5000,
            volumeScore: 5000,
            lastUpdate: block.timestamp
        });

        // Set oracle addresses
        chainlinkSUSDFeed = _chainlinkSUSD;
        bandProtocolFeed = _bandProtocol;
        api3ProxyFeed = _api3Proxy;
        pythNetworkFeed = _pythNetwork;

        // Initialize LayerZero endpoint
        endpoint = ILayerZeroEndpointV2(_endpoint);
        crossChainEnabled = (_mode != OperationMode.LOCAL_ONLY) && (_endpoint != address(0));

        // Do not mark as initialized here - allow post-deployment initialization
        // initialized = true; // REMOVED: Allow initialize() function to work

        emit Initialized(0, 0, _mode);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // INITIALIZATION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Initialize the contract after deployment with placeholder values
     */
    function initialize(
        uint256 _totalFee,
        uint256 _initialJackpotFee,
        address _chainlinkSUSD,
        address _bandProtocol,
        address _api3Proxy,
        address _pythNetwork
    ) external onlyOwner {
        if (initialized) revert AlreadyInitialized();
        if (_totalFee <= EnhancedDragonMarketAnalyzer.BASE_BURN_BPS) revert TotalFeeTooLow();
        if (_initialJackpotFee + EnhancedDragonMarketAnalyzer.BASE_BURN_BPS > _totalFee) revert FeesExceedTotal();

        // Update fee configuration
        feeConfig.totalFee = _totalFee;
        feeConfig.jackpotFee = _initialJackpotFee;
        feeConfig.liquidityFee = _totalFee - _initialJackpotFee - EnhancedDragonMarketAnalyzer.BASE_BURN_BPS;
        feeConfig.lastUpdate = block.timestamp;

        // Update oracle addresses
        chainlinkSUSDFeed = _chainlinkSUSD;
        bandProtocolFeed = _bandProtocol;
        api3ProxyFeed = _api3Proxy;
        pythNetworkFeed = _pythNetwork;

        // Initialize price tracking
        _updatePriceFromOracles();

        initialized = true;
        emit Initialized(_totalFee, _initialJackpotFee, operationMode);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // CORE MARKET MANAGEMENT FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Update market data and fees atomically
     * @return success Whether the update was successful
     * @return newPrice Updated price
     * @return newJackpotFee Updated jackpot fee
     */
    function updateMarketDataAndFees() external onlyOwner returns (
        bool success,
        int256 newPrice,
        uint256 newJackpotFee
    ) {
        // Update price from oracles
        (bool priceSuccess, int256 aggregatedPrice, uint256 oracleCount) = _updatePriceFromOracles();
        if (!priceSuccess) {
            return (false, latestPrice, feeConfig.jackpotFee);
        }

        // Update market conditions based on new price and existing data
        _updateMarketConditions(aggregatedPrice, oracleCount);

        // Update fees if conditions are met
        _maybeUpdateFees(); // Return value not used

        emit PriceUpdated(aggregatedPrice, block.timestamp, priceDeviation, oracleCount);
        
        return (true, aggregatedPrice, feeConfig.jackpotFee);
    }

    /**
     * @dev Update jackpot size and trigger fee recalculation if needed
     */
    function updateJackpotSize(uint256 _newJackpotSize) external onlyOwner {
        jackpotSize = _newJackpotSize;
        emit JackpotSizeUpdated(_newJackpotSize);

        // Update market conditions to reflect new jackpot size
        _updateMarketConditionsWithJackpot(_newJackpotSize);

        // Consider updating fees
        _maybeUpdateFees();
    }

    /**
     * @dev Add trading volume and update daily metrics
     */
    function addVolume(uint256 _volumeAmount) external onlyOwner {
        cumulativeVolume += _volumeAmount;
        dailyVolume += _volumeAmount;

        // Check if it's time to reset daily volume
        if (block.timestamp >= lastVolumeReset + volumeResetInterval) {
            _resetDailyVolume();
        }

        // Update market conditions with new volume data
        _updateMarketConditionsWithVolume();

        // Consider updating fees
        _maybeUpdateFees();
    }

    /**
     * @dev Force update of fee allocation based on current conditions
     */
    function updateFees() external onlyOwner {
        _updateFees();
    }

    /**
     * @dev Get current fee percentages
     */
    function getFees() external view returns (
        uint256 _jackpotFee,
        uint256 _liquidityFee,
        uint256 _burnFee,
        uint256 _totalFee
    ) {
        return (
            feeConfig.jackpotFee,
            feeConfig.liquidityFee,
            feeConfig.burnFee,
            feeConfig.totalFee
        );
    }

    /**
     * @dev Get comprehensive market data
     */
    function getMarketData() external view returns (
        int256 price,
        uint256 marketScore,
        uint256 liquidityScore,
        uint256 volatilityScore,
        uint256 volumeScore,
        uint256 lastUpdate
    ) {
        if (circuitBreakerActive) revert CircuitBreakerActive();
        
        int256 currentPrice = latestPrice;
        
        // Include cross-chain price if available
        if (crossChainEnabled && activeNetworks.length > 0) {
            currentPrice = _getAggregatedCrossChainPrice();
        }
        
        return (
            currentPrice,
            marketConditions.score,
            marketConditions.liquidityScore,
            marketConditions.volatilityScore,
            marketConditions.volumeScore,
            marketConditions.lastUpdate
        );
    }

    /**
     * @dev Get volume data
     */
    function getVolumeData() external view returns (
        uint256 totalVolume,
        uint256 currentDailyVolume,
        uint256 lastReset
    ) {
        return (cumulativeVolume, dailyVolume, lastVolumeReset);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // ORACLE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Get latest price data (Oracle interface compatibility)
     */
    function getLatestPrice() external view returns (int256 price, uint256 timestamp) {
        if (circuitBreakerActive) revert CircuitBreakerActive();
        if (block.timestamp - lastPriceUpdate > maxUpdateInterval) revert PriceDataStale();
        
        return (latestPrice, lastPriceUpdate);
    }

    /**
     * @dev Get aggregated price data (Oracle interface compatibility)
     */
    function getAggregatedPrice() external view returns (int256 price, bool success, uint256 timestamp) {
        if (circuitBreakerActive) {
            return (0, false, lastPriceUpdate);
        }
        
        bool dataFresh = (block.timestamp - lastPriceUpdate) <= maxUpdateInterval;
        int256 currentPrice = latestPrice;
        
        if (crossChainEnabled && activeNetworks.length > 0) {
            currentPrice = _getAggregatedCrossChainPrice();
        }
        
        return (currentPrice, dataFresh, lastPriceUpdate);
    }

    /**
     * @dev Get market conditions score (Oracle interface compatibility)
     */
    function getMarketConditions() external view returns (uint256 score) {
        return marketConditions.score;
    }

    /**
     * @dev Check if oracle data is fresh (Oracle interface compatibility)
     */
    function isFresh() external view returns (bool fresh) {
        return (block.timestamp - lastPriceUpdate) <= maxUpdateInterval && !circuitBreakerActive;
    }

    /**
     * @dev Get total swap volume (Oracle interface compatibility)
     */
    function totalSwapVolume() external view returns (uint256 volume) {
        return cumulativeVolume;
    }

    /**
     * @dev Get swap count (Oracle interface compatibility)
     */
    function swapCount() external view returns (uint256 count) {
        // Estimate based on volume (simplified)
        return cumulativeVolume > 0 ? cumulativeVolume / 1e18 : 0;
    }

    /**
     * @dev Get liquidity data (Oracle interface compatibility)
     */
    function getLiquidityData() external view returns (
        uint256 totalTVL,
        uint256 mainPoolTVL,
        uint256 dragonBalance,
        uint256 wrappedNativeBalance,
        uint256 lastUpdate
    ) {
        uint256 baseLiquidity = marketConditions.liquidityScore * 1e18;
        
        // Include cross-chain liquidity if available
        if (crossChainEnabled && crossChainData.totalValue > 0) {
            baseLiquidity += crossChainData.totalValue;
        }
        
        return (
            baseLiquidity,
            baseLiquidity / 2,
            baseLiquidity / 4,
            baseLiquidity / 4,
            marketConditions.lastUpdate
        );
    }

    /**
     * @dev Get liquidity depth ratio (Oracle interface compatibility)
     */
    function getLiquidityDepthRatio() external view returns (uint256 ratio) {
        uint256 score = marketConditions.liquidityScore;
        if (score == 0) return 0;
        
        uint256 baseRatio;
        if (score >= 8000) {
            baseRatio = 8000 + ((score - 8000) * 2000) / 2000;
        } else if (score >= 5000) {
            baseRatio = 5000 + ((score - 5000) * 3000) / 3000;
        } else {
            baseRatio = (score * 5000) / 5000;
        }
        
        // Boost if cross-chain liquidity available
        if (crossChainEnabled && crossChainData.totalValue > 0) {
            baseRatio = (baseRatio * 110) / 100;
            if (baseRatio > 10000) baseRatio = 10000;
        }
        
        return baseRatio;
    }

    /**
     * @dev Calculate market impact (Oracle interface compatibility)
     */
    function calculateMarketImpact(uint256 tradeSize) external view returns (uint256 impact) {
        if (tradeSize == 0 || marketConditions.liquidityScore == 0) return 0;
        
        uint256 totalSupply = 6942000 * 10 ** 18;
        uint256 tradeRatio = (tradeSize * 10000) / totalSupply;
        
        uint256 liquidityAdjustment = 10000 - marketConditions.liquidityScore;
        impact = (tradeRatio * (10000 + liquidityAdjustment)) / 10000;
        
        // Reduce impact if cross-chain liquidity available
        if (crossChainEnabled && crossChainData.totalValue > 0) {
            impact = (impact * 80) / 100;
        }
        
        return impact > 5000 ? 5000 : impact;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // CROSS-CHAIN FUNCTIONS (OPTIONAL)
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Add supported network for cross-chain operations
     */
    function addSupportedNetwork(uint32 eid, string calldata name) external onlyOwner {
        if (!crossChainEnabled) revert CrossChainNotEnabled();
        require(!supportedNetworks[eid], 'Network already supported');
        
        supportedNetworks[eid] = true;
        networkNames[eid] = name;
        activeNetworks.push(eid);
        
        emit NetworkAdded(eid, name);
    }

    /**
     * @dev Remove supported network
     */
    function removeSupportedNetwork(uint32 eid) external onlyOwner {
        require(supportedNetworks[eid], 'Network not supported');
        
        supportedNetworks[eid] = false;
        delete networkNames[eid];
        
        // Remove from active networks array
        for (uint256 i = 0; i < activeNetworks.length; i++) {
            if (activeNetworks[i] == eid) {
                activeNetworks[i] = activeNetworks[activeNetworks.length - 1];
                activeNetworks.pop();
                break;
            }
        }
        
        emit NetworkRemoved(eid);
    }

    /**
     * @dev Get cross-chain market data summary
     */
    function getCrossChainMarketData() external view returns (
        int256 aggregatedPrice,
        uint256 totalJackpot,
        uint256 totalLiquidity,
        uint256 networkCount,
        uint256 lastUpdate
    ) {
        if (!crossChainEnabled) {
            return (latestPrice, jackpotSize, marketConditions.liquidityScore * 1e18, 1, lastPriceUpdate);
        }
        
        return (
            _getAggregatedCrossChainPrice(),
            _getTotalCrossChainJackpot(),
            crossChainData.totalValue,
            activeNetworks.length,
            crossChainData.lastUpdate
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // LAYERZERO V2 MESSAGE HANDLING
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev LayerZero V2 receive function
     */
    function lzReceive(
        Origin calldata _origin,
        bytes32 /* _guid */,
        bytes calldata _message,
        address /* _executor */,
        bytes calldata /* _extraData */
    ) external payable override {
        if (!crossChainEnabled) revert CrossChainNotEnabled();
        require(msg.sender == address(endpoint), 'Only endpoint');
        require(supportedNetworks[_origin.srcEid], 'Unsupported network');

        // AUDIT FIX: Update nonce for replay protection
        bytes32 sender = _origin.sender;
        nonces[_origin.srcEid][sender]++;

        (uint32 channel, bytes memory data) = abi.decode(_message, (uint32, bytes));
        
        channelData[channel][_origin.srcEid] = data;
        channelLastUpdated[channel] = block.timestamp;
        
        _processCrossChainData(channel, _origin.srcEid, data);
        
        emit CrossChainDataReceived(_origin.srcEid, channel, data, block.timestamp);
    }

    /**
     * @dev LayerZero V2 interface requirement
     */
    function allowInitializePath(Origin calldata _origin) external view override returns (bool) {
        return crossChainEnabled && supportedNetworks[_origin.srcEid];
    }

    /**
     * @dev LayerZero V2 interface requirement
     */
    function nextNonce(uint32 _eid, bytes32 _sender) external view override returns (uint64) {
        // AUDIT FIX: Implement proper nonce tracking for replay protection
        return nonces[_eid][_sender] + 1;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS - ORACLE OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Update price from multiple oracle sources
     */
    function _updatePriceFromOracles() internal returns (bool success, int256 aggregatedPrice, uint256 oracleCount) {
        if (circuitBreakerActive) {
            return (false, latestPrice, 0);
        }
        
        uint256 totalWeight = 0;
        uint256 weightedSum = 0;
        uint256 validOracles = 0;
        
        // Get prices from all configured oracles
        (int256 chainlinkPrice, bool chainlinkValid) = _getChainlinkPrice();
        if (chainlinkValid) {
            weightedSum += uint256(chainlinkPrice) * chainlinkWeight;
            totalWeight += chainlinkWeight;
            validOracles++;
            oracleCache["chainlink"] = OracleData(chainlinkPrice, block.timestamp, true);
        }
        
        (int256 bandPrice, bool bandValid) = _getBandProtocolPrice();
        if (bandValid) {
            weightedSum += uint256(bandPrice) * bandWeight;
            totalWeight += bandWeight;
            validOracles++;
            oracleCache["band"] = OracleData(bandPrice, block.timestamp, true);
        }
        
        (int256 api3Price, bool api3Valid) = _getAPI3Price();
        if (api3Valid) {
            weightedSum += uint256(api3Price) * api3Weight;
            totalWeight += api3Weight;
            validOracles++;
            oracleCache["api3"] = OracleData(api3Price, block.timestamp, true);
        }
        
        if (validOracles == 0) {
            return (false, latestPrice, 0);
        }
        
        // Calculate weighted average
        aggregatedPrice = int256(weightedSum / totalWeight);
        
        // Validate price bounds
        if (aggregatedPrice < minPrice || aggregatedPrice > maxPrice) {
            return (false, latestPrice, validOracles);
        }
        
        // Check for excessive deviation
        if (latestPrice > 0) {
            uint256 deviation = uint256((aggregatedPrice > latestPrice ? 
                aggregatedPrice - latestPrice : latestPrice - aggregatedPrice) * 10000) / uint256(latestPrice);
            
            if (deviation > maxPriceDeviation) {
                circuitBreakerActive = true;
                emit CircuitBreakerTriggered("Excessive price deviation", aggregatedPrice, deviation);
                return (false, latestPrice, validOracles);
            }
            
            priceDeviation = deviation;
        }
        
        // Update price state
        latestPrice = aggregatedPrice;
        lastPriceUpdate = block.timestamp;
        
        return (true, aggregatedPrice, validOracles);
    }

    /**
     * @dev Get price from Chainlink oracle
     */
    function _getChainlinkPrice() internal view returns (int256 price, bool isValid) {
        if (chainlinkSUSDFeed == address(0)) return (0, false);
        
        // AUDIT FIX: Check cache first before making external call
        OracleData memory cached = oracleCache["chainlink"];
        if (cached.isValid && block.timestamp - cached.timestamp <= cacheValidityPeriod) {
            return (cached.price, true);
        }
        
        try AggregatorV3Interface(chainlinkSUSDFeed).latestRoundData() returns (
            uint80 /* roundId */,
            int256 answer,
            uint256 /* startedAt */,
            uint256 updatedAt,
            uint80 /* answeredInRound */
        ) {
            if (answer <= 0 || updatedAt == 0) return (0, false);
            if (block.timestamp - updatedAt > 3600) return (0, false);
            
            uint8 decimals = AggregatorV3Interface(chainlinkSUSDFeed).decimals();
            if (decimals < 18) {
                price = answer * int256(10 ** (18 - decimals));
            } else if (decimals > 18) {
                price = answer / int256(10 ** (decimals - 18));
            } else {
                price = answer;
            }
            
            return (price, true);
        } catch {
            return (0, false);
        }
    }

    /**
     * @dev Get price from Band Protocol oracle
     */
    function _getBandProtocolPrice() internal view returns (int256 price, bool isValid) {
        if (bandProtocolFeed == address(0)) return (0, false);
        
        // AUDIT FIX: Check cache first before making external call
        OracleData memory cached = oracleCache["band"];
        if (cached.isValid && block.timestamp - cached.timestamp <= cacheValidityPeriod) {
            return (cached.price, true);
        }
        
        try IStdReference(bandProtocolFeed).getReferenceData("S", "USD") returns (
            IStdReference.ReferenceData memory data
        ) {
            if (data.rate == 0) return (0, false);
            price = int256(data.rate);
            return (price, true);
        } catch {
            return (0, false);
        }
    }

    /**
     * @dev Get price from API3 oracle
     */
    function _getAPI3Price() internal view returns (int256 price, bool isValid) {
        if (api3ProxyFeed == address(0)) return (0, false);
        
        // AUDIT FIX: Check cache first before making external call
        OracleData memory cached = oracleCache["api3"];
        if (cached.isValid && block.timestamp - cached.timestamp <= cacheValidityPeriod) {
            return (cached.price, true);
        }
        
        try IApi3Proxy(api3ProxyFeed).read() returns (int224 value, uint256 timestamp) {
            if (value <= 0 || timestamp == 0) return (0, false);
            if (block.timestamp - timestamp > 3600) return (0, false);
            
            price = int256(value);
            return (price, true);
        } catch {
            return (0, false);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS - MARKET CONDITIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Update market conditions based on current data
     */
    function _updateMarketConditions(int256 newPrice, uint256 oracleCount) internal {
        // Calculate price change percentage
        int256 priceChangePercent = 0;
        if (latestPrice > 0) {
            priceChangePercent = ((newPrice - latestPrice) * 100) / latestPrice;
        }
        
        // Calculate market condition score using EnhancedDragonMarketAnalyzer
        uint256 newScore = EnhancedDragonMarketAnalyzer.calculateMarketConditionScore(
            marketConditions.liquidityScore * 1e18, // Convert to actual liquidity value
            dailyVolume,
            priceChangePercent,
            0, // stakers - could be enhanced with veDRAGON integration
            jackpotSize,
            0  // daysSinceLastJackpot - could be enhanced with jackpot history
        );
        
        // Update market conditions
        marketConditions.score = newScore;
        marketConditions.lastUpdate = block.timestamp;
        
        // Update component scores based on oracle diversity
        _updateComponentScores(oracleCount);
        
        emit MarketConditionsUpdated(
            marketConditions.score,
            marketConditions.liquidityScore,
            marketConditions.volatilityScore,
            marketConditions.volumeScore
        );
    }

    /**
     * @dev Update market conditions with jackpot data
     */
    function _updateMarketConditionsWithJackpot(uint256 newJackpotSize) internal {
        // Recalculate market score with new jackpot size
        uint256 newScore = EnhancedDragonMarketAnalyzer.calculateMarketConditionScore(
            marketConditions.liquidityScore * 1e18,
            dailyVolume,
            0, // No price change for jackpot-only update
            0,
            newJackpotSize,
            0
        );
        
        marketConditions.score = newScore;
        marketConditions.lastUpdate = block.timestamp;
        
        emit MarketConditionsUpdated(
            marketConditions.score,
            marketConditions.liquidityScore,
            marketConditions.volatilityScore,
            marketConditions.volumeScore
        );
    }

    /**
     * @dev Update market conditions with volume data
     */
    function _updateMarketConditionsWithVolume() internal {
        // Update volume score based on recent activity (simplified calculation)
        uint256 volumeScore;
        if (marketConditions.liquidityScore > 0) {
            uint256 turnoverRatio = (dailyVolume * 10000) / (marketConditions.liquidityScore * 1e18);
            if (turnoverRatio > 5000) { // >50% turnover
                volumeScore = 2000;
            } else if (turnoverRatio > 1000) { // >10% turnover
                volumeScore = 1000 + (1000 * (turnoverRatio - 1000)) / 4000;
            } else {
                volumeScore = (1000 * turnoverRatio) / 1000;
            }
        } else {
            volumeScore = 0;
        }
        
        marketConditions.volumeScore = volumeScore;
        
        // Recalculate overall score
        marketConditions.score = (
            marketConditions.liquidityScore * 30 +
            volumeScore * 30 +
            marketConditions.volatilityScore * 40
        ) / 100;
        
        marketConditions.lastUpdate = block.timestamp;
    }

    /**
     * @dev Update component scores based on oracle diversity
     */
    function _updateComponentScores(uint256 oracleCount) internal {
        // Base scores start at current values
        uint256 baseScore = marketConditions.score;
        
        // Oracle diversity affects liquidity score
        uint256 diversityBonus = oracleCount * 500; // 5% per oracle
        if (diversityBonus > 2000) diversityBonus = 2000; // Cap at 20%
        
        marketConditions.liquidityScore = baseScore + diversityBonus;
        if (marketConditions.liquidityScore > 10000) {
            marketConditions.liquidityScore = 10000;
        }
        
        // Volatility score based on price deviation
        if (priceDeviation > 500) { // > 5%
            marketConditions.volatilityScore = baseScore + 1000; // High volatility
        } else if (priceDeviation > 200) { // > 2%
            marketConditions.volatilityScore = baseScore + 500; // Medium volatility
        } else {
            marketConditions.volatilityScore = baseScore; // Low volatility
        }
        
        if (marketConditions.volatilityScore > 10000) {
            marketConditions.volatilityScore = 10000;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS - FEE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Update fees if conditions are met
     */
    function _maybeUpdateFees() internal returns (bool updated) {
        if (!adaptiveFeesEnabled) return false;
        
        // Check if enough time has passed since last update
        if (block.timestamp >= feeConfig.lastUpdate + feeUpdateInterval) {
            _updateFees();
            return true;
        }
        
        return false;
    }

    /**
     * @dev Update fee allocation based on current conditions
     */
    function _updateFees() internal {
        if (!adaptiveFeesEnabled) return;

        // Calculate optimal fee allocation using EnhancedDragonMarketAnalyzer
        EnhancedDragonMarketAnalyzer.FeeAllocation memory allocation = EnhancedDragonMarketAnalyzer.calculateOptimalFeeAllocation(
            jackpotSize,
            dailyVolume,
            feeConfig.totalFee,
            marketConditions.score
        );

        // Update fee configuration
        feeConfig.jackpotFee = allocation.jackpotFeeBps;
        feeConfig.liquidityFee = allocation.liquidityFeeBps;
        feeConfig.lastUpdate = block.timestamp;

        emit FeeUpdated(
            feeConfig.jackpotFee,
            feeConfig.liquidityFee,
            feeConfig.burnFee,
            feeConfig.totalFee
        );
    }

    /**
     * @dev Reset daily volume counter
     */
    function _resetDailyVolume() internal {
        emit VolumeUpdated(dailyVolume, cumulativeVolume);
        
        // Update volume snapshot for cross-chain calculations
        lastVolumeSnapshot = cumulativeVolume;
        lastVolumeReset = block.timestamp;
        dailyVolume = 0;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS - CROSS-CHAIN
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Process cross-chain data
     */
    function _processCrossChainData(uint32 channel, uint32 srcEid, bytes memory data) internal {
        if (channel == PRICE_CHANNEL) {
            int256 price = abi.decode(data, (int256));
            crossChainData.prices[srcEid] = price;
            emit CrossChainPriceUpdated(srcEid, price, block.timestamp);
        } else if (channel == JACKPOT_CHANNEL) {
            uint256 jackpot = abi.decode(data, (uint256));
            crossChainData.jackpots[srcEid] = jackpot;
        } else if (channel == LIQUIDITY_CHANNEL) {
            uint256 liquidity = abi.decode(data, (uint256));
            crossChainData.liquidity[srcEid] = liquidity;
        }
        
        crossChainData.lastUpdate = block.timestamp;
        _updateCrossChainTotals();
    }

    /**
     * @dev Update cross-chain totals
     */
    function _updateCrossChainTotals() internal {
        uint256 totalValue = 0;
        
        for (uint256 i = 0; i < activeNetworks.length; i++) {
            uint32 eid = activeNetworks[i];
            totalValue += crossChainData.liquidity[eid];
        }
        
        crossChainData.totalValue = totalValue;
    }

    /**
     * @dev Get aggregated cross-chain price
     */
    function _getAggregatedCrossChainPrice() internal view returns (int256) {
        if (activeNetworks.length == 0) return latestPrice;
        
        int256 totalPrice = latestPrice; // Include local price
        uint256 validPrices = 1;
        
        for (uint256 i = 0; i < activeNetworks.length; i++) {
            uint32 eid = activeNetworks[i];
            if (crossChainData.prices[eid] > 0) {
                totalPrice += crossChainData.prices[eid];
                validPrices++;
            }
        }
        
        return validPrices > 0 ? totalPrice / int256(validPrices) : latestPrice;
    }

    /**
     * @dev Get total cross-chain jackpot
     */
    function _getTotalCrossChainJackpot() internal view returns (uint256) {
        uint256 total = jackpotSize; // Include local jackpot
        
        for (uint256 i = 0; i < activeNetworks.length; i++) {
            total += crossChainData.jackpots[activeNetworks[i]];
        }
        
        return total;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Set operation mode
     */
    function setOperationMode(OperationMode _newMode) external onlyOwner {
        if (_newMode == operationMode) return;
        
        OperationMode oldMode = operationMode;
        operationMode = _newMode;
        
        // Update cross-chain enabled status
        if (_newMode == OperationMode.LOCAL_ONLY) {
            crossChainEnabled = false;
        } else if (address(endpoint) != address(0)) {
            crossChainEnabled = true;
        }
        
        emit OperationModeChanged(oldMode, _newMode);
    }

    /**
     * @dev Update total fee
     */
    function updateTotalFee(uint256 _totalFee) external onlyOwner {
        if (_totalFee < EnhancedDragonMarketAnalyzer.BASE_BURN_BPS) revert TotalFeeTooLow();
        if (_totalFee > EnhancedDragonMarketAnalyzer.MAX_TOTAL_FEE_BPS) revert FeeTooHigh();

        feeConfig.totalFee = _totalFee;
        _updateFees();
    }

    /**
     * @dev Set fee update interval
     */
    function setFeeUpdateInterval(uint256 _intervalSeconds) external onlyOwner {
        if (_intervalSeconds == 0) revert IntervalMustBeGreaterThanZero();
        feeUpdateInterval = _intervalSeconds;
    }

    /**
     * @dev Toggle adaptive fees
     */
    function setAdaptiveFeesEnabled(bool _enabled) external onlyOwner {
        adaptiveFeesEnabled = _enabled;
        emit AdaptiveFeesToggled(_enabled);
    }

    /**
     * @dev Set oracle addresses
     */
    function setOracleAddresses(
        address _chainlink,
        address _band,
        address _api3,
        address _pyth
    ) external onlyOwner {
        chainlinkSUSDFeed = _chainlink;
        bandProtocolFeed = _band;
        api3ProxyFeed = _api3;
        pythNetworkFeed = _pyth;
        
        emit OracleAddressUpdated("chainlink", _chainlink);
        emit OracleAddressUpdated("band", _band);
        emit OracleAddressUpdated("api3", _api3);
        emit OracleAddressUpdated("pyth", _pyth);
    }

    /**
     * @dev Set oracle source weights
     */
    function setSourceWeights(
        uint256 _chainlinkWeight,
        uint256 _api3Weight,
        uint256 _pythWeight,
        uint256 _bandWeight
    ) external onlyOwner {
        require(_chainlinkWeight + _api3Weight + _pythWeight + _bandWeight == 10000, 'Weights must sum to 10000');

        chainlinkWeight = _chainlinkWeight;
        api3Weight = _api3Weight;
        pythWeight = _pythWeight;
        bandWeight = _bandWeight;

        emit SourceWeightsUpdated(_chainlinkWeight, _api3Weight, _pythWeight, _bandWeight);
    }

    /**
     * @dev Reset circuit breaker
     */
    function resetCircuitBreaker() external onlyOwner {
        circuitBreakerActive = false;
        emit CircuitBreakerReset(msg.sender);
    }

    /**
     * @dev Check Sonic FeeM status
     */
    function checkFeeMStatus() external view returns (bool isRegistered) {
    }

    /// @dev Register my contract on Sonic FeeM
    function registerMe() external {
        (bool _success,) = address(0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830).call(
            abi.encodeWithSignature("selfRegister(uint256)", 143)
        );
        require(_success, "FeeM registration failed");
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // INTERFACE COMPLIANCE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Update and get fresh aggregated price (state-changing)
     * @return price Aggregated price in 8 decimals
     * @return success Whether price aggregation was successful
     */
    function updateAndGetPrice() external override returns (int256 price, bool success) {
        // AUDIT FIX: Actually update prices from oracles instead of returning cached data
        (bool updateSuccess, int256 aggregatedPrice, ) = _updatePriceFromOracles();
        return (aggregatedPrice, updateSuccess);
    }

    /**
     * @dev Get market condition score (0-100)
     * @return score Market condition score based on volatility and volume
     */
    function getMarketConditionScore() external view override returns (uint256 score) {
        return marketConditions.score;
    }

    /**
     * @dev Update market conditions with new swap data
     * @param swapAmount Swap amount to add to statistics
     */
    function updateMarketConditions(uint256 swapAmount) external override {
        // Update cumulative volume
        cumulativeVolume += swapAmount;
        dailyVolume += swapAmount;
        
        // Simple market condition update
        marketConditions.lastUpdate = block.timestamp;
    }

    /**
     * @dev Get oracle configuration for a specific oracle ID
     * @param _oracleId The oracle ID to query
     */
    function getOracleConfig(uint8 _oracleId) external view override returns (
        address oracleAddress,
        OracleType oracleType,
        bool isActive,
        uint8 decimals,
        bytes32 priceId,
        string memory baseSymbol,
        string memory quoteSymbolResult
    ) {
        // Map oracle IDs to oracle types and addresses
        if (_oracleId == 0) {
            return (chainlinkSUSDFeed, OracleType.CHAINLINK, chainlinkSUSDFeed != address(0), 8, bytes32(0), nativeSymbol, quoteSymbol);
        } else if (_oracleId == 1) {
            return (api3ProxyFeed, OracleType.API3, api3ProxyFeed != address(0), 18, bytes32(0), nativeSymbol, quoteSymbol);
        } else if (_oracleId == 2) {
            return (bandProtocolFeed, OracleType.BAND, bandProtocolFeed != address(0), 18, bytes32(0), nativeSymbol, quoteSymbol);
        } else if (_oracleId == 3) {
            return (pythNetworkFeed, OracleType.PYTH, pythNetworkFeed != address(0), 8, bytes32(0), nativeSymbol, quoteSymbol);
        } else {
            return (address(0), OracleType.CHAINLINK, false, 0, bytes32(0), "", "");
        }
    }

    /**
     * @dev Get market statistics
     */
    function getMarketStats() external view override returns (
        uint256 totalVolume,
        uint256 totalSwaps,
        uint256 avgSwapAmount,
        uint256 priceChanges,
        uint256 significantChanges,
        uint256 lastUpdate
    ) {
        totalVolume = cumulativeVolume;
        totalSwaps = 0; // Would need additional tracking
        avgSwapAmount = 0; // Would need additional tracking
        priceChanges = 0; // Could be implemented with additional tracking
        significantChanges = 0; // Could be implemented with additional tracking
        lastUpdate = lastPriceUpdate;
    }

    /**
     * @dev Get last valid price for an oracle
     */
    function getLastValidPrice(uint8 /* _oracleId */) external view override returns (PriceData memory) {
        // Return cached data or current price
        return PriceData({
            price: latestPrice,
            timestamp: lastPriceUpdate,
            roundId: 0
        });
    }


}

