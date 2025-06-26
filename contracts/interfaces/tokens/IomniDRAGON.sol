// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IomniDRAGON
 * @dev Interface for the omniDRAGON token - Core Infrastructure
 *
 * Main interface defining the core functionality of the omniDRAGON ecosystem
 * Handles native token swaps, fee distribution, and cross-chain operations
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
interface IomniDRAGON {
    /**
     * @dev Process swap of native tokens ($S) to Dragon tokens and apply fees
     * @param _user The user who is swapping
     * @param _nativeAmount The amount of native tokens ($S) being swapped
     * @return swappableAmount The amount to be used for the actual swap after fees
     * @return nativeFeeAmount Total native amount that should be converted to fees
     * @return jackpotFeeAmount Native amount for jackpot (within nativeFeeAmount)
     * @return veDRAGONFeeAmount Native amount for veDRAGON (within nativeFeeAmount)
     */
    function processNativeSwapFees(address _user, uint256 _nativeAmount) external returns (uint256 swappableAmount, uint256 nativeFeeAmount, uint256 jackpotFeeAmount, uint256 veDRAGONFeeAmount);

    /**
     * @dev Distribute fees to jackpot and veDRAGON without triggering lottery entry
     * @param jackpotAmount Amount to send to jackpot
     * @param veDRAGONAmount Amount to send to veDRAGON
     */
    function distributeFees(uint256 jackpotAmount, uint256 veDRAGONAmount) external;

    /**
     * @dev Get wrapped native token address
     * @return Address of the wrapped native token (WETH, wS, etc.)
     */
    function wrappedNativeToken() external view returns (address);
}
