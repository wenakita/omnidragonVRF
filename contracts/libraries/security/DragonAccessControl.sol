// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';

/**
 * @title DragonAccessControl
 * @dev Comprehensive role-based access control for the Dragon ecosystem
 * Implements audit recommendations to reduce centralization risks
 */
abstract contract DragonAccessControl is AccessControlEnumerable, Pausable {
  // Role definitions
  bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');
  bytes32 public constant OPERATOR_ROLE = keccak256('OPERATOR_ROLE');
  bytes32 public constant PAUSER_ROLE = keccak256('PAUSER_ROLE');
  bytes32 public constant FEE_MANAGER_ROLE = keccak256('FEE_MANAGER_ROLE');
  bytes32 public constant LOTTERY_MANAGER_ROLE = keccak256('LOTTERY_MANAGER_ROLE');
  bytes32 public constant TREASURY_ROLE = keccak256('TREASURY_ROLE');
  bytes32 public constant UPGRADER_ROLE = keccak256('UPGRADER_ROLE');
  bytes32 public constant ORACLE_ROLE = keccak256('ORACLE_ROLE');
  bytes32 public constant PARTNER_MANAGER_ROLE = keccak256('PARTNER_MANAGER_ROLE');

  // Multi-signature requirements
  mapping(bytes32 => uint256) public roleThresholds;
  mapping(bytes32 => mapping(bytes32 => mapping(address => bool))) public roleProposalSignatures;
  mapping(bytes32 => mapping(bytes32 => uint256)) public roleProposalSignatureCount;

  // Events
  event RoleThresholdSet(bytes32 indexed role, uint256 threshold);
  event MultiSigProposalCreated(bytes32 indexed role, bytes32 indexed proposalId, address proposer);
  event MultiSigProposalSigned(bytes32 indexed role, bytes32 indexed proposalId, address signer);
  event MultiSigProposalExecuted(bytes32 indexed role, bytes32 indexed proposalId);

  // Errors
  error InsufficientSignatures();
  error AlreadySigned();
  error ProposalNotFound();
  error InvalidThreshold();

  constructor() {
    // Set up initial roles
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(ADMIN_ROLE, msg.sender);

    // Set role hierarchies
    _setRoleAdmin(OPERATOR_ROLE, ADMIN_ROLE);
    _setRoleAdmin(PAUSER_ROLE, ADMIN_ROLE);
    _setRoleAdmin(FEE_MANAGER_ROLE, ADMIN_ROLE);
    _setRoleAdmin(LOTTERY_MANAGER_ROLE, ADMIN_ROLE);
    _setRoleAdmin(TREASURY_ROLE, ADMIN_ROLE);
    _setRoleAdmin(UPGRADER_ROLE, ADMIN_ROLE);
    _setRoleAdmin(ORACLE_ROLE, ADMIN_ROLE);
    _setRoleAdmin(PARTNER_MANAGER_ROLE, ADMIN_ROLE);

    // Set default thresholds (can be updated)
    roleThresholds[ADMIN_ROLE] = 2;
    roleThresholds[TREASURY_ROLE] = 2;
    roleThresholds[UPGRADER_ROLE] = 3;
  }

  /**
   * @dev Modifier for admin functions
   */
  modifier onlyAdmin() {
    require(hasRole(ADMIN_ROLE, msg.sender), 'DragonAccessControl: admin only');
    _;
  }

  /**
   * @dev Modifier for operator functions
   */
  modifier onlyOperator() {
    require(hasRole(OPERATOR_ROLE, msg.sender), 'DragonAccessControl: operator only');
    _;
  }

  /**
   * @dev Modifier for fee management functions
   */
  modifier onlyFeeManager() {
    require(hasRole(FEE_MANAGER_ROLE, msg.sender), 'DragonAccessControl: fee manager only');
    _;
  }

  /**
   * @dev Modifier for lottery management functions
   */
  modifier onlyLotteryManager() {
    require(hasRole(LOTTERY_MANAGER_ROLE, msg.sender), 'DragonAccessControl: lottery manager only');
    _;
  }

  /**
   * @dev Modifier for treasury functions
   */
  modifier onlyTreasury() {
    require(hasRole(TREASURY_ROLE, msg.sender), 'DragonAccessControl: treasury only');
    _;
  }

  /**
   * @dev Modifier for functions requiring multi-signature
   */
  modifier requiresMultiSig(bytes32 role, bytes32 proposalId) {
    uint256 threshold = roleThresholds[role];
    if (threshold > 1) {
      // Check if proposal has enough signatures
      if (roleProposalSignatureCount[role][proposalId] < threshold) {
        // Record signature
        if (roleProposalSignatures[role][proposalId][msg.sender]) {
          revert AlreadySigned();
        }

        roleProposalSignatures[role][proposalId][msg.sender] = true;
        roleProposalSignatureCount[role][proposalId]++;

        emit MultiSigProposalSigned(role, proposalId, msg.sender);

        // If still not enough signatures, revert
        if (roleProposalSignatureCount[role][proposalId] < threshold) {
          revert InsufficientSignatures();
        }
      }

      emit MultiSigProposalExecuted(role, proposalId);
    }
    _;
  }

  /**
   * @dev Set role threshold for multi-signature
   * @param role The role to set threshold for
   * @param threshold The number of signatures required
   */
  function setRoleThreshold(bytes32 role, uint256 threshold) external onlyAdmin {
    if (threshold == 0) revert InvalidThreshold();

    // Get current role member count
    uint256 memberCount = getRoleMemberCount(role);
    if (threshold > memberCount) revert InvalidThreshold();

    roleThresholds[role] = threshold;
    emit RoleThresholdSet(role, threshold);
  }

  /**
   * @dev Pause contract operations
   */
  function pause() external {
    require(hasRole(PAUSER_ROLE, msg.sender), 'DragonAccessControl: pauser only');
    _pause();
  }

  /**
   * @dev Unpause contract operations
   */
  function unpause() external onlyAdmin {
    _unpause();
  }

  /**
   * @dev Check if address has any privileged role
   * @param account The address to check
   * @return Whether the address has any privileged role
   */
  function hasPrivilegedRole(address account) public view returns (bool) {
    return
      hasRole(ADMIN_ROLE, account) ||
      hasRole(OPERATOR_ROLE, account) ||
      hasRole(FEE_MANAGER_ROLE, account) ||
      hasRole(LOTTERY_MANAGER_ROLE, account) ||
      hasRole(TREASURY_ROLE, account) ||
      hasRole(UPGRADER_ROLE, account) ||
      hasRole(ORACLE_ROLE, account) ||
      hasRole(PARTNER_MANAGER_ROLE, account);
  }

  /**
   * @dev Get all roles for an account
   * @param account The address to check
   * @return roles Array of role identifiers
   */
  function getAccountRoles(address account) external view returns (bytes32[] memory roles) {
    uint256 count = 0;
    bytes32[] memory tempRoles = new bytes32[](9);

    if (hasRole(DEFAULT_ADMIN_ROLE, account)) tempRoles[count++] = DEFAULT_ADMIN_ROLE;
    if (hasRole(ADMIN_ROLE, account)) tempRoles[count++] = ADMIN_ROLE;
    if (hasRole(OPERATOR_ROLE, account)) tempRoles[count++] = OPERATOR_ROLE;
    if (hasRole(PAUSER_ROLE, account)) tempRoles[count++] = PAUSER_ROLE;
    if (hasRole(FEE_MANAGER_ROLE, account)) tempRoles[count++] = FEE_MANAGER_ROLE;
    if (hasRole(LOTTERY_MANAGER_ROLE, account)) tempRoles[count++] = LOTTERY_MANAGER_ROLE;
    if (hasRole(TREASURY_ROLE, account)) tempRoles[count++] = TREASURY_ROLE;
    if (hasRole(UPGRADER_ROLE, account)) tempRoles[count++] = UPGRADER_ROLE;
    if (hasRole(ORACLE_ROLE, account)) tempRoles[count++] = ORACLE_ROLE;
    if (hasRole(PARTNER_MANAGER_ROLE, account)) tempRoles[count++] = PARTNER_MANAGER_ROLE;

    roles = new bytes32[](count);
    for (uint256 i = 0; i < count; i++) {
      roles[i] = tempRoles[i];
    }

    return roles;
  }

  /**
   * @dev Create a multi-sig proposal
   * @param role The role requiring multi-sig
   * @param proposalData The proposal data for ID generation
   * @return proposalId The generated proposal ID
   */
  function createMultiSigProposal(bytes32 role, bytes memory proposalData) internal returns (bytes32 proposalId) {
    proposalId = keccak256(abi.encodePacked(role, proposalData, block.timestamp));
    emit MultiSigProposalCreated(role, proposalId, msg.sender);
    return proposalId;
  }

  /**
   * @dev Clear a multi-sig proposal after execution
   * @param role The role of the proposal
   * @param proposalId The proposal ID to clear
   */
  function clearMultiSigProposal(bytes32 role, bytes32 proposalId) internal {
    roleProposalSignatureCount[role][proposalId] = 0;
    // Note: We don't clear individual signatures to save gas
    // They're invalidated by the signature count reset
  }
}
