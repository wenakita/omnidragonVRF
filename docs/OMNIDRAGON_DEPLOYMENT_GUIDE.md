# 🐲 OmniDragon Ecosystem Deployment Guide

Welcome to the comprehensive deployment guide for the OmniDragon cross-chain DeFi ecosystem on Sonic blockchain.

## 🎯 Overview

OmniDragon is a comprehensive cross-chain DeFi ecosystem featuring:
- **omniDRAGON**: Main ecosystem token with LayerZero V2 integration
- **veDRAGON**: Voting escrow token for governance and rewards
- **redDRAGON**: Staking rewards token
- **Lottery System**: Cross-chain lottery with veDRAGON boosts
- **Price Oracle**: Cross-chain price feeds
- **Fee Management**: Consolidated fee distribution
- **Promotional Items**: NFT-based lottery enhancements

## 🏗️ Architecture

### CREATE2 Deterministic Deployments
The following contracts **MUST** have identical addresses across all chains:
- `omniDRAGON` - Main token (Salt: `keccak256("OMNIDRAGON_TOKEN_V1")`)
- `OmniDragonLotteryManager` - Lottery system (Salt: `keccak256("OMNIDRAGON_LOTTERY_V1")`)
- `OmniDragonPriceOracle` - Price feeds (Salt: `keccak256("OMNIDRAGON_ORACLE_V1")`)

### Deployment Phases

#### Phase 1: Infrastructure Setup
1. **CREATE2FactoryWithOwnership** - Deterministic deployment factory
2. **OmniDragonDeployer** - Main deployment coordinator
3. **OmniDragonChainRegistry** - Chain configuration registry

#### Phase 2: Core Token Infrastructure
4. **omniDRAGON** - Main ecosystem token (CREATE2)
5. **redDRAGON** - Staking rewards token
6. **veDRAGON** - Voting escrow token

#### Phase 3: DeFi Infrastructure
7. **OmniDragonFeeManager** - Consolidated fee management
8. **OmniDragonPriceOracle** - Price oracle system (CREATE2)
9. **veDRAGONRevenueDistributor** - Revenue sharing for veDRAGON holders

#### Phase 4: Lottery & Gaming System
10. **DrandRandomnessProvider** - Drand-based randomness
11. **DragonJackpotVault** - Prize pool management
12. **DragonJackpotDistributor** - Prize distribution
13. **OmniDragonLotteryManager** - Main lottery system (CREATE2)

#### Phase 5: External Integrations
14. **ChainlinkVRFIntegratorV2_5** - Chainlink VRF integration
15. **PromotionalItemRegistry** - NFT promotional system
16. **GoldScratcher** - Jackpot boost promotional NFT
17. **RedEnvelope** - Probability boost promotional NFT

## 🚀 Deployment Instructions

### Prerequisites

1. **Environment Setup**
   ```bash
   npm install
   cp .env.example .env
   # Configure your private key and RPC URLs in .env
   ```

2. **Network Configuration**
   - Sonic Mainnet: Chain ID 146
   - LayerZero Endpoint: `0x83c73Da98cf733B03315aFa8758834b36a195b87`
   - Sonic FeeM Address: `0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830`

### Step 1: Deploy Ecosystem

Deploy all contracts in the correct order with CREATE2 deterministic deployment:

```bash
npx hardhat run tasks/deploy-ecosystem.js --network sonic
```

This will:
- Deploy all 17 contracts in proper dependency order
- Use CREATE2 for core contracts (omniDRAGON, LotteryManager, PriceOracle)
- Register promotional items with the registry
- Register contracts with Sonic FeeM
- Save deployment data to `sonic-ecosystem-deployment.json`

### Step 2: Configure Ecosystem

Configure all contract integrations and settings:

```bash
npx hardhat run tasks/configure-ecosystem.js --network sonic
```

This will:
- Set omniDRAGON core addresses and fee structures
- Configure chain registry with Sonic information
- Set up lottery system integrations
- Configure veDRAGON revenue distribution
- Perform initial token mint (if on Sonic mainnet)
- Save configuration data to `sonic-ecosystem-deployment-configured.json`

### Step 3: Validate Deployment

Run comprehensive validation checks:

```bash
npx hardhat run tasks/validate-deployment.js --network sonic
```

This will:
- Verify all contracts are deployed correctly
- Validate CREATE2 addresses match expected values
- Test basic contract functionality
- Check integration points
- Verify security configurations
- Generate validation report (`validation-report.json`)

## 🔧 Configuration Details

### Fee Structure
- **Buy Fees**: 10% total (6.9% jackpot, 2.41% veDRAGON, 0.69% burn)
- **Sell Fees**: 10% total (same distribution as buy)
- **Transfer Fees**: 0% (no fees on transfers)

### Token Economics
- **Initial Supply**: 1,000,000,000 DRAGON (1B tokens)
- **Initial Minting Chain**: Sonic (Chain ID 146/332)
- **Cross-chain**: LayerZero V2 OFT implementation

### Sonic Integration
- **FeeM Registration**: All core contracts register automatically
- **Wrapped Token**: Wrapped Sonic (wS) at `0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38`
- **DEX Router**: Sonic DEX Router (configurable)

## 🎰 Lottery System

### Components
- **JackpotVault**: Manages prize pools
- **JackpotDistributor**: Handles prize distribution
- **LotteryManager**: Core lottery logic with veDRAGON boosts
- **Randomness**: Drand + Chainlink VRF for security

### Promotional Items
- **GoldScratcher**: Boosts jackpot payouts (15% max boost)
- **RedEnvelope**: Boosts win probability (5x max multiplier)
- Both are ERC721 NFTs with specific transfer restrictions

## 🔒 Security Features

### Access Control
- **Multi-sig Ready**: All contracts support Ownable pattern
- **Emergency Controls**: Pause mechanisms for critical functions
- **Timelock**: Built-in delays for sensitive operations

### Cross-chain Security
- **LayerZero V2**: Latest security standards
- **DVN Configuration**: Decentralized verification networks
- **Message Validation**: Enforced options for message security

## 📊 Monitoring & Maintenance

### Post-Deployment Checklist
- [ ] All contracts deployed successfully
- [ ] CREATE2 addresses verified across chains
- [ ] Fee structures configured correctly
- [ ] Lottery system functional
- [ ] Cross-chain messaging working
- [ ] FeeM registration confirmed
- [ ] Frontend integration tested
- [ ] Security audit completed

### Ongoing Maintenance
1. **Monitor gas usage** for optimization opportunities
2. **Track cross-chain message success rates**
3. **Monitor lottery participation and payouts**
4. **Update price feeds** as needed
5. **Manage promotional item campaigns**

## 🛠️ Advanced Configuration

### Multi-Chain Deployment

For deploying to additional chains:

1. **Update hardhat.config.ts** with new network configuration
2. **Run deployment** on new chain with same CREATE2 salts
3. **Configure LayerZero** peer connections
4. **Update chain registry** with new chain information
5. **Test cross-chain** functionality

### Custom Parameters

Key parameters that can be customized:

```javascript
// Fee structure (basis points)
const CUSTOM_FEES = {
    jackpot: 690,   // 6.9%
    veDRAGON: 241,  // 2.41%
    burn: 69,       // 0.69%
    total: 1000     // 10%
};

// Lottery configuration
const LOTTERY_CONFIG = {
    minParticipation: ethers.parseEther("1"),    // 1 DRAGON minimum
    maxBoost: 1500,                              // 15% max jackpot boost
    drawInterval: 86400,                         // 24 hours
};

// veDRAGON settings
const VEDRAGON_CONFIG = {
    maxLockTime: 4 * 365 * 24 * 3600,          // 4 years
    maxVotingPower: 25000,                       // 2.5x max multiplier
    epochDuration: 7 * 24 * 3600,               // 1 week
};
```

## 🔍 Troubleshooting

### Common Issues

1. **CREATE2 Address Mismatch**
   - Verify salt values match exactly
   - Check constructor arguments order
   - Ensure same deployer address

2. **Gas Estimation Failures**
   - Increase gas limits in deployment scripts
   - Check network congestion
   - Verify contract size limits

3. **LayerZero Configuration Issues**
   - Verify endpoint addresses
   - Check peer connections
   - Validate message library versions

4. **FeeM Registration Failures**
   - Ensure correct FeeM address
   - Check registration parameters
   - Verify transaction success

### Support

For additional support:
- **Documentation**: Check contract interfaces in `/contracts/interfaces/`
- **Examples**: Review test files in `/test/`
- **Community**: Join our Telegram for developer support

## 📜 License

This project is licensed under MIT License. See LICENSE file for details.

---

**⚠️ Important Security Notice**: Always perform thorough testing on testnets before mainnet deployment. Consider professional security audits for production use.

**🎉 Ready to Deploy?** Follow the steps above to deploy your OmniDragon ecosystem on Sonic blockchain! 