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

### ❌ **Legacy omniDRAGON Token (Deprecated)**
```
Contract: 0x0E5d746F01f4CDc76320c3349386176a873eAa40
Status: ❌ DEPRECATED (has bugs, unauthorized)
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

### **OmniDragon Chain Registry**
```
Contract: 0x567eB27f7EA8c69988e30B045987Ad58A597685C
Purpose: Cross-chain configuration management
```

### **LayerZero Proxy**
```
Contract: 0x6Fa6abF394d4f827988FBAD17CadFb506b83c3e8
Purpose: Cross-chain messaging endpoint
```

### **OmniDragon Deployer V2**
```
Contract: 0xDb24adBeCF6aAD00C8bb34b7828EC1dd095c2e2C
Purpose: CREATE2 universal deployment factory
```

---

## 🛠 **Ecosystem Components**

### **Price Oracle System**
```
Status: Integrated (addresses vary by deployment)
Features: Multi-oracle aggregation, Chainlink price feeds
Supported Chains: Sonic, Ethereum, Arbitrum, Avalanche
```

### **VRF Integration**
```
Contract: 0x1b1523b3254e076fcbcc992cbe2dc8f08458e538
Type: Chainlink VRF Integrator
Purpose: Secure randomness for lottery system
```

### **Fee Manager**
```
Status: Dynamic fee calculation system
Features: Market-based fee adjustment, Jackpot optimization
```

---

## 🎯 **Key Features & Integrations**

### **Chainlink VRF v2.5**
- ✅ Secure randomness for lottery draws
- ✅ Cross-chain VRF support via LayerZero
- ✅ Tamper-proof prize distribution

### **Multi-Oracle Price Feeds**
- ✅ Chainlink price feeds (primary)
- ✅ API3, Band Protocol, Pyth (secondary)
- ✅ Weighted aggregation for accuracy

### **Cross-Chain Architecture**
- ✅ LayerZero v2 integration
- ✅ Universal addressing via CREATE2
- ✅ Chain-agnostic deployment

---

## 📊 **System Status**

| Component | Status | Integration |
|-----------|--------|-------------|
| omniDRAGON Token | ✅ Active | Lottery Manager |
| Lottery System | ✅ Active | Chainlink VRF |
| Price Oracle | ✅ Active | Multiple Feeds |
| Cross-Chain | ✅ Active | LayerZero v2 |
| Fee Management | ✅ Active | Dynamic Calculation |

---

## 🔧 **Configuration**

### **Lottery Parameters**
- Min Swap: $10 USD
- Max Probability: 4% (at $10,000+ swaps)
- Prize Distribution: 69% of jackpot vault
- veDRAGON Boost: Up to 2.5x multiplier

### **Token Economics**
- Total Supply: 6,942,000 DRAGON
- Burn Fee: 0.69% (fixed)
- Jackpot Fee: 6.9% (adaptive)
- veDRAGON Fee: 2.41% (adaptive)

---

## 🏆 **Hackathon Innovation**

### **Novel Implementations**
1. **Instant Lottery System**: Per-swap lottery with VRF randomness
2. **Dynamic Fee Optimization**: Market-responsive fee structure
3. **Cross-Chain VRF**: LayerZero + Chainlink integration
4. **CREATE2 Universal Deployment**: Same address across chains
5. **Multi-Oracle Aggregation**: Robust price data collection

### **Chainlink Products Used**
- ✅ **VRF v2.5**: Secure randomness generation
- ✅ **Price Feeds**: Multi-chain price data
- ✅ **Automation**: (Planned for fee updates)
- ✅ **Functions**: (Planned for API integration)

---

## 📝 **Verification Commands**

```bash
# Verify omniDRAGON Token
npx hardhat verify --network sonic 0x2521f093D012beCDC16336c301A895fbad4DDbC5

# Verify Lottery Manager
npx hardhat verify --network sonic 0x56eAb9e1f775d0f43cf831d719439e0bF6748234

# View on Explorer
https://sonicscan.org/address/0x2521f093D012beCDC16336c301A895fbad4DDbC5
```

---

## 🎊 **Demo & Testing**

### **Try the System**
1. Swap tokens to trigger lottery entry
2. Watch VRF randomness generate results
3. See dynamic fees adjust based on market conditions
4. Experience cross-chain functionality

### **Key Differentiators**
- **Instant Gratification**: Per-swap lottery (not epoch-based)
- **Fair Randomness**: Chainlink VRF ensures tamper-proof results
- **Market Responsive**: Fees adapt to market conditions
- **Cross-Chain Native**: Built for multi-chain from day one

---

*Built with ❤️ for the Chainlink ecosystem*  
*Leveraging VRF, Price Feeds, and innovative cross-chain architecture* 