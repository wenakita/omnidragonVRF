# omniDRAGON LayerZero V2 Deployment Guide

## Overview

This guide covers the deployment of omniDRAGON token across three chains:
- **Sonic** (Chain ID: 146) - Origin chain with initial mint of 6,942,000 DRAGON
- **Arbitrum** (Chain ID: 42161) - Deployed with 0 initial supply
- **Avalanche** (Chain ID: 43114) - Deployed with 0 initial supply

## Token Details
- **Name**: Dragon
- **Symbol**: DRAGON
- **Total Supply**: 6,942,000 (minted only on Sonic)
- **Decimals**: 18

## Pre-deployed Infrastructure

### CREATE2 Factory
The CREATE2FactoryWithOwnership is already deployed at the same address on all chains:
```
0xAA28020DDA6b954D16208eccF873D79AC6533833
```

### Calculated Deployment Addresses
Using CREATE2, the contracts will be deployed at the same addresses on all chains:

- **OmniDragonHybridRegistry**: `0x69637BfD5D2b851D870d9E0E38B5b73FaF950777` (vanity address: starts with 0x69, ends with 0777)
- **omniDRAGON**: `0x69cb0574d4f7ca6879a72cb50123B391c4e60777` (vanity address: starts with 0x69, ends with 0777)

## Deployment Steps

### 1. Setup Environment

Ensure your `.env` file contains:
```bash
PRIVATE_KEY=your_private_key_here
RPC_URL_SONIC=https://eu.endpoints.matrixed.link/rpc/sonic/?auth=p886of4gitu82
RPC_URL_ARBITRUM=https://eu.endpoints.matrixed.link/rpc/arbitrum/?auth=p886of4gitu82
RPC_URL_AVALANCHE=https://eu.endpoints.matrixed.link/rpc/avax/?auth=p886of4gitu82
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Compile Contracts

```bash
pnpm compile
```

### 4. Deploy Registry (All Chains)

Deploy the OmniDragonHybridRegistry on each chain:

```bash
# Sonic
npx hardhat deploy --network sonic-mainnet --tags Registry

# Arbitrum
npx hardhat deploy --network arbitrum-mainnet --tags Registry

# Avalanche
npx hardhat deploy --network avalanche-mainnet --tags Registry
```

### 5. Deploy omniDRAGON (All Chains)

Deploy the omniDRAGON token on each chain:

```bash
# Sonic (will mint 6,942,000 DRAGON)
npx hardhat deploy --network sonic-mainnet --tags OmniDRAGON

# Arbitrum (0 initial supply)
npx hardhat deploy --network arbitrum-mainnet --tags OmniDRAGON

# Avalanche (0 initial supply)
npx hardhat deploy --network avalanche-mainnet --tags OmniDRAGON
```

### 6. Wire LayerZero Connections

Configure the LayerZero pathways between all chains:

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

This will:
- Set up peer relationships between all chains
- Configure DVNs (Decentralized Verifier Networks)
- Set enforced options for cross-chain messages

### 7. Verify Deployment

Check the peer connections:

```bash
npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.ts
```

## Post-Deployment Configuration

### 1. Set Trading Pairs

On each chain, you'll need to set the DEX trading pairs as "isPair" to enable fee collection:

```solidity
// Example: Call setPair() on omniDRAGON contract
setPair(pairAddress, true)
```

### 2. Configure Additional Roles

Set up the ecosystem contracts:
- Jackpot Vault
- Revenue Distributor
- Lottery Manager
- LP Manager
- Wrapped Native Token (if different from default)

Use the `setRoles()` function on the omniDRAGON contract.

### 3. Update Chain Configurations

If needed, update chain configurations in the registry using `updateChain()`.

## Sending Tokens Cross-Chain

To send DRAGON tokens from one chain to another:

```bash
npx hardhat lz:oft:send \
  --network sonic-mainnet \
  --to 0xRecipientAddress \
  --to-eid 30110 \
  --amount 1000
```

Endpoint IDs:
- Sonic: 30332
- Arbitrum: 30110
- Avalanche: 30106

## Important Notes

1. **Initial Supply**: Only Sonic will have the initial 6,942,000 DRAGON supply. Other chains receive tokens via LayerZero bridge.

2. **Same Address Deployment**: Thanks to CREATE2, all contracts have the same address on all chains, simplifying integration.

3. **Fee Structure**: 
   - Buy/Sell: 10% fee (6.9% lottery, 2.41% revenue, 0.69% burn)
   - Transfer: 0% fee

4. **Security**: The registry acts as the delegate for LayerZero operations, providing centralized control over cross-chain configurations.

## Troubleshooting

If deployment fails:
1. Check that the CREATE2 factory exists at the expected address
2. Verify the salt hasn't been used before
3. Ensure sufficient gas on all chains
4. Check RPC endpoints are responsive

For LayerZero issues:
1. Verify endpoints are correctly configured
2. Check DVN availability
3. Ensure proper gas limits in enforced options 