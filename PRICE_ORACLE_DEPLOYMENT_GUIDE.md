# OmniDragon Price Oracle Deployment Guide

This guide covers the deployment and configuration of the OmniDragon Price Oracle system across Sonic, Arbitrum, and Avalanche networks.

## Overview

The OmniDragon Price Oracle system consists of two main components:
- **OmniDragonPriceOracle**: Multi-oracle price aggregation with cross-chain capabilities
- **DragonFeeManager**: Dynamic fee management based on market conditions

## Features

### OmniDragonPriceOracle
- **Multi-Oracle Aggregation**: Combines data from Chainlink, Band Protocol, API3, and Pyth
- **Cross-Chain Price Synchronization**: LayerZero V2 integration for cross-chain price data
- **Market Condition Analysis**: Real-time volatility and liquidity scoring
- **Circuit Breaker Protection**: Automatic safety mechanisms for price anomalies
- **Adaptive Fee Calculation**: Dynamic fee adjustments based on market conditions

### DragonFeeManager
- **Price Oracle Integration**: Links to OmniDragonPriceOracle for market data
- **Adaptive Fee Structure**: Automatic fee adjustments based on market conditions
- **Configurable Parameters**: Customizable fee ranges and thresholds

## Network Configurations

### Sonic Network (Chain ID: 146)
```javascript
{
  nativeSymbol: "S",
  quoteSymbol: "USD",
  layerzeroEndpoint: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B",
  chainlinkOracle: "0x26e45619119119e14b7663e4d3e4b85fa6c5e6119" // LINK/USD (proxy for S/USD)
}
```

### Arbitrum Network (Chain ID: 42161)
```javascript
{
  nativeSymbol: "ETH",
  quoteSymbol: "USD",
  layerzeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
  chainlinkOracle: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612" // ETH/USD
}
```

### Avalanche Network (Chain ID: 43114)
```javascript
{
  nativeSymbol: "AVAX",
  quoteSymbol: "USD",
  layerzeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
  chainlinkOracle: "0x0A77230d17318075983913bC2145DB16C7366156" // AVAX/USD
}
```

## Deployment Instructions

### 1. Deploy Price Oracles

Deploy on all networks:
```bash
# Deploy on Sonic
npx hardhat deploy-price-oracles --network sonic

# Deploy on Arbitrum
npx hardhat deploy-price-oracles --network arbitrum

# Deploy on Avalanche
npx hardhat deploy-price-oracles --network avalanche
```

### 2. Deploy Fee Managers

Deploy fee managers (requires price oracles to be deployed first):
```bash
# Deploy on Sonic
npx hardhat deploy-fee-managers --network sonic

# Deploy on Arbitrum
npx hardhat deploy-fee-managers --network arbitrum

# Deploy on Avalanche
npx hardhat deploy-fee-managers --network avalanche
```

### 3. Link Fee Managers to Price Oracles

```bash
# Link on each network
npx hardhat link-fee-manager-oracle --network sonic
npx hardhat link-fee-manager-oracle --network arbitrum
npx hardhat link-fee-manager-oracle --network avalanche
```

## Configuration Tasks

### Check Oracle Status

```bash
# Check status on any network
npx hardhat configure-price-oracles --network sonic --action status
npx hardhat configure-price-oracles --network arbitrum --action status
npx hardhat configure-price-oracles --network avalanche --action status
```

### Update Oracle Addresses

```bash
# Update oracle addresses with latest configurations
npx hardhat configure-price-oracles --network sonic --action update-oracles
npx hardhat configure-price-oracles --network arbitrum --action update-oracles
npx hardhat configure-price-oracles --network avalanche --action update-oracles
```

### Set Fee Configuration

```bash
# Set total fee to 12% and jackpot fee to 4%
npx hardhat configure-price-oracles --network sonic --action set-fees --totalfee 1200 --jackpotfee 400
npx hardhat configure-price-oracles --network arbitrum --action set-fees --totalfee 1200 --jackpotfee 400
npx hardhat configure-price-oracles --network avalanche --action set-fees --totalfee 1200 --jackpotfee 400
```

### Update Oracle Weights

```bash
# Set oracle weights (Chainlink 40%, Band 30%, API3 20%, Pyth 10%)
npx hardhat configure-price-oracles --network sonic --action set-weights
npx hardhat configure-price-oracles --network arbitrum --action set-weights
npx hardhat configure-price-oracles --network avalanche --action set-weights
```

### Enable Cross-Chain Mode

```bash
# Enable cross-chain price synchronization
npx hardhat configure-price-oracles --network sonic --action enable-crosschain
npx hardhat configure-price-oracles --network arbitrum --action enable-crosschain
npx hardhat configure-price-oracles --network avalanche --action enable-crosschain
```

### Test Oracle Functionality

```bash
# Test oracle feeds and functionality
npx hardhat configure-price-oracles --network sonic --action test-oracle
npx hardhat configure-price-oracles --network arbitrum --action test-oracle
npx hardhat configure-price-oracles --network avalanche --action test-oracle
```

## Deployment Files

After successful deployment, the following files will be created:

```
deployments/
├── sonic/
│   ├── OmniDragonPriceOracle.json
│   └── DragonFeeManager.json
├── arbitrum/
│   ├── OmniDragonPriceOracle.json
│   └── DragonFeeManager.json
└── avalanche/
    ├── OmniDragonPriceOracle.json
    └── DragonFeeManager.json
```

