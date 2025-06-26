// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title IRandomWordsCallbackV2_5
 * @dev Interface for contracts that can receive random words from the ChainlinkVRFIntegratorV2_5.
 *      This matches the callback pattern used by Chainlink VRF 2.5 consumers.
 */
interface IRandomWordsCallbackV2_5 {
    /**
     * @notice Callback function to receive fulfilled random words.
     * @param randomWords An array containing the fulfilled random words. For the current
     *                    integrator, this will be an array with a single word.
     * @param sequence The unique sequence number (request ID) of the VRF request.
     */
    function receiveRandomWords(uint256[] memory randomWords, uint64 sequence) external;
} 