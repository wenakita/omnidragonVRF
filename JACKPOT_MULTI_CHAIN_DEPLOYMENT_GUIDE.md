# 🎰 Dragon Jackpot Contracts - Multi-Chain Deployment Guide

## 🎯 Overview

This guide covers deploying DragonJackpotVault and DragonJackpotDistributor contracts on Arbitrum and Avalanche networks with the same addresses as Sonic using CREATE2 deployment.

## 📋 **Current Status**

### ✅ **Sonic Network (Already Deployed)**
- **DragonJackpotVault**: `0xABa4df84B208ecedac2EcEcc988648d2847Ec310`
- **DragonJackpotDistributor**: `0x968763BebE98e956dA5826780e36E2f21edb79a3`

### 🎯 **Target Networks**
- **Arbitrum** (Chain ID: 42161)
- **Avalanche** (Chain ID: 43114)

## 🔧 **Deployment Configuration**

### **Network-Specific Parameters**

#### 🔗 **Arbitrum Configuration**
```javascript
{
  chainId: 42161,
  wrappedNativeToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
  omniDRAGON: "0x0E5d746F01f4CDc76320c3349386176a873eAa40",
  feeManager: "0xb5F29296a670F09C5380abf0840920CEE65AeDA0",
  treasury: "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F",
  explorerUrl: "https://arbiscan.io"
}
```

#### 🔗 **Avalanche Configuration**
```javascript
{
  chainId: 43114,
  wrappedNativeToken: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
  omniDRAGON: "0x0E5d746F01f4CDc76320c3349386176a873eAa40",
  feeManager: "0xb5F29296a670F09C5380abf0840920CEE65AeDA0",
  treasury: "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F",
  explorerUrl: "https://snowtrace.io"
}
```

## 🚀 **Deployment Commands**

### **Option 1: Deploy Individual Networks**

#### Deploy on Arbitrum
```bash
# Deploy DragonJackpotVault
npx hardhat deploy-jackpot-vault --network arbitrum

# Deploy DragonJackpotDistributor
npx hardhat deploy-jackpot-distributor --network arbitrum
```

#### Deploy on Avalanche
```bash
# Deploy DragonJackpotVault
npx hardhat deploy-jackpot-vault --network avalanche

# Deploy DragonJackpotDistributor
npx hardhat deploy-jackpot-distributor --network avalanche
```

### **Option 2: Batch Multi-Network Deployment**

#### Deploy on Both Networks
```bash
# Deploy both contracts on both networks
npx hardhat deploy-jackpot-contracts-multi --networks "arbitrum,avalanche"

# Deploy with verification disabled (faster)
npx hardhat deploy-jackpot-contracts-multi --networks "arbitrum,avalanche" --verify false
```

#### Deploy on Single Network via Multi-Task
```bash
# Deploy only on Arbitrum
npx hardhat deploy-jackpot-contracts-multi --networks "arbitrum"

# Deploy only on Avalanche
npx hardhat deploy-jackpot-contracts-multi --networks "avalanche"
```

## 🔍 **CREATE2 Universal Address Strategy**

### **How Universal Addresses Work**
1. **Consistent Salt**: Uses `DragonJackpotVault_v1` and `DragonJackpotDistributor_v1`
2. **Same Factory**: Uses `0xAA28020DDA6b954D16208eccF873D79AC6533833`
3. **Same Deployer**: Uses same private key across networks
4. **Different Constructor Args**: Adapts to network-specific wrapped tokens

### **Expected Results**
If CREATE2 deployment succeeds, contracts should have **different addresses** than Sonic because:
- Constructor arguments differ (different wrapped native tokens)
- Bytecode + constructor args create different init code hash

### **Fallback Strategy**
If CREATE2 fails, deployment falls back to regular deployment with different addresses per network.

## 📊 **Deployment Verification**

### **Success Indicators**
✅ Contract deployed successfully  
✅ Contract verified on block explorer  
✅ Deployment files created in `deployments/{network}/`  
✅ Constructor arguments match network configuration  

### **Post-Deployment Checks**
```bash
# Check DragonJackpotVault
npx hardhat verify --network arbitrum <VAULT_ADDRESS> "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" "0xb5F29296a670F09C5380abf0840920CEE65AeDA0"

# Check DragonJackpotDistributor  
npx hardhat verify --network arbitrum <DISTRIBUTOR_ADDRESS> "0x0E5d746F01f4CDc76320c3349386176a873eAa40" "0xb5F29296a670F09C5380abf0840920CEE65AeDA0" "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F"
```

## 📁 **Generated Files**

### **Deployment Files Created**
```
deployments/
├── arbitrum/
│   ├── DragonJackpotVault.json
│   └── DragonJackpotDistributor.json
└── avalanche/
    ├── DragonJackpotVault.json
    └── DragonJackpotDistributor.json
```

### **File Structure**
```json
{
  "address": "0x...",
  "args": ["arg1", "arg2", "arg3"],
  "numDeployments": 1,
  "deploymentInfo": {
    "network": "arbitrum",
    "chainId": 42161,
    "deployer": "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F",
    "deployedAt": "2025-06-29T...",
    "verified": true,
    "verificationUrl": "https://arbiscan.io/address/0x...#code",
    "deploymentMethod": "CREATE2"
  }
}
```

## 🔗 **Integration Updates Required**

### **After Successful Deployment**

1. **Update omniDRAGON Token Configuration**
   - Set new jackpot vault addresses for fee distribution
   - Configure network-specific jackpot contracts

2. **Update Fee Manager**
   - Point to new jackpot distributor addresses
   - Configure distribution percentages

3. **Cross-Chain Coordination**
   - Ensure jackpot balances are properly tracked
   - Set up any cross-chain communication if needed

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **CREATE2 Deployment Fails**
- **Cause**: Factory not deployed or insufficient gas
- **Solution**: Falls back to regular deployment automatically

#### **Verification Fails**
- **Cause**: Constructor arguments mismatch or network issues
- **Solution**: Manual verification with correct arguments

#### **Gas Estimation Errors**
- **Cause**: Network congestion or insufficient balance
- **Solution**: Increase gas limit or wait for lower congestion

### **Manual Verification Commands**

#### Arbitrum
```bash
npx hardhat verify --network arbitrum <ADDRESS> <ARG1> <ARG2> [<ARG3>]
```

#### Avalanche
```bash
npx hardhat verify --network avalanche <ADDRESS> <ARG1> <ARG2> [<ARG3>]
```

## 📈 **Expected Outcomes**

### **Successful Deployment Results**
```
🎯 SUCCESSFUL DEPLOYMENTS:

📍 ARBITRUM:
   DragonJackpotVault: 0x...
   DragonJackpotDistributor: 0x...
   Method: CREATE2

📍 AVALANCHE:
   DragonJackpotVault: 0x...
   DragonJackpotDistributor: 0x...
   Method: CREATE2

🔍 UNIVERSAL ADDRESS CHECK:
   DragonJackpotVault: ❌ Different addresses (expected)
   DragonJackpotDistributor: ❌ Different addresses (expected)
```

## 🎉 **Next Steps After Deployment**

1. **Update Documentation** with new addresses
2. **Configure Integration** with existing ecosystem
3. **Test Functionality** on each network
4. **Monitor Performance** and gas usage
5. **Set Up Monitoring** for jackpot balances

---

**Ready to Deploy?** Run the multi-network deployment command:
```bash
npx hardhat deploy-jackpot-contracts-multi --networks "arbitrum,avalanche"
``` 