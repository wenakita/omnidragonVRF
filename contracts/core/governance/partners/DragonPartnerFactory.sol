// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "../../../libraries/security/ReentrancyGuard.sol";
import {IDragonPartnerFactory} from "../../../interfaces/governance/partners/IDragonPartnerFactory.sol";
import {DragonPartnerPool} from "./DragonPartnerPool.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../../../interfaces/governance/partners/IDragonPartnerRegistry.sol";

/**
 * @title DragonPartnerFactory
 * @dev Factory contract for creating and managing Dragon partner pools
 *
 * Enables ecosystem partnerships through dedicated liquidity pools and fee sharing
 * Streamlines partner onboarding and pool creation for the OmniDragon ecosystem
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract DragonPartnerFactory is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    // State variables
    address public immutable partnerRegistry;
    address public veDRAGONBoostManager;
    address public treasury;
    address public jackpot;
    address public defaultStakingToken;

    // Pool tracking
    mapping(uint256 => address) public partnerPools;
    EnumerableSet.AddressSet private poolSet;

    // Configuration
    uint256 public defaultFeePercentage = 500; // 5% default fee
    bool public onlyOwnerCanCreate = true; // Only owner can create pools initially

    // Events
    event PartnerPoolCreated(uint256 indexed partnerId, address indexed partnerAddress, address poolAddress, address stakingToken);
    event PartnerPoolInitialized(address indexed poolAddress, address stakingToken);
    event ConfigurationUpdated(string parameter, uint256 value);
    event AddressUpdated(string parameter, address value);
    event PermissionUpdated(string permission, bool value);

    /**
     * @dev Constructor
     * @param _partnerRegistry Partner registry address
     * @param _veDRAGONBoostManager veDRAGON boost manager address
     * @param _treasury Treasury address
     * @param _jackpot Jackpot address
     * @param _defaultStakingToken Default staking token address
     */
    constructor(
        address _partnerRegistry,
        address _veDRAGONBoostManager,
        address _treasury,
        address _jackpot,
        address _defaultStakingToken
    ) Ownable(msg.sender) {
        require(_partnerRegistry != address(0), "Zero address: partnerRegistry");
        require(_veDRAGONBoostManager != address(0), "Zero address: veDRAGONBoostManager");
        require(_treasury != address(0), "Zero address: treasury");
        require(_jackpot != address(0), "Zero address: jackpot");
        require(_defaultStakingToken != address(0), "Zero address: token");

        partnerRegistry = _partnerRegistry;
        veDRAGONBoostManager = _veDRAGONBoostManager;
        treasury = _treasury;
        jackpot = _jackpot;
        defaultStakingToken = _defaultStakingToken;

        // Register for Sonic FeeM automatically
    }

    /**
     * @dev Modifier for authorized creators
     */
    modifier canCreate() {
        if (onlyOwnerCanCreate) {
            require(msg.sender == owner(), "Not authorized");
        }
        _;
    }

    /**
     * @dev Create a new partner pool
     * @param _partnerId ID of the partner
     * @param _stakingToken Token to use for staking (optional, defaults to defaultStakingToken)
     * @return poolAddress Address of the new partner pool
     */
    function createPartnerPool(
        uint256 _partnerId,
        address _stakingToken
    ) external returns (address poolAddress) {
        // Check if partner exists and is active
        address partnerAddress = IDragonPartnerRegistry(partnerRegistry).partnerList(_partnerId);
        require(partnerAddress != address(0), "Partner does not exist");

        bool isActive = IDragonPartnerRegistry(partnerRegistry).isPartnerActive(partnerAddress);
        require(isActive, "Partner not active");

        // Use default values if not specified
        uint256 feePercentage = defaultFeePercentage;
        require(feePercentage <= 5000, "Fee too high");

        address stakingToken = _stakingToken != address(0) ? _stakingToken : defaultStakingToken;

        // Deploy new pool
        DragonPartnerPool pool = new DragonPartnerPool(
            partnerAddress,
            veDRAGONBoostManager,
            treasury,
            jackpot,
            feePercentage
        );

        // Store pool address
        poolAddress = address(pool);
        partnerPools[_partnerId] = poolAddress;
        poolSet.add(poolAddress);

        // Initialize pool
        pool.initialize(partnerRegistry, stakingToken);
        pool.transferOwnership(owner());

        emit PartnerPoolCreated(_partnerId, partnerAddress, poolAddress, stakingToken);

        return poolAddress;
    }

    /**
     * @dev Get the pool address for a partner
     * @param _partnerId Partner ID
     * @return Pool address
     */
    function getPartnerPool(uint256 _partnerId) external view returns (address) {
        return partnerPools[_partnerId];
    }

    /**
     * @dev Get total number of pools
     * @return Number of pools
     */
    function getPoolCount() external view returns (uint256) {
        return poolSet.length();
    }

    /**
     * @dev Get pool at index
     * @param _index Index in the pool array
     * @return Pool address
     */
    function getPoolAt(uint256 _index) external view returns (address) {
        require(_index < poolSet.length(), "Index out of bounds");
        return poolSet.at(_index);
    }

    /**
     * @dev Set default fee percentage
     * @param _feePercentage New default fee percentage
     */
    function setDefaultFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 5000, "Fee too high");
        defaultFeePercentage = _feePercentage;
        emit ConfigurationUpdated("defaultFeePercentage", _feePercentage);
    }

    /**
     * @dev Set the veDRAGON boost manager address
     * @param _veDRAGONBoostManager New veDRAGON boost manager address
     */
    function setVeDRAGONBoostManager(address _veDRAGONBoostManager) external onlyOwner {
        require(_veDRAGONBoostManager != address(0), "Zero address");
        veDRAGONBoostManager = _veDRAGONBoostManager;
        emit AddressUpdated("veDRAGONBoostManager", _veDRAGONBoostManager);
    }

    /**
     * @dev Set treasury address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero address");
        treasury = _treasury;
        emit AddressUpdated("treasury", _treasury);
    }

    /**
     * @dev Set jackpot address
     * @param _jackpot New jackpot address
     */
    function setJackpot(address _jackpot) external onlyOwner {
        require(_jackpot != address(0), "Zero address");
        jackpot = _jackpot;
        emit AddressUpdated("jackpot", _jackpot);
    }

    /**
     * @dev Set default staking token
     * @param _defaultStakingToken New default staking token
     */
    function setDefaultStakingToken(address _defaultStakingToken) external onlyOwner {
        require(_defaultStakingToken != address(0), "Zero address");
        defaultStakingToken = _defaultStakingToken;
        emit AddressUpdated("defaultStakingToken", _defaultStakingToken);
    }

    /**
     * @dev Set permission for who can create pools
     * @param _onlyOwner Whether only owner can create pools
     */
    function setOnlyOwnerCanCreate(bool _onlyOwner) external onlyOwner {
        onlyOwnerCanCreate = _onlyOwner;
        emit PermissionUpdated("onlyOwnerCanCreate", _onlyOwner);
    }

    /**
     * @notice Check if this contract is registered for Sonic FeeM
     * @return isRegistered Whether the contract is registered for fee monetization
     */
    function checkFeeMStatus() external view returns (bool isRegistered) {
    }
}