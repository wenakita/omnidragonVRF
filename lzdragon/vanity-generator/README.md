# CREATE2 Vanity Address Generator

A high-performance Rust-based vanity address generator for CREATE2 deployments, designed to help deploy contracts at the same addresses across multiple chains.

## Features

- 🚀 **High Performance**: Multi-threaded Rust implementation using Rayon
- 🎯 **Pattern Matching**: Support for both prefix and suffix patterns
- 📊 **Progress Tracking**: Real-time progress indicators with attempt rates
- 💾 **Result Export**: JSON output with all deployment details
- 🔍 **Flexible Search**: Configurable pattern lengths and thread counts

## Quick Start

### Prerequisites

- Rust and Cargo installed
- Python 3.7+ (for helper script)
- Compiled Hardhat artifacts in parent directory

### Installation

1. **Navigate to project directory:**
   ```bash
   cd vanity-generator
   ```

2. **Build the project:**
   ```bash
   cargo build --release
   ```

### Usage

#### Option 1: Using the Python Helper Script (Recommended)

The helper script automatically extracts bytecode hashes from Hardhat artifacts and runs the vanity generator:

```bash
python3 deploy_helper.py
```

This will:
- Extract bytecode hashes from `../artifacts/`
- Generate vanity addresses ending with "777"
- Save results to individual JSON files
- Create a combined results file

#### Option 2: Manual Usage

Run the Rust binary directly:

```bash
cargo run --release -- \
  --factory 0xAA28020DDA6b954D16208eccF873D79AC6533833 \
  --bytecode-hash 0x48be50edf860a051d9ebfb6b24debfb68012a8243d1d21d8b04ec630622c8337 \
  --pattern 777 \
  --contract-name OmniDragonHybridRegistry \
  --threads 8
```

#### Command Line Options

- `-f, --factory`: CREATE2 factory address
- `-b, --bytecode-hash`: Keccak256 hash of contract bytecode
- `-p, --pattern`: Pattern to search for (e.g., "777")
- `-c, --contract-name`: Contract name for output
- `-t, --threads`: Number of threads to use (default: 8)
- `--prefix`: Search for prefix instead of suffix
- `-o, --output`: Output file name (default: vanity_result.json)

## Getting Bytecode Hashes

### Method 1: From Hardhat Artifacts

After compiling with `npm run compile`, bytecode hashes are in the artifacts:

```bash
# Find the contract artifact
find artifacts -name "OmniDragonHybridRegistry.json"

# Extract bytecode and calculate hash
python3 -c "
import json, hashlib
with open('artifacts/contracts/core/config/OmniDragonHybridRegistry.sol/OmniDragonHybridRegistry.json') as f:
    artifact = json.load(f)
    bytecode = artifact['bytecode'][2:]  # Remove 0x prefix
    hash = hashlib.sha3_256(bytes.fromhex(bytecode)).hexdigest()
    print(f'0x{hash}')
"
```

### Method 2: Using Foundry

```bash
# Get bytecode hash
forge inspect OmniDragonHybridRegistry bytecode | tail -n1 | xxd -r -p | keccak256sum
```

## Example Output

```
🔍 Vanity Address Generator for CREATE2 Deployments
Factory: 0xAA28020DDA6b954D16208eccF873D79AC6533833
Bytecode Hash: 0x48be50edf860a051d9ebfb6b24debfb68012a8243d1d21d8b04ec630622c8337
Pattern: 777
Contract: OmniDragonHybridRegistry
Threads: 8
Searching for suffix match...

🎉 FOUND VANITY ADDRESS!
Address: 0x69092c4af14b13ae15e1bf822bc38b072ee1d777
Salt: 0x8b1e85e5301fe0d9fe499daa95956af04e5d37eeee55aa914f2a514ef517239c
Attempts: 1,234,567
Duration: 45.67 seconds
Rate: 27,045 attempts/second
Results saved to: vanity_result.json
```

## Deployment with CREATE2

Once you have the vanity address results, you can deploy using CREATE2:

```solidity
// Example CREATE2 deployment
bytes32 salt = 0x8b1e85e5301fe0d9fe499daa95956af04e5d37eeee55aa914f2a514ef517239c;
bytes memory bytecode = abi.encodePacked(
    type(OmniDragonHybridRegistry).creationCode,
    abi.encode(initialOwner) // Constructor parameters
);

address deployed = Create2.deploy(0, salt, bytecode);
// deployed == 0x69092c4af14b13ae15e1bf822bc38b072ee1d777
```

## Performance Tips

1. **Use more threads** for faster generation (up to CPU core count)
2. **Shorter patterns** are found much faster (3 chars vs 4 chars is ~16x faster)
3. **Release builds** are significantly faster than debug builds
4. **Consider pattern probability**: 
   - 3 hex chars (e.g., "777"): ~1 in 4,096 attempts
   - 4 hex chars (e.g., "7777"): ~1 in 65,536 attempts
   - 5 hex chars: ~1 in 1,048,576 attempts

## Testing

Run the built-in tests to verify CREATE2 calculations:

```bash
cargo test
```

## File Structure

```
vanity-generator/
├── Cargo.toml              # Rust dependencies
├── src/
│   └── main.rs             # Main vanity generator
├── deploy_helper.py        # Python helper script
├── README.md               # This file
└── vanity_*.json          # Generated results
```

## Troubleshooting

### Common Issues

1. **"No such file or directory" errors**: Ensure you're in the correct directory and artifacts exist
2. **Slow generation**: Try reducing pattern length or increasing thread count
3. **Build failures**: Make sure Rust is up to date (`rustup update`)

### Performance Expectations

On a modern 8-core CPU:
- Pattern "777" (3 chars): ~30-60 seconds
- Pattern "7777" (4 chars): ~8-15 minutes  
- Pattern "77777" (5 chars): ~2-4 hours

## Security Notes

- Always verify generated addresses before deployment
- Use a secure random number generator (provided by default)
- Double-check bytecode hashes match your compiled contracts
- Test on testnets before mainnet deployment

## License

MIT License - See LICENSE file for details 