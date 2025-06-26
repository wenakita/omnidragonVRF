// SPDX-License-Identifier: MIT

/**
 * Interface: IveDRAGONFeeDistributor
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */

pragma solidity ^0.8.20;

/**
 * @title IveDRAGONFeeDistributor
 * @dev Interface for the veDRAGON fee distributor contract
 *
 * Manages fee collection and distribution to veDRAGON holders
 * Core component of the OmniDragon revenue sharing mechanism
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
interface IveDRAGONFeeDistributor {
    /**
     * @notice Receive rewards (DRAGON tokens) from external sources
     * @param _amount The amount of DRAGON tokens to receive
     */
    function receiveRewards(uint256 _amount) external;

    /**
     * @notice Distribute accumulated rewards to the veDRAGON contract or reward mechanism
     */
    function distributeRewards() external;

    /**
     * @notice Get the current accumulated rewards that have not been distributed
     * @return The amount of undistributed rewards
     */
    function accumulatedRewards() external view returns (uint256);

    /**
     * @notice Set the DRAGON token address
     * @param _rewardToken The address of the DRAGON token
     */
    function setRewardToken(address _rewardToken) external;

    /**
     * @notice Update the veDRAGON recipient address
     * @param _veDRAGONAddress The new veDRAGON contract or reward distributor address
     */
    function setVeDRAGONAddress(address _veDRAGONAddress) external;

    /**
     * @notice Set the wrapped native token address
     * @param _wrappedNativeToken The new wrapped native token address
     */
    function setWrappedNativeToken(address _wrappedNativeToken) external;
}
