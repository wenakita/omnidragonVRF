// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IOAppPeerManager } from "../../interfaces/external/layerzero/IOAppPeerManager.sol";

/**
 * @title LayerZeroV2PeerLib
 * @dev Library for LayerZero v2 peer management in OmniDragon ecosystem
 *
 * Provides gas-efficient peer management with comprehensive validation
 * Supports batch operations and emergency controls
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
library LayerZeroV2PeerLib {
    // Storage structure for peer management
    struct PeerStorage {
        mapping(uint32 eid => bytes32 peer) peers;
        mapping(uint32 eid => bool exists) peerExists;
        uint32[] configuredEids;
        mapping(uint32 eid => uint256 index) eidToIndex;
        address defaultDelegate;
        bool emergencyMode;
    }

    // Constants
    bytes32 private constant ZERO_BYTES32 = bytes32(0);
    uint32 private constant MAX_EIDS = 1000; // Reasonable limit

    // Events (library events are emitted by the calling contract)
    event PeerSet(uint32 indexed eid, bytes32 indexed peer);
    event PeerRemoved(uint32 indexed eid, bytes32 indexed peer);
    event DefaultDelegateSet(address indexed delegate);
    event EmergencyPeerRemoval(uint32 indexed eid, string reason);
    event EmergencyModeActivated();
    event EmergencyModeDeactivated();

    // Errors
    error PeerNotSet(uint32 eid);
    error PeerAlreadySet(uint32 eid, bytes32 peer);
    error InvalidPeer(bytes32 peer);
    error InvalidEndpointId(uint32 eid);
    error UnauthorizedPeer(uint32 eid, bytes32 sender);
    error DelegateNotSet();
    error TooManyEndpoints(uint32 count);
    error ArrayLengthMismatch();
    error EmergencyModeActive();
    error InvalidArrayLength();

    /**
     * @dev Set peer for a specific endpoint
     * @param self Storage reference
     * @param _eid Endpoint ID
     * @param _peer Peer address as bytes32
     */
    function setPeer(
        PeerStorage storage self,
        uint32 _eid,
        bytes32 _peer
    ) internal {
        if (self.emergencyMode) revert EmergencyModeActive();
        if (_eid == 0) revert InvalidEndpointId(_eid);
        if (_peer == ZERO_BYTES32) revert InvalidPeer(_peer);

        // Check if peer already set to prevent duplicates
        if (self.peers[_eid] == _peer && self.peerExists[_eid]) {
            revert PeerAlreadySet(_eid, _peer);
        }

        // Add to configured EIDs if not already present
        if (!self.peerExists[_eid]) {
            if (self.configuredEids.length >= MAX_EIDS) {
                revert TooManyEndpoints(uint32(self.configuredEids.length));
            }
            
            self.eidToIndex[_eid] = self.configuredEids.length;
            self.configuredEids.push(_eid);
            self.peerExists[_eid] = true;
        }

        self.peers[_eid] = _peer;
        emit PeerSet(_eid, _peer);
    }

    /**
     * @dev Set multiple peers in batch
     * @param self Storage reference
     * @param _eids Array of endpoint IDs
     * @param _peers Array of peer addresses
     */
    function setPeers(
        PeerStorage storage self,
        uint32[] calldata _eids,
        bytes32[] calldata _peers
    ) internal {
        if (_eids.length != _peers.length) revert ArrayLengthMismatch();
        if (_eids.length == 0) revert InvalidArrayLength();
        if (self.emergencyMode) revert EmergencyModeActive();

        for (uint256 i = 0; i < _eids.length; i++) {
            // Internal call bypasses emergency mode check since we already checked
            _setPeerInternal(self, _eids[i], _peers[i]);
        }
    }

    /**
     * @dev Internal setPeer without emergency mode check
     */
    function _setPeerInternal(
        PeerStorage storage self,
        uint32 _eid,
        bytes32 _peer
    ) private {
        if (_eid == 0) revert InvalidEndpointId(_eid);
        if (_peer == ZERO_BYTES32) revert InvalidPeer(_peer);

        // Add to configured EIDs if not already present
        if (!self.peerExists[_eid]) {
            if (self.configuredEids.length >= MAX_EIDS) {
                revert TooManyEndpoints(uint32(self.configuredEids.length));
            }
            
            self.eidToIndex[_eid] = self.configuredEids.length;
            self.configuredEids.push(_eid);
            self.peerExists[_eid] = true;
        }

        self.peers[_eid] = _peer;
        emit PeerSet(_eid, _peer);
    }

    /**
     * @dev Remove peer for a specific endpoint
     * @param self Storage reference
     * @param _eid Endpoint ID
     */
    function removePeer(
        PeerStorage storage self,
        uint32 _eid
    ) internal {
        if (!self.peerExists[_eid]) revert PeerNotSet(_eid);

        bytes32 peer = self.peers[_eid];
        
        // Remove from peers mapping
        delete self.peers[_eid];
        delete self.peerExists[_eid];

        // Remove from configured EIDs array
        uint256 index = self.eidToIndex[_eid];
        uint256 lastIndex = self.configuredEids.length - 1;
        
        if (index != lastIndex) {
            uint32 lastEid = self.configuredEids[lastIndex];
            self.configuredEids[index] = lastEid;
            self.eidToIndex[lastEid] = index;
        }
        
        self.configuredEids.pop();
        delete self.eidToIndex[_eid];

        emit PeerRemoved(_eid, peer);
    }

    /**
     * @dev Get peer for a specific endpoint
     * @param self Storage reference
     * @param _eid Endpoint ID
     * @return peer Peer address
     */
    function getPeer(
        PeerStorage storage self,
        uint32 _eid
    ) internal view returns (bytes32 peer) {
        return self.peers[_eid];
    }

    /**
     * @dev Get peer with revert if not set
     * @param self Storage reference
     * @param _eid Endpoint ID
     * @return peer Peer address
     */
    function getPeerOrRevert(
        PeerStorage storage self,
        uint32 _eid
    ) internal view returns (bytes32 peer) {
        peer = self.peers[_eid];
        if (peer == ZERO_BYTES32) revert PeerNotSet(_eid);
    }

    /**
     * @dev Check if peer is set for endpoint
     * @param self Storage reference
     * @param _eid Endpoint ID
     * @return isSet True if peer is set
     */
    function isPeerSet(
        PeerStorage storage self,
        uint32 _eid
    ) internal view returns (bool isSet) {
        return self.peerExists[_eid] && self.peers[_eid] != ZERO_BYTES32;
    }

    /**
     * @dev Check if sender is authorized peer
     * @param self Storage reference
     * @param _eid Endpoint ID
     * @param _sender Sender address
     * @return isAuthorized True if authorized
     */
    function isAuthorizedPeer(
        PeerStorage storage self,
        uint32 _eid,
        bytes32 _sender
    ) internal view returns (bool isAuthorized) {
        return self.peers[_eid] == _sender && self.peerExists[_eid];
    }

    /**
     * @dev Verify peer authorization and revert if not authorized
     * @param self Storage reference
     * @param _eid Endpoint ID
     * @param _sender Sender address
     */
    function requireAuthorizedPeer(
        PeerStorage storage self,
        uint32 _eid,
        bytes32 _sender
    ) internal view {
        if (!isAuthorizedPeer(self, _eid, _sender)) {
            revert UnauthorizedPeer(_eid, _sender);
        }
    }

    /**
     * @dev Get all configured endpoint IDs
     * @param self Storage reference
     * @return eids Array of endpoint IDs
     */
    function getConfiguredEids(
        PeerStorage storage self
    ) internal view returns (uint32[] memory eids) {
        return self.configuredEids;
    }

    /**
     * @dev Get peers for multiple endpoints
     * @param self Storage reference
     * @param _eids Array of endpoint IDs
     * @return peers Array of peer addresses
     */
    function getPeers(
        PeerStorage storage self,
        uint32[] calldata _eids
    ) internal view returns (bytes32[] memory peers) {
        peers = new bytes32[](_eids.length);
        for (uint256 i = 0; i < _eids.length; i++) {
            peers[i] = self.peers[_eids[i]];
        }
    }

    /**
     * @dev Emergency function to remove all peers
     * @param self Storage reference
     */
    function emergencyRemoveAllPeers(
        PeerStorage storage self
    ) internal {
        uint32[] memory eids = self.configuredEids;
        
        // Clear all peers
        for (uint256 i = 0; i < eids.length; i++) {
            uint32 eid = eids[i];
            // bytes32 peer = self.peers[eid]; // Unused variable removed
            delete self.peers[eid];
            delete self.peerExists[eid];
            delete self.eidToIndex[eid];
            emit EmergencyPeerRemoval(eid, "Emergency removal");
        }
        
        // Clear the configured EIDs array
        delete self.configuredEids;
        
        // Activate emergency mode
        self.emergencyMode = true;
        emit EmergencyModeActivated();
    }

    /**
     * @dev Deactivate emergency mode
     * @param self Storage reference
     */
    function deactivateEmergencyMode(
        PeerStorage storage self
    ) internal {
        self.emergencyMode = false;
        emit EmergencyModeDeactivated();
    }

    /**
     * @dev Set default delegate
     * @param self Storage reference
     * @param _delegate Delegate address
     */
    function setDefaultDelegate(
        PeerStorage storage self,
        address _delegate
    ) internal {
        self.defaultDelegate = _delegate;
        emit DefaultDelegateSet(_delegate);
    }

    /**
     * @dev Get default delegate
     * @param self Storage reference
     * @return delegate Delegate address
     */
    function getDefaultDelegate(
        PeerStorage storage self
    ) internal view returns (address delegate) {
        return self.defaultDelegate;
    }

    /**
     * @dev Check if in emergency mode
     * @param self Storage reference
     * @return inEmergency True if in emergency mode
     */
    function isEmergencyMode(
        PeerStorage storage self
    ) internal view returns (bool inEmergency) {
        return self.emergencyMode;
    }

    /**
     * @dev Convert address to bytes32
     * @param _addr Address to convert
     * @return bytes32 representation
     */
    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    /**
     * @dev Convert bytes32 to address
     * @param _bytes Bytes32 to convert
     * @return address representation
     */
    function bytes32ToAddress(bytes32 _bytes) internal pure returns (address) {
        return address(uint160(uint256(_bytes)));
    }

    /**
     * @dev Validate endpoint ID
     * @param _eid Endpoint ID to validate
     */
    function validateEndpointId(uint32 _eid) internal pure {
        if (_eid == 0) revert InvalidEndpointId(_eid);
    }

    /**
     * @dev Validate peer address
     * @param _peer Peer address to validate
     */
    function validatePeer(bytes32 _peer) internal pure {
        if (_peer == ZERO_BYTES32) revert InvalidPeer(_peer);
    }
} 