// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOAppPeerManager
 * @dev LayerZero v2 peer management interface for OmniDragon ecosystem
 *
 * Provides standardized peer management across all OmniDragon contracts
 * Enables seamless cross-chain communication setup and maintenance
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
interface IOAppPeerManager {
    // Events
    event PeerSet(uint32 indexed eid, bytes32 indexed peer);
    event PeerRemoved(uint32 indexed eid, bytes32 indexed peer);
    event DefaultDelegateSet(address indexed delegate);
    event EmergencyPeerRemoval(uint32 indexed eid, string reason);

    // Errors
    error PeerNotSet(uint32 eid);
    error PeerAlreadySet(uint32 eid, bytes32 peer);
    error InvalidPeer(bytes32 peer);
    error InvalidEndpointId(uint32 eid);
    error UnauthorizedPeer(uint32 eid, bytes32 sender);
    error DelegateNotSet();

    /**
     * @notice Set peer address for a specific endpoint
     * @param _eid Endpoint ID (uint32 for LayerZero v2)
     * @param _peer Peer contract address as bytes32
     */
    function setPeer(uint32 _eid, bytes32 _peer) external;

    /**
     * @notice Set multiple peers in a single transaction
     * @param _eids Array of endpoint IDs
     * @param _peers Array of peer addresses (must match _eids length)
     */
    function setPeers(uint32[] calldata _eids, bytes32[] calldata _peers) external;

    /**
     * @notice Remove peer for a specific endpoint
     * @param _eid Endpoint ID to remove peer for
     */
    function removePeer(uint32 _eid) external;

    /**
     * @notice Get peer address for an endpoint
     * @param _eid Endpoint ID
     * @return peer Peer address as bytes32
     */
    function getPeer(uint32 _eid) external view returns (bytes32 peer);

    /**
     * @notice Check if peer is set for an endpoint
     * @param _eid Endpoint ID
     * @return isSet True if peer is set
     */
    function isPeerSet(uint32 _eid) external view returns (bool isSet);

    /**
     * @notice Check if sender is authorized peer for an endpoint
     * @param _eid Endpoint ID
     * @param _sender Sender address to check
     * @return isAuthorized True if sender is authorized
     */
    function isAuthorizedPeer(uint32 _eid, bytes32 _sender) external view returns (bool isAuthorized);

    /**
     * @notice Get all configured endpoint IDs
     * @return eids Array of configured endpoint IDs
     */
    function getConfiguredEids() external view returns (uint32[] memory eids);

    /**
     * @notice Get peer configuration for multiple endpoints
     * @param _eids Array of endpoint IDs to query
     * @return peers Array of peer addresses
     */
    function getPeers(uint32[] calldata _eids) external view returns (bytes32[] memory peers);

    /**
     * @notice Emergency function to remove all peers
     * @dev Only for emergency situations - requires special authorization
     */
    function emergencyRemoveAllPeers() external;

    /**
     * @notice Helper to convert address to bytes32
     * @param _addr Address to convert
     * @return bytes32 representation
     */
    function addressToBytes32(address _addr) external pure returns (bytes32);

    /**
     * @notice Helper to convert bytes32 to address
     * @param _bytes Bytes32 to convert
     * @return address representation
     */
    function bytes32ToAddress(bytes32 _bytes) external pure returns (address);
} 