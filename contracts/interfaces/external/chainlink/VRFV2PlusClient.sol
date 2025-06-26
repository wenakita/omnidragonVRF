// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title VRFV2PlusClient
 * @dev A client library for formatting requests to Chainlink VRF V2.5.
 *      This library provides the necessary structs and helper functions to interact
 *      with the VRF Coordinator using its struct-based interface.
 */
library VRFV2PlusClient {
    /**
     * @dev Extra arguments structure for VRF 2.5, allowing specification of payment method.
     */
    struct ExtraArgsV1 {
        bool nativePayment; // true for native token payment, false for LINK payment
    }

    /**
     * @dev Main request structure for VRF 2.5, encapsulating all request parameters.
     */
    struct RandomWordsRequest {
        bytes32 keyHash;              // The gas lane key hash
        uint256 subId;                // The subscription ID
        uint16 requestConfirmations;  // Minimum number of confirmations
        uint32 callbackGasLimit;      // Gas limit for the callback function
        uint32 numWords;              // The number of random words to request
        bytes extraArgs;              // Encoded extra arguments (e.g., payment type)
    }

    /**
     * @dev The official tag for encoding VRF V2.5 ExtraArgsV1.
     *      This ensures the coordinator can correctly decode the extra arguments.
     */
    bytes4 public constant EXTRA_ARGS_V1_TAG = bytes4(keccak256("VRF ExtraArgsV1"));

    /**
     * @notice Encodes the ExtraArgsV1 struct into bytes with the correct V2.5 tag.
     * @param extraArgs The struct containing extra arguments to encode.
     * @return The ABI-encoded bytes payload for the `extraArgs` field of the request.
     */
    function _argsToBytes(ExtraArgsV1 memory extraArgs) internal pure returns (bytes memory) {
        return abi.encodePacked(EXTRA_ARGS_V1_TAG, abi.encode(extraArgs.nativePayment));
    }
} 