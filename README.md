# omniDRAGON Contracts

This repository contains the smart contracts for the omniDRAGON ecosystem, a cross-chain token using LayerZero v2 OFT (Omnichain Fungible Token) with CREATE2 deterministic deployment.

## Overview

omniDRAGON is a hybrid cross-chain token ecosystem that includes:
- **omniDRAGON**: The main cross-chain token using LayerZero v2 OFT
- **redDRAGON**: A complementary token for the ecosystem
- **veDRAGON**: A vote-escrowed token for governance

## Contract Structure

### Core Contracts

#### Tokens
- `contracts/core/tokens/omniDRAGON.sol` - Main cross-chain token contract
- `contracts/core/tokens/redDRAGON.sol` - Complementary token
- `contracts/core/tokens/veDRAGON.sol` - Vote-escrowed governance token

#### Factory & Deployment
- `contracts/core/factory/OmniDragonDeployer.sol` - Deployer contract for omniDRAGON
- `contracts/core/factory/CREATE2FactoryWithOwnership.sol` - CREATE2 factory for deterministic deployments

#### Configuration
- `contracts/core/config/OmniDragonHybridRegistry.sol` - Centralized configuration registry

### Additional Features

#### Oracles
- Price oracles for ecosystem tokens
- Chainlink VRF integration

#### Governance
- Governance contracts for decentralized decision making

#### Lottery & Promotions
- Lottery system contracts
- Promotional campaign contracts

#### Helpers & Libraries
- LayerZero options helper
- Security utilities
- Math libraries

## Architecture

The omniDRAGON ecosystem uses a hybrid registry pattern with CREATE2 deterministic deployments:

1. **CREATE2 Deployments**: All contracts use CREATE2 for deterministic addresses across chains
2. **Hybrid Registry**: Centralized configuration through the OmniDragonHybridRegistry
3. **LayerZero v2**: Cross-chain functionality via LayerZero OFT standard

## Supported Chains

- Sonic (EID 30332)
- Arbitrum (EID 30110)
- Avalanche (EID 30106)

## Key Features

- **Cross-Chain Transfers**: Seamless token transfers across supported chains
- **Deterministic Addresses**: Same contract addresses on all chains via CREATE2
- **Centralized Configuration**: Unified configuration management through registry
- **Security**: Built with OpenZeppelin standards and proper access controls
- **Governance**: On-chain governance with veDRAGON token

## Development

This is a contracts-only repository. For full deployment scripts and configuration, see the main development repository.

## Security

All contracts have been designed with security best practices:
- OpenZeppelin standards compliance
- Proper access controls
- Reentrancy protection
- Comprehensive event logging

## License

[Add your license information here] 