// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DragonMath
 * @dev Advanced mathematical operations library for the Dragon ecosystem
 * @notice Provides safe arithmetic operations and specialized calculations
 */
library DragonMath {
    
    // Base burn fee (69 basis points = 0.69%)
    uint256 public constant BASE_BURN_BPS = 69;
    
    /**
     * @dev Fee allocation structure
     */
    struct FeeAllocation {
        uint256 jackpotFeeBps;
        uint256 lpFeeBps;
        uint256 burnFeeBps;
    }
    
    /**
     * @dev Returns the average of two numbers. The result is rounded down.
     */
    function average(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a + b) / 2;
    }

    /**
     * @dev Returns the ceiling of the division of two numbers.
     */
    function ceilDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "Division by zero");
        return a == 0 ? 0 : (a - 1) / b + 1;
    }

    /**
     * @dev Multiplies two numbers and returns the result, throwing on overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) return 0;
        uint256 c = a * b;
        require(c / a == b, "Multiplication overflow");
        return c;
    }

    /**
     * @dev Integer division of two numbers, truncating the quotient.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "Division by zero");
        return a / b;
    }

    /**
     * @dev Subtracts two numbers, throwing on overflow (i.e. if subtrahend is greater than minuend).
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a, "Subtraction overflow");
        return a - b;
    }

    /**
     * @dev Adds two numbers, throwing on overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "Addition overflow");
        return c;
    }

    /**
     * @dev Calculate percentage of a value
     * @param value The base value
     * @param pct The percentage (in basis points, 10000 = 100%)
     * @return result The calculated percentage
     */
    function percentage(uint256 value, uint256 pct) internal pure returns (uint256) {
        return mul(value, pct) / 10000;
    }

    /**
     * @dev Calculate compound interest
     * @param principal The initial amount
     * @param rate The interest rate (in basis points per period)
     * @param periods The number of periods
     * @return result The final amount after compound interest
     */
    function compound(uint256 principal, uint256 rate, uint256 periods) internal pure returns (uint256) {
        uint256 result = principal;
        for (uint256 i = 0; i < periods; i++) {
            result = result + percentage(result, rate);
        }
        return result;
    }

    /**
     * @dev Calculate the square root of a number using the Babylonian method
     * @param x The number to find the square root of
     * @return y The square root
     */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = add(x, 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    /**
     * @dev Calculate the minimum of two numbers
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    /**
     * @dev Calculate the maximum of two numbers
     */
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }

    /**
     * @dev Calculate weighted average of multiple values
     * @param values Array of values
     * @param weights Array of weights (must be same length as values)
     * @return result The weighted average
     */
    function weightedAverage(uint256[] memory values, uint256[] memory weights) 
        internal 
        pure 
        returns (uint256 result) 
    {
        require(values.length == weights.length, "Arrays must have same length");
        require(values.length > 0, "Arrays cannot be empty");
        
        uint256 totalWeightedValue = 0;
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < values.length; i++) {
            totalWeightedValue = add(totalWeightedValue, mul(values[i], weights[i]));
            totalWeight = add(totalWeight, weights[i]);
        }
        
        require(totalWeight > 0, "Total weight cannot be zero");
        return div(totalWeightedValue, totalWeight);
    }

    /**
     * @dev Calculate exponential moving average
     * @param currentValue The current value
     * @param previousEMA The previous EMA value
     * @param alpha The smoothing factor (in basis points, 10000 = 100%)
     * @return newEMA The new EMA value
     */
    function exponentialMovingAverage(
        uint256 currentValue, 
        uint256 previousEMA, 
        uint256 alpha
    ) internal pure returns (uint256 newEMA) {
        require(alpha <= 10000, "Alpha cannot exceed 10000");
        
        uint256 alphaComponent = percentage(currentValue, alpha);
        uint256 oneMinusAlpha = sub(10000, alpha);
        uint256 previousComponent = percentage(previousEMA, oneMinusAlpha);
        
        return add(alphaComponent, previousComponent);
    }

    /**
     * @dev Calculate standard deviation of an array of values
     * @param values Array of values
     * @return stdDev The standard deviation
     */
    function standardDeviation(uint256[] memory values) internal pure returns (uint256 stdDev) {
        require(values.length > 0, "Array cannot be empty");
        
        // Calculate mean
        uint256 sum = 0;
        for (uint256 i = 0; i < values.length; i++) {
            sum = add(sum, values[i]);
        }
        uint256 mean = div(sum, values.length);
        
        // Calculate variance
        uint256 varianceSum = 0;
        for (uint256 i = 0; i < values.length; i++) {
            uint256 diff = values[i] > mean ? 
                sub(values[i], mean) : 
                sub(mean, values[i]);
            varianceSum = add(varianceSum, mul(diff, diff));
        }
        uint256 variance = div(varianceSum, values.length);
        
        // Return square root of variance
        return sqrt(variance);
    }

    /**
     * @dev Calculate geometric mean of an array of values
     * @param values Array of values
     * @return geomMean The geometric mean
     */
    function geometricMean(uint256[] memory values) internal pure returns (uint256 geomMean) {
        require(values.length > 0, "Array cannot be empty");
        
        // For simplicity, we'll use arithmetic mean for now
        // A true geometric mean would require more complex exponentiation
        uint256 sum = 0;
        for (uint256 i = 0; i < values.length; i++) {
            require(values[i] > 0, "All values must be positive for geometric mean");
            sum = add(sum, values[i]);
        }
        return div(sum, values.length);
    }

    /**
     * @dev Linear interpolation between two values
     * @param x0 Start value
     * @param x1 End value
     * @param t Interpolation factor (0-10000, where 10000 = 100%)
     * @return result The interpolated value
     */
    function lerp(uint256 x0, uint256 x1, uint256 t) internal pure returns (uint256 result) {
        require(t <= 10000, "t cannot exceed 10000");
        
        if (x1 >= x0) {
            uint256 diff = sub(x1, x0);
            uint256 increment = percentage(diff, t);
            return add(x0, increment);
        } else {
            uint256 diff = sub(x0, x1);
            uint256 decrement = percentage(diff, t);
            return sub(x0, decrement);
        }
    }

    /**
     * @dev Calculate the absolute difference between two numbers
     */
    function absDiff(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? sub(a, b) : sub(b, a);
    }

    /**
     * @dev Check if a number is within a percentage range of another number
     * @param value The value to check
     * @param target The target value
     * @param tolerancePercent The tolerance percentage (in basis points)
     * @return isWithinRange True if value is within range
     */
    function isWithinPercentage(
        uint256 value, 
        uint256 target, 
        uint256 tolerancePercent
    ) internal pure returns (bool isWithinRange) {
        uint256 tolerance = percentage(target, tolerancePercent);
        uint256 lowerBound = target > tolerance ? sub(target, tolerance) : 0;
        uint256 upperBound = add(target, tolerance);
        
        return value >= lowerBound && value <= upperBound;
    }

    /**
     * @dev Calculate adaptive fees based on jackpot size and volume
     * @param jackpotSize Current jackpot size
     * @param dailyVolume Daily volume
     * @param totalFeeBps Total fee in basis points
     * @return allocation Fee allocation structure
     */
    function calculateAdaptiveFees(
        uint256 jackpotSize,
        uint256 dailyVolume,
        uint256 totalFeeBps
    ) internal pure returns (FeeAllocation memory allocation) {
        // Ensure we have enough fees to allocate
        require(totalFeeBps > BASE_BURN_BPS, "Total fee too low");
        
        // Available fees after burn
        uint256 availableFeeBps = sub(totalFeeBps, BASE_BURN_BPS);
        
        // Base allocation: 50% jackpot, 50% liquidity
        uint256 baseJackpotFee = div(availableFeeBps, 2);
        uint256 baseLpFee = sub(availableFeeBps, baseJackpotFee);
        
        // Adjust based on jackpot size vs daily volume ratio
        if (dailyVolume > 0) {
            uint256 ratio = div(mul(jackpotSize, 10000), dailyVolume); // Ratio scaled by 10000
            
            // If jackpot is large relative to volume, increase jackpot fees
            if (ratio > 5000) { // Jackpot > 50% of daily volume
                uint256 adjustment = min(percentage(baseLpFee, 2000), div(baseLpFee, 4)); // Max 20% or 1/4 of LP fee
                baseJackpotFee = add(baseJackpotFee, adjustment);
                baseLpFee = sub(baseLpFee, adjustment);
            }
            // If jackpot is small relative to volume, increase LP fees
            else if (ratio < 1000) { // Jackpot < 10% of daily volume
                uint256 adjustment = min(percentage(baseJackpotFee, 2000), div(baseJackpotFee, 4)); // Max 20% or 1/4 of jackpot fee
                baseLpFee = add(baseLpFee, adjustment);
                baseJackpotFee = sub(baseJackpotFee, adjustment);
            }
        }
        
        return FeeAllocation({
            jackpotFeeBps: baseJackpotFee,
            lpFeeBps: baseLpFee,
            burnFeeBps: BASE_BURN_BPS
        });
    }
} 