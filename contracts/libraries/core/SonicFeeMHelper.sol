// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFeeMRegistry
 * @notice Interface for Sonic FeeM (Fee Monetization) Registration
 */
interface IFeeMRegistry {
  function register() external;
  function isRegistered(address contractAddress) external view returns (bool isRegistered);
}

/**
 * @title SonicFeeMHelper
 * @notice Helper library for easy FeeM registration on Sonic network
 * @dev Provides a simple way for contracts to participate in Sonic's fee monetization
 *
 * Usage in your contract:
 * import SonicFeeMHelper from this library
 *
 * contract MyContract {
 *     constructor() {
 *         // Register for FeeM during deployment
 *         SonicFeeMHelper.registerForFeeM();
 *     }
 * }
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
library SonicFeeMHelper {
  /// @notice Sonic FeeM registry address
  address public constant SONIC_FEEM_REGISTRY = 0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830;

  /// @notice Magic number required by Sonic FeeM protocol
  uint256 public constant SONIC_FEEM_REGISTER_VALUE = 143;

  /**
   * @notice Register the calling contract for Sonic FeeM
   * @dev Call this function in your contract's constructor or initialization
   * Only works on Sonic network - does nothing on other chains
   */
  function registerForFeeM() internal {
    // Only register on Sonic network
    if (block.chainid == 146) {
      // Sonic mainnet chain ID
      try IFeeMRegistry(SONIC_FEEM_REGISTRY).register() {
        // Registration successful
      } catch {
        // Try the actual Sonic FeeM method with magic number
        _registerWithSonicMethod();
      }
    }
  }

  /**
   * @notice Register using the actual Sonic FeeM method
   * @dev Internal function that calls the Sonic-specific registration
   */
  function _registerWithSonicMethod() private {
    (bool success, ) = SONIC_FEEM_REGISTRY.call(
      abi.encodeWithSignature('selfRegister(uint256)', SONIC_FEEM_REGISTER_VALUE)
    );
    // Don't revert on failure to allow deployment to continue
    // Note: success variable available for future error handling if needed
    success; // Suppress unused variable warning
  }

  /**
   * @notice Register the calling contract for FeeM with custom registry address
   * @param feeMRegistry Address of the FeeM registry contract
   * @dev Use this if you want to specify a custom FeeM registry address
   */
  function registerForFeeMWithRegistry(address feeMRegistry) internal {
    if (block.chainid == 146 && feeMRegistry != address(0)) {
      try IFeeMRegistry(feeMRegistry).register() {
        // Registration successful
      } catch {
        // Try Sonic-specific method
        _registerWithCustomRegistry(feeMRegistry);
      }
    }
  }

  /**
   * @notice Register using custom registry with Sonic method
   * @param feeMRegistry Custom registry address
   */
  function _registerWithCustomRegistry(address feeMRegistry) private {
    (bool success, ) = feeMRegistry.call(abi.encodeWithSignature('selfRegister(uint256)', SONIC_FEEM_REGISTER_VALUE));
    // Don't revert on failure to allow deployment to continue
    // Note: success variable available for future error handling if needed
    success; // Suppress unused variable warning
  }

  /**
   * @notice Check if the calling contract is registered for FeeM
   * @return isRegistered Whether the contract is registered
   */
  function isRegisteredForFeeM() internal view returns (bool isRegistered) {
    if (block.chainid == 146) {
      try IFeeMRegistry(SONIC_FEEM_REGISTRY).isRegistered(address(this)) returns (bool registered) {
        return registered;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * @notice Check if a specific contract is registered for FeeM
   * @param contractAddress Address to check
   * @return isRegistered Whether the contract is registered
   */
  function isContractRegisteredForFeeM(address contractAddress) internal view returns (bool isRegistered) {
    if (block.chainid == 146) {
      try IFeeMRegistry(SONIC_FEEM_REGISTRY).isRegistered(contractAddress) returns (bool registered) {
        return registered;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * @notice Manual registration function that can be called externally
   * @dev This matches the pattern you provided: registerMe() function
   */
  function registerMe() external {
    require(block.chainid == 146, 'Only available on Sonic network');

    (bool success, ) = SONIC_FEEM_REGISTRY.call(
      abi.encodeWithSignature('selfRegister(uint256)', SONIC_FEEM_REGISTER_VALUE)
    );
    require(success, 'FeeM registration failed');
  }
}
