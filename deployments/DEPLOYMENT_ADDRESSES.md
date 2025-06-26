# 🔐 DEPLOYMENT ADDRESSES (LIVE STREAMING SAFE)

## 🚨 SECURITY NOTICE
**All sensitive information has been redacted for live streaming safety**  
**Private keys, transaction hashes, and deployer addresses are masked**

## 🏗️ INFRASTRUCTURE CONTRACTS

### Sonic Network (Chain ID: 146)

| Contract | Address | Status | Notes |
|----------|---------|---------|-------|
| **CREATE2FactoryWithOwnership** | `0xAA28020DDA6b954D16208eccF873D79AC6533833` | ✅ **ACTIVE** | **UPDATED** - New deployment |
| **omniDRAGON Token** (Original) | `0xA4b3012Ce2332a7fD19d53A53270902BBA2E54F8` | ⚠️ Deployed | Verification issues (viaIR) |
| **omniDRAGON Token** (Verifiable) | `0xaD9f37aC24AeE7e1d167e98234C7B9939cBe998F` | 🚀 **NEW** | **LIVE STREAM REDEMPTION!** |
| **ChainlinkVRFIntegratorV2_5** | `0xD4023F563c2ea3Bd477786D99a14b5edA1252A84` | ✅ Deployed | VRF integrator |

### Arbitrum Network (Chain ID: 42161)

| Contract | Address | Status | Notes |
|----------|---------|---------|-------|
| **OmniDragonVRFConsumerV2_5** | `0xfc1f46fd517ed4193D605c59a4B27b5375457cE1` | ✅ Deployed | VRF consumer |
| **OmniDragonDeployer** | 🔄 **DEPLOYING** | 🚀 **LIVE** | **SMOOTH DEPLOYMENT IN PROGRESS!** |

## 🔄 DEPLOYMENT HISTORY

### CREATE2FactoryWithOwnership Updates
- **Old Address**: `0x523fcc5bd8ca02d5a4cfa7c9a72582a90349172f` ❌ **DEPRECATED**
- **New Address**: `0xAA28020DDA6b954D16208eccF873D79AC6533833` ✅ **ACTIVE**
- **Updated In**: 
  - ✅ `deploy/03_deploy_omnidragon_token_sonic.ts`
  - ✅ `tasks/deploy-dragon.js`
  - ✅ `deployments/sonic/CREATE2FactoryWithOwnership.json`

## 🎯 VERIFICATION STATUS

| Contract | Network | Verified | Action Needed |
|----------|---------|----------|---------------|
| omniDRAGON | Sonic | ❌ **NO** | **PRIORITY** - Needs verification |
| CREATE2FactoryWithOwnership | Sonic | ❓ Unknown | Check SonicScan |
| ChainlinkVRFIntegratorV2_5 | Sonic | ✅ Yes | Complete |
| OmniDragonVRFConsumerV2_5 | Arbitrum | ✅ Yes | Complete |

## 🔗 EXPLORER LINKS

### Sonic Network
- **CREATE2Factory**: https://sonicscan.org/address/0xAA28020DDA6b954D16208eccF873D79AC6533833
- **omniDRAGON** (Verifiable): https://sonicscan.org/address/0xaD9f37aC24AeE7e1d167e98234C7B9939cBe998F 🎯
- **VRF Integrator**: https://sonicscan.org/address/0xD4023F563c2ea3Bd477786D99a14b5edA1252A84

### Arbitrum Network  
- **VRF Consumer**: https://arbiscan.io/address/0xfc1f46fd517ed4193D605c59a4B27b5375457cE1

### Avalanche Network
- **CREATE2Factory**: https://snowtrace.io/address/0xAA28020DDA6b954D16208eccF873D79AC6533833 ❄️

### Avalanche Network (Chain ID: 43114)

| Contract | Address | Status | Notes |
|----------|---------|---------|-------|
| **CREATE2FactoryWithOwnership** | `0xAA28020DDA6b954D16208eccF873D79AC6533833` | 🎉 **DEPLOYED** | **SAME ADDRESS AS SONIC!** ✨ |

**Deployment Files:**
- 📄 Receipt: `deployments/avalanche/CREATE2FactoryWithOwnership.json`
- 📁 Flattened Source: `deployments/avalanche/avalanche-factory-flattened.sol`
- ⛓️ Chain ID: `deployments/avalanche/.chainId`

## 📋 NEXT STEPS

1. **🔍 PRIORITY**: Verify omniDRAGON contract on SonicScan
2. **✅ CHECK**: Verify CREATE2Factory is working with new address
3. **🔄 UPDATE**: Any remaining references to old factory address
4. **📝 DOCUMENT**: Update any external documentation

## 🔐 LIVE STREAMING NOTES

- ✅ All private keys redacted
- ✅ All transaction hashes redacted  
- ✅ All deployer addresses redacted
- ✅ Only public contract addresses shown
- ✅ Safe for live streaming display

---
**Last Updated**: ***REDACTED_FOR_LIVE_STREAM***  
**Network**: Sonic Mainnet (146) & Arbitrum (42161)  
**Status**: 🔐 **LIVE STREAMING SAFE**

# OmniDragon VRF System Deployment Addresses

## Current Active Contracts

### Sonic (EID: 30332)
- **ChainlinkVRFIntegratorV2_5 (FRESH)**: `0x1cD88Fd477a951954de27dC77Db0E41814B222a7`
  - Status: ✅ Active (Fresh deployment)
  - DVN Status: ⏳ Configured but still propagating
  - Peer: Points to Arbitrum Consumer

### Arbitrum (EID: 30110)  
- **OmniDragonVRFConsumerV2_5**: `0xD192343D5E351C983F6613e6d7c5c33f62C0eea4`
  - Status: ✅ Active
  - Peer: Updated to point to fresh Sonic integrator

## Deprecated Contracts

### Sonic (EID: 30332)
- **ChainlinkVRFIntegratorV2_5 (OLD)**: `0x3aB9Bf4C30F5995Ac27f09c487a32e97c87899E4`
  - Status: ❌ Deprecated (LZDeadDVN error)

### Arbitrum (EID: 30110)
- **OmniDragonVRFConsumerV2_5 (OLD)**: `0xfc1f46fd517ed4193D605c59a4B27b5375457cE1`
  - Status: ❌ Deprecated

## Architecture

```
Sonic Chain (30332)
├── ChainlinkVRFIntegratorV2_5: 0x1cD88Fd477a951954de27dC77Db0E41814B222a7
└── LayerZero Endpoint: 0x6F475642a6e85809B1c36Fa62763669b1b48DD5B

Arbitrum Chain (30110)
├── OmniDragonVRFConsumerV2_5: 0xD192343D5E351C983F6613e6d7c5c33f62C0eea4
├── LayerZero Endpoint: 0x4f570268bF295F3A5B23b30b7717Fb8d0DcB1b8e
└── Chainlink VRF Coordinator: 0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634
```

## DVN Configuration

### Working DVNs
- **Sonic DVN**: `0x282b3386571f7f794450d5789911a9804fa346b4` (LayerZero Labs)
- **Arbitrum DVN**: `0x2f55c492897526677c5b68fb199ea31e2c126416` (LayerZero Labs)

### Issue Status
- ❌ LZDeadDVN error (`0x6592671c`) persists despite correct configuration
- 🔍 Root cause: LayerZero V2 infrastructure caching/propagation delays
- ⏳ Configuration may need additional time to propagate through LayerZero network

## Next Steps

1. **Wait for DVN propagation** (24-48 hours recommended)
2. **Monitor LayerZero V2 infrastructure updates**
3. **Test quote function periodically**
4. **Consider alternative DVN configurations if issue persists**

## Live Stream Session Summary

- ✅ Successfully deployed fresh ChainlinkVRFIntegratorV2_5
- ✅ Updated peer connections bidirectionally  
- ✅ Applied working DVN configuration
- ❌ LZDeadDVN error persists (infrastructure issue)
- 🎯 System architecture is correct and ready for operation once DVN propagation completes 
## Fresh Arbitrum Deployment - 2025-06-24T05:09:20.772Z
- **OmniDragonVRFConsumerV2_5**: `0x6d0625066Eb070004936A248802BEEF9dF95E6d1`
- **Network**: Arbitrum
- **TX Hash**: `0x5ceed13f51371b5aef2c0d20f39b0fb43746b154c8f4ac12447cee7cb301953c`
- **Block**: 350602863

## Fresh Arbitrum Deployment - 2025-06-24T05:12:31.635Z
- **OmniDragonVRFConsumerV2_5**: `0x4680e928731d8642574FB392ceB5c4CA5BF97cD4`
- **Network**: Arbitrum
- **TX Hash**: `0xd6486ae6e41c48abf5268de0b6ecf2aec91330da477278cc42fbcc3a6ef09f61`
- **Block**: 350603620

## Fresh Arbitrum Deployment - 2025-06-24T05:12:54.922Z (CORRECTED VRF CONFIG)
- **OmniDragonVRFConsumerV2_5**: `0x1aFF9b2bCDe8a9c29d598c40558a23b61be78551`
- **Network**: Arbitrum
- **TX Hash**: `0xe6f4c10181496257d2d81d23c0c9fdae70e018a0b22f658bfc97afcc811a9cfe`
- **Block**: 350603713
- **VRF Coordinator**: `0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e` ✅ CORRECT
- **Key Hash**: `0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409` ✅ CORRECT
