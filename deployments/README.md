# 🚀 OmniDragon Universal Deployments

This directory contains all deployment information for the OmniDragon universal deployment system.

## 📁 Directory Structure

```
deployments/
├── sonic/
│   ├── OmniDragonDeployer.json
│   ├── omniDRAGON.json
│   └── OmniDragonChainRegistry.json
├── arbitrum/
│   ├── OmniDragonDeployer.json
│   ├── omniDRAGON.json
│   └── OmniDragonChainRegistry.json
├── avalanche/
│   ├── OmniDragonDeployer.json
│   ├── omniDRAGON.json
│   └── OmniDragonChainRegistry.json
└── README.md
```

## 🌍 Universal Addresses

All contracts have the **same address** across all networks:

| Contract | Universal Address |
|----------|------------------|
| **OmniDragonDeployer** | `0xDb24adBeCF6aAD00C8bb34b7828EC1dd095c2e2C` |
| **omniDRAGON** | `0x0E5d746F01f4CDc76320c3349386176a873eAa40` |
| **OmniDragonChainRegistry** | `0x567eB27f7EA8c69988e30B045987Ad58A597685C` |

## 🌐 Supported Networks

### Sonic (Chain ID: 146)
- **Explorer**: https://sonicscan.org
- **RPC**: https://eu.endpoints.matrixed.link/rpc/sonic?auth=p886of4gitu82
- **LayerZero EID**: 30332

### Arbitrum One (Chain ID: 42161)
- **Explorer**: https://arbiscan.io
- **RPC**: https://eu.endpoints.matrixed.link/rpc/arbitrum?auth=p886of4gitu82
- **LayerZero EID**: 30110

### Avalanche C-Chain (Chain ID: 43114)
- **Explorer**: https://snowtrace.io
- **RPC**: https://eu.endpoints.matrixed.link/rpc/avax?auth=p886of4gitu82
- **LayerZero EID**: 30106

## 📄 Deployment File Format

Each deployment file contains:

```json
{
  "address": "0x...",           // Contract address
  "abi": [...],                 // Complete contract ABI
  "transactionHash": "0x...",   // Deployment transaction hash
  "receipt": {...},             // Transaction receipt
  "args": [...],                // Constructor arguments
  "numDeployments": 1,          // Number of deployments
  "deploymentInfo": {           // Network-specific info
    "network": "sonic",
    "chainId": 146,
    "deployer": "0x...",
    "deployedAt": "2025-06-29T12:00:00.000Z",
    "gasPrice": "55000000000",
    "gasLimit": "20000000",
    "verified": true,
    "verificationUrl": "https://..."
  }
}
```

## 🔧 Usage Examples

### JavaScript/TypeScript

```javascript
// Load deployment info
const sonicDeployment = require('./deployments/sonic/omniDRAGON.json');
const arbitrumDeployment = require('./deployments/arbitrum/omniDRAGON.json');

// Get contract instance
const omniDRAGON = new ethers.Contract(
  sonicDeployment.address,
  sonicDeployment.abi,
  provider
);

// Verify universal address
console.log('Same address:', 
  sonicDeployment.address === arbitrumDeployment.address
); // true
```

### Hardhat Tasks

```javascript
// In hardhat tasks
const deployment = await hre.deployments.get('omniDRAGON');
const contract = await ethers.getContractAt('omniDRAGON', deployment.address);
```

### Web3 Frontend

```javascript
// Load ABI and address
import sonicOmniDRAGON from './deployments/sonic/omniDRAGON.json';

const contract = new web3.eth.Contract(
  sonicOmniDRAGON.abi,
  sonicOmniDRAGON.address
);
```

## 📊 Deployment Statistics

| Network | OmniDragonDeployer Gas | omniDRAGON Gas | Total Gas |
|---------|----------------------|----------------|-----------|
| **Sonic** | 6,064,222 | 4,172,702 | 10,236,924 |
| **Arbitrum** | 5,960,966 | 3,686,317 | 9,647,283 |
| **Avalanche** | 5,849,136 | 3,685,191 | 9,534,327 |
| **Total** | 17,874,324 | 11,544,210 | **29,418,534** |

## 🔍 Verification Links

### OmniDragonDeployer
- [Sonic](https://sonicscan.org/address/0xDb24adBeCF6aAD00C8bb34b7828EC1dd095c2e2C#code)
- [Arbitrum](https://arbiscan.io/address/0xDb24adBeCF6aAD00C8bb34b7828EC1dd095c2e2C#code)
- [Avalanche](https://snowtrace.io/address/0xDb24adBeCF6aAD00C8bb34b7828EC1dd095c2e2C#code)

### omniDRAGON
- [Sonic](https://sonicscan.org/address/0x0E5d746F01f4CDc76320c3349386176a873eAa40#code)
- [Arbitrum](https://arbiscan.io/address/0x0E5d746F01f4CDc76320c3349386176a873eAa40#code)
- [Avalanche](https://snowtrace.io/address/0x0E5d746F01f4CDc76320c3349386176a873eAa40#code)

## 🛠️ Maintenance

### Adding New Networks

1. Create new network directory: `deployments/{network}/`
2. Deploy contracts using universal deployment scripts
3. Create deployment JSON files with same format
4. Verify addresses match universal addresses
5. Update this README with new network info

### Updating Contracts

1. Deploy new version using incremented salt
2. Update deployment files with new addresses
3. Maintain backward compatibility
4. Document version changes

## 🔐 Security Notes

- All deployment files contain verified contract addresses
- ABIs are extracted from compiled artifacts
- Transaction hashes can be verified on respective explorers
- Constructor arguments are included for transparency

---

**Last Updated**: June 29, 2025  
**Universal Deployment Version**: v2.0.0  
**Status**: Production Ready ✅ 