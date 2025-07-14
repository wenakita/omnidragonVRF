# 🌐 Registry-Based Wrapped Native Token Management

This guide explains the enhanced **OmniDragonHybridRegistry** with centralized wrapped native token management.

## 🎯 **What Changed**

### **Before**: Hardcoded in omniDRAGON Contract
```solidity
// ❌ OLD: Hardcoded logic in each token contract
function _getWrappedNativeSymbol(uint256 chainId) internal pure returns (string memory) {
    if (chainId == 146) return "WS";        // Sonic
    if (chainId == 43114) return "WAVAX";   // Avalanche
    // ... hardcoded for each chain
}
```

### **After**: Centralized in Registry
```solidity
// ✅ NEW: Registry provides chain-specific information
interface IOmniDragonHybridRegistry {
    function getWrappedNativeSymbol(uint16 chainId) external view returns (string memory);
    function getWrappedNativeInfo(uint16 chainId) external view returns (address tokenAddress, string memory symbol);
}
```

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────┐
│    OmniDragonHybridRegistry         │ ← Central Configuration
│  ┌─────────────────────────────────┐ │
│  │ Chain Configs                   │ │
│  │ ├── chainId: 146 (Sonic)       │ │
│  │ │   ├── wrappedNativeToken     │ │
│  │ │   └── wrappedNativeSymbol: WS│ │
│  │ ├── chainId: 42161 (Arbitrum)  │ │
│  │ │   └── wrappedNativeSymbol: WETH│ │
│  │ └── chainId: 43114 (Avalanche) │ │
│  │     └── wrappedNativeSymbol: WAVAX│ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
              │ getWrappedNativeSymbol()
              ▼
┌─────────────────────────────────────┐
│         omniDRAGON Contract         │ ← Uses Registry
│  ┌─────────────────────────────────┐ │
│  │ Constructor:                    │ │
│  │ ├── Get symbol from registry   │ │
│  │ ├── Fallback to token contract │ │
│  │ └── Final fallback: "WNATIVE"  │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## 🔧 **New Registry Functions**

### **1. Enhanced Chain Registration**
```solidity
function registerChain(
    uint16 _chainId,
    string calldata _chainName,
    address _wrappedNativeToken,
    string calldata _wrappedNativeSymbol,  // 🆕 NEW!
    address _lotteryManager,
    // ... other params
) external onlyOwner;
```

### **2. Wrapped Native Symbol Getter**
```solidity
function getWrappedNativeSymbol(uint16 _chainId) external view returns (string memory);
```

### **3. Combined Info Getter**
```solidity
function getWrappedNativeInfo(uint16 _chainId) external view returns (
    address tokenAddress, 
    string memory symbol
);
```

## 🎯 **Supported Chains**

| **Chain** | **Chain ID** | **Native Token** | **Wrapped Token** | **Symbol** |
|-----------|--------------|------------------|-------------------|------------|
| **Sonic** | 146 | S | Wrapped Sonic | **WS** |
| **Arbitrum** | 42161 | ETH | Wrapped Ether | **WETH** |
| **Avalanche** | 43114 | AVAX | Wrapped AVAX | **WAVAX** |
| **Fantom** | 250 | FTM | Wrapped FTM | **WFTM** |
| **Polygon** | 137 | MATIC | Wrapped MATIC | **WMATIC** |
| **BSC** | 56 | BNB | Wrapped BNB | **WBNB** |
| **Ethereum** | 1 | ETH | Wrapped Ether | **WETH** |

## 📋 **How to Configure**

### **Step 1: Deploy Registry**
```bash
npx hardhat run deploy/deploy_omnidragon_ecosystem.js --network sonic
```

### **Step 2: Configure Chains**
```bash
# Set registry address
export REGISTRY_ADDRESS="0x..."

# Run configuration script
npx hardhat run scripts/configure-registry-chains.js --network sonic
```

### **Step 3: Deploy omniDRAGON Tokens**
```bash
# Deploy on each chain - tokens will automatically get correct symbols
npx hardhat run deploy/deploy_omnidragon_ecosystem.js --network arbitrum
npx hardhat run deploy/deploy_omnidragon_ecosystem.js --network avalanche
```

## 🔄 **Fee Distribution Flow (Updated)**

```
BUY Transaction (WAVAX → DRAGON on Avalanche)
    ↓
collectWrappedNativeFees()
    ├── 6.9% → JackpotVault
    ├── 2.41% → veDRAGONRevenueDistributor  
    └── 0.69% → Contract (buyback fund)
    ↓
Events Emitted:
    ├── FeeDistributed(jackpotVault, amount, "WAVAX_jackpot")
    ├── FeeDistributed(revenueDistributor, amount, "WAVAX_revenue")
    └── WrappedNativeFeeCollected(buyer, totalAmount, timestamp)
```

```
SELL Transaction (DRAGON → WAVAX on Avalanche)
    ↓
_distributeDRAGONFeesImmediately()
    ├── 6.9% → JackpotVault (DRAGON)
    ├── 2.41% → veDRAGONRevenueDistributor (DRAGON)
    └── 0.69% → 0x...dEaD (burn) 🔥
```

## 🧪 **Testing the Integration**

### **Test Wrapped Native Symbol Resolution**
```javascript
// Test script
const registry = await ethers.getContractAt("OmniDragonHybridRegistry", registryAddress);

// Test different chains
console.log("Sonic symbol:", await registry.getWrappedNativeSymbol(146));     // "WS"
console.log("Arbitrum symbol:", await registry.getWrappedNativeSymbol(42161)); // "WETH"
console.log("Avalanche symbol:", await registry.getWrappedNativeSymbol(43114)); // "WAVAX"

// Test combined info
const [address, symbol] = await registry.getWrappedNativeInfo(146);
console.log(`Sonic: ${address} (${symbol})`);
```

### **Test omniDRAGON Integration**
```javascript
const omniDragon = await ethers.getContractAt("omniDRAGON", dragonAddress);

// Check if correct symbol is loaded
const info = await omniDragon.getWrappedNativeInfo();
console.log("Token symbol:", info.symbol); // Should show "WS", "WETH", "WAVAX", etc.
```

## 🎁 **Benefits**

| **Aspect** | **Before** | **After** |
|------------|------------|-----------|
| **Maintainability** | ❌ Update each contract | ✅ Update registry only |
| **Accuracy** | ❌ Hardcoded may be wrong | ✅ Configurable per chain |
| **Flexibility** | ❌ Fixed at compile time | ✅ Runtime configurable |
| **Events** | ❌ Generic "WETH" everywhere | ✅ Correct "WS", "WAVAX", etc. |
| **User Experience** | ❌ Confusing token names | ✅ Clear chain-specific names |

## 🚀 **Migration Guide**

### **For Existing Deployments**

1. **Deploy Updated Registry**
2. **Configure Chains** using the script
3. **Update omniDRAGON contracts** to use new registry functions
4. **Verify** symbol resolution works correctly

### **For New Deployments**

1. **Deploy Registry** with chain configurations
2. **Deploy omniDRAGON** - will automatically use correct symbols
3. **Deploy ecosystem contracts** - all inherit correct token info

## 🎯 **Summary**

The new **Registry-Based Wrapped Native Token Management** provides:

✅ **Centralized Configuration** - One place to manage all chain-specific data  
✅ **Accurate Token Names** - Shows "WS" on Sonic, "WAVAX" on Avalanche, etc.  
✅ **Maintainable Architecture** - Update registry instead of every contract  
✅ **Better User Experience** - Clear, chain-appropriate token names  
✅ **Immediate Fee Distribution** - Real-time splitting with correct token names  
✅ **Backward Compatibility** - Old functions still work  

Now your users will see the correct native token names on every chain! 🌐✨ 