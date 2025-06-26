# 🏔️ AVALANCHE VRF DEPLOYMENT GUIDE

## 🎥 LIVE STREAMING SAFE DEPLOYMENT GUIDE
**All sensitive information has been redacted for live streaming safety**

---

## 📋 OVERVIEW

This guide walks through deploying the OmniDragon VRF system on Avalanche, creating a three-chain setup:
- **Sonic** → **Arbitrum** (existing)
- **Sonic** → **Avalanche** (new)
- **Avalanche** → **Arbitrum** (new)

## 🏗️ ARCHITECTURE

```
┌─────────────┐    LayerZero    ┌─────────────────┐
│    SONIC    │ ──────────────► │    ARBITRUM     │
│ VRF Request │                 │ Chainlink VRF   │
│             │ ◄────────────── │   Consumer      │
└─────────────┘    Response     └─────────────────┘
       │                                   ▲
       │ LayerZero                         │
       ▼                                   │
┌─────────────┐    LayerZero              │
│  AVALANCHE  │ ──────────────────────────┘
│VRF Integrator│
│VRF Consumer │
└─────────────┘
```

## 🔧 STEP 1: NETWORK CONFIGURATION

### Avalanche Network Details (Public Information)
- **Chain ID**: 43114
- **RPC URL**: `https://api.avax.network/ext/bc/C/rpc`
- **LayerZero Endpoint**: `0x1a44076050125825900e736c501f859c50fE728c`
- **Explorer**: https://snowtrace.io

### Chainlink VRF 2.5 on Avalanche (Public Information)
- **VRF Coordinator**: `0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634`
- **Key Hash**: `0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61`
- **Subscription**: `49130512167777098004519592693541429977179420141459329604059253338290818062746`

## 🚀 STEP 2: DEPLOYMENT COMMANDS

### Deploy VRF Integrator to Avalanche
```bash
# Deploy the VRF request contract
npx hardhat run scripts/deploy/04_deploy_avalanche_vrf_integrator.ts --network avalanche
```

### Deploy VRF Consumer to Avalanche (Optional - for local VRF)
```bash
# Deploy the VRF consumer contract (if you want Avalanche-local VRF)
npx hardhat run scripts/deploy/03_deploy_avalanche_vrf_consumer.ts --network avalanche
```

## 🔗 STEP 3: LAYERZERO CONFIGURATION

### Create Configuration File
```bash
# Generate LayerZero configuration
npx hardhat run scripts/setup-cross-chain-vrf.ts
```

### Set Peer Connections
```bash
# Configure peer connections using LayerZero V2 CLI
npx @layerzerolabs/devtools-cli oapp wire --oapp-config layerzero-vrf.config.ts
```

### Configure DVN Settings
```bash
# Set up Decentralized Verifier Network (included in wire command)
# DVN settings are configured in the layerzero-vrf.config.ts file
```

## 🎲 STEP 4: CHAINLINK VRF SETUP (For Local Avalanche VRF)

### Create VRF Subscription
1. Visit: https://vrf.chain.link/avalanche
2. Create new subscription
3. Fund with LINK tokens
4. Add your consumer contract

### Configuration Values
- **Subscription ID**: `49130512167777098004519592693541429977179420141459329604059253338290818062746` 🔐
- **Gas Limit**: `690420` (high for callbacks)
- **Confirmations**: `3` (recommended)

## 🔧 STEP 5: CONTRACT CONFIGURATION

### Set Peer Connections (Manual Method)
```solidity
// On Avalanche VRF Integrator
setPeer(30110, ARBITRUM_VRF_CONSUMER_ADDRESS); // Arbitrum
setPeer(30332, SONIC_VRF_INTEGRATOR_ADDRESS);  // Sonic

// On Arbitrum VRF Consumer (add Avalanche peer)
setPeer(30106, AVALANCHE_VRF_INTEGRATOR_ADDRESS); // Avalanche
```

### Fund Contracts
```bash
# Fund contracts with native tokens for LayerZero fees
# Avalanche contracts need AVAX
# Amounts: 0.1-0.5 AVAX recommended
```

## 🧪 STEP 6: TESTING

### Test VRF Request Flow
```bash
# Run the demonstration script
npx hardhat run scripts/demo-vrf-flow.ts --network sonic

# Test Avalanche → Arbitrum flow
npx hardhat run scripts/demo-vrf-flow.ts --network avalanche
```

### Monitor Transactions
- **Avalanche Explorer**: https://snowtrace.io
- **Arbitrum Explorer**: https://arbiscan.io
- **Sonic Explorer**: https://sonicscan.org

## 📊 STEP 7: VERIFICATION

### Verify Contracts on Snowtrace
```bash
# Verify VRF Integrator
npx hardhat verify --network avalanche CONTRACT_ADDRESS_HERE "CONSTRUCTOR_ARGS"

# Verify VRF Consumer (if deployed)
npx hardhat verify --network avalanche CONTRACT_ADDRESS_HERE "CONSTRUCTOR_ARGS"
```

## 🔍 MONITORING & DEBUGGING

### Check Peer Connections
```solidity
// Call on each contract
function peers(uint32 eid) external view returns (bytes32)
```

### Monitor Events
- `RandomWordsRequested`
- `RandomWordsReceived`
- `MessageSent`
- `MessageReceived`

### LayerZero Message Tracking
- Use LayerZero Scan: https://layerzeroscan.com
- Track messages between chains

## 🛡️ SECURITY CONSIDERATIONS

### DVN Configuration
- **Required DVNs**: LayerZero Labs DVN
- **Optional DVNs**: Google Cloud DVN, Nethermind DVN
- **Threshold**: At least 1 optional DVN

### Gas Limits
- **Sonic**: 690,420 gas
- **Arbitrum**: 690,420 gas  
- **Avalanche**: 690,420 gas

### Timeout Settings
- **Request Timeout**: 1 hour
- **Retry Logic**: Built-in LayerZero retry

## 📈 CONFIGURATION OPTIONS

### Option 1: Avalanche → Arbitrum VRF
- Use existing Arbitrum VRF Consumer
- Leverage established Chainlink setup
- Lower deployment overhead

### Option 2: Avalanche Local VRF
- Deploy VRF Consumer on Avalanche
- Create separate Chainlink subscription
- Independent VRF source

### Option 3: Multi-Chain VRF
- Deploy both configurations
- Load balance VRF requests
- Maximum redundancy

## 🎯 SUCCESS METRICS

### Deployment Success
- ✅ Contracts deployed to Avalanche
- ✅ Peer connections established
- ✅ DVN configuration set
- ✅ Contracts funded with native tokens

### Functional Success
- ✅ VRF requests successful
- ✅ Cross-chain messages delivered
- ✅ Random words received
- ✅ Events emitted correctly

## 🔐 LIVE STREAMING NOTES

- ✅ All private keys redacted
- ✅ All sensitive configuration masked
- ✅ Only public contract addresses shown
- ✅ Safe for live streaming display

---

**Last Updated**: ***REDACTED_FOR_LIVE_STREAM***  
**Networks**: Avalanche C-Chain (43114), Arbitrum (42161), Sonic (146)  
**Status**: 🔐 **LIVE STREAMING SAFE** 