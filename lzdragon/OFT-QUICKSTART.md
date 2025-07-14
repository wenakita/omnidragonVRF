# LayerZero OFT Quickstart - Sonic Mainnet

This project is configured to deploy and manage an Omnichain Fungible Token (OFT) between Sonic Mainnet and Optimism Mainnet using LayerZero V2.

## Setup Complete ✅

### 1. Environment Configuration
- Created `.env` file with placeholders for:
  - `PRIVATE_KEY` (required - replace with your actual private key)
  - `RPC_URL_SONIC` (optional - defaults to https://rpc.soniclabs.com)
  - `RPC_URL_OPTIMISM` (optional - defaults to https://mainnet.optimism.io)

### 2. Network Configuration
- Updated `hardhat.config.ts` with:
  - Sonic Mainnet (EID: 30332)
  - Optimism Mainnet (EID: 30111)

### 3. LayerZero Wiring Configuration
- Updated `layerzero.config.ts` with:
  - Sonic ↔ Optimism pathway
  - LayerZero Labs DVN as required security
  - 80,000 gas for LZ_RECEIVE operations
  - 1 block confirmation for both directions

### 4. Contracts
- Created `contracts/MyOFT.sol` - A standard OFT implementation
- Created `deploy/MyOFT.ts` - Deployment script with configurable token name/symbol

### 5. Tasks
- Created `tasks/oftSend.ts` - Task for sending OFT tokens cross-chain

## Deployment Instructions

1. **Set your private key** in `.env`:
   ```bash
   PRIVATE_KEY=your_actual_private_key_here
   ```

2. **Deploy to Sonic Mainnet**:
   ```bash
   npx hardhat lz:deploy --network sonic-mainnet
   ```
   
3. **Deploy to Optimism Mainnet** (if needed):
   ```bash
   npx hardhat lz:deploy --network optimism-mainnet
   ```

4. **Wire the connections**:
   ```bash
   npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
   ```

5. **Verify the peer connections**:
   ```bash
   npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.ts
   ```

## Sending Tokens

Use the OFT send task to transfer tokens between chains:

```bash
npx hardhat lz:oft:send \
  --network sonic-mainnet \
  --to 0xYourRecipientAddress \
  --to-eid 30111 \
  --amount 100
```

Parameters:
- `--network`: Source network (where tokens are being sent from)
- `--to`: Recipient address on destination chain
- `--to-eid`: Destination endpoint ID (30111 for Optimism, 30332 for Sonic)
- `--amount`: Amount of tokens to send

## Important Notes

1. **Fund your deployer**: Ensure your deployer address has native tokens on both chains for:
   - Contract deployment
   - Wire configuration transactions
   - Cross-chain message fees

2. **Token Supply**: The current `MyOFT.sol` doesn't include minting logic. You may want to add:
   - A mint function in the constructor
   - Or a separate mint function with access control

3. **Security**: The current configuration uses LayerZero Labs as the only required DVN. For production, consider adding more DVNs for enhanced security.

## Troubleshooting

If `quoteSend` reverts:
1. Check that wiring is complete: `npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts`
2. Ensure no `LzDeadDVN` entries exist in your configuration
3. Verify both contracts are deployed and wired correctly

## Next Steps

1. Add minting logic to your OFT contract
2. Configure additional security providers (DVNs)
3. Set appropriate gas limits based on your contract's needs
4. Consider implementing fee collection mechanisms 