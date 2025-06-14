# OmniDragon Cross-Chain VRF System

A cross-chain Verifiable Random Function (VRF) system built with LayerZero V2 and Chainlink VRF 2.5 Plus, enabling secure random number generation across Sonic and Arbitrum networks.

## 🌟 Features

- **Cross-Chain VRF**: Request random numbers from Sonic, processed on Arbitrum via Chainlink VRF
- **LayerZero V2 Integration**: Secure cross-chain messaging with built-in retry mechanisms
- **Chainlink VRF 2.5 Plus**: Enterprise-grade verifiable randomness
- **Gas Optimized**: Efficient cross-chain operations with configurable gas limits
- **Event-Driven**: Real-time notifications for request status and fulfillment

## 🏗️ Architecture

```
Sonic Network                    Arbitrum Network
┌─────────────────────┐         ┌──────────────────────────┐
│ ChainlinkVRF        │         │ OmniDragonVRF            │
│ IntegratorV2_5      │◄────────┤ ConsumerV2_5             │
│                     │         │                          │
│ - Request VRF       │         │ - Process VRF Request    │
│ - Receive Response  │         │ - Call Chainlink VRF     │
│ - Handle Callbacks  │         │ - Send Response Back     │
└─────────────────────┘         └──────────────────────────┘
         │                                    │
         │                                    │
         └────────── LayerZero V2 ────────────┘
```

## 📋 Contract Addresses

### Mainnet Deployments

- **Sonic Network**
  - Contract: `0xe0dFebC010E0680b9B824A51227B2e7cb8C0F747`
  - Network: Sonic Mainnet (Chain ID: 146)

- **Arbitrum Network**
  - Contract: `0xd703FFB355fcE93AFD73387A2BE11d8819CAF791`
  - Network: Arbitrum One (Chain ID: 42161)

## 🚀 Quick Start

### Prerequisites

```bash
npm install
# or
yarn install
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
PRIVATE_KEY=your_private_key_here
RPC_URL_ARBITRUM=https://arb1.arbitrum.io/rpc
RPC_URL_SONIC=https://rpc.soniclabs.com
```

### Testing the System

1. **Check System Status**
   ```bash
   npx hardhat run scripts/check-request-status.ts --network sonic
   ```

2. **Make a VRF Request**
   ```bash
   npx hardhat run scripts/test-vrf-system.ts --network sonic
   ```

3. **Fund Contracts (if needed)**
   ```bash
   npx hardhat run scripts/fund-new-contracts.ts --network arbitrum
   npx hardhat run scripts/fund-new-contracts.ts --network sonic
   ```

## 📜 Available Scripts

### Core Scripts

- **`test-vrf-system.ts`** - Complete VRF system test with real-time monitoring
- **`check-request-status.ts`** - Monitor request status and contract health
- **`fund-new-contracts.ts`** - Fund contracts with LayerZero fees

### Utility Scripts

- **`withdraw-from-all-previous-contracts.ts`** - Withdraw funds from old deployments
- **`withdraw-from-sonic-contract.ts`** - Specific Sonic contract withdrawal

## 🔧 Configuration

### LayerZero Configuration

The system uses LayerZero V2 with the following configuration:
- **Confirmations**: 20 blocks
- **DVNs**: LayerZero Labs DVN
- **Executors**: LayerZero default executors
- **Gas Limits**: Optimized for VRF operations

### Chainlink VRF Configuration

- **Coordinator**: Chainlink VRF 2.5 Plus on Arbitrum
- **Key Hash**: 30 gwei gas lane
- **Subscription**: Managed subscription for reliable funding

## 🔍 How It Works

1. **Request Initiation**: User calls `requestRandomWordsSimple()` on Sonic
2. **Cross-Chain Message**: LayerZero sends request to Arbitrum
3. **VRF Processing**: Arbitrum contract requests randomness from Chainlink
4. **Fulfillment**: Chainlink VRF provides verifiable random number
5. **Response**: Random number sent back to Sonic via LayerZero
6. **Callback**: Optional callback to requesting contract on Sonic

## 📊 Monitoring

### Request Status

```solidity
function checkRequestStatus(uint64 requestId) external view returns (
    bool fulfilled,
    bool exists,
    address provider,
    uint256 randomWord,
    uint256 timestamp,
    bool expired
);
```

### Events

- `RandomWordsRequested(uint64 requestId, address provider, uint32 targetEid)`
- `RandomWordsReceived(uint256[] randomWords, uint64 sequence, address provider)`
- `MessageSent(uint64 sequence, uint32 targetEid, bytes payload)`

## 🛠️ Development

### Compile Contracts

```bash
npx hardhat compile
```

### Deploy Contracts

```bash
# Deploy to Arbitrum
npx hardhat deploy --network arbitrum

# Deploy to Sonic
npx hardhat deploy --network sonic
```

### Configure LayerZero

```bash
npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

## 🔐 Security

- **Ownership**: Contracts use OpenZeppelin's Ownable for access control
- **Validation**: Strict payload validation and peer verification
- **Timeouts**: Request expiration to prevent stuck states
- **Retry Logic**: Built-in LayerZero V2 retry mechanisms

## 🌐 Networks

### Supported Networks

- **Sonic Mainnet** (Chain ID: 146)
- **Arbitrum One** (Chain ID: 42161)

### LayerZero Endpoint IDs

- Sonic: `30332`
- Arbitrum: `30110`

## 📞 Support

- **Telegram**: [https://t.me/sonicreddragon](https://t.me/sonicreddragon)
- **Twitter**: [https://x.com/sonicreddragon](https://x.com/sonicreddragon)

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for the OmniDragon ecosystem** 