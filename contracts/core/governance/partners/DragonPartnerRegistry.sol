// SPDX-License-Identifier: MIT

/**
 *   ██████╗  █████╗ ██████╗ ████████╗███╗   ██╗███████╗██████╗ ███████╗
 *   ██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝████╗  ██║██╔════╝██╔══██╗██╔════╝
 *   ██████╔╝███████║██████╔╝   ██║   ██╔██╗ ██║█████╗  ██████╔╝███████╗
 *   ██╔═══╝ ██╔══██║██╔══██╗   ██║   ██║╚██╗██║██╔══╝  ██╔══██╗╚════██║
 *   ██║     ██║  ██║██║  ██║   ██║   ██║ ╚████║███████╗██║  ██║███████║
 *   ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚══════╝
 *              COLLABORATION AND INTEGRATION SYSTEM
 *
 * Partner Integration Contracts
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonic_reddragon_bot
 */

pragma solidity ^0.8.20;

import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';
import { IDragonPartnerRegistry } from '../../../interfaces/governance/partners/IDragonPartnerRegistry.sol';

/**
 * @title DragonPartnerRegistry
 * @dev Registry for managing partners in the Dragon ecosystem
 */
contract DragonPartnerRegistry is Ownable, IDragonPartnerRegistry {
  // Custom errors
  error BoostTooHigh(uint256 provided, uint256 maximum);
  error ZeroAddress();
  error FeeShareTooHigh(uint256 provided, uint256 maximum);
  error PartnerAlreadyExists(address partner);
  error PartnerDoesNotExist(address partner);
  error PartnerNotActive(address partner);
  error PartnerAlreadyActive(address partner);
  error FeeMRegistrationFailed();
  error IndexOutOfBounds(uint256 index, uint256 length);
  error RegistrationFailed();

  // Partner extended internal struct (not exposed in interface)
  struct PartnerExtended {
    address addr; // Partner address
    string name; // Partner name
    uint256 feeShare; // Fee share in basis points
    uint256 probabilityBoost; // Probability boost in basis points
    bool active; // Partner active status
  }

  // Partners storage
  address[] private _partnerList;
  mapping(address => PartnerExtended) private _partners;
  mapping(address => bool) public override isPartnerActive;

  // Authorized distributors
  mapping(address => bool) private _authorizedDistributors;

  // Default probability boost
  uint256 private _defaultProbabilityBoost = 100; // 1% by default

  // Events
  event PartnerAdded(address indexed partner, string name);
  event PartnerActivated(address indexed partner);
  event PartnerDeactivated(address indexed partner);
  event PartnerRemoved(address indexed partner);
  event DistributorAuthorized(address indexed distributor);
  event DistributorUnauthorized(address indexed distributor);
  event DefaultProbabilityBoostUpdated(uint256 newBoost);

  constructor() Ownable(msg.sender) {
    // Register for Sonic FeeM automatically
  }

  /**
   * @dev Add a new partner
   * @param partnerAddress Partner address
   * @param name Partner name
   * @param feeShare Fee share in basis points
   * @param probabilityBoost Probability boost in basis points
   */
  function addPartner(
    address partnerAddress,
    string memory name,
    uint256 feeShare,
    uint256 probabilityBoost
  ) external override onlyOwner {
    if (partnerAddress == address(0)) revert ZeroAddress();
    if (_partners[partnerAddress].addr != address(0)) revert PartnerAlreadyExists(partnerAddress);
    if (feeShare > 5000) revert FeeShareTooHigh(feeShare, 5000); // Max 50%
    if (probabilityBoost > 1000) revert BoostTooHigh(probabilityBoost, 1000); // Max 10%

    // Create partner
    _partners[partnerAddress] = PartnerExtended({
      addr: partnerAddress,
      name: name,
      feeShare: feeShare,
      probabilityBoost: probabilityBoost,
      active: true
    });

    // Add to list
    _partnerList.push(partnerAddress);

    // Set active
    isPartnerActive[partnerAddress] = true;

    // Emit event
    emit PartnerAdded(partnerAddress, name);
    emit PartnerActivated(partnerAddress);
  }

  /**
   * @dev Add a new partner with default probability boost
   * @param partnerAddress Partner address
   * @param name Partner name
   * @param feeShare Fee share in basis points
   */
  function addPartnerWithDefaultBoost(
    address partnerAddress,
    string memory name,
    uint256 feeShare
  ) external override onlyOwner {
    this.addPartner(partnerAddress, name, feeShare, _defaultProbabilityBoost);
  }

  /**
   * @dev Update an existing partner
   * @param partnerAddress Partner address
   * @param name New name
   * @param feeShare New fee share
   * @param probabilityBoost New probability boost
   */
  function updatePartner(
    address partnerAddress,
    string memory name,
    uint256 feeShare,
    uint256 probabilityBoost
  ) external override onlyOwner {
    if (_partners[partnerAddress].addr == address(0)) revert PartnerDoesNotExist(partnerAddress);
    if (feeShare > 5000) revert FeeShareTooHigh(feeShare, 5000); // Max 50%
    if (probabilityBoost > 1000) revert BoostTooHigh(probabilityBoost, 1000); // Max 10%

    // Update partner
    _partners[partnerAddress].name = name;
    _partners[partnerAddress].feeShare = feeShare;
    _partners[partnerAddress].probabilityBoost = probabilityBoost;
  }

  /**
   * @dev Update an existing partner with default probability boost
   * @param partnerAddress Partner address
   * @param name New name
   * @param feeShare New fee share
   */
  function updatePartnerWithDefaultBoost(
    address partnerAddress,
    string memory name,
    uint256 feeShare
  ) external override onlyOwner {
    this.updatePartner(partnerAddress, name, feeShare, _defaultProbabilityBoost);
  }

  /**
   * @dev Activate a partner
   * @param partnerAddress Partner address
   */
  function activatePartner(address partnerAddress) external onlyOwner {
    if (_partners[partnerAddress].addr == address(0)) revert PartnerDoesNotExist(partnerAddress);
    if (isPartnerActive[partnerAddress]) revert PartnerAlreadyActive(partnerAddress);

    // Set active
    _partners[partnerAddress].active = true;
    isPartnerActive[partnerAddress] = true;

    // Emit event
    emit PartnerActivated(partnerAddress);
  }

  /**
   * @dev Deactivate a partner
   * @param partnerAddress Partner address
   */
  function deactivatePartner(address partnerAddress) external override onlyOwner {
    if (_partners[partnerAddress].addr == address(0)) revert PartnerDoesNotExist(partnerAddress);
    if (!isPartnerActive[partnerAddress]) revert PartnerNotActive(partnerAddress);

    // Set inactive
    _partners[partnerAddress].active = false;
    isPartnerActive[partnerAddress] = false;

    // Emit event
    emit PartnerDeactivated(partnerAddress);
  }

  /**
   * @dev Set distributor authorization
   * @param distributor Distributor address
   * @param authorized Authorization status
   */
  function setDistributorAuthorization(address distributor, bool authorized) external override onlyOwner {
    if (distributor == address(0)) revert ZeroAddress();

    _authorizedDistributors[distributor] = authorized;

    if (authorized) {
      emit DistributorAuthorized(distributor);
    } else {
      emit DistributorUnauthorized(distributor);
    }
  }

  /**
   * @dev Set default probability boost
   * @param boost Default probability boost
   */
  function setDefaultProbabilityBoost(uint256 boost) external override onlyOwner {
    if (boost > 1000) revert BoostTooHigh(boost, 1000); // Max 10%

    _defaultProbabilityBoost = boost;
    emit DefaultProbabilityBoostUpdated(boost);
  }

  /**
   * @dev Get partner at index - implements IDragonPartnerRegistry
   * @param index Index
   * @return Partner address
   */
  function partnerList(uint256 index) external view override returns (address) {
    if (index >= _partnerList.length) revert IndexOutOfBounds(index, _partnerList.length);
    return _partnerList[index];
  }

  /**
   * @dev Get partner count - implements IDragonPartnerRegistry
   * @return Partner count
   */
  function getPartnerCount() external view override returns (uint256) {
    return _partnerList.length;
  }

  /**
   * @dev Get partner details - implements IDragonPartnerRegistry
   * @param partnerAddress Partner address
   * @return name Partner name
   * @return feeShare Fee share in basis points
   * @return probabilityBoost Probability boost in basis points
   * @return isActive Partner active status
   */
  function getPartnerDetails(
    address partnerAddress
  ) external view override returns (string memory name, uint256 feeShare, uint256 probabilityBoost, bool isActive) {
    if (_partners[partnerAddress].addr == address(0)) revert PartnerDoesNotExist(partnerAddress);

    PartnerExtended memory partner = _partners[partnerAddress];
    return (partner.name, partner.feeShare, partner.probabilityBoost, partner.active);
  }

  /**
   * @dev Get partner data - implements IDragonPartnerRegistry
   */
  function partners(
    address partnerAddress
  ) external view override returns (string memory name, uint256 feeShare, uint256 probabilityBoost, bool isActive) {
    PartnerExtended memory partner = _partners[partnerAddress];
    return (partner.name, partner.feeShare, partner.probabilityBoost, partner.active);
  }

  /**
   * @dev Check if distributor is authorized
   */
  function authorizedDistributors(address distributor) external view override returns (bool) {
    return _authorizedDistributors[distributor];
  }

  /**
   * @dev Check if distributor is authorized
   */
  function isDistributorAuthorized(address distributor) external view override returns (bool) {
    return _authorizedDistributors[distributor];
  }

  /**
   * @dev Get default probability boost
   */
  function defaultProbabilityBoost() external view override returns (uint256) {
    return _defaultProbabilityBoost;
  }

  /**
   * @dev Check if partner is whitelisted (alias for isPartnerActive)
   * @param partner Partner address
   * @return Whether partner is whitelisted
   */
  function isWhitelistedPartner(address partner) external view override returns (bool) {
    return isPartnerActive[partner];
  }

  /**
   * @dev Get partner boost (returns probability boost)
   * @param partner Partner address
   * @return Probability boost in basis points
   */
  function getPartnerBoost(address partner) external view override returns (uint256) {
    if (_partners[partner].addr == address(0)) revert PartnerDoesNotExist(partner);
    return _partners[partner].probabilityBoost;
  }

  /**
   * @dev Register a partner (alias for addPartner with default fee share)
   * @param partner Partner address
   * @param boost Probability boost in basis points
   */
  function registerPartner(address partner, uint256 boost) external override onlyOwner {
    this.addPartner(partner, 'Partner', 0, boost); // 0 fee share by default
  }

  /**
   * @dev Remove a partner from the registry
   * @param partner Partner address
   */
  function removePartner(address partner) external override onlyOwner {
    if (_partners[partner].addr == address(0)) revert PartnerDoesNotExist(partner);

    // Find and remove from list
    for (uint256 i = 0; i < _partnerList.length; i++) {
      if (_partnerList[i] == partner) {
        _partnerList[i] = _partnerList[_partnerList.length - 1];
        _partnerList.pop();
        break;
      }
    }

    // Delete partner data
    delete _partners[partner];
    delete isPartnerActive[partner];

    emit PartnerRemoved(partner);
  }

  /**
   * @notice Check if this contract is registered for Sonic FeeM
   * @return isRegistered Whether the contract is registered for fee monetization
   */
  function checkFeeMStatus() external view returns (bool isRegistered) {
  }
}