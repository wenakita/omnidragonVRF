# LayerZero CLI Workaround for Sonic Network

## Issue

The LayerZero CLI tools (`lz:oapp:wire`, `lz:oapp:config:init`, etc.) do not recognize Sonic's custom endpoint ID (30332). When trying to use the standard LayerZero configuration with Sonic included, you'll encounter errors like:

```
Error: Config from file 'layerzero.config.ts' is malformed. Please fix the following errors:
Property 'contracts.0.contract': Invalid input
Property 'connections.0.to': Invalid input
...
```

## Root Cause

- Sonic uses a custom endpoint ID (30332) that is not in the standard `@layerzerolabs/lz-definitions`
- The LayerZero CLI validates endpoint IDs against the official list and rejects custom values
- Sonic's LayerZero integration is still in early stages with placeholder DVNs (LZDeadDVN)

## Workaround Solutions

### 1. Manual Configuration Script (Recommended)

Use the manual configuration scripts that directly interact with the contracts:

```bash
# Configure all chains including Sonic
npx hardhat run scripts/manual-lz-wire.js

# Configure only Arbitrum <-> Avalanche (CLI-compatible chains)
npx hardhat run scripts/wire-arbitrum-avalanche.js
```

These scripts:
- Set up peer connections between chains
- Configure enforced options for gas limits
- Work with Sonic's custom endpoint ID

### 2. Separate Configuration Files

For CLI-compatible operations on Arbitrum and Avalanche only:

```bash
# Use the supported config that excludes Sonic
npx hardhat lz:oapp:wire --oapp-config layerzero-supported.config.ts
```

### 3. Current Configuration Status

All LayerZero configurations have been manually set:
- ✅ Peer connections: All 6 connections configured
- ✅ Enforced options: 200k gas for SEND, 300k for SEND_AND_CALL
- ✅ Arbitrum ↔ Avalanche: Fully functional
- ⚠️  Sonic transfers: Awaiting production DVN deployment by LayerZero team

## Important Notes

1. **Sonic Limitations**: 
   - Uses LZDeadDVN (placeholder) instead of production DVNs
   - Quote functions fail due to missing default pathways
   - Manual fee estimation required for transfers

2. **Transfer Testing**:
   - Arbitrum ↔ Avalanche transfers should work normally
   - Sonic transfers require manual fee specification
   - See `scripts/test-lz-transfer-working.js` for examples

3. **Future Resolution**:
   - LayerZero team needs to deploy production DVNs on Sonic
   - CLI tools need to be updated to recognize Sonic's endpoint ID

## Configuration Verification

To verify current configuration:

```bash
# Check peers
npx hardhat run scripts/verify-lz-config.js

# Check enforced options
npx hardhat lz:oapp:enforced-opts:get
``` 