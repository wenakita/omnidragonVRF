// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleLayerZeroProxy
 * @dev Ultra-lightweight proxy for LayerZero endpoints
 * Small enough to deploy via CREATE2 for identical addresses across chains
 * 
 * This contract acts as a proxy to the real LayerZero endpoint
 * allowing omniDRAGON to be deployed with identical addresses
 * while still connecting to chain-specific LayerZero endpoints
 */
contract SimpleLayerZeroProxy is Ownable {
    // Real LayerZero endpoint address
    address public lzEndpoint;
    
    // Events
    event EndpointUpdated(address indexed oldEndpoint, address indexed newEndpoint);
    
    /**
     * @dev Constructor
     * @param _initialEndpoint Initial LayerZero endpoint (can be placeholder)
     * @param _owner Contract owner
     */
    constructor(address _initialEndpoint, address _owner) Ownable(_owner) {
        lzEndpoint = _initialEndpoint;
    }
    
    /**
     * @notice Update the LayerZero endpoint
     * @param _newEndpoint New LayerZero endpoint address
     */
    function updateEndpoint(address _newEndpoint) external onlyOwner {
        require(_newEndpoint != address(0), "Zero address");
        
        address oldEndpoint = lzEndpoint;
        lzEndpoint = _newEndpoint;
        
        emit EndpointUpdated(oldEndpoint, _newEndpoint);
    }
    
    /**
     * @dev Fallback function that delegates all calls to the LayerZero endpoint
     */
    fallback() external payable {
        address endpoint = lzEndpoint;
        require(endpoint != address(0), "Endpoint not set");
        
        assembly {
            // Copy msg.data to memory
            calldatacopy(0, 0, calldatasize())
            
            // Forward call to endpoint
            let result := delegatecall(gas(), endpoint, 0, calldatasize(), 0, 0)
            
            // Copy the returned data
            returndatacopy(0, 0, returndatasize())
            
            // Return or revert
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
} 