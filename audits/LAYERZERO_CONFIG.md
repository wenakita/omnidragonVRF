# LayerZero V2 Cross-Chain Setup Guide

This guide will help you set up a LayerZero V2 cross-chain configuration between Arbitrum and Sonic networks with proper ULN, DVN, and executor configurations.

## Project Structure Requirements

1. **Package Manager**: Use Yarn (not npm) to avoid dependency conflicts
2. **Framework**: Hardhat with hardhat-deploy plugin
3. **LayerZero**: Use @layerzerolabs/toolbox-hardhat for V2 support

## Step 1: Install Dependencies

```bash
yarn add -D hardhat hardhat-deploy hardhat-preprocessor
yarn add -D @nomiclabs/hardhat-ethers @layerzerolabs/toolbox-hardhat
yarn add -D @layerzerolabs/devtools-evm-hardhat @layerzerolabs/lz-definitions
yarn install --legacy-peer-deps  # If dependency conflicts occur
```

## Step 2: Configure remappings.txt

Create `remappings.txt` in your project root:

```
@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/
@chainlink/contracts/=lib/chainlink-brownie-contracts/contracts/
@layerzerolabs/oapp-evm/contracts/=lib/devtools/packages/oapp-evm/contracts/
@layerzerolabs/lz-evm-protocol-v2/contracts/=lib/layerzero-v2/packages/layerzero-v2/evm/protocol/contracts/
forge-std/=lib/forge-std/src/
@layerzerolabs/oapp/contracts/=lib/devtools/packages/oapp-evm/contracts/
@omnidragon/interfaces/=contracts/interfaces/
@omnidragon/core/=contracts/core/
@omnidragon/libraries/=contracts/libraries/
```

## Step 3: Configure hardhat.config.ts

```typescript
import 'dotenv/config'
import 'hardhat-deploy'
import '@nomiclabs/hardhat-ethers'
import '@layerzerolabs/toolbox-hardhat'
import { HardhatUserConfig, HttpNetworkAccountsUserConfig } from 'hardhat/types'
import 'hardhat-preprocessor'
import fs from 'fs'
import path from 'path'
import { EndpointId } from '@layerzerolabs/lz-definitions'

const MNEMONIC = process.env.MNEMONIC
const PRIVATE_KEY = process.env.PRIVATE_KEY

const accounts: HttpNetworkAccountsUserConfig | undefined = MNEMONIC
    ? { mnemonic: MNEMONIC }
    : PRIVATE_KEY
      ? [PRIVATE_KEY]
      : undefined

function getRemappings() {
    return fs
        .readFileSync('remappings.txt', 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => line.trim().split('='))
}

const config: HardhatUserConfig = {
    paths: {
        cache: 'cache/hardhat',
        sources: './contracts',
    },
    solidity: {
        compilers: [
            {
                version: '0.8.22',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    preprocess: {
        eachLine: (hre) => ({
            transform: (line: string) => {
                if (line.match(/^\s*import /i)) {
                    for (const [from, to] of getRemappings()) {
                        if (line.includes(from)) {
                            line = line.replace(from, to)
                            break
                        }
                    }
                }
                return line
            },
        }),
    },
    networks: {
        sonic: {
            eid: EndpointId.SONIC_V2_MAINNET,
            url: process.env.RPC_URL_SONIC || 'https://rpc.soniclabs.com',
            accounts,
            chainId: 146,
        },
        arbitrum: {
            eid: EndpointId.ARBITRUM_V2_MAINNET,
            url: process.env.RPC_URL_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
            accounts,
            chainId: 42161,
        },
        hardhat: {
            allowUnlimitedContractSize: true,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
}

export default config
```

## Step 4: Update tsconfig.json

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "dist"
  },
  "include": ["./scripts", "./test", "./hardhat.config.ts", "./deploy"],
}
```

## Step 5: Create LayerZero Configuration

Create `layerzero.config.ts` in your project root:

```typescript
import { EndpointId } from '@layerzerolabs/lz-definitions';

const arbitrumContract = {
  eid: EndpointId.ARBITRUM_V2_MAINNET,
  contractName: 'YourArbitrumContract',
  address: '0x0000000000000000000000000000000000000000', // Replace with actual address
};

const sonicContract = {
  eid: EndpointId.SONIC_V2_MAINNET,
  contractName: 'YourSonicContract',
  address: '0x0000000000000000000000000000000000000000', // Replace with actual address
};

export default {
  contracts: [{ contract: arbitrumContract }, { contract: sonicContract }],
  connections: [
    {
      from: arbitrumContract,
      to: sonicContract,
      config: {
        sendLibrary: '0x975bcD720be66659e3EB3C0e4F1866a3020E493A',
        receiveLibraryConfig: {
          receiveLibrary: '0x7B9E184e07a6EE1aC23eAe0fe8D6Be2f663f05e6',
          gracePeriod: 0,
        },
        sendConfig: {
          executorConfig: {
            maxMessageSize: 10000,
            executor: '0x31CAe3B7fB82d847621859fb1585353c5720660D',
          },
          ulnConfig: {
            confirmations: 20,
            requiredDVNs: [
              '0x2f55c492897526677c5b68fb199ea31e2c126416', // LayerZero DVN
              '0xa7b5189bca84cd304d8553977c7c614329750d99'  // Google Cloud DVN
            ],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
        receiveConfig: {
          ulnConfig: {
            confirmations: 20,
            requiredDVNs: [
              '0x2f55c492897526677c5b68fb199ea31e2c126416',
              '0xa7b5189bca84cd304d8553977c7c614329750d99'
            ],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
      },
    },
    {
      from: sonicContract,
      to: arbitrumContract,
      config: {
        sendLibrary: '0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7',
        receiveLibraryConfig: {
          receiveLibrary: '0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043',
          gracePeriod: 0,
        },
        sendConfig: {
          executorConfig: {
            maxMessageSize: 10000,
            executor: '0x4208D6E27538189bB48E603D6123A94b8Abe0A0b',
          },
          ulnConfig: {
            confirmations: 20,
            requiredDVNs: [
              '0x282b3386571f7f794450d5789911a9804fa346b4', // LayerZero DVN Sonic
              '0x05aaefdf9db6e0f7d27fa3b6ee099edb33da029e'  // Google Cloud DVN Sonic
            ],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
        receiveConfig: {
          ulnConfig: {
            confirmations: 20,
            requiredDVNs: [
              '0x282b3386571f7f794450d5789911a9804fa346b4',
              '0x05aaefdf9db6e0f7d27fa3b6ee099edb33da029e'
            ],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
      },
    },
  ],
};
```

## Step 6: Add Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "lz:help": "npx hardhat --help | grep 'lz:'",
    "lz:wire": "npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts",
    "lz:get": "npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts",
    "lz:peers": "npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.ts"
  }
}
```

## Step 7: Create Deployment Scripts

Create `deploy/01_deploy_contracts.js`:

```javascript
const func = async function (hre) {
    const { deployments, getNamedAccounts } = hre
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    // LayerZero V2 Endpoints
    const ENDPOINTS = {
        arbitrum: '0x1a44076050125825900e736c501f859c50fE728c',
        sonic: '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B'
    }

    if (hre.network.name === 'arbitrum') {
        await deploy('YourArbitrumContract', {
            from: deployer,
            args: [ENDPOINTS.arbitrum, deployer],
            log: true,
            waitConfirmations: 1,
        })
    }

    if (hre.network.name === 'sonic') {
        await deploy('YourSonicContract', {
            from: deployer,
            args: [ENDPOINTS.sonic, deployer],
            log: true,
            waitConfirmations: 1,
        })
    }
}

func.tags = ['deploy']
module.exports = func
```

## Step 8: Environment Variables

Create `.env` file:

```bash
PRIVATE_KEY=your_private_key_here
RPC_URL_ARBITRUM=https://arb1.arbitrum.io/rpc
RPC_URL_SONIC=https://rpc.soniclabs.com
```

## Step 9: Deployment and Configuration Commands

```bash
# 1. Install dependencies
yarn install

# 2. Deploy contracts
npx hardhat deploy --network arbitrum --tags deploy
npx hardhat deploy --network sonic --tags deploy

# 3. Update layerzero.config.ts with deployed addresses

# 4. Wire LayerZero configurations
npm run lz:wire

# 5. Verify configuration
npm run lz:get
npm run lz:peers
```

## Key Configuration Explanations

### ULN (Ultra Light Node) Configuration
- **confirmations**: Number of block confirmations required (20 for production)
- **requiredDVNs**: Array of DVN addresses that must verify messages
- **optionalDVNs**: Additional DVNs for extra security (optional)
- **optionalDVNThreshold**: Number of optional DVNs required

### DVN (Decentralized Verifier Network)
- Production setup uses 2 required DVNs per network
- LayerZero Labs DVN + Google Cloud DVN for redundancy
- No optional DVNs for simpler setup

### Executor Configuration
- **maxMessageSize**: Maximum payload size (10000 bytes)
- **executor**: Address that executes messages on destination chain

### Libraries
- **sendLibrary**: Handles outgoing message transmission
- **receiveLibrary**: Handles incoming message reception
- Different addresses per network

## Troubleshooting

1. **Dependency Conflicts**: Use `yarn install --legacy-peer-deps`
2. **Missing Imports**: Add proper remappings to `remappings.txt`
3. **TypeScript Errors**: Update `tsconfig.json` to include all relevant files
4. **Deployment Issues**: Ensure contract addresses are updated in `layerzero.config.ts`

## Testing

```bash
# Test configuration
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts

# Test cross-chain messaging
npx hardhat run scripts/test-messaging.js --network arbitrum
```

This setup provides a production-ready LayerZero V2 configuration with proper security (2 DVNs), performance optimization, and error handling. 