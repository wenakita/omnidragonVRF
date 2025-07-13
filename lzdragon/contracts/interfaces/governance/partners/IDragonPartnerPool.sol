// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IDragonPartnerPool
 * @dev Interface for the DragonPartnerPool contract which represents a partner pool
 *
 * Manages individual partner pools receiving votes and providing probability boosts
 * Core component for partner-based lottery enhancements and fee sharing
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
interface IDragonPartnerPool {
    // Events
    event BoostUpdated(uint256 oldBoostBasisPoints, uint256 newBoostBasisPoints);
    event JackpotEntryAdded(address indexed user, uint256 amount);
    event FeeDistributed(address indexed token, address indexed partner, uint256 amount);

    /**
     * @dev Initializes a new partner pool
     * @param _partnerId ID of the partner
     * @param _partnerAddress Address of the partner
     * @param _factory Address of the factory that created this pool
     * @param _initialBoostBasisPoints Initial boost in basis points
     */
    function initialize(
        uint256 _partnerId,
        address _partnerAddress,
        address _factory,
        uint256 _initialBoostBasisPoints
    ) external;

    /**
     * @dev Updates the probability boost for this partner pool
     * @param _newBoostBasisPoints New boost in basis points
     */
    function updateProbabilityBoost(uint256 _newBoostBasisPoints) external;

    /**
     * @dev Allows a user to enter the jackpot via this partner pool
     * @param _amount Amount to base the entry on
     */
    function enterJackpot(uint256 _amount) external;

    /**
     * @dev Distribute rewards to this partner pool
     * @param _token Token address to distribute
     * @param _amount Amount to distribute
     */
    function distributeRewards(address _token, uint256 _amount) external;

    /**
     * @dev Gets the current boost in basis points
     * @return boostBasisPoints Current boost in basis points
     */
    function getBoostBasisPoints() external view returns (uint256 boostBasisPoints);

    /**
     * @dev Gets the partner address
     * @return address Partner address
     */
    function partnerAddress() external view returns (address);

    /**
     * @dev Gets the partner ID
     * @return partnerId ID of the partner
     */
    function partnerId() external view returns (uint256 partnerId);
}
