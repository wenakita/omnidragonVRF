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

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

**Quick Start**: To test with existing deployed contracts, you can use:
```bash
cp .env.sample .env
# Then add your PRIVATE_KEY to the .env file
```

#### Required Variables

**All environment variables are required** - the system will not work without them:

```bash
# Deployer private key (required for all operations)
PRIVATE_KEY=your_private_key_here

# RPC URLs (required)
RPC_URL_ARBITRUM=https://arb1.arbitrum.io/rpc
RPC_URL_SONIC=https://rpc.soniclabs.com

# LayerZero V2 Infrastructure (required)
LZ_ARBITRUM_ENDPOINT=0x1a44076050125825900e736c501f859c50fE728c
LZ_SONIC_ENDPOINT=0x6F475642a6e85809B1c36Fa62763669b1b48DD5B
LZ_ARBITRUM_SEND_LIBRARY=0x975bcD720be66659e3EB3C0e4F1866a3020E493A
LZ_ARBITRUM_RECEIVE_LIBRARY=0x7B9E184e07a6EE1aC23eAe0fe8D6Be2f663f05e6
LZ_ARBITRUM_EXECUTOR=0x31CAe3B7fB82d847621859fb1585353c5720660D
LZ_ARBITRUM_DVN=0x2f55c492897526677c5b68fb199ea31e2c126416
LZ_SONIC_SEND_LIBRARY=0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7
LZ_SONIC_RECEIVE_LIBRARY=0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043
LZ_SONIC_EXECUTOR=0x4208D6E27538189bB48E603D6123A94b8Abe0A0b
LZ_SONIC_DVN=0x282b3386571f7f794450d5789911a9804fa346b4

# Chainlink VRF Configuration (required for Arbitrum deployment)
CHAINLINK_VRF_COORDINATOR=0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e
CHAINLINK_SUBSCRIPTION_ID=76197290230634444536112874207591481868701552347170354938929514079949640872745
CHAINLINK_KEY_HASH=0xe9f223d7d83ec85c4f78042a4845af3a1c8df7757b4997b815ce4b8d07aca68c

# Contract Addresses (required - update with your deployments)
ARBITRUM_VRF_CONTRACT=0xd703FFB355fcE93AFD73387A2BE11d8819CAF791
SONIC_VRF_CONTRACT=0xe0dFebC010E0680b9B824A51227B2e7cb8C0F747

# API Keys for contract verification (optional)
ARBISCAN_API_KEY=your_arbiscan_api_key
SONICSCAN_API_KEY=your_sonicscan_api_key
```

> **Security Note**: All addresses are now required via environment variables. No fallback values are provided in the code to ensure sensitive information stays in your local `.env` file.

> **Mainnet Addresses**: The addresses above are for mainnet. If deploying to testnets, you'll need to update the LayerZero and Chainlink addresses accordingly.

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