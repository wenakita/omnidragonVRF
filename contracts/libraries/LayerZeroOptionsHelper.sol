// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LayerZeroOptionsHelper
 * @dev Library for creating proper LayerZero V2 extraOptions to avoid LZ_ULN_InvalidWorkerOptions
 * @notice This library implements the fix for the 0x6592671c error by providing Legacy Type 1 options
 * 
 * KEY LEARNING: Never use empty options ("0x") - always use Legacy Type 1 format!
 * 
 * The breakthrough discovery was that LayerZero V2's quoteSend() fails with error 0x6592671c 
 * (LZ_ULN_InvalidWorkerOptions) when using empty extraOptions ("0x").
 * 
 * SOLUTION: Use Legacy Type 1 options format:
 * - Type: 0x0001 (2 bytes)
 * - Gas: 32 bytes of gas amount
 * - Total: 34 bytes
 * 
 * Example: 0x00010000000000000000000000000000000000000000000000000000000000030d40
 * (Type 1 + 200,000 gas)
 */
library LayerZeroOptionsHelper {
    
    // Constants
    uint16 internal constant LEGACY_TYPE_1 = 1;
    uint32 internal constant DEFAULT_GAS_LIMIT = 200000;
    uint32 internal constant MIN_GAS_LIMIT = 100000;
    uint32 internal constant MAX_GAS_LIMIT = 2000000;
    
    /**
     * @dev Creates Legacy Type 1 options for LayerZero V2
     * @param gasLimit The gas limit for the destination chain execution
     * @return options The properly formatted Legacy Type 1 options
     * 
     * Format: [type:2bytes][gasLimit:32bytes] = 34 bytes total
     * - type: 0x0001 (Legacy Type 1)
     * - gasLimit: 32-byte big-endian encoded gas limit
     */
    function createLegacyType1Options(uint32 gasLimit) internal pure returns (bytes memory) {
        require(gasLimit >= MIN_GAS_LIMIT && gasLimit <= MAX_GAS_LIMIT, "Invalid gas limit");
        
        // Encode as: [type:2bytes][gasLimit:32bytes]
        return abi.encodePacked(LEGACY_TYPE_1, uint256(gasLimit));
    }
    
    /**
     * @dev Creates Legacy Type 1 options with default gas limit
     * @return options The properly formatted Legacy Type 1 options with 200,000 gas
     */
    function createDefaultLegacyType1Options() internal pure returns (bytes memory) {
        return createLegacyType1Options(DEFAULT_GAS_LIMIT);
    }
    
    /**
     * @dev Validates that options are not empty (which causes LZ_ULN_InvalidWorkerOptions)
     * @param options The options to validate
     * @return isValid True if options are valid (not empty)
     */
    function validateOptions(bytes memory options) internal pure returns (bool isValid) {
        return options.length > 0;
    }
    
    /**
     * @dev Checks if options are Legacy Type 1 format
     * @param options The options to check
     * @return True if options are Legacy Type 1 format
     */
    function isLegacyType1(bytes memory options) internal pure returns (bool) {
        if (options.length != 34) return false;
        
        uint16 optionType;
        assembly {
            optionType := mload(add(options, 2))
        }
        return optionType == LEGACY_TYPE_1;
    }
    
    /**
     * @dev Extracts gas limit from Legacy Type 1 options
     * @param options The Legacy Type 1 options
     * @return gasLimit The gas limit encoded in the options
     */
    function extractGasLimit(bytes memory options) internal pure returns (uint32 gasLimit) {
        require(isLegacyType1(options), "Not Legacy Type 1 options");
        
        uint256 fullGasLimit;
        assembly {
            fullGasLimit := mload(add(options, 34)) // Skip 2 bytes type + read 32 bytes
        }
        
        require(fullGasLimit <= type(uint32).max, "Gas limit too large");
        return uint32(fullGasLimit);
    }
    
    /**
     * @dev Emergency function to convert empty options to Legacy Type 1
     * @param options The options to fix (if empty)
     * @return fixedOptions The options, converted to Legacy Type 1 if they were empty
     */
    function ensureValidOptions(bytes memory options) internal pure returns (bytes memory fixedOptions) {
        if (options.length == 0) {
            return createDefaultLegacyType1Options();
        }
        return options;
    }
    
    /**
     * @dev Creates Legacy Type 1 options with custom gas for specific networks
     * @param chainId The destination chain ID
     * @return options The properly formatted Legacy Type 1 options with chain-specific gas
     */
    function createChainSpecificOptions(uint256 chainId) internal pure returns (bytes memory) {
        uint32 gasLimit;
        
        if (chainId == 1) {          // Ethereum
            gasLimit = 300000;
        } else if (chainId == 42161) { // Arbitrum
            gasLimit = 250000;
        } else if (chainId == 43114) { // Avalanche
            gasLimit = 250000;
        } else if (chainId == 146) {   // Sonic
            gasLimit = 200000;
        } else {
            gasLimit = DEFAULT_GAS_LIMIT; // Default for other chains
        }
        
        return createLegacyType1Options(gasLimit);
    }
} 