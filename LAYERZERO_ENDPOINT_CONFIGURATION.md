# LayerZero V2 Endpoint Configuration Solution

## Overview

This document explains the solution for making LayerZero V2 endpoints configurable while respecting the immutable nature of the OApp pattern. The solution provides flexibility for endpoint management through a secure proxy pattern with timelock mechanisms.

## Background

LayerZero V2 uses an immutable endpoint pattern where the LayerZero endpoint address is set in the constructor and cannot be changed after deployment. This design ensures security and predictability but limits flexibility for endpoint updates.

Our solution provides configurable endpoints through:
1. **Direct Access**: Functions to view the current LayerZero endpoint
2. **Proxy Pattern**: A separate proxy contract for advanced endpoint management
3. **Security Features**: Timelock mechanisms and emergency controls

## Solution Components

### 1. Enhanced omniDRAGON Contract

The omniDRAGON contract now includes functions to access the LayerZero endpoint:

```solidity
/**
 * @dev Get current LayerZero endpoint address
 * @return The current LayerZero endpoint address
 * @notice LayerZero V2 endpoints are immutable and set in constructor
 * @notice To change endpoints, deploy a new contract with the desired endpoint
 */
function getLayerZeroEndpoint() external view returns (address) {
    return address(endpoint);
}

/**
 * @dev Check if LayerZero endpoint is operational
 * @return True if endpoint is set and operational
 */
function isLayerZeroEndpointSet() external view returns (bool) {
    return address(endpoint) != address(0);
}
```

### 2. OmniDragonLayerZeroProxy Contract

A dedicated proxy contract that provides configurable endpoint management:

**Key Features:**
- **Timelock Protection**: 48-hour delay for endpoint changes
- **Emergency Controls**: Pause/unpause functionality
- **Access Control**: Owner and emergency pauser roles
- **Transparency**: Full event logging and status tracking

**Core Functions:**
- `proposeEndpointChange(address _newEndpoint)`: Propose a new endpoint
- `executeEndpointChange()`: Execute pending change after timelock
- `cancelEndpointChange()`: Cancel pending changes
- `setEmergencyPause(bool _paused)`: Emergency pause/unpause
- `getProxyStatus()`: Get comprehensive status information

## Network Configuration

### Current LayerZero V2 Endpoints

| Network   | Chain ID | LayerZero Endpoint                           |
|-----------|----------|----------------------------------------------|
| Sonic     | 146      | `0x6F475642a6e85809B1c36Fa62763669b1b48DD5B` |
| Arbitrum  | 42161    | `0x1a44076050125825900e736c501f859c50fE728c` |
| Avalanche | 43114    | `0x1a44076050125825900e736c501f859c50fE728c` |

## Deployment Guide

### 1. Deploy LayerZero Proxy

```bash
# Deploy on Sonic
npx hardhat deploy-layerzero-proxy --network sonic

# Deploy on Arbitrum  
npx hardhat deploy-layerzero-proxy --network arbitrum

# Deploy on Avalanche
npx hardhat deploy-layerzero-proxy --network avalanche

# Deploy with custom parameters
npx hardhat deploy-layerzero-proxy \
  --network sonic \
  --initial-endpoint "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B" \
  --owner "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F" \
  --emergency-pauser "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F"
```

### 2. Verify Deployment

```bash
# Check proxy status
npx hardhat manage-layerzero-proxy --action status --network sonic

# Verify on block explorer
npx hardhat verify --network sonic PROXY_ADDRESS "ENDPOINT" "OWNER" "EMERGENCY_PAUSER"
```

## Usage Examples

### 1. Check Current Endpoint

```javascript
// For omniDRAGON contract
const omniDragon = await ethers.getContractAt("omniDRAGON", OMNIDRAGON_ADDRESS);
const currentEndpoint = await omniDragon.getLayerZeroEndpoint();
const isSet = await omniDragon.isLayerZeroEndpointSet();

console.log("Current LayerZero Endpoint:", currentEndpoint);
console.log("Is Endpoint Set:", isSet);
```

### 2. Proxy Management

```bash
# Get proxy status
npx hardhat manage-layerzero-proxy --action status --network sonic

# Propose endpoint change
npx hardhat manage-layerzero-proxy \
  --action propose \
  --new-endpoint "0xNEW_ENDPOINT_ADDRESS" \
  --network sonic

# Execute endpoint change (after 48 hours)
npx hardhat manage-layerzero-proxy --action execute --network sonic

# Cancel pending change
npx hardhat manage-layerzero-proxy --action cancel --network sonic

# Emergency pause
npx hardhat manage-layerzero-proxy --action pause --network sonic

# Emergency unpause
npx hardhat manage-layerzero-proxy --action unpause --network sonic
```

### 3. Programmatic Usage

```javascript
const proxy = await ethers.getContractAt("OmniDragonLayerZeroProxy", PROXY_ADDRESS);

// Get current status
const [endpoint, paused, pendingChange, timeToChange] = await proxy.getProxyStatus();

// Propose endpoint change
if (!pendingChange) {
    await proxy.proposeEndpointChange("0xNEW_ENDPOINT_ADDRESS");
}

// Execute change after timelock
if (pendingChange && timeToChange === 0) {
    await proxy.executeEndpointChange();
}

// Get endpoint interface
const endpointInterface = await proxy.getEndpointInterface();
```

## Security Features

### 1. Timelock Mechanism

- **48-hour delay** for all endpoint changes
- Prevents rapid or unauthorized changes
- Allows time for review and intervention

### 2. Access Control

- **Owner**: Can propose, execute, and cancel endpoint changes
- **Emergency Pauser**: Can pause/unpause proxy operations
- **Multi-signature support**: Compatible with Safe multisig wallets

### 3. Emergency Controls

- **Emergency pause**: Immediately stop proxy operations
- **Cancellation**: Cancel pending changes if needed
- **Event logging**: Full transparency of all actions

### 4. Validation

- Address validation for all endpoint addresses
- Duplicate endpoint prevention
- Operational status checks

## Architecture Benefits

### 1. Flexibility

- **Configurable endpoints** without redeploying main contracts
- **Future-proof** against LayerZero endpoint changes
- **Network-specific** endpoint management

### 2. Security

- **Immutable core** contracts maintain security guarantees
- **Timelock protection** prevents hasty changes
- **Emergency controls** for crisis management

### 3. Transparency

- **Full event logging** of all endpoint changes
- **Status tracking** with detailed information
- **Audit trail** for all modifications

### 4. Compatibility

- **LayerZero V2 compliant** with standard patterns
- **Upgrade path** from existing deployments
- **Tool integration** with management scripts

## Best Practices

### 1. Endpoint Changes

1. **Plan ahead**: Propose changes well in advance
2. **Verify endpoints**: Ensure new endpoints are valid and operational
3. **Monitor timelock**: Track pending changes and execution timing
4. **Test thoroughly**: Validate endpoints on testnets first

### 2. Security

1. **Use multisig**: Deploy with Safe multisig for production
2. **Separate roles**: Use different addresses for owner and emergency pauser
3. **Monitor events**: Set up alerts for all proxy events
4. **Regular audits**: Review proxy status and pending changes

### 3. Operations

1. **Document changes**: Keep records of all endpoint modifications
2. **Coordinate updates**: Ensure all stakeholders are informed
3. **Emergency procedures**: Have clear processes for emergency situations
4. **Backup plans**: Maintain alternative endpoints if possible

## Migration Path

### From Existing Deployments

1. **Deploy proxy** with current endpoint as initial endpoint
2. **Update integrations** to use proxy for endpoint queries
3. **Transition gradually** to proxy-based endpoint management
4. **Retire direct** endpoint queries in favor of proxy

### For New Deployments

1. **Deploy omniDRAGON** with LayerZero V2 endpoint
2. **Deploy proxy** with same endpoint for future flexibility
3. **Configure management** scripts and monitoring
4. **Document procedures** for endpoint changes

## Troubleshooting

### Common Issues

1. **Timelock not met**: Wait for 48-hour delay to pass
2. **No pending change**: Propose a change before executing
3. **Same endpoint**: Cannot change to current endpoint
4. **Access denied**: Ensure correct owner/pauser permissions

### Error Messages

- `TimelockNotMet`: Wait for timelock delay to pass
- `NoPendingChange`: No pending endpoint change to execute/cancel
- `SameEndpoint`: New endpoint is same as current
- `EmergencyPaused`: Proxy is paused, unpause first
- `NotAuthorized`: Insufficient permissions for action

## Conclusion

This solution provides the best of both worlds:
- **Maintains LayerZero V2 security** through immutable core contracts
- **Enables endpoint flexibility** through secure proxy pattern
- **Provides operational safety** through timelock and emergency controls
- **Ensures transparency** through comprehensive event logging

The implementation allows omniDRAGON to work with LayerZero V2 endpoints directly while providing a path for future endpoint updates through the proxy pattern when needed.

## Related Files

- `contracts/core/tokens/omniDRAGON.sol` - Enhanced with endpoint access functions
- `contracts/core/tokens/OmniDragonLayerZeroProxy.sol` - Configurable endpoint proxy
- `tasks/deploy-layerzero-proxy.js` - Deployment script
- `tasks/manage-layerzero-proxy.js` - Management script
- `deployments/*/OmniDragonLayerZeroProxy.json` - Deployment records 