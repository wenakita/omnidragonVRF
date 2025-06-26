// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDVNManager
 * @dev LayerZero v2 DVN (Decentralized Verifier Network) management interface
 *
 * Provides standardized DVN configuration and management for OmniDragon ecosystem
 * Enables proper verification setup across different chains and message libraries
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
interface IDVNManager {
    // DVN Configuration structure
    struct DVNConfig {
        address dvnAddress;
        uint64 confirmations;
        uint16 multiplierBps;
        uint128 floorMarginUSD;
        bool isActive;
        uint256 gasLimit;
    }

    // Send/Receive library configuration
    struct LibraryConfig {
        address sendLibrary;
        address receiveLibrary;
        uint32 eid;
        uint256 gracePeriod;
        bool isDefault;
    }

    // DVN assignment parameters
    struct DVNAssignment {
        uint32 dstEid;
        address[] requiredDVNs;
        address[] optionalDVNs;
        uint8 requiredDVNCount;
        uint8 optionalDVNThreshold;
    }

    // Events
    event DVNConfigured(uint32 indexed eid, address indexed dvn, DVNConfig config);
    event DVNRemoved(uint32 indexed eid, address indexed dvn);
    event DVNAssignmentSet(uint32 indexed eid, address[] requiredDVNs, address[] optionalDVNs);
    event LibraryConfigured(uint32 indexed eid, address sendLib, address receiveLib);
    event DefaultDVNSet(address indexed dvn);
    event DVNFeePaid(address indexed dvn, uint256 fee);
    event DVNVerificationCompleted(uint32 indexed srcEid, bytes32 indexed messageHash, address indexed dvn);

    // Errors
    error DVNNotConfigured(address dvn);
    error InvalidDVNConfig(address dvn);
    error DVNAlreadyConfigured(address dvn);
    error InsufficientDVNs(uint8 required, uint8 available);
    error InvalidLibraryConfig(address libraryAddress);
    error DVNVerificationFailed(address dvn, bytes32 messageHash);
    error UnauthorizedDVN(address dvn);

    /**
     * @notice Configure DVN for a specific endpoint
     * @param _eid Endpoint ID
     * @param _dvn DVN address
     * @param _config DVN configuration parameters
     */
    function configureDVN(uint32 _eid, address _dvn, DVNConfig calldata _config) external;

    /**
     * @notice Configure multiple DVNs for an endpoint
     * @param _eid Endpoint ID
     * @param _dvns Array of DVN addresses
     * @param _configs Array of DVN configurations
     */
    function configureDVNs(
        uint32 _eid,
        address[] calldata _dvns,
        DVNConfig[] calldata _configs
    ) external;

    /**
     * @notice Set DVN assignment for message verification
     * @param _assignment DVN assignment configuration
     */
    function setDVNAssignment(DVNAssignment calldata _assignment) external;

    /**
     * @notice Configure send/receive libraries for an endpoint
     * @param _config Library configuration
     */
    function configureLibrary(LibraryConfig calldata _config) external;

    /**
     * @notice Remove DVN configuration
     * @param _eid Endpoint ID
     * @param _dvn DVN address to remove
     */
    function removeDVN(uint32 _eid, address _dvn) external;

    /**
     * @notice Get DVN configuration for an endpoint
     * @param _eid Endpoint ID
     * @param _dvn DVN address
     * @return config DVN configuration
     */
    function getDVNConfig(uint32 _eid, address _dvn) external view returns (DVNConfig memory config);

    /**
     * @notice Get all configured DVNs for an endpoint
     * @param _eid Endpoint ID
     * @return dvns Array of DVN addresses
     */
    function getConfiguredDVNs(uint32 _eid) external view returns (address[] memory dvns);

    /**
     * @notice Get DVN assignment for an endpoint
     * @param _eid Endpoint ID
     * @return assignment DVN assignment configuration
     */
    function getDVNAssignment(uint32 _eid) external view returns (DVNAssignment memory assignment);

    /**
     * @notice Check if DVN is configured and active
     * @param _eid Endpoint ID
     * @param _dvn DVN address
     * @return isActive True if DVN is active
     */
    function isDVNActive(uint32 _eid, address _dvn) external view returns (bool isActive);

    /**
     * @notice Estimate DVN fees for verification
     * @param _eid Destination endpoint ID
     * @param _confirmations Number of confirmations required
     * @param _options Verification options
     * @return totalFee Total estimated fee
     */
    function estimateDVNFees(
        uint32 _eid,
        uint64 _confirmations,
        bytes calldata _options
    ) external view returns (uint256 totalFee);

    /**
     * @notice Assign verification job to DVNs
     * @param _eid Destination endpoint ID
     * @param _packetHeader Packet header for verification
     * @param _payloadHash Hash of the payload
     * @param _confirmations Required confirmations
     * @param _options Verification options
     * @return assignedDVNs Array of DVNs assigned to the job
     * @return totalFee Total fee for the assignment
     */
    function assignVerificationJob(
        uint32 _eid,
        bytes calldata _packetHeader,
        bytes32 _payloadHash,
        uint64 _confirmations,
        bytes calldata _options
    ) external payable returns (address[] memory assignedDVNs, uint256 totalFee);

    /**
     * @notice Verify message using assigned DVNs
     * @param _srcEid Source endpoint ID
     * @param _messageHash Message hash to verify
     * @param _confirmations Number of confirmations
     * @return isVerified True if verification succeeded
     * @return verifyingDVNs DVNs that completed verification
     */
    function verifyMessage(
        uint32 _srcEid,
        bytes32 _messageHash,
        uint64 _confirmations
    ) external view returns (bool isVerified, address[] memory verifyingDVNs);

    /**
     * @notice Get library configuration for an endpoint
     * @param _eid Endpoint ID
     * @return config Library configuration
     */
    function getLibraryConfig(uint32 _eid) external view returns (LibraryConfig memory config);

    /**
     * @notice Emergency function to disable all DVNs
     * @dev Only for emergency situations
     */
    function emergencyDisableAllDVNs() external;

    /**
     * @notice Set default DVN for unspecified endpoints
     * @param _dvn Default DVN address
     */
    function setDefaultDVN(address _dvn) external;

    /**
     * @notice Get default DVN address
     * @return dvn Default DVN address
     */
    function getDefaultDVN() external view returns (address dvn);
} 