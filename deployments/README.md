# OmniDragon Deployments

This directory contains deployment information for all OmniDragon contracts across multiple networks.

## Structure

```
deployments/
├── README.md                           # This file
├── deployments.json                    # Master deployment registry
├── arbitrum/                          # Arbitrum One deployments
│   ├── omniDRAGON.json                # OmniDragon OFT token
│   └── OmniDragonHybridRegistry.json  # Dragon registry
├── avalanche/                         # Avalanche C-Chain deployments
│   ├── omniDRAGON.json                # OmniDragon OFT token
│   └── OmniDragonHybridRegistry.json  # Dragon registry
└── sonic/                             # Sonic Network deployments
    ├── omniDRAGON.json                # OmniDragon OFT token
    └── OmniDragonHybridRegistry.json  # Dragon registry
```

## Contracts

### omniDRAGON
- **Type**: LayerZero OFT (Omnichain Fungible Token)
- **Address**: `0x6903daC0361D23780f391D60b4933D512c3ED777` (same on all networks)
- **Description**: The main OmniDragon token with cross-chain transfer capabilities via LayerZero V2
- **Networks**: Sonic, Arbitrum, Avalanche

### OmniDragonHybridRegistry
- **Type**: Registry Contract
- **Address**: `0x6903daC0361D23780f391D60b4933D512c3ED777` (same on all networks)
- **Description**: Registry for managing dragon NFT metadata and ownership across chains
- **Networks**: Sonic, Arbitrum, Avalanche

## Network Details

### Sonic Network
- **Chain ID**: 146
- **LayerZero Endpoint ID**: 30332
- **RPC**: https://rpc.soniclabs.com/
- **Explorer**: https://explorer.soniclabs.com/

### Arbitrum One
- **Chain ID**: 42161
- **LayerZero Endpoint ID**: 30110
- **RPC**: https://arb1.arbitrum.io/rpc
- **Explorer**: https://arbiscan.io/

### Avalanche C-Chain
- **Chain ID**: 43114
- **LayerZero Endpoint ID**: 30106
- **RPC**: https://api.avax.network/ext/bc/C/rpc
- **Explorer**: https://snowtrace.io/

## Deployment Method

All contracts are deployed using **CREATE2** for deterministic addresses, ensuring the same contract address across all networks.

- **Deployer**: `0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F`
- **Method**: CREATE2 with custom salt
- **Result**: Vanity address `0x6903daC0361D23780f391D60b4933D512c3ED777`

## LayerZero Configuration

### Cross-Chain Peers
The omniDRAGON OFT contracts are configured with peers on all networks:

```
Sonic (30332) ←→ Arbitrum (30110)
Sonic (30332) ←→ Avalanche (30106)
Arbitrum (30110) ←→ Avalanche (30106)
```

All peer addresses are set to the bytes32 representation of the contract address:
`0x0000000000000000000000006903dac0361d23780f391d60b4933d512c3ed777`

## Usage

### Using the Deployment Utils

```bash
# Display deployment summary
node scripts/deployment-utils.js

# Validate all deployments
node scripts/deployment-utils.js validate

# Get specific deployment info
node scripts/deployment-utils.js get sonic omniDRAGON
```

### Reading Deployment Data

```javascript
const DeploymentManager = require('./scripts/deployment-utils');
const manager = new DeploymentManager();

// Get contract address
const address = manager.getContractAddress('sonic', 'omniDRAGON');

// Get LayerZero endpoint ID
const endpointId = manager.getLayerZeroEndpointId('arbitrum');

// Get all networks for a contract
const networks = manager.getContractNetworks('omniDRAGON');
```

## File Format

Each deployment JSON file contains:
- Contract address and ABI
- Deployment transaction details
- Network information
- LayerZero configuration (for OFT contracts)
- Metadata and deployment parameters

## Maintenance

To update deployment information:
1. Edit the individual network files (`{network}/{contract}.json`)
2. Update the master registry (`deployments.json`)
3. Run validation: `node scripts/deployment-utils.js validate` 