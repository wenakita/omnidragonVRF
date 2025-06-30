# 🔧 OmniDragon Universal Deployment - Technical Reference

## 📋 Quick Reference

### Universal Addresses
- **OmniDragonDeployer:** `0xDb24adBeCF6aAD00C8bb34b7828EC1dd095c2e2C`
- **omniDRAGON:** `0x0E5d746F01f4CDc76320c3349386176a873eAa40`

### Infrastructure
- **CREATE2 Factory:** `0xAA28020DDA6b954D16208eccF873D79AC6533833`
- **Chain Registry:** `0x567eB27f7EA8c69988e30B045987Ad58A597685C`
- **Deployer:** `0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F`

## 🔐 Cryptographic Details

### Salt Generation
```solidity
// Deployer Salt
bytes32 deployerSalt = keccak256("OMNIDRAGON_DEPLOYER_UNIVERSAL_V1");
// Result: 0x05fef7bf931b270856151b5974641227c04520c8757943ffc0aadf9f31556507

// Base Salt
bytes32 baseSalt = keccak256("OMNIDRAGON_FRESH_V2_2025_DELEGATE");

// omniDRAGON Salt
bytes32 omniDRAGONSalt = keccak256(abi.encodePacked(baseSalt, "omniDRAGON", "1.0.0"));
// Result: 0xeb2a79d209d2f313d18b6ecaa53a2c094cee6df6d7d31f093afc24b239ce8ce5
```

### Bytecode Hashes
```solidity
// OmniDragonDeployer
bytes32 deployerBytecodeHash = 0x0a5d0564ce5546ff83e3d207ed34debe19a1118057d3e8e6748ae340d5848581;

// omniDRAGON
bytes32 omniDRAGONBytecodeHash = 0x75d14abd2e986249ae8c38c762b9ecfdc706d865d62e2e9ba1308b5f46671e07;
```

### CREATE2 Address Calculation
```solidity
function computeAddress(
    address factory,
    bytes32 salt,
    bytes32 bytecodeHash
) pure returns (address) {
    return address(uint160(uint256(keccak256(abi.encodePacked(
        bytes1(0xff),
        factory,
        salt,
        bytecodeHash
    )))));
}
```

## 🏗️ Constructor Arguments

### OmniDragonDeployer
```solidity
constructor(address _create2Factory) {
    create2Factory = _create2Factory;
}
```
**Arguments:** `["0xAA28020DDA6b954D16208eccF873D79AC6533833"]`

### omniDRAGON
```solidity
constructor(
    address _lzEndpoint,
    address _delegate
) OFT("Dragon", "DRAGON", _lzEndpoint, _delegate) {
    _mint(_delegate, 1000000 * 10**18);
}
```
**Arguments:** `["0x567eB27f7EA8c69988e30B045987Ad58A597685C", "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F"]`

## 🌐 Network Configuration

### Sonic (Chain ID: 146)
```json
{
  "chainId": 146,
  "rpc": "https://eu.endpoints.matrixed.link/rpc/sonic?auth=p886of4gitu82",
  "explorer": "https://sonicscan.org",
  "layerZero": {
    "eid": 30332,
    "endpoint": "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B"
  },
  "gas": {
    "price": "55000000000",
    "limit": "20000000"
  }
}
```

### Arbitrum One (Chain ID: 42161)
```json
{
  "chainId": 42161,
  "rpc": "https://eu.endpoints.matrixed.link/rpc/arbitrum?auth=p886of4gitu82",
  "explorer": "https://arbiscan.io",
  "layerZero": {
    "eid": 30110,
    "endpoint": "0x1a44076050125825900e736c501f859c50fE728c"
  },
  "gas": {
    "price": "3000000000",
    "limit": "10000000"
  }
}
```

### Avalanche C-Chain (Chain ID: 43114)
```json
{
  "chainId": 43114,
  "rpc": "https://eu.endpoints.matrixed.link/rpc/avax?auth=p886of4gitu82",
  "explorer": "https://snowtrace.io",
  "layerZero": {
    "eid": 30106,
    "endpoint": "0x1a44076050125825900e736c501f859c50fE728c"
  },
  "gas": {
    "price": "25000000000",
    "limit": "15000000"
  }
}
```

## 🔧 Compiler Configuration

### Hardhat Config
```javascript
const config = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100
      },
      viaIR: false
    }
  }
};
```

### Contract Sizes
- **OmniDragonDeployer:** ~23KB
- **omniDRAGON:** ~18KB

## 📊 Gas Analysis

### Deployment Costs
| Contract | Sonic | Arbitrum | Avalanche | Average |
|----------|-------|----------|-----------|---------|
| **OmniDragonDeployer** | 6,064,222 | 5,960,966 | 5,849,136 | 5,958,108 |
| **omniDRAGON** | 4,172,702 | 3,686,317 | 3,685,191 | 3,848,070 |

### Gas Costs (USD Estimates)
Assuming ETH = $3,500:
- **Sonic (55 GWei):** ~$1.28 per deployment
- **Arbitrum (3 GWei):** ~$0.07 per deployment
- **Avalanche (25 GWei):** ~$0.58 per deployment

## 🛠️ Deployment Scripts

### Core Scripts
1. **deploy-omnidragon-deployer-universal.js** - Deploys universal deployer
2. **deploy-omnidragon-universal.js** - Deploys omniDRAGON token
3. **verify-universal-contracts.js** - Verifies all contracts
4. **deployment-status.js** - Shows deployment status

### Utility Scripts
1. **predict-universal-deployer-address.js** - Predicts deployer address
2. **predict-universal-omnidragon-address.js** - Predicts token address

### Usage Examples
```bash
# Deploy deployer on all networks
npx hardhat deploy-omnidragon-deployer-universal --network sonic
npx hardhat deploy-omnidragon-deployer-universal --network arbitrum
npx hardhat deploy-omnidragon-deployer-universal --network avalanche

# Deploy omniDRAGON on all networks
npx hardhat deploy-omnidragon-universal --network sonic
npx hardhat deploy-omnidragon-universal --network arbitrum
npx hardhat deploy-omnidragon-universal --network avalanche

# Verify all contracts
npx hardhat verify-universal-contracts --network sonic
npx hardhat verify-universal-contracts --network arbitrum
npx hardhat verify-universal-contracts --network avalanche
```

## 🔍 Verification Details

### Etherscan API Keys
```javascript
const etherscan = {
  apiKey: {
    sonic: "your-sonic-api-key",
    arbitrumOne: "your-arbitrum-api-key",
    avalanche: "your-avalanche-api-key"
  },
  customChains: [
    {
      network: "sonic",
      chainId: 146,
      urls: {
        apiURL: "https://api.sonicscan.org/api",
        browserURL: "https://sonicscan.org"
      }
    }
  ]
};
```

### Verification Command
```bash
npx hardhat verify --network [network] [contract_address] [constructor_args...]
```

## 🧪 Testing Commands

### Contract Interaction
```javascript
// Get contract instance
const omniDRAGON = await ethers.getContractAt("omniDRAGON", "0x0E5d746F01f4CDc76320c3349386176a873eAa40");

// Check basic info
console.log("Name:", await omniDRAGON.name());
console.log("Symbol:", await omniDRAGON.symbol());
console.log("Total Supply:", await omniDRAGON.totalSupply());
console.log("Decimals:", await omniDRAGON.decimals());

// Check LayerZero config
console.log("Endpoint:", await omniDRAGON.endpoint());
console.log("Owner:", await omniDRAGON.owner());
```

## 🔄 Upgrade Path

### Future Versions
To deploy new versions while maintaining universal addresses:
1. Update contract code
2. Increment version in salt generation
3. Recalculate addresses
4. Deploy using same process

### Version Management
```solidity
// Current version
string constant VERSION = "1.0.0";

// Future version
string constant VERSION = "1.1.0";
```

## 🚨 Security Considerations

### Access Control
- **OmniDragonDeployer:** No owner, immutable factory reference
- **omniDRAGON:** Owned by deployer address, standard OFT permissions

### Immutable Components
- CREATE2 factory address (cannot be changed)
- Chain registry address (set at deployment)
- Salt values (deterministic)

### Risk Mitigation
- All contracts verified on explorers
- Standard OpenZeppelin/LayerZero implementations
- No proxy patterns (direct deployment)

## 📈 Monitoring

### Key Metrics to Track
1. Contract deployment success rate
2. Verification success rate
3. Gas costs across networks
4. Address consistency

### Health Checks
```bash
# Check if contracts exist
npx hardhat deployment-status

# Verify addresses match
npx hardhat predict-universal-omnidragon-address --network sonic
```

## 🔧 Troubleshooting

### Common Issues
1. **Gas limit exceeded:** Increase gas limit in network config
2. **Salt already used:** Check if contract already deployed
3. **Verification failed:** Ensure exact constructor args and compiler settings
4. **RPC errors:** Check network connectivity and API keys

### Debug Commands
```bash
# Check bytecode hash
npx hardhat compile --force

# Predict address
npx hardhat predict-universal-omnidragon-address --network [network]

# Check deployment status
npx hardhat deployment-status
```

---

**Last Updated:** June 29, 2025  
**Version:** v2.0.0  
**Maintained by:** OmniDragon Team 