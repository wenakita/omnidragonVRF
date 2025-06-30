# 🐉 OmniDragon Ecosystem - Contract Addresses
## Chainlink Hackathon Submission

### 🌐 **Network**: Sonic Mainnet
**Chain ID**: 146  
**Block Explorer**: https://sonicscan.org/

---

## 🚀 **Core Token Contracts**

### ✅ **Main omniDRAGON Token (Fixed & Active)**
```
Contract: 0x2521f093D012beCDC16336c301A895fbad4DDbC5
Features: CREATE2 compatible, Bug-free, Lottery integration
Status: ✅ ACTIVE & AUTHORIZED
```

---

## 🎰 **Lottery & Gaming System**

### **OmniDragon Lottery Manager**
```
Contract: 0x56eAb9e1f775d0f43cf831d719439e0bF6748234
Features: VRF integration, Dynamic probability, veDRAGON boost
Chainlink Integration: ✅ VRF v2.5 Consumer
```

### **Revenue Distributor**
```
Contract: 0x968763BebE98e956dA5826780e36E2f21edb79a3
Purpose: Fee distribution to veDRAGON holders
```

---

## 🔗 **Infrastructure & Deployment**

### **VRF Integration**
```
Contract: 0x1b1523b3254e076fcbcc992cbe2dc8f08458e538
Type: Chainlink VRF Integrator
Purpose: Secure randomness for lottery system
```

### **LayerZero Proxy**
```
Contract: 0x6Fa6abF394d4f827988FBAD17CadFb506b83c3e8
Purpose: Cross-chain messaging endpoint
```

---

## 🎯 **Key Features & Integrations**

### **Chainlink VRF v2.5**
- ✅ Secure randomness for lottery draws
- ✅ Cross-chain VRF support via LayerZero
- ✅ Tamper-proof prize distribution

### **Multi-Oracle Price Feeds**
- ✅ Chainlink price feeds (primary)
- ✅ Weighted aggregation for accuracy

### **Cross-Chain Architecture**
- ✅ LayerZero v2 integration
- ✅ Universal addressing via CREATE2

---

## 🏆 **Hackathon Innovation**

### **Novel Implementations**
1. **Instant Lottery System**: Per-swap lottery with VRF randomness
2. **Dynamic Fee Optimization**: Market-responsive fee structure
3. **Cross-Chain VRF**: LayerZero + Chainlink integration
4. **CREATE2 Universal Deployment**: Same address across chains

### **Chainlink Products Used**
- ✅ **VRF v2.5**: Secure randomness generation
- ✅ **Price Feeds**: Multi-chain price data

---

## 📝 **Verification Commands**

```bash
# Verify omniDRAGON Token
npx hardhat verify --network sonic 0x2521f093D012beCDC16336c301A895fbad4DDbC5

# View on Explorer
https://sonicscan.org/address/0x2521f093D012beCDC16336c301A895fbad4DDbC5
```

---

*Built with ❤️ for the Chainlink ecosystem* 