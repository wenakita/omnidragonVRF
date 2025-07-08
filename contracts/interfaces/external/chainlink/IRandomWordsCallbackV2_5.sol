// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRandomWordsCallbackV2_5
 * @dev Interface for receiving random words from Chainlink VRF V2.5
 */
interface IRandomWordsCallbackV2_5 {
    /**
     * @notice Receive random words from Chainlink VRF
     * @param randomWords Array of random words
     * @param sequence Sequence number for the request
     */
    function receiveRandomWords(uint256[] memory randomWords, uint256 sequence) external;
} 