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
 * @dev Specialized library for Dragon Token ecosystem time-based mechanics
 * Adapted from Solady DateTimeLib with enhancements for jackpot and
 * lock time calculations with Dragon-specific time-based events.
 */
library DragonDateTimeLib {
    // Constants for time calculations
    uint256 public constant SECONDS_PER_MINUTE = 60;
    uint256 public constant SECONDS_PER_HOUR = 60 * 60;
    uint256 public constant SECONDS_PER_DAY = 24 * 60 * 60;
    uint256 public constant SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY;
    uint256 public constant SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;

    // Special events time constants
    uint256 public constant TUESDAY = 2;  // 1-indexed weekday (Monday = 1)
    uint256 public constant FRIDAY = 5;   // 1-indexed weekday (Monday = 1)

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
     * @dev Calculate lock-end time aligned to a week boundary
     * @param currentTime Current timestamp
     * @param lockDuration Duration to lock for in seconds
     * @return lockEnd Timestamp when lock will expire (aligned to week)
     */
    function calculateLockEndAligned(uint256 currentTime, uint256 lockDuration) internal pure returns (uint256 lockEnd) {
        // Calculate raw lock end time
        uint256 rawLockEnd = currentTime + lockDuration;

        // Round down to the nearest week boundary
        return (rawLockEnd / SECONDS_PER_WEEK) * SECONDS_PER_WEEK;
    }

    /**
     * @dev Check if a timestamp is during a Dragon Token special event
     * Special events will be activated in the future
     * @return isSpecialEvent Whether the timestamp is during a special event (always false currently)
     * @return eventMultiplier The multiplier for the event (10000 = 1.0x)
     */
    function checkForSpecialEvent(uint256) internal pure returns (bool isSpecialEvent, uint256 eventMultiplier) {
        // Special events are inactive by default
        // This function will be updated when events are activated

        /*
        // Check if it's the first Tuesday of the month (2x boost)
        if (isFirstTuesdayOfMonth(timestamp)) {
            return (true, 20000); // 2.0x boost
        }

        // Check if it's any Friday (1.5x boost)
        (bool isFridayToday,) = isFriday(timestamp);
        if (isFridayToday) {
            return (true, 15000); // 1.5x boost
        }
        */

        // No special event - default state
        return (false, 10000); // 1.0x (no boost)
    }
}
