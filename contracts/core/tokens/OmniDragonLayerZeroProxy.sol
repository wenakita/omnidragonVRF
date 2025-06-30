// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

/**
 * @title OmniDragonLayerZeroProxy
 * @dev Proxy contract that allows configurable LayerZero V2 endpoints
 * @notice This contract acts as a configurable proxy for LayerZero endpoints
 * @notice while maintaining compatibility with the omniDRAGON ecosystem
 */
contract OmniDragonLayerZeroProxy is Ownable, ReentrancyGuard {
    
    // ======== STORAGE ========
    
    /// @notice Current LayerZero V2 endpoint address
    address public currentEndpoint;
    
    /// @notice Timelock delay for endpoint changes (48 hours)
    uint256 public constant ENDPOINT_TIMELOCK_DELAY = 48 hours;
    
    /// @notice Timestamp of last endpoint change
    uint256 public lastEndpointChangeTimestamp;
    
    /// @notice Pending endpoint change
    struct PendingEndpointChange {
        address newEndpoint;
        uint256 effectiveTimestamp;
        bool isPending;
    }
    
    PendingEndpointChange public pendingEndpointChange;
    
    /// @notice Emergency pause flag
    bool public emergencyPaused;
    
    /// @notice Emergency pauser address
    address public emergencyPauser;
    
    // ======== EVENTS ========
    
    event EndpointChangeProposed(address indexed oldEndpoint, address indexed newEndpoint, uint256 effectiveTimestamp);
    event EndpointChanged(address indexed oldEndpoint, address indexed newEndpoint);
    event EndpointChangeExecuted(address indexed newEndpoint);
    event EndpointChangeCancelled(address indexed proposedEndpoint);
    event EmergencyPauseToggled(bool paused);
    event EmergencyPauserUpdated(address indexed oldPauser, address indexed newPauser);
    
    // ======== ERRORS ========
    
    error ZeroAddress();
    error TimelockNotMet();
    error NoPendingChange();
    error EmergencyPaused();
    error NotAuthorized();
    error SameEndpoint();
    
    // ======== MODIFIERS ========
    
    modifier notEmergencyPaused() {
        if (emergencyPaused) revert EmergencyPaused();
        _;
    }
    
    modifier onlyEmergencyPauserOrOwner() {
        if (msg.sender != emergencyPauser && msg.sender != owner()) revert NotAuthorized();
        _;
    }
    
    modifier validAddress(address addr) {
        if (addr == address(0)) revert ZeroAddress();
        _;
    }
    
    // ======== CONSTRUCTOR ========
    
    constructor(
        address _initialEndpoint,
        address _owner,
        address _emergencyPauser
    ) Ownable(_owner) validAddress(_initialEndpoint) validAddress(_owner) {
        currentEndpoint = _initialEndpoint;
        emergencyPauser = _emergencyPauser;
        lastEndpointChangeTimestamp = block.timestamp;
        
        emit EndpointChanged(address(0), _initialEndpoint);
    }
    
    // ======== ENDPOINT MANAGEMENT ========
    
    /**
     * @dev Propose a new LayerZero endpoint address
     * @param _newEndpoint The new LayerZero endpoint address
     * @notice Initiates a timelock for endpoint change
     */
    function proposeEndpointChange(address _newEndpoint) 
        external 
        onlyOwner 
        validAddress(_newEndpoint) 
        notEmergencyPaused 
    {
        if (_newEndpoint == currentEndpoint) revert SameEndpoint();
        
        uint256 effectiveTimestamp = block.timestamp + ENDPOINT_TIMELOCK_DELAY;
        
        pendingEndpointChange = PendingEndpointChange({
            newEndpoint: _newEndpoint,
            effectiveTimestamp: effectiveTimestamp,
            isPending: true
        });
        
        emit EndpointChangeProposed(currentEndpoint, _newEndpoint, effectiveTimestamp);
    }
    
    /**
     * @dev Execute the pending endpoint change after timelock
     * @notice Can only be called after the timelock delay has passed
     */
    function executeEndpointChange() external onlyOwner notEmergencyPaused {
        if (!pendingEndpointChange.isPending) revert NoPendingChange();
        if (block.timestamp < pendingEndpointChange.effectiveTimestamp) revert TimelockNotMet();
        
        address oldEndpoint = currentEndpoint;
        address newEndpoint = pendingEndpointChange.newEndpoint;
        
        currentEndpoint = newEndpoint;
        lastEndpointChangeTimestamp = block.timestamp;
        
        // Clear pending change
        delete pendingEndpointChange;
        
        emit EndpointChanged(oldEndpoint, newEndpoint);
        emit EndpointChangeExecuted(newEndpoint);
    }
    
    /**
     * @dev Cancel a pending endpoint change
     * @notice Only owner can cancel pending changes
     */
    function cancelEndpointChange() external onlyOwner {
        if (!pendingEndpointChange.isPending) revert NoPendingChange();
        
        address proposedEndpoint = pendingEndpointChange.newEndpoint;
        delete pendingEndpointChange;
        
        emit EndpointChangeCancelled(proposedEndpoint);
    }
    
    // ======== PROXY FUNCTIONS ========
    
    /**
     * @dev Get the current LayerZero endpoint
     * @return The current endpoint address
     */
    function getEndpoint() external view returns (address) {
        return currentEndpoint;
    }
    
    /**
     * @dev Get the current LayerZero endpoint as ILayerZeroEndpointV2
     * @return The current endpoint interface
     */
    function getEndpointInterface() external view returns (ILayerZeroEndpointV2) {
        return ILayerZeroEndpointV2(currentEndpoint);
    }
    
    /**
     * @dev Check if endpoint is operational
     * @return True if endpoint is set and not paused
     */
    function isEndpointOperational() external view returns (bool) {
        return currentEndpoint != address(0) && !emergencyPaused;
    }
    
    /**
     * @dev Get pending endpoint change details
     * @return newEndpoint The proposed new endpoint
     * @return effectiveTimestamp When the change can be executed
     * @return isPending Whether there's a pending change
     */
    function getPendingEndpointChange() external view returns (
        address newEndpoint,
        uint256 effectiveTimestamp,
        bool isPending
    ) {
        return (
            pendingEndpointChange.newEndpoint,
            pendingEndpointChange.effectiveTimestamp,
            pendingEndpointChange.isPending
        );
    }
    
    /**
     * @dev Get time remaining until endpoint change can be executed
     * @return timeRemaining Seconds until change can be executed (0 if ready)
     */
    function getTimeUntilEndpointChange() external view returns (uint256 timeRemaining) {
        if (!pendingEndpointChange.isPending) return 0;
        
        if (block.timestamp >= pendingEndpointChange.effectiveTimestamp) {
            return 0;
        }
        
        return pendingEndpointChange.effectiveTimestamp - block.timestamp;
    }
    
    // ======== EMERGENCY FUNCTIONS ========
    
    /**
     * @dev Emergency pause/unpause the proxy
     * @param _paused Whether to pause or unpause
     */
    function setEmergencyPause(bool _paused) external onlyEmergencyPauserOrOwner {
        emergencyPaused = _paused;
        emit EmergencyPauseToggled(_paused);
    }
    
    /**
     * @dev Update emergency pauser address
     * @param _newEmergencyPauser New emergency pauser address
     */
    function setEmergencyPauser(address _newEmergencyPauser) 
        external 
        onlyOwner 
        validAddress(_newEmergencyPauser) 
    {
        address oldPauser = emergencyPauser;
        emergencyPauser = _newEmergencyPauser;
        emit EmergencyPauserUpdated(oldPauser, _newEmergencyPauser);
    }
    
    // ======== VIEW FUNCTIONS ========
    
    /**
     * @dev Get comprehensive proxy status
     * @return endpoint Current endpoint address
     * @return paused Emergency pause status
     * @return pendingChange Whether there's a pending endpoint change
     * @return timeToChange Seconds until pending change can be executed
     */
    function getProxyStatus() external view returns (
        address endpoint,
        bool paused,
        bool pendingChange,
        uint256 timeToChange
    ) {
        endpoint = currentEndpoint;
        paused = emergencyPaused;
        pendingChange = pendingEndpointChange.isPending;
        
        if (pendingChange && block.timestamp < pendingEndpointChange.effectiveTimestamp) {
            timeToChange = pendingEndpointChange.effectiveTimestamp - block.timestamp;
        } else {
            timeToChange = 0;
        }
    }
} 