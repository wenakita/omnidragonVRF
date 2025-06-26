// SPDX-License-Identifier: MIT

/**
 * Interface: IWETH
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */

pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IWETH
 * @dev Interface for Wrapped Ether (WETH) token functionality
 *
 * Standard interface for wrapped native tokens across different chains
 * Enables seamless integration with native token wrapping and unwrapping
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
interface IWETH is IERC20 {
    /**
     * @notice Deposit native token (ETH, AVAX, etc.) to get wrapped token
     */
    function deposit() external payable;

    /**
     * @notice Withdraw native token by burning wrapped token
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external;
}
