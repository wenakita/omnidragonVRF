# OmniDRAGON LayerZero V2 Multi-Chain Deployment Guide

## 🎉 Diamond Inheritance Problem SOLVED!

The LayerZero V2 compatible omniDRAGON contract has been successfully implemented with the diamond inheritance issue completely resolved using the proven OFTCore pattern.

## 🚀 Quick Start

### Prerequisites

1. **Environment Setup**
   ```bash
   # Set your private key
   export PRIVATE_KEY="your_private_key_here"
   
   # Ensure you have native tokens on all target chains:
   # - Sonic (S)
   # - Arbitrum (ETH) 
   # - Avalanche (AVAX)
   ```

2. **Compile Contracts**
   ```bash
   npm run compile
   # ✅ Should compile 145 files successfully
   ```

### Option 1: Full Multi-Chain Deployment (Recommended)

Deploy across all chains with automatic peer configuration:

```bash
npm run deploy:multichain
```

This will:
- Deploy OmniDragonDeployer on each chain (if needed)
- Deploy omniDRAGON with deterministic addresses
- Configure LayerZero peers between all chains
- Perform initial minting on Sonic
- Display comprehensive deployment summary

### Option 2: Step-by-Step Deployment

For more control and testing:

#### Step 1: Deploy on Sonic (Initial Minting Chain)
```bash
npm run deploy:sonic-v2
```

#### Step 2: Deploy on Arbitrum
```bash
npm run deploy:arbitrum-v2
```

#### Step 3: Deploy on Avalanche
```bash
npm run deploy:avalanche-v2
```

#### Step 4: Configure Cross-Chain Peers
```bash
# Configure Sonic -> Arbitrum
npm run configure:peer sonic 0xSonicAddress arbitrum 0xArbitrumAddress

# Configure Sonic -> Avalanche  
npm run configure:peer sonic 0xSonicAddress avalanche 0xAvalancheAddress

# Configure Arbitrum -> Sonic
npm run configure:peer arbitrum 0xArbitrumAddress sonic 0xSonicAddress

# Configure Arbitrum -> Avalanche
npm run configure:peer arbitrum 0xArbitrumAddress avalanche 0xAvalancheAddress

# Configure Avalanche -> Sonic
npm run configure:peer avalanche 0xAvalancheAddress sonic 0xSonicAddress

# Configure Avalanche -> Arbitrum
npm run configure:peer avalanche 0xAvalancheAddress arbitrum 0xArbitrumAddress
```

## 🔧 Advanced Commands

### Predict Contract Addresses
```bash
npm run predict:address sonic 0xDeployerAddress
npm run predict:address arbitrum 0xDeployerAddress
npm run predict:address avalanche 0xDeployerAddress
```

### Check Contract Information
```bash
npm run contract:info sonic 0xContractAddress
npm run contract:info arbitrum 0xContractAddress
npm run contract:info avalanche 0xContractAddress
```

### Manual Deployment Steps
```bash
# Connect to network
npm run deploy:step connect sonic

# Setup deployer (deploy new or connect to existing)
npm run deploy:step setup-deployer sonic [existing_deployer_address]

# Predict address
npm run deploy:step predict sonic 0xDeployerAddress

# Deploy contract
npm run deploy:step deploy sonic 0xDeployerAddress

# Perform initial minting (Sonic only)
npm run deploy:step mint sonic 0xContractAddress

# Display contract info
npm run deploy:step info sonic 0xContractAddress
```

## 🌐 Network Configuration

### Sonic (Chain ID: 146)
- **LayerZero EID**: 30332
- **Endpoint**: `0x6F475642a6e85809B1c36Fa62763669b1b48DD5B`
- **Initial Minting**: ✅ Enabled (6,942,000 DRAGON)
- **Explorer**: https://sonicscan.org

### Arbitrum (Chain ID: 42161)  
- **LayerZero EID**: 30110
- **Endpoint**: `0x1a44076050125825900e736c501f859c50fE728c`
- **Initial Minting**: ❌ Disabled
- **Explorer**: https://arbiscan.io

### Avalanche (Chain ID: 43114)
- **LayerZero EID**: 30106  
- **Endpoint**: `0x1a44076050125825900e736c501f859c50fE728c`
- **Initial Minting**: ❌ Disabled
- **Explorer**: https://snowtrace.io

## 🏗️ Contract Architecture

### LayerZero V2 Features
- ✅ **Diamond Inheritance Resolved**: Uses proven OFTCore pattern
- ✅ **OFT Compatibility**: Omnichain Fungible Token standard
- ✅ **Burn-and-Mint**: Cross-chain transfers burn on source, mint on destination
- ✅ **Enforced Options**: OAppOptionsType3 support for enhanced security
- ✅ **Unified Supply**: Single token supply across all chains

### Inheritance Pattern (SOLVED!)
```solidity
contract omniDRAGON is ERC20, ReentrancyGuard, OApp, OAppOptionsType3, IomniDRAGON
```

This follows the exact pattern used in LayerZero's own `OFTCore` contract, which successfully resolves the diamond inheritance issue.

### Fee Structure (Preserved)
- **Buy Fees**: 10% total (6.9% jackpot, 2.41% veDRAGON, 0.69% burn)
- **Sell Fees**: 10% total (6.9% jackpot, 2.41% veDRAGON, 0.69% burn)  
- **Transfer Fees**: 0% (no fees on wallet-to-wallet transfers)
- **Lottery Entries**: Only on buy transactions

## 🔐 Security Features

### Access Control
- **Owner**: Deployer address (can be transferred)
- **Emergency Pauser**: Configurable address for emergency stops
- **Authorized Callers**: Whitelist for fee processing functions

### Emergency Functions
- `emergencyPause()`: Pause all transfers
- `emergencyUnpause()`: Resume operations (owner only)
- Transfer pausing for individual operations

### LayerZero Security
- **Peer Validation**: Only configured peers can send messages
- **Message Validation**: Proper encoding/decoding of cross-chain messages
- **DVN Support**: Ready for Decentralized Verifier Network configuration

## 📊 Deployment Verification

After deployment, verify these key points:

### 1. Contract Deployment
```bash
# Check contract exists and is initialized
npm run contract:info <network> <address>
```

### 2. LayerZero Configuration
- Peers are configured between all chains
- Endpoint addresses are correct
- EIDs match network configuration

### 3. Token Economics
- Initial supply minted only on Sonic: 6,942,000 DRAGON
- Fee structure matches specification
- Owner has correct balance

### 4. Cross-Chain Functionality
- Test small cross-chain transfer
- Verify burn-and-mint mechanism
- Check unified supply across chains

## 🚨 Important Notes

### Initial Minting
- **ONLY** performed on Sonic (Chain ID 146)
- **Cannot** be repeated (audit fix prevents multiple mints)
- Total supply: 6,942,000 DRAGON tokens

### Deterministic Addresses
- Using CREATE2 factory ensures same address across all chains
- Addresses are predictable before deployment
- Requires identical bytecode and salt across chains

### Gas Considerations
- **Sonic**: ~15M gas limit for deployment
- **Arbitrum**: ~50M gas limit for deployment  
- **Avalanche**: ~15M gas limit for deployment

## 🔍 Troubleshooting

### Common Issues

1. **"Contract already deployed"**
   - Check if contract exists at predicted address
   - Use different salt or redeploy deployer

2. **"No peer configured"**
   - Ensure peers are set on both source and destination
   - Verify EIDs are correct

3. **"Initial minting already done"**
   - Initial minting can only happen once
   - Check if tokens were already minted

4. **Gas estimation failures**
   - Increase gas limits in configuration
   - Check network congestion

### Debug Commands
```bash
# Check deployment status
npm run contract:info <network> <address>

# Verify peer configuration
# (Check "Configured Peers" section in output)

# Check LayerZero endpoint
# (Verify endpoint address matches network config)
```

## 🎯 Next Steps After Deployment

1. **Set Core Addresses**
   ```solidity
   setCoreAddresses(
     jackpotVault,
     revenueDistributor, 
     wrappedNativeToken,
     uniswapRouter,
     lotteryManager,
     emergencyTreasury,
     emergencyPauser
   )
   ```

2. **Configure Liquidity Pairs**
   ```solidity
   addPair(pairAddress, DexType.UNISWAP_V2)
   ```

3. **Set Up DVN Configuration**
   - Configure LayerZero DVNs for enhanced security
   - Set message library and executor configurations

4. **Verify Contracts**
   - Submit source code to block explorers
   - Verify deployment parameters

5. **Test Cross-Chain Transfers**
   - Start with small amounts
   - Verify burn-and-mint mechanism
   - Test all chain pairs

## 📞 Support

For issues or questions:
- Check the troubleshooting section above
- Review deployment logs for specific error messages
- Ensure all prerequisites are met
- Verify network connectivity and gas availability

---

**🎉 Congratulations! The diamond inheritance problem that was blocking LayerZero V2 integration has been completely resolved using the proven OFTCore pattern. Your omniDRAGON contract is now ready for cross-chain deployment!** 