// SPDX-License-Identifier: MIT

/**
 * Time management utilities for veDRAGON lockups,
 * jackpot scheduling, and special event bonuses
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonic_reddragon_bot
 */

pragma solidity ^0.8.20;

/**
 * @title DragonDateTimeLib
 * @dev Date and time utilities for Dragon ecosystem
 */
library DragonDateTimeLib {
    // Constants for time calculations
    uint256 public constant SECONDS_PER_MINUTE = 60;
    uint256 public constant SECONDS_PER_HOUR = 60 * 60;
    uint256 public constant SECONDS_PER_DAY = 86400;
    uint256 public constant SECONDS_PER_WEEK = 604800;
    uint256 public constant SECONDS_PER_YEAR = 31536000;

    // Special events time constants
    uint256 public constant TUESDAY = 2;  // 1-indexed weekday (Monday = 1)
    uint256 public constant FRIDAY = 5;   // 1-indexed weekday (Monday = 1)

    // Special event timestamps (example dates)
    uint256 public constant DRAGON_YEAR_START = 1704067200; // Jan 1, 2024
    uint256 public constant LUNAR_NEW_YEAR = 1707696000; // Feb 12, 2024
    uint256 public constant DRAGON_FESTIVAL = 1718150400; // June 12, 2024

    /**
     * @dev Convert timestamp to day
     * @param timestamp Unix timestamp
     * @return day Days since epoch (Jan 1, 1970)
     */
    function timestampToDay(uint256 timestamp) internal pure returns (uint256 day) {
        return timestamp / SECONDS_PER_DAY;
    }

    /**
     * @dev Determine the day of the week from a timestamp
     * @param timestamp Unix timestamp
     * @return weekday The day of the week (1-indexed: Monday = 1, Sunday = 7)
     */
    function getDayOfWeek(uint256 timestamp) internal pure returns (uint256 weekday) {
        // January 1, 1970 was a Thursday (4)
        uint256 daysSinceEpoch = timestampToDay(timestamp);
        // +3 adjustment ensures Monday is 1
        return ((daysSinceEpoch + 3) % 7) + 1;
    }

    /**
     * @dev Checks if a timestamp falls on a specific day of the week
     * @param timestamp Unix timestamp
     * @param targetWeekday Target weekday (1-7, where 1 = Monday)
     * @return result True if the timestamp is on the target weekday
     * @return startOfDay Timestamp at 00:00:00 UTC of the day
     */
    function isDayOfWeek(uint256 timestamp, uint256 targetWeekday) internal pure returns (bool result, uint256 startOfDay) {
        uint256 day = timestampToDay(timestamp);
        startOfDay = day * SECONDS_PER_DAY;
        result = getDayOfWeek(timestamp) == targetWeekday;
    }

    /**
     * @dev Checks if a timestamp falls on a Tuesday
     * @param timestamp Unix timestamp
     * @return result True if the timestamp is on a Tuesday
     * @return startOfDay Timestamp at 00:00:00 UTC of the day
     */
    function isTuesday(uint256 timestamp) internal pure returns (bool result, uint256 startOfDay) {
        return isDayOfWeek(timestamp, TUESDAY);
    }

    /**
     * @dev Checks if a timestamp falls on a Friday
     * @param timestamp Unix timestamp
     * @return result True if the timestamp is on a Friday
     * @return startOfDay Timestamp at 00:00:00 UTC of the day
     */
    function isFriday(uint256 timestamp) internal pure returns (bool result, uint256 startOfDay) {
        return isDayOfWeek(timestamp, FRIDAY);
    }

    /**
     * @dev Get month number from a timestamp
     * @param timestamp Unix timestamp
     * @return month Month number (1-12)
     */
    function getMonth(uint256 timestamp) internal pure returns (uint256 month) {
        uint256 epochDay = timestamp / SECONDS_PER_DAY;

        // Howard Hinnant's algorithm for computing month from days
        assembly {
            epochDay := add(epochDay, 719468)
            let doe := mod(epochDay, 146097)
            let yoe := div(sub(sub(add(doe, div(doe, 36524)), div(doe, 1460)), eq(doe, 146096)), 365)
            let doy := sub(doe, sub(add(mul(365, yoe), shr(2, yoe)), div(yoe, 100)))
            let mp := div(add(mul(5, doy), 2), 153)
            month := sub(add(mp, 3), mul(gt(mp, 9), 12))
        }
    }

    /**
     * @dev Get day of month from a timestamp
     * @param timestamp Unix timestamp
     * @return day Day of month (1-31)
     */
    function getDayOfMonth(uint256 timestamp) internal pure returns (uint256 day) {
        uint256 epochDay = timestamp / SECONDS_PER_DAY;

        // Compute the day of month using modified Zeller's algorithm
        assembly {
            epochDay := add(epochDay, 719468)
            let doe := mod(epochDay, 146097)
            let yoe := div(sub(sub(add(doe, div(doe, 36524)), div(doe, 1460)), eq(doe, 146096)), 365)
            let doy := sub(doe, sub(add(mul(365, yoe), shr(2, yoe)), div(yoe, 100)))
            let mp := div(add(mul(5, doy), 2), 153)
            day := add(sub(doy, div(sub(add(mul(153, mp), 2), 5), 153)), 1)
        }
    }

    /**
     * @dev Check if a timestamp is in the first week of the month
     * @param timestamp Unix timestamp
     * @return result True if the day is in the first 7 days of the month
     */
    function isFirstWeekOfMonth(uint256 timestamp) internal pure returns (bool result) {
        uint256 dayOfMonth = getDayOfMonth(timestamp);
        return dayOfMonth <= 7;
    }

    /**
     * @dev Check if a timestamp is the first occurrence of a specific weekday in the month
     * @param timestamp Unix timestamp
     * @param targetWeekday Target weekday (1-7, where 1 = Monday)
     * @return result True if the timestamp is the first occurrence of that weekday in the month
     */
    function isFirstWeekdayOfMonth(uint256 timestamp, uint256 targetWeekday) internal pure returns (bool result) {
        // Must be the target weekday
        (bool isTargetDay,) = isDayOfWeek(timestamp, targetWeekday);
        if (!isTargetDay) return false;

        // Get the day of month (1-31)
        uint256 dayOfMonth = getDayOfMonth(timestamp);

        // If it's days 1-7, we need to check if this is the first occurrence
        if (dayOfMonth <= 7) {
            // Check if there are any earlier days in the month with the same weekday
            // Start from day 1 and check each day until we reach our current day
            for (uint256 d = 1; d < dayOfMonth; d++) {
                uint256 earlierTimestamp = timestamp - ((dayOfMonth - d) * SECONDS_PER_DAY);
                if (getDayOfWeek(earlierTimestamp) == targetWeekday) {
                    // Found an earlier occurrence of this weekday
                    return false;
                }
            }
            // No earlier occurrences found
            return true;
        }

        // If we're beyond day 7, it can't be the first occurrence
        return false;
    }

    /**
     * @dev Check if a timestamp is the first Tuesday of the month
     * @param timestamp Unix timestamp
     * @return result True if the timestamp is the first Tuesday of the month
     */
    function isFirstTuesdayOfMonth(uint256 timestamp) internal pure returns (bool result) {
        return isFirstWeekdayOfMonth(timestamp, TUESDAY);
    }

    /**
     * @dev Check if a timestamp is the first Friday of the month
     * @param timestamp Unix timestamp
     * @return result True if the timestamp is the first Friday of the month
     */
    function isFirstFridayOfMonth(uint256 timestamp) internal pure returns (bool result) {
        return isFirstWeekdayOfMonth(timestamp, FRIDAY);
    }

    /**
     * @dev Calculate the timestamp of the next occurrence of a specific weekday
     * @param timestamp Starting timestamp
     * @param targetWeekday Target weekday (1-7, where 1 = Monday)
     * @return nextOccurrence Timestamp of the next occurrence of the target weekday
     */
    function getNextWeekday(uint256 timestamp, uint256 targetWeekday) internal pure returns (uint256 nextOccurrence) {
        uint256 currentWeekday = getDayOfWeek(timestamp);
        uint256 daysToAdd;

        if (currentWeekday < targetWeekday) {
            // Target weekday is later in the current week
            daysToAdd = targetWeekday - currentWeekday;
        } else {
            // Target weekday is in the next week
            daysToAdd = 7 - (currentWeekday - targetWeekday);
        }

        // Align to the start of the day and add the required days
        uint256 currentDay = timestampToDay(timestamp);
        return (currentDay + daysToAdd) * SECONDS_PER_DAY;
    }

    /**
     * @dev Calculate the timestamp of the next Tuesday
     * @param timestamp Starting timestamp
     * @return nextTuesday Timestamp of the next Tuesday at 00:00:00 UTC
     */
    function getNextTuesday(uint256 timestamp) internal pure returns (uint256 nextTuesday) {
        return getNextWeekday(timestamp, TUESDAY);
    }

    /**
     * @dev Calculate how many days until the first Tuesday of the next month
     * @param timestamp Current timestamp
     * @return daysUntil Number of days until the event
     * @return eventTimestamp Timestamp of the event
     */
    function daysUntilFirstTuesdayOfNextMonth(uint256 timestamp) internal pure returns (uint256 daysUntil, uint256 eventTimestamp) {
        // Get the current month
        uint256 currentMonth = getMonth(timestamp);
        uint256 dayOfMonth = getDayOfMonth(timestamp);

        // Calculate the first day of next month (approximate)
        uint256 daysInMonth;
        if (currentMonth == 2) {
            // February special case
            daysInMonth = 28; // Simplified, not handling leap years
        } else if (currentMonth == 4 || currentMonth == 6 || currentMonth == 9 || currentMonth == 11) {
            // 30-day months
            daysInMonth = 30;
        } else {
            // 31-day months
            daysInMonth = 31;
        }

        // Calculate days remaining in this month
        uint256 daysRemainingInMonth = daysInMonth - dayOfMonth + 1;

        // Calculate the first day of next month
        uint256 firstDayOfNextMonth = timestampToDay(timestamp) + daysRemainingInMonth;
        uint256 firstDayOfNextMonthTs = firstDayOfNextMonth * SECONDS_PER_DAY;

        // Find the weekday of the first day of next month
        uint256 firstDayWeekday = getDayOfWeek(firstDayOfNextMonthTs);

        // Calculate the first Tuesday
        uint256 daysToFirstTuesday;
        if (firstDayWeekday <= TUESDAY) {
            daysToFirstTuesday = TUESDAY - firstDayWeekday;
        } else {
            daysToFirstTuesday = 7 - (firstDayWeekday - TUESDAY);
        }

        eventTimestamp = firstDayOfNextMonthTs + (daysToFirstTuesday * SECONDS_PER_DAY);
        daysUntil = (eventTimestamp - timestamp) / SECONDS_PER_DAY;

        return (daysUntil, eventTimestamp);
    }

    /**
     * @dev Calculate aligned lock end time (rounds to nearest week)
     * @param startTime Start timestamp
     * @param lockDuration Duration in seconds
     * @return Aligned end timestamp
     */
    function calculateLockEndAligned(uint256 startTime, uint256 lockDuration) 
        internal 
        pure 
        returns (uint256) 
    {
        uint256 endTime = startTime + lockDuration;
        
        // Align to the nearest Thursday (like veCRV)
        uint256 weekStart = (endTime / SECONDS_PER_WEEK) * SECONDS_PER_WEEK;
        uint256 thursday = weekStart + (4 * SECONDS_PER_DAY); // Thursday is day 4
        
        // If we're past Thursday, move to next Thursday
        if (endTime > thursday) {
            thursday += SECONDS_PER_WEEK;
        }
        
        return thursday;
    }

    /**
     * @dev Check for special events that provide bonus multipliers
     * @param timestamp Current timestamp
     * @return isSpecialEvent Whether a special event is active
     * @return eventMultiplier Multiplier for the event (in basis points, 10000 = 1x)
     */
    function checkForSpecialEvent(uint256 timestamp) 
        internal 
        pure 
        returns (bool isSpecialEvent, uint256 eventMultiplier) 
    {
        // Check for Dragon Year (Year of the Dragon)
        if (isInDragonYear(timestamp)) {
            return (true, 12000); // 1.2x multiplier during Dragon Year
        }
        
        // Check for Lunar New Year period (2 weeks)
        if (timestamp >= LUNAR_NEW_YEAR && timestamp <= LUNAR_NEW_YEAR + (2 * SECONDS_PER_WEEK)) {
            return (true, 15000); // 1.5x multiplier during Lunar New Year
        }
        
        // Check for Dragon Festival (1 week)
        if (timestamp >= DRAGON_FESTIVAL && timestamp <= DRAGON_FESTIVAL + SECONDS_PER_WEEK) {
            return (true, 13000); // 1.3x multiplier during Dragon Festival
        }
        
        // Check for weekend bonus (Saturday-Sunday)
        uint256 dayOfWeek = ((timestamp / SECONDS_PER_DAY) + 4) % 7; // 0=Thursday, 6=Wednesday
        if (dayOfWeek == 2 || dayOfWeek == 3) { // Saturday or Sunday
            return (true, 11000); // 1.1x multiplier on weekends
        }
        
        return (false, 10000); // No special event, 1x multiplier
    }
    
    /**
     * @dev Check if timestamp is in a Dragon Year
     * @param timestamp Timestamp to check
     * @return Whether it's a Dragon Year
     */
    function isInDragonYear(uint256 timestamp) internal pure returns (bool) {
        // Dragon years: 2024, 2036, 2048, etc. (every 12 years)
        uint256 year = getYear(timestamp);
        return (year - 2024) % 12 == 0 && year >= 2024;
    }
    
    /**
     * @dev Get year from timestamp
     * @param timestamp Unix timestamp
     * @return year Year (e.g., 2024)
     */
    function getYear(uint256 timestamp) internal pure returns (uint256) {
        // Simplified year calculation (approximate)
        return 1970 + (timestamp / SECONDS_PER_YEAR);
    }

    /**
     * @dev Check if timestamp is on weekend
     * @param timestamp Unix timestamp
     * @return Whether it's weekend
     */
    function isWeekend(uint256 timestamp) internal pure returns (bool) {
        uint256 dayOfWeek = getDayOfWeek(timestamp);
        return dayOfWeek == 0 || dayOfWeek == 6; // Sunday or Saturday
    }

    /**
     * @dev Calculate next aligned timestamp for a given interval
     * @param timestamp Current timestamp
     * @param interval Interval in seconds
     * @return Next aligned timestamp
     */
    function getNextAlignedTime(uint256 timestamp, uint256 interval) 
        internal 
        pure 
        returns (uint256) 
    {
        return ((timestamp / interval) + 1) * interval;
    }
    
    /**
     * @dev Calculate time until next special event
     * @param timestamp Current timestamp
     * @return timeUntilEvent Seconds until next special event
     * @return eventType Type of next event (0=none, 1=weekend, 2=festival, 3=lunar_new_year)
     */
    function getTimeUntilNextEvent(uint256 timestamp) 
        internal 
        pure 
        returns (uint256 timeUntilEvent, uint256 eventType) 
    {
        // Check for upcoming weekend
        uint256 dayOfWeek = getDayOfWeek(timestamp);
        if (dayOfWeek < 6) { // Not Saturday yet
            uint256 timeUntilSaturday = (6 - dayOfWeek) * SECONDS_PER_DAY;
            timeUntilSaturday -= timestamp % SECONDS_PER_DAY; // Adjust for time of day
            return (timeUntilSaturday, 1);
        }
        
        // Check for upcoming festivals (simplified)
        if (timestamp < DRAGON_FESTIVAL) {
            return (DRAGON_FESTIVAL - timestamp, 2);
        }
        
        // No specific event found
        return (0, 0);
    }
}
