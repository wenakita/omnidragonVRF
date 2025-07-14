# omniDRAGON Deployment Summary

## Sonic Mainnet ✅ DEPLOYED

### Deployment Details
- **Date**: December 11, 2024
- **Network**: Sonic Mainnet (Chain ID: 146)
- **Deployer**: `0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F`

### Contract Addresses
- **OmniDragonHybridRegistry**: `0x69637BfD5D2b851D870d9E0E38B5b73FaF950777` 
  - ✨ Vanity address: starts with `0x69`, ends with `0777`
  - Transaction: `0x9721113129b125e3a3c87e67c0055574c1efbe31c8a9a9a449d14a6edaf01cbc`

- **omniDRAGON Token (Old)**: `0xa693A8ba4005F4AD8EC37Ef9806843c4646994BA` (REPLACED)
- **omniDRAGON Token (NEW)**: `0x69cb0574d4f7ca6879a72cb50123B391c4e60777` ✨ Vanity: starts with 0x69, ends with 0777
  - Status: Ready for deployment with vanity address
  - Salt: `0x2cba8e159bea4252994ade12157f7e9324a2d6f6878baa8f0031cb0bd44bfefa`

### Chain Registration
- Transaction: `0x8804baace8a6ed2173547195207e8b846e268cc400c2f1ca522f8e3b37b912e9`
- Wrapped Native Token: `0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38` (Wrapped S)

## Arbitrum Mainnet ⏳ PENDING

### Expected Addresses (via CREATE2)
- **OmniDragonHybridRegistry**: `0x69637BfD5D2b851D870d9E0E38B5b73FaF950777` (same)
- **omniDRAGON Token**: Will be calculated after deployment

### Chain Configuration
- Chain ID: 42161
- Wrapped Native: `0x82aF49447D8a07e3bd95BD0d56f35241523fBab1` (WETH)
- Initial Supply: 0 (tokens will be bridged from Sonic)

## Avalanche Mainnet ⏳ PENDING

### Expected Addresses (via CREATE2)
- **OmniDragonHybridRegistry**: `0x69637BfD5D2b851D870d9E0E38B5b73FaF950777` (same)
- **omniDRAGON Token**: Will be calculated after deployment

### Chain Configuration
- Chain ID: 43114
- Wrapped Native: `0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7` (WAVAX)
- Initial Supply: 0 (tokens will be bridged from Sonic)

## LayerZero Configuration ⏳ PENDING

### Endpoint IDs
- Sonic: 30332
- Arbitrum: 30110
- Avalanche: 30106

### DVN Configuration
- Using LayerZero Labs DVN on all chains
- Enforced options: 80,000 gas for LZ_RECEIVE

## Next Steps

1. **Deploy on Arbitrum**
   ```bash
   npx hardhat deploy --network arbitrum-mainnet --tags Registry
   npx hardhat deploy --network arbitrum-mainnet --tags OmniDRAGON
   ```

2. **Deploy on Avalanche**
   ```bash
   npx hardhat deploy --network avalanche-mainnet --tags Registry
   npx hardhat deploy --network avalanche-mainnet --tags OmniDRAGON
   ```

3. **Wire LayerZero Connections**
   ```bash
   npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
   ```

4. **Verify Peer Connections**
   ```bash
   npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.ts
   ``` 