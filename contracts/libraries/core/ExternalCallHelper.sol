// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ExternalCallHelper
 * @dev Library for safe external calls with circuit breakers and error handling
 * Implements audit recommendations for external dependency hardening
 */
library ExternalCallHelper {
  // Circuit breaker states
  enum CircuitState {
    CLOSED, // Normal operation
    OPEN, // Circuit tripped, calls blocked
    HALF_OPEN // Testing if service recovered
  }

  struct CircuitBreaker {
    CircuitState state;
    uint256 failureCount;
    uint256 lastFailureTime;
    uint256 cooldownEndTime;
  }

  // Configuration constants
  uint256 constant FAILURE_THRESHOLD = 3;
  uint256 constant COOLDOWN_PERIOD = 1 hours;
  uint256 constant HALF_OPEN_SUCCESS_THRESHOLD = 2;

  // Events for monitoring
  event ExternalCallFailed(address indexed target, bytes4 indexed selector, string reason);
  event CircuitBreakerTripped(address indexed target, uint256 cooldownEndTime);
  event CircuitBreakerReset(address indexed target);

  /**
   * @dev Safe external call with circuit breaker
   * @param target The address to call
   * @param data The calldata
   * @param circuitBreaker The circuit breaker state
   * @return success Whether the call succeeded
   * @return result The return data
   */
  function safeCall(
    address target,
    bytes memory data,
    CircuitBreaker storage circuitBreaker
  ) internal returns (bool success, bytes memory result) {
    // Check circuit breaker state
    if (circuitBreaker.state == CircuitState.OPEN) {
      if (block.timestamp >= circuitBreaker.cooldownEndTime) {
        // Try half-open state
        circuitBreaker.state = CircuitState.HALF_OPEN;
        circuitBreaker.failureCount = 0;
      } else {
        // Circuit still open
        return (false, abi.encode('Circuit breaker open'));
      }
    }

    // Make the external call
    (success, result) = target.call(data);

    if (success) {
      // Handle successful call
      if (circuitBreaker.state == CircuitState.HALF_OPEN) {
        circuitBreaker.failureCount = 0;
        circuitBreaker.state = CircuitState.CLOSED;
        emit CircuitBreakerReset(target);
      }
    } else {
      // Handle failed call
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = block.timestamp;

      // Extract selector for monitoring
      bytes4 selector;
      if (data.length >= 4) {
        assembly {
          selector := mload(add(data, 0x20))
        }
      }

      emit ExternalCallFailed(target, selector, string(result));

      // Check if we should trip the circuit breaker
      if (circuitBreaker.failureCount >= FAILURE_THRESHOLD) {
        circuitBreaker.state = CircuitState.OPEN;
        circuitBreaker.cooldownEndTime = block.timestamp + COOLDOWN_PERIOD;
        emit CircuitBreakerTripped(target, circuitBreaker.cooldownEndTime);
      }
    }

    return (success, result);
  }

  /**
   * @dev Safe external call with try/catch for specific errors
   * @param target The address to call
   * @param data The calldata
   * @param defaultValue Default value to return on failure
   * @return result The result or default value
   */
  function safeCallWithDefault(
    address target,
    bytes memory data,
    bytes memory defaultValue
  ) internal returns (bytes memory result) {
    (bool success, bytes memory returnData) = target.call(data);

    if (success && returnData.length > 0) {
      return returnData;
    } else {
      return defaultValue;
    }
  }

  /**
   * @dev Safe static call (view function)
   * @param target The address to call
   * @param data The calldata
   * @return success Whether the call succeeded
   * @return result The return data
   */
  function safeStaticCall(address target, bytes memory data) internal view returns (bool success, bytes memory result) {
    // Static calls don't modify state, so no circuit breaker needed
    (success, result) = target.staticcall(data);
    return (success, result);
  }

  /**
   * @dev Batch external calls with individual error handling
   * @param targets Array of addresses to call
   * @param calldatas Array of calldata
   * @return successes Array of success flags
   * @return results Array of return data
   */
  function safeBatchCall(
    address[] memory targets,
    bytes[] memory calldatas
  ) internal returns (bool[] memory successes, bytes[] memory results) {
    require(targets.length == calldatas.length, 'Array length mismatch');

    successes = new bool[](targets.length);
    results = new bytes[](targets.length);

    for (uint256 i = 0; i < targets.length; i++) {
      (successes[i], results[i]) = targets[i].call(calldatas[i]);
    }

    return (successes, results);
  }

  /**
   * @dev Check if circuit breaker is tripped
   * @param circuitBreaker The circuit breaker to check
   * @return Whether the circuit is open
   */
  function isCircuitOpen(CircuitBreaker storage circuitBreaker) internal view returns (bool) {
    if (circuitBreaker.state == CircuitState.OPEN) {
      return block.timestamp < circuitBreaker.cooldownEndTime;
    }
    return false;
  }

  /**
   * @dev Reset circuit breaker (admin function)
   * @param circuitBreaker The circuit breaker to reset
   */
  function resetCircuitBreaker(CircuitBreaker storage circuitBreaker) internal {
    circuitBreaker.state = CircuitState.CLOSED;
    circuitBreaker.failureCount = 0;
    circuitBreaker.lastFailureTime = 0;
    circuitBreaker.cooldownEndTime = 0;
  }
}