Each deployment file contains:
- Contract address
- Deployment transaction details
- Constructor parameters
- Network configuration
- Verification commands

## Contract Verification

### Verify Price Oracle

```bash
# Sonic
npx hardhat verify --network sonic <PRICE_ORACLE_ADDRESS> "S" "USD" "0x26e45619119119e14b7663e4d3e4b85fa6c5e6119" "0x0000000000000000000000000000000000000000" "0x0000000000000000000000000000000000000000" "0x0000000000000000000000000000000000000000" "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B" 0

# Arbitrum
npx hardhat verify --network arbitrum <PRICE_ORACLE_ADDRESS> "ETH" "USD" "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612" "0x0000000000000000000000000000000000000000" "0x0000000000000000000000000000000000000000" "0x0000000000000000000000000000000000000000" "0x1a44076050125825900e736c501f859c50fE728c" 0

# Avalanche
npx hardhat verify --network avalanche <PRICE_ORACLE_ADDRESS> "AVAX" "USD" "0x0A77230d17318075983913bC2145DB16C7366156" "0x0000000000000000000000000000000000000000" "0x0000000000000000000000000000000000000000" "0x0000000000000000000000000000000000000000" "0x1a44076050125825900e736c501f859c50fE728c" 0
```

### Verify Fee Manager

```bash
# Replace <PRICE_ORACLE_ADDRESS> with actual deployed address
npx hardhat verify --network sonic <FEE_MANAGER_ADDRESS> "<PRICE_ORACLE_ADDRESS>" 1000 300
npx hardhat verify --network arbitrum <FEE_MANAGER_ADDRESS> "<PRICE_ORACLE_ADDRESS>" 1000 300
npx hardhat verify --network avalanche <FEE_MANAGER_ADDRESS> "<PRICE_ORACLE_ADDRESS>" 1000 300
```

## Integration with OmniDragon Ecosystem

### 1. Update omniDRAGON Contract

The omniDRAGON token contract should reference the DragonFeeManager for dynamic fee calculations:

```solidity
// In omniDRAGON contract
address public feeManager;

function updateFeeManager(address _feeManager) external onlyOwner {
    feeManager = _feeManager;
}

function getSwapFees() external view returns (uint256 jackpotFee, uint256 liquidityFee) {
    if (feeManager != address(0)) {
        IDragonFeeManager(feeManager).getCurrentFees();
    }
    // Fallback to default fees
    return (300, 700); // 3% jackpot, 7% liquidity
}
```

### 2. Update Jackpot Contracts

The DragonJackpotVault and DragonJackpotDistributor should query the price oracle for market conditions:

```solidity
// In jackpot contracts
function getMarketConditions() external view returns (uint256 score) {
    if (priceOracle != address(0)) {
        return IOmniDragonPriceOracle(priceOracle).getMarketConditionScore();
    }
    return 5000; // Default neutral score
}
```

## Monitoring and Maintenance

### 1. Regular Health Checks

```bash
# Daily status check
npx hardhat configure-price-oracles --network sonic --action status
npx hardhat configure-price-oracles --network arbitrum --action status
npx hardhat configure-price-oracles --network avalanche --action status
```

### 2. Oracle Feed Testing

```bash
# Weekly oracle testing
npx hardhat configure-price-oracles --network sonic --action test-oracle
npx hardhat configure-price-oracles --network arbitrum --action test-oracle
npx hardhat configure-price-oracles --network avalanche --action test-oracle
```

### 3. Fee Optimization

Monitor market conditions and adjust fees as needed:

```bash
# Adjust fees based on market volatility
npx hardhat configure-price-oracles --network sonic --action set-fees --totalfee 1500 --jackpotfee 500
```

## Security Considerations

### 1. Oracle Security
- Multiple oracle sources reduce single points of failure
- Circuit breaker protection prevents manipulation
- Price deviation monitoring alerts to anomalies

### 2. Access Control
- Owner-only functions for critical operations
- Timelock mechanisms for major changes
- Emergency pause functionality

### 3. Cross-Chain Security
- LayerZero V2 provides battle-tested cross-chain messaging
- Message verification and replay protection
- Endpoint validation and security

## Troubleshooting

### Common Issues

1. **Oracle Not Responding**
   - Check oracle feed addresses
   - Verify network connectivity
   - Test individual oracle feeds

2. **Price Deviation Errors**
   - Adjust price deviation thresholds
   - Check for oracle feed issues
   - Verify market conditions

3. **Cross-Chain Sync Issues**
   - Verify LayerZero endpoint addresses
   - Check cross-chain message fees
   - Test cross-chain connectivity

### Support Commands

```bash
# Get detailed oracle status
npx hardhat configure-price-oracles --network sonic --action status

# Test all oracle feeds
npx hardhat configure-price-oracles --network sonic --action test-oracle

# Check fee manager linking
npx hardhat link-fee-manager-oracle --network sonic
```

## Conclusion

The OmniDragon Price Oracle system provides robust, multi-source price data with cross-chain synchronization capabilities. Regular monitoring and maintenance ensure optimal performance and security for the entire OmniDragon ecosystem.

For support or questions, refer to the deployment logs and verification commands provided after each deployment. 