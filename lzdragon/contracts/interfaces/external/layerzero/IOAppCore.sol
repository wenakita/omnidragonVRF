// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOAppCore
 * @dev Minimal interface for LayerZero OApp core functions
 */
interface IOAppCore {
    function setDelegate(address _delegate) external;
} 