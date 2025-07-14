# 🎯 OmniDragon Rust Vanity Address Generator

High-performance vanity address generator for omniDRAGON contracts using CREATE2 and Rust.

## Features

- **⚡ Ultra-fast**: Uses parallel processing with Rayon
- **🎯 Vanity patterns**: Generate addresses matching `0x69...d777`
- **🏗️ CREATE2 compatible**: Works with your CREATE2FactoryWithOwnership
- **📊 Progress tracking**: Real-time progress bars and statistics
- **🔧 Configurable**: Customizable prefix, suffix, and max attempts

## Performance

- **~1M+ attempts/second** on modern CPUs
- **Multi-core processing** using all available CPU cores
- **Memory efficient** with atomic operations
- **Optimized for vanity address generation**

## Installation

### Prerequisites

1. **Install Rust** (if not already installed):
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

2. **Verify installation**:
```bash
cargo --version
```

### Build

```bash
cd vanity-generator
cargo build --release
```

## Usage

### Option 1: Use the Helper Script (Recommended)

```bash
# Run from project root
npx hardhat run scripts/rust-vanity-generator.js --network sonic
```

This will:
1. Deploy the CREATE2 factory
2. Extract bytecode hashes
3. Build and run the Rust generator
4. Save results to `vanity-addresses-sonic.json`

### Option 2: Manual Usage

```bash
cd vanity-generator

# Run with specific parameters
cargo run --release -- \
    --factory 0x1234567890123456789012345678901234567890 \
    --registry-bytecode 0xabcdef... \
    --omnidragon-bytecode 0x123456... \
    --prefix 0x69 \
    --suffix d777 \
    --max-attempts 10000000 \
    --network sonic
```

## Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--factory` | `-f` | CREATE2 factory address | Required |
| `--registry-bytecode` | `-r` | Registry bytecode hash | Required |
| `--omnidragon-bytecode` | `-o` | omniDRAGON bytecode hash | Required |
| `--prefix` | `-p` | Address prefix | `0x69` |
| `--suffix` | `-s` | Address suffix | `d777` |
| `--max-attempts` | `-m` | Max attempts per contract | `10000000` |
| `--network` | `-n` | Network name | `sonic` |

## Example Output

```
🎯 OmniDragon Vanity Address Generator
=====================================
Network: sonic
Factory: 0x1234567890123456789012345678901234567890
Pattern: 0x69...d777
Max Attempts: 10000000
Using 16 CPU cores

🔍 Searching for vanity address for OmniDragonHybridRegistry...
Pattern: 0x69...d777
Factory: 0x1234567890123456789012345678901234567890
Bytecode Hash: 0xabcdef...
Max Attempts: 10000000

█████████████████████████████████████████ 2,547,832/10,000,000 (1,234,567 attempts/sec)

🎉 Found vanity address for OmniDragonHybridRegistry!
Address: 0x69a1b2c3d4e5f6789012345678901234567d777
Salt: 0x8f9e8d7c6b5a4938271605948372615849362718
Attempts: 2,547,832
Time: 2.06s
Rate: 1,234,567 attempts/sec
```

## Output Format

The generator saves results to `vanity-addresses-{network}.json`:

```json
{
  "network": "sonic",
  "timestamp": "2024-01-01T12:00:00Z",
  "factory": "0x1234567890123456789012345678901234567890",
  "registry": {
    "address": "0x69a1b2c3d4e5f6789012345678901234567d777",
    "salt": "0x8f9e8d7c6b5a4938271605948372615849362718",
    "attempts": 2547832,
    "time_seconds": 2.06,
    "contract_name": "OmniDragonHybridRegistry",
    "bytecode_hash": "0xabcdef...",
    "factory_address": "0x1234567890123456789012345678901234567890"
  },
  "omnidragon": {
    "address": "0x69fedcba0987654321098765432109876543d777",
    "salt": "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
    "attempts": 5834291,
    "time_seconds": 4.73,
    "contract_name": "omniDRAGON",
    "bytecode_hash": "0x123456...",
    "factory_address": "0x1234567890123456789012345678901234567890"
  }
}
```

## Performance Tips

1. **Use release mode**: Always use `--release` flag for maximum performance
2. **More cores = faster**: The generator scales with CPU cores
3. **Adjust max attempts**: Increase for harder patterns, decrease for testing
4. **Pattern difficulty**: Shorter patterns are found faster than longer ones

## Pattern Difficulty

| Pattern | Estimated Attempts | Time (16 cores) |
|---------|-------------------|------------------|
| `0x69` | ~256 | < 1 second |
| `0x69...7` | ~4,096 | < 1 second |
| `0x69...77` | ~65,536 | < 1 second |
| `0x69...777` | ~1,048,576 | ~1 second |
| `0x69...d777` | ~16,777,216 | ~15 seconds |

## Troubleshooting

### Rust Not Found
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### Build Errors
```bash
cd vanity-generator
cargo clean
cargo build --release
```

### No Vanity Address Found
- Increase `--max-attempts`
- Try shorter patterns
- Ensure factory address is correct

## Next Steps

After generating vanity addresses:

1. **Deploy contracts**:
   ```bash
   npx hardhat run scripts/deploy-vanity-omnidragon.js --network sonic
   ```

2. **Update LayerZero configs**:
   ```bash
   npx hardhat run scripts/update-layerzero-configs.js
   ```

3. **Test LayerZero setup**:
   ```bash
   npx hardhat lz:oapp:config:get --oapp-config sonic-layerzero.config.ts
   ``` 