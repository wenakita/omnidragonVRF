import 'dotenv/config'
import 'hardhat-deploy'
import '@layerzerolabs/toolbox-hardhat'
import '@nomicfoundation/hardhat-toolbox'
import '@nomicfoundation/hardhat-verify'
import { HardhatUserConfig } from 'hardhat/types'
import { EndpointId } from '@layerzerolabs/lz-definitions'

const PRIVATE_KEY = process.env.PRIVATE_KEY
const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : []

const config: HardhatUserConfig = {
    solidity: {
        version: '0.8.20',
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        arbitrum: {
            eid: EndpointId.ARBITRUM_V2_MAINNET,
            url: process.env.ARBITRUM_RPC_URL || 'https://arbitrum.drpc.org',
            accounts,
            chainId: 42161,
        },
        avalanche: {
            eid: EndpointId.AVALANCHE_V2_MAINNET,
            url: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
            accounts,
            chainId: 43114,
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
    etherscan: {
        apiKey: {
            avalanche: process.env.SNOWTRACE_API_KEY || '',
            arbitrumOne: process.env.ARBISCAN_API_KEY || '',
        },
    },
}

export default config
