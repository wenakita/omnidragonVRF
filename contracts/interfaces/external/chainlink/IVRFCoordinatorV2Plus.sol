// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { VRFV2PlusClient } from "./VRFV2PlusClient.sol";

/**
 * @title IVRFCoordinatorV2Plus
 * @dev Interface for the Chainlink VRF Coordinator V2.5.
 *      It uses a struct-based approach for requesting random words.
 */
interface IVRFCoordinatorV2Plus {
    /**
     * @notice Request a set of random words using the VRF 2.5 struct format.
     * @param req The RandomWordsRequest struct containing all parameters for the VRF request.
     * @return requestId A unique identifier for the request.
     */
    function requestRandomWords(
        VRFV2PlusClient.RandomWordsRequest calldata req
    ) external returns (uint256 requestId);

    // Other functions from the coordinator can be added here if needed.
    // For example: getRequestConfig, getSubscription, etc.
} 