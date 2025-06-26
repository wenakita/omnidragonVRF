import 'dotenv/config'
import 'hardhat-deploy'
import '@nomiclabs/hardhat-ethers'
import '@layerzerolabs/toolbox-hardhat'
import '@nomicfoundation/hardhat-verify'
import './tasks/deploy-dragon.js'
import './tasks/deploy-ecosystem.js'
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
                version: '0.8.20',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 800, // Factory-like optimization
                    },
                    viaIR: false, // Disable IR optimization for verification
                },
            },
            {
                version: '0.8.22',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200, // Standard optimizer runs
                    },
                    viaIR: false, // Disable IR optimization for verification
                },
            },
            {
                version: '0.8.28',
                settings: {
                    optimizer: {
                        enabled: true,
                    },
                    viaIR: true, // Enable IR optimization for better code generation
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
            url: process.env.RPC_URL_SONIC || 'https://rpc.soniclabs.com', // Using a public RPC
            accounts,
            chainId: 146,
            gas: 50000000,
            gasPrice: 100000000000,
        } as any,
        arbitrum: {
            eid: EndpointId.ARBITRUM_V2_MAINNET,
            url: process.env.RPC_URL_ARBITRUM || 'https://arbitrum.drpc.org', // Using a public RPC
            accounts,
            chainId: 42161,
            gas: 35000000,
            gasPrice: 3000000000,
            allowUnlimitedContractSize: true,
        } as any,
        base: {
            eid: EndpointId.BASE_V2_MAINNET,
            url: process.env.RPC_URL_BASE || 'https://mainnet.base.org', // Standard public RPC
            accounts,
            chainId: 8453,
            gas: 35000000,
            gasPrice: 1000000000,
            allowUnlimitedContractSize: true,
        } as any,
        ethereum: {
            eid: EndpointId.ETHEREUM_V2_MAINNET,
            url: process.env.RPC_URL_ETHEREUM || 'https://ethereum.drpc.org', // Using a public RPC
            accounts,
            chainId: 1,
            gas: 30000000,
            gasPrice: 20000000000,
            allowUnlimitedContractSize: true,
        } as any,
        avalanche: {
            eid: EndpointId.AVALANCHE_V2_MAINNET,
            url: process.env.RPC_URL_AVALANCHE || 'https://api.avax.network/ext/bc/C/rpc', // Standard public RPC
            accounts: process.env.CREATE2_PRIVATE_KEY ? [process.env.CREATE2_PRIVATE_KEY] : accounts,
            chainId: 43114,
            gas: 15000000,
            gasPrice: 25000000000,
            allowUnlimitedContractSize: true,
        } as any,
        bsc: {
            eid: EndpointId.BSC_V2_MAINNET, // Assuming this is the correct EndpointId for BSC Mainnet V2
            url: process.env.RPC_URL_BSC || 'https://bsc-dataseed.bnbchain.org', // Using a public RPC
            accounts,
            chainId: 56, // Standard BSC Mainnet Chain ID
            gas: 30000000,
            gasPrice: 5000000000, // 5 gwei
            allowUnlimitedContractSize: true,
        } as any,
        hardhat: {
            allowUnlimitedContractSize: true,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
    etherscan: {
        apiKey: {
            sonic: process.env.SONICSCAN_API_KEY || 'YW21H25FAP339T8GK8HBXYA87BZETH9DCU',
            avalanche: process.env.SNOWTRACE_API_KEY || 'YW21H25FAP339T8GK8HBXYA87BZETH9DCU',
            // You might need to add API keys for Arbitrum, Base, Ethereum, BSC if you plan to verify contracts
        },
        customChains: [
            {
                network: 'sonic',
                chainId: 146,
                urls: {
                    apiURL: 'https://api.sonicscan.org/api',
                    browserURL: 'https://sonicscan.org',
                },
            },
            {
                network: 'avalanche',
                chainId: 43114,
                urls: {
                    apiURL: 'https://api.snowtrace.io/api',
                    browserURL: 'https://snowtrace.io',
                },
            },
            // You might need to add custom chain configurations for Arbitrum, Base, Ethereum, BSC if their Etherscan APIs are not standard
        ],
    },
}

export default config
