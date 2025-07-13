// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IDragonPartnerFactory
 * @dev Interface for the DragonPartnerFactory contract which creates partner pool contracts
 *
 * Enables partner onboarding and pool creation for ecosystem partnerships
 * Facilitates creation and management of partner-specific liquidity pools
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
interface IDragonPartnerFactory {
    // Events
    event PartnerPoolCreated(uint256 indexed partnerId, address indexed partnerPool, address indexed partnerAddress);
    event PartnerPoolWhitelisted(address indexed partnerPool);
    event PartnerPoolRemoved(address indexed partnerPool);

    /**
     * @dev Creates a new partner pool
     * @param _partnerId ID of the partner
     * @param _boostBasisPoints Initial boost in basis points (e.g., 690 = 6.9%)
     * @return pool Address of the newly created pool
     */
    function createPartnerPool(uint256 _partnerId, uint256 _boostBasisPoints) external returns (address pool);

    /**
     * @dev Gets a partner pool address by partner ID
     * @param _partnerId ID of the partner
     * @return pool Address of the partner pool
     */
    function getPartnerPool(uint256 _partnerId) external view returns (address pool);

    /**
     * @dev Gets the partner ID for a pool address
     * @param _pool Address of the partner pool
     * @return partnerId ID of the partner
     */
    function getPoolPartnerId(address _pool) external view returns (uint256 partnerId);

    /**
     * @dev Checks if a pool address is a valid partner pool
     * @param _pool Address to check
     * @return isValid Whether the address is a valid partner pool
     */
    function isValidPartnerPool(address _pool) external view returns (bool isValid);

    /**
     * @dev Whitelists an externally created partner pool
     * @param _partnerId ID of the partner
     * @param _pool Address of the externally created pool
     */
    function whitelistPartnerPool(uint256 _partnerId, address _pool) external;

    /**
     * @dev Gets the partner pool at a specific index
     * @param _index Index of the partner pool
     * @return pool Address of the partner pool
     */
    function partnerPools(uint256 _index) external view returns (address pool);

    /**
     * @dev Gets the total number of partner pools
     * @return count Number of pools
     */
    function getPartnerPoolCount() external view returns (uint256 count);
}
