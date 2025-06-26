// SPDX-License-Identifier: MIT

/**
 * @title IWrappedNativeToken
 * @dev Interface for wrapped native token (WETH, WAVAX, WrappedNativeToken, etc.)
 *
 * Standard interface for wrapped native tokens across different blockchain networks
 * Enables seamless integration with native token wrapping and unwrapping operations
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */

pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IWrappedNativeToken is IERC20 {
    function deposit() external payable;
    function withdraw(uint256) external;
}
