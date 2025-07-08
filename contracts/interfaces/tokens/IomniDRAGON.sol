// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IomniDRAGON
 * @dev Interface for the omniDRAGON token - Core Infrastructure
 *
 * Main interface defining the core functionality of the omniDRAGON ecosystem
 * Handles symmetric fee collection, external LP management, and cross-chain operations
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
     * @dev Distribute fees to lottery manager
     * @param amount Amount to send to lottery manager
     */
    function distributeFees(uint256 amount) external;

    /**
     * @dev Distribute WETH to lottery manager
     * @param amount Amount of WETH to distribute
     */
    function distributeWETH(uint256 amount) external;

    /**
     * @dev Distribute all available WETH to lottery manager
     */
    function distributeAllWETH() external;

    /**
     * @dev Get WETH balance of the contract
     * @return WETH balance
     */
    function getWETHBalance() external view returns (uint256);

    /**
     * @dev Get wrapped native token address
     * @return Address of the wrapped native token (WETH, wS, etc.)
     */
    function wrappedNativeToken() external view returns (address);

    // ========== SYMMETRIC FEE COLLECTION FUNCTIONS ==========

    /**
     * @dev Collect WETH fees during buy transactions (symmetric to DRAGON fee collection on sells)
     * @param buyer Address of the buyer
     * @param wethAmount Amount of WETH being used for purchase
     */
    function collectWETHFees(address buyer, uint256 wethAmount) external;

    /**
     * @dev Collect native token fees during buy transactions
     * @param buyer Address of the buyer
     */
    function collectNativeFees(address buyer) external payable;

    /**
     * @dev AUDIT FIX: Removed unused dragonAmount parameter
     * @notice Handle buy transaction fees (called by DEX integration)
     * @param buyer Address of the buyer
     * @param wethAmount Amount of WETH being used for purchase
     * @param useNative Whether to collect fee in native tokens
     */
    function handleBuyTransactionFees(
        address buyer, 
        uint256 wethAmount, 
        bool useNative
    ) external payable;

    /**
     * @dev Get accumulated fee balances (used by external LP manager)
     * @return dragonBalance DRAGON tokens accumulated from sell fees
     * @return wethBalance WETH tokens accumulated from buy fees
     * @return nativeBalance Native tokens available for wrapping
     * @return canCreate Whether external LP manager can create LP
     */
    function getAccumulatedFees() external view returns (
        uint256 dragonBalance,
        uint256 wethBalance,
        uint256 nativeBalance,
        bool canCreate
    );


}
