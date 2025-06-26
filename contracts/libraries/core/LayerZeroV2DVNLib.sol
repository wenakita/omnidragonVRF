// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IDVNManager } from "../../interfaces/external/layerzero/IDVNManager.sol";

/**
 * @title LayerZeroV2DVNLib
 * @dev Library for LayerZero v2 DVN management in OmniDragon ecosystem
 *
 * Provides comprehensive DVN configuration and verification management
 * Supports multiple verification strategies and emergency controls
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
library LayerZeroV2DVNLib {
    // DVN Configuration structure
    struct DVNConfig {
        address dvnAddress;
        uint64 confirmations;
        uint16 multiplierBps;
        uint128 floorMarginUSD;
        bool isActive;
        uint256 gasLimit;
    }

    // DVN assignment parameters
    struct DVNAssignment {
        uint32 dstEid;
        address[] requiredDVNs;
        address[] optionalDVNs;
        uint8 requiredDVNCount;
        uint8 optionalDVNThreshold;
    }

    // Storage structure for DVN management
    struct DVNStorage {
        mapping(uint32 eid => mapping(address dvn => DVNConfig)) dvnConfigs;
        mapping(uint32 eid => address[] dvns) configuredDVNs;
        mapping(uint32 eid => mapping(address dvn => uint256 index)) dvnToIndex;
        mapping(uint32 eid => DVNAssignment) dvnAssignments;
        address defaultDVN;
        bool emergencyMode;
        mapping(address dvn => bool disabled) emergencyDisabled;
        mapping(address dvn => uint256 totalFees) dvnFees;
    }

    // Constants
    uint8 private constant MAX_DVNS_PER_ENDPOINT = 50;
    uint64 private constant MIN_CONFIRMATIONS = 1;
    uint64 private constant MAX_CONFIRMATIONS = 1000;
    uint16 private constant MAX_MULTIPLIER_BPS = 50000; // 500%
    uint256 private constant MIN_GAS_LIMIT = 21000;

    // Events
    event DVNConfigured(uint32 indexed eid, address indexed dvn);
    event DVNRemoved(uint32 indexed eid, address indexed dvn);
    event DVNAssignmentSet(uint32 indexed eid, address[] requiredDVNs, address[] optionalDVNs);
    event DefaultDVNSet(address indexed dvn);
    event DVNFeePaid(address indexed dvn, uint256 fee);
    event EmergencyDVNDisabled(address indexed dvn, string reason);
    event EmergencyModeActivated();
    event EmergencyModeDeactivated();

    // Errors
    error DVNNotConfigured(address dvn);
    error InvalidDVNConfig(address dvn);
    error DVNAlreadyConfigured(address dvn);
    error InsufficientDVNs(uint8 required, uint8 available);
    error InvalidEndpointId(uint32 eid);
    error UnauthorizedDVN(address dvn);
    error TooManyDVNs(uint8 count);
    error InvalidConfirmations(uint64 confirmations);
    error InvalidMultiplier(uint16 multiplier);
    error InvalidGasLimit(uint256 gasLimit);
    error EmergencyModeActive();
    error DVNEmergencyDisabled(address dvn);
    error ArrayLengthMismatch();

    /**
     * @dev Configure DVN for a specific endpoint
     * @param self Storage reference
     * @param _eid Endpoint ID
     * @param _dvn DVN address
     * @param _config DVN configuration
     */
    function configureDVN(
        DVNStorage storage self,
        uint32 _eid,
        address _dvn,
        DVNConfig calldata _config
    ) internal {
        if (self.emergencyMode) revert EmergencyModeActive();
        _validateDVNConfig(_dvn, _config);
        
        bool isNew = !self.dvnConfigs[_eid][_dvn].isActive;
        
        if (isNew) {
            if (self.configuredDVNs[_eid].length >= MAX_DVNS_PER_ENDPOINT) {
                revert TooManyDVNs(uint8(self.configuredDVNs[_eid].length));
            }
            
            self.dvnToIndex[_eid][_dvn] = self.configuredDVNs[_eid].length;
            self.configuredDVNs[_eid].push(_dvn);
        }
        
        self.dvnConfigs[_eid][_dvn] = _config;
        emit DVNConfigured(_eid, _dvn);
    }

    /**
     * @dev Configure multiple DVNs for an endpoint
     */
    function configureDVNs(
        DVNStorage storage self,
        uint32 _eid,
        address[] calldata _dvns,
        DVNConfig[] calldata _configs
    ) internal {
        if (_dvns.length != _configs.length) revert ArrayLengthMismatch();
        if (self.emergencyMode) revert EmergencyModeActive();
        
        for (uint256 i = 0; i < _dvns.length; i++) {
            _configureDVNInternal(self, _eid, _dvns[i], _configs[i]);
        }
    }

    /**
     * @dev Internal DVN configuration
     */
    function _configureDVNInternal(
        DVNStorage storage self,
        uint32 _eid,
        address _dvn,
        DVNConfig calldata _config
    ) private {
        _validateDVNConfig(_dvn, _config);
        
        bool isNew = !self.dvnConfigs[_eid][_dvn].isActive;
        
        if (isNew) {
            if (self.configuredDVNs[_eid].length >= MAX_DVNS_PER_ENDPOINT) {
                revert TooManyDVNs(uint8(self.configuredDVNs[_eid].length));
            }
            
            self.dvnToIndex[_eid][_dvn] = self.configuredDVNs[_eid].length;
            self.configuredDVNs[_eid].push(_dvn);
        }
        
        self.dvnConfigs[_eid][_dvn] = _config;
        emit DVNConfigured(_eid, _dvn);
    }

    /**
     * @dev Set DVN assignment for message verification
     */
    function setDVNAssignment(
        DVNStorage storage self,
        DVNAssignment calldata _assignment
    ) internal {
        if (self.emergencyMode) revert EmergencyModeActive();
        
        // Validate assignment
        if (_assignment.requiredDVNs.length < _assignment.requiredDVNCount) {
            revert InsufficientDVNs(_assignment.requiredDVNCount, uint8(_assignment.requiredDVNs.length));
        }
        
        self.dvnAssignments[_assignment.dstEid] = _assignment;
        emit DVNAssignmentSet(_assignment.dstEid, _assignment.requiredDVNs, _assignment.optionalDVNs);
    }

    /**
     * @dev Remove DVN configuration
     */
    function removeDVN(
        DVNStorage storage self,
        uint32 _eid,
        address _dvn
    ) internal {
        if (!self.dvnConfigs[_eid][_dvn].isActive) revert DVNNotConfigured(_dvn);
        
        // Remove from configured DVNs array
        uint256 index = self.dvnToIndex[_eid][_dvn];
        uint256 lastIndex = self.configuredDVNs[_eid].length - 1;
        
        if (index != lastIndex) {
            address lastDVN = self.configuredDVNs[_eid][lastIndex];
            self.configuredDVNs[_eid][index] = lastDVN;
            self.dvnToIndex[_eid][lastDVN] = index;
        }
        
        self.configuredDVNs[_eid].pop();
        delete self.dvnToIndex[_eid][_dvn];
        delete self.dvnConfigs[_eid][_dvn];
        
        emit DVNRemoved(_eid, _dvn);
    }

    /**
     * @dev Set default DVN
     */
    function setDefaultDVN(
        DVNStorage storage self,
        address _dvn
    ) internal {
        self.defaultDVN = _dvn;
        emit DefaultDVNSet(_dvn);
    }

    /**
     * @dev Emergency disable all DVNs
     */
    function emergencyDisableAllDVNs(
        DVNStorage storage self
    ) internal {
        self.emergencyMode = true;
        emit EmergencyModeActivated();
    }

    /**
     * @dev Emergency disable specific DVN
     */
    function emergencyDisableDVN(
        DVNStorage storage self,
        address _dvn,
        string memory _reason
    ) internal {
        self.emergencyDisabled[_dvn] = true;
        emit EmergencyDVNDisabled(_dvn, _reason);
    }

    /**
     * @dev Deactivate emergency mode
     */
    function deactivateEmergencyMode(
        DVNStorage storage self
    ) internal {
        self.emergencyMode = false;
        emit EmergencyModeDeactivated();
    }

    // ============ VIEW FUNCTIONS ============

    function getDVNConfig(
        DVNStorage storage self,
        uint32 _eid,
        address _dvn
    ) internal view returns (DVNConfig memory) {
        return self.dvnConfigs[_eid][_dvn];
    }

    function getConfiguredDVNs(
        DVNStorage storage self,
        uint32 _eid
    ) internal view returns (address[] memory) {
        return self.configuredDVNs[_eid];
    }

    function getDVNAssignment(
        DVNStorage storage self,
        uint32 _eid
    ) internal view returns (DVNAssignment memory) {
        return self.dvnAssignments[_eid];
    }

    function isDVNActive(
        DVNStorage storage self,
        uint32 _eid,
        address _dvn
    ) internal view returns (bool) {
        return self.dvnConfigs[_eid][_dvn].isActive && !self.emergencyDisabled[_dvn];
    }

    function getDefaultDVN(
        DVNStorage storage self
    ) internal view returns (address) {
        return self.defaultDVN;
    }

    function isEmergencyMode(
        DVNStorage storage self
    ) internal view returns (bool) {
        return self.emergencyMode;
    }

    // ============ INTERNAL HELPER FUNCTIONS ============

    /**
     * @dev Validate DVN configuration
     */
    function _validateDVNConfig(
        address _dvn,
        DVNConfig calldata _config
    ) private pure {
        if (_dvn == address(0)) revert InvalidDVNConfig(_dvn);
        if (_config.confirmations < MIN_CONFIRMATIONS || _config.confirmations > MAX_CONFIRMATIONS) {
            revert InvalidConfirmations(_config.confirmations);
        }
        if (_config.multiplierBps > MAX_MULTIPLIER_BPS) {
            revert InvalidMultiplier(_config.multiplierBps);
        }
        if (_config.gasLimit < MIN_GAS_LIMIT) {
            revert InvalidGasLimit(_config.gasLimit);
        }
    }
} 