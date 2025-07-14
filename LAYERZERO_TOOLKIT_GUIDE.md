# LayerZero Toolkit Guide for Custom Endpoints

## Overview

The LayerZero toolkit CLI (`@layerzerolabs/toolbox-hardhat`) is the official tool for configuring LayerZero OApp connections. However, it only supports chains that are defined in the `@layerzerolabs/lz-definitions` package.

## The Challenge with Sonic

Sonic (Chain ID: 146, EID: 30332) is not yet included in the official LayerZero definitions, which causes the toolkit to fail when trying to process configurations that include Sonic.

## Solutions

### 1. Hybrid Approach (Recommended)

Use the toolkit for standard chains and handle custom chains manually:

```bash
# Run the hybrid script that combines toolkit + manual configuration
node scripts/lz-toolkit-wire.js
```

This script:
- Uses `npm run lz:wire` for Arbitrum ↔ Avalanche
- Manually configures all Sonic connections

### 2. Manual Configuration Only

Since all peers are already configured, you can verify with:

```bash
node scripts/check-lz-wire-status.js
```

### 3. LayerZero Toolkit Commands (Standard Chains Only)

For configurations without custom chains:

```bash
# Get current configuration
npm run lz:config

# Wire OApp connections
npm run lz:wire
```

## Configuration Files

### `layerzero.config.ts`
Currently configured for Arbitrum ↔ Avalanche only (toolkit-compatible).

### `hardhat.config.ts`
Includes Sonic with custom EID:
```typescript
sonic: {
    eid: 30332 as any, // Custom Sonic EID
    url: process.env.SONIC_RPC_URL || 'https://rpc.soniclabs.com',
    accounts,
    chainId: 146,
}
```

## Current Status

✅ All peers are already configured:
- Sonic ↔ Arbitrum
- Sonic ↔ Avalanche
- Arbitrum ↔ Avalanche

## Testing Cross-Chain Transfers

Test the configuration with:

```bash
node scripts/test-lz-transfer.js
```

## Future Updates

When Sonic is added to official LayerZero definitions:
1. Update `@layerzerolabs/lz-definitions` package
2. Update `layerzero.config.ts` to include Sonic
3. Use standard `npm run lz:wire` for all chains 