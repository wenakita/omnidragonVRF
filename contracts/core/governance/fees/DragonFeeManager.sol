// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { DragonMath } from "../../../libraries/math/DragonMath.sol";
import "../../../libraries/core/SonicFeeMHelper.sol";

// External Interfaces
import { IUniswapV2Router02 } from "../../../interfaces/external/uniswap/v2/IUniswapV2Router02.sol";

/**
 * @title DragonFeeManager
 * @dev Lightweight fee manager that uses DragonMath for calculations
 *
 * Replaces the heavy DragonAdaptiveFeeManager by separating concerns:
 * - This contract: State management and admin functions
 * - DragonMath library: Pure mathematical calculations
 *
 * Fee structure:
 * - Burn Fee: Fixed at 0.69% (69 basis points) - non-configurable
 * - Jackpot Fee: Configurable, defaults to 6.9% (690 basis points)
 * - LP Fee: Automatically calculated as (totalFee - jackpotFee - burnFee)
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract DragonFeeManager is Ownable {
    // Custom Errors
    error TotalFeeTooLow();
    error FeesExceedTotal();
    error FeeTooHigh();
    error IntervalMustBeGreaterThanZero();
    error AlreadyInitialized();

    // Initialization flag
    bool public initialized;

    // Fee configuration
    uint256 public totalFee;            // Total fee percentage (scaled by 1e4, e.g. 1000 = 10%)
    uint256 public burnFee;             // Burn fee percentage (always BASE_BURN_BPS = 69)

    // Current fee allocation (cached from last calculation)
    uint256 public jackpotFee;          // Current jackpot fee (scaled by 1e4)
    uint256 public liquidityFee;        // Current LP fee (calculated as: totalFee - jackpotFee - burnFee)

    // Market state tracking
    uint256 public jackpotSize;         // Current jackpot size
    uint256 public cumulativeVolume;    // Cumulative trading volume
    uint256 public dailyVolume;         // Approximate daily volume
    uint256 public lastVolumeReset;     // Timestamp of last volume reset
    uint256 public volumeUpdateInterval; // Interval between volume resets (seconds)

    // Update control
    uint256 public feeUpdateInterval;   // Minimum time between fee updates (seconds)
    uint256 public lastFeeUpdate;       // Timestamp of last fee update
    bool public adaptiveFeesEnabled;    // Whether adaptive fees are enabled

    // Events
    event FeeUpdated(uint256 jackpotFee, uint256 liquidityFee, uint256 burnFee, uint256 totalFee);
    event JackpotSizeUpdated(uint256 newSize);
    event VolumeUpdated(uint256 newVolume);
    event AdaptiveFeesToggled(bool enabled);
    event Initialized(uint256 totalFee, uint256 jackpotFee);

    /**
     * @dev Constructor
     * @param _totalFee Initial total fee (scaled by 1e4, e.g. 1000 = 10%)
     * @param _initialJackpotFee Initial jackpot fee (scaled by 1e4)
     */
    constructor(
        uint256 _totalFee,
        uint256 _initialJackpotFee
    ) Ownable(msg.sender) {
        if (_totalFee <= DragonMath.BASE_BURN_BPS) revert TotalFeeTooLow();
        if (_initialJackpotFee + DragonMath.BASE_BURN_BPS > _totalFee) revert FeesExceedTotal();

        // Initialize fee structure with fixed burn fee
        totalFee = _totalFee;
        burnFee = DragonMath.BASE_BURN_BPS; // Always 69 (0.69%)
        jackpotFee = _initialJackpotFee;
        liquidityFee = _totalFee - _initialJackpotFee - DragonMath.BASE_BURN_BPS;

        // Initialize volume tracking
        lastVolumeReset = block.timestamp;
        volumeUpdateInterval = 1 days;
        feeUpdateInterval = 1 days;

        // Enable adaptive fees by default
        adaptiveFeesEnabled = true;

        // Mark as initialized if constructor is called with non-placeholder values
        initialized = !(_totalFee == 1000 && _initialJackpotFee == 690);

        // Register for Sonic FeeM automatically
        SonicFeeMHelper.registerForFeeM();
    }

    /**
     * @dev Initialize the contract after deployment with placeholder values
     * @param _totalFee Initial total fee (scaled by 1e4, e.g. 1000 = 10%)
     * @param _initialJackpotFee Initial jackpot fee (scaled by 1e4)
     */
    function initialize(
        uint256 _totalFee,
        uint256 _initialJackpotFee
    ) external onlyOwner {
        if (initialized) revert AlreadyInitialized();

        if (_totalFee <= DragonMath.BASE_BURN_BPS) revert TotalFeeTooLow();
        if (_initialJackpotFee + DragonMath.BASE_BURN_BPS > _totalFee) revert FeesExceedTotal();

        // Set fee structure with fixed burn fee
        totalFee = _totalFee;
        burnFee = DragonMath.BASE_BURN_BPS; // Always 69 (0.69%)
        jackpotFee = _initialJackpotFee;
        liquidityFee = _totalFee - _initialJackpotFee - DragonMath.BASE_BURN_BPS;

        // Initialize volume tracking
        lastVolumeReset = block.timestamp;
        volumeUpdateInterval = 1 days;
        feeUpdateInterval = 1 days;

        // Enable adaptive fees by default
        adaptiveFeesEnabled = true;

        // Mark as initialized
        initialized = true;

        emit Initialized(_totalFee, _initialJackpotFee);
    }

    /**
     * @notice Update jackpot size (called when jackpot changes)
     * @param _newJackpotSize Current jackpot size
     */
    function updateJackpotSize(uint256 _newJackpotSize) external onlyOwner {
        jackpotSize = _newJackpotSize;
        emit JackpotSizeUpdated(_newJackpotSize);

        // Consider updating fees if conditions are met
        _maybeUpdateFees();
    }

    /**
     * @notice Add transaction volume
     * @param _volumeAmount Amount to add to volume tracking
     */
    function addVolume(uint256 _volumeAmount) external onlyOwner {
        // Add to cumulative volume
        cumulativeVolume += _volumeAmount;

        // Add to daily volume approximation
        dailyVolume += _volumeAmount;

        // Check if it's time to reset the daily volume counter
        if (block.timestamp >= lastVolumeReset + volumeUpdateInterval) {
            // Update the daily volume metric
            lastVolumeReset = block.timestamp;
            emit VolumeUpdated(dailyVolume);

            // Reset daily volume counter
            dailyVolume = 0;

            // Consider updating fees if conditions are met
            _maybeUpdateFees();
        }
    }

    /**
     * @notice Force an update of fee allocation
     */
    function updateFees() external onlyOwner {
        _updateFees();
    }

    /**
     * @notice Get current fee percentages
     * @return _jackpotFee Current jackpot fee
     * @return _liquidityFee Current liquidity provider fee
     * @return _burnFee Current burn fee
     * @return _totalFee Total fee
     */
    function getFees() external view returns (
        uint256 _jackpotFee,
        uint256 _liquidityFee,
        uint256 _burnFee,
        uint256 _totalFee
    ) {
        return (jackpotFee, liquidityFee, burnFee, totalFee);
    }

    /**
     * @notice Calculate the optimal fee allocation based on current conditions
     * @param _jackpotSize Current jackpot size
     * @param _dailyVolume Approximate daily volume
     * @return _jackpotFee Calculated jackpot fee percentage (scaled by 1e4)
     * @return _liquidityFee Calculated liquidity fee percentage (scaled by 1e4)
     */
    function calculateAdaptiveFees(
        uint256 _jackpotSize,
        uint256 _dailyVolume
    ) public view returns (
        uint256 _jackpotFee,
        uint256 _liquidityFee
    ) {
        // If adaptive fees are disabled, return current fees
        if (!adaptiveFeesEnabled) {
            return (jackpotFee, liquidityFee);
        }

        // Use DragonMath library for calculations
        DragonMath.FeeAllocation memory allocation = DragonMath.calculateAdaptiveFees(
            _jackpotSize,
            _dailyVolume,
            totalFee
        );

        return (allocation.jackpotFeeBps, allocation.lpFeeBps);
    }

    /**
     * @notice Update fees if conditions are met
     */
    function _maybeUpdateFees() internal {
        // Check if enough time has passed since last update
        if (block.timestamp >= lastFeeUpdate + feeUpdateInterval) {
            _updateFees();
        }
    }

    /**
     * @notice Update fee allocation based on current conditions
     */
    function _updateFees() internal {
        // Skip if adaptive fees are disabled
        if (!adaptiveFeesEnabled) return;

        // Calculate new fees using DragonMath
        (uint256 newJackpotFee, uint256 newLiquidityFee) = calculateAdaptiveFees(
            jackpotSize,
            dailyVolume
        );

        // Update fees
        jackpotFee = newJackpotFee;
        liquidityFee = newLiquidityFee;
        lastFeeUpdate = block.timestamp;

        emit FeeUpdated(jackpotFee, liquidityFee, burnFee, totalFee);
    }

    /***************************************************************************
     *                              ADMIN FUNCTIONS                            *
     ***************************************************************************/

    /**
     * @notice Update total fee
     * @param _totalFee New total fee (scaled by 1e4)
     */
    function updateTotalFee(uint256 _totalFee) external onlyOwner {
        if (_totalFee < DragonMath.BASE_BURN_BPS) revert TotalFeeTooLow();
        if (_totalFee > 2000) revert FeeTooHigh();

        totalFee = _totalFee;

        // Recalculate other fees
        _updateFees();
    }

    /**
     * @notice Set fee update interval
     * @param _intervalSeconds New interval in seconds
     */
    function setFeeUpdateInterval(uint256 _intervalSeconds) external onlyOwner {
        if (_intervalSeconds == 0) revert IntervalMustBeGreaterThanZero();
        feeUpdateInterval = _intervalSeconds;
    }

    /**
     * @notice Set volume update interval
     * @param _intervalSeconds New interval in seconds
     */
    function setVolumeUpdateInterval(uint256 _intervalSeconds) external onlyOwner {
        if (_intervalSeconds == 0) revert IntervalMustBeGreaterThanZero();
        volumeUpdateInterval = _intervalSeconds;
    }

    /**
     * @notice Toggle adaptive fees
     * @param _enabled Whether to enable adaptive fees
     */
    function setAdaptiveFeesEnabled(bool _enabled) external onlyOwner {
        adaptiveFeesEnabled = _enabled;
        emit AdaptiveFeesToggled(_enabled);
    }

    /**
     * @notice Check if this contract is registered for Sonic FeeM
     * @return isRegistered Whether the contract is registered for fee monetization
     */
    function checkFeeMStatus() external view returns (bool isRegistered) {
        return SonicFeeMHelper.isRegisteredForFeeM();
    }
}
