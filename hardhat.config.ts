import 'dotenv/config'
import 'hardhat-deploy'
import '@nomiclabs/hardhat-ethers'
import '@layerzerolabs/toolbox-hardhat'
import '@nomicfoundation/hardhat-verify'
// Task imports temporarily disabled to fix HH9 error
// import './tasks/configure-arbitrum-reverse-peer.js'
// import './tasks/verify-cross-chain-vrf.js'
// import './tasks/list-all-addresses.js'
// import './tasks/configure-avalanche-ecosystem.js'
// import './tasks/test-ecosystem-functionality.js'
// import './tasks/deploy-omnidragon-documented.js'
// import './tasks/deploy-omnidragon-universal-addresses.js'
// import './tasks/configure-omnidragon-delegates.js'
// import './tasks/set-omnidragon-peers-manual.js'
// import './tasks/transfer-omnidragon-ownership.js'
// import './tasks/verify-all-contracts.js'
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
    try {
        return fs
            .readFileSync('remappings.txt', 'utf8')
            .split('\n')
            .filter(Boolean)
            .map((line) => line.trim().split('='))
    } catch (error) {
        // Return empty array if remappings.txt doesn't exist
        return []
    }
}

const config: any = {
    layerZero: {
        // LayerZero V2 configuration
        deploymentSourcePackages: [],
        // Include LayerZero V2 artifacts
        artifactSourcePackages: ['@layerzerolabs/lz-evm-sdk-v2', '@layerzerolabs/test-devtools-evm-hardhat'],
    } as any,
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
                        runs: 100, // Low runs for smaller contract size
                    },
                    viaIR: false, // Disable IR optimization for verification
                },
            },
            {
                version: '0.8.22',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100, // Low runs for smaller contract size
                    },
                    viaIR: false, // Disable IR optimization for verification
                },
            },
            {
                version: '0.8.28',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100, // Low runs for smaller contract size
                    },
                    viaIR: true, // Enable IR optimization for better code generation
                },
            },
        ],
    },
    preprocess: {
        eachLine: (hre: any) => ({
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
            eid: 30332, // Sonic EID - using numeric value since SONIC_V2_MAINNET might not be defined
            url: process.env.RPC_URL_SONIC || 'https://eu.endpoints.matrixed.link/rpc/sonic?auth=p886of4gitu82',
            accounts,
            chainId: 146,
            gas: 20000000,  // Increased to 20M - Sonic supports up to 1B gas per block
            gasPrice: 55000000000,  // 55 GWei as per Sonic documentation (base fee + 10% buffer)
            allowUnlimitedContractSize: true,
        } as any,
        arbitrum: {
            eid: EndpointId.ARBITRUM_V2_MAINNET,
            url: process.env.RPC_URL_ARBITRUM || 'https://eu.endpoints.matrixed.link/rpc/arbitrum?auth=p886of4gitu82',
            accounts,
            chainId: 42161,
            gas: 35000000,
            gasPrice: 3000000000,
            allowUnlimitedContractSize: true,
        } as any,
        base: {
            eid: EndpointId.BASE_V2_MAINNET,
            url: process.env.RPC_URL_BASE || 'https://eu.endpoints.matrixed.link/rpc/base?auth=p886of4gitu82',
            accounts,
            chainId: 8453,
            gas: 35000000,
            gasPrice: 1000000000,
            allowUnlimitedContractSize: true,
        } as any,
        ethereum: {
            eid: EndpointId.ETHEREUM_V2_MAINNET,
            url: process.env.RPC_URL_ETHEREUM || 'https://eu.endpoints.matrixed.link/rpc/ethereum?auth=p886of4gitu82',
            accounts,
            chainId: 1,
            gas: 30000000,
            gasPrice: 20000000000,
            allowUnlimitedContractSize: true,
        } as any,
        avalanche: {
            eid: EndpointId.AVALANCHE_V2_MAINNET,
            url: process.env.RPC_URL_AVALANCHE || 'https://eu.endpoints.matrixed.link/rpc/avax?auth=p886of4gitu82',
            accounts,  // Use same accounts as other networks for consistent CREATE2 addresses
            chainId: 43114,
            gas: 15000000,
            gasPrice: 25000000000,
            allowUnlimitedContractSize: true,
        } as any,
        bsc: {
            eid: EndpointId.BSC_V2_MAINNET, // Assuming this is the correct EndpointId for BSC Mainnet V2
            url: process.env.RPC_URL_BSC || 'https://eu.endpoints.matrixed.link/rpc/bsc?auth=p886of4gitu82',
            accounts,
            chainId: 56, // Standard BSC Mainnet Chain ID
            gas: 30000000,
            gasPrice: 5000000000, // 5 gwei
            allowUnlimitedContractSize: true,
        } as any,
        polygon: {
            eid: EndpointId.POLYGON_V2_MAINNET,
            url: process.env.RPC_URL_POLYGON || 'https://eu.endpoints.matrixed.link/rpc/polygon?auth=p886of4gitu82',
            accounts,
            chainId: 137,
            gas: 30000000,
            gasPrice: 30000000000, // 30 gwei
            allowUnlimitedContractSize: true,
        } as any,
        optimism: {
            eid: EndpointId.OPTIMISM_V2_MAINNET,
            url: process.env.RPC_URL_OPTIMISM || 'https://eu.endpoints.matrixed.link/rpc/optimism?auth=p886of4gitu82',
            accounts,
            chainId: 10,
            gas: 30000000,
            gasPrice: 1000000000, // 1 gwei
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
            arbitrumOne: process.env.ARBISCAN_API_KEY || 'RAUMV4R1QETFWBPNS9SDQCS5QJD1WZ1YUD',
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
