import { EndpointId } from '@layerzerolabs/lz-definitions'
import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

// Custom endpoint ID for Sonic Mainnet
const SONIC_V2_MAINNET = 30332

const sonicContract: OmniPointHardhat = {
    eid: SONIC_V2_MAINNET as EndpointId,
    contractName: 'omniDRAGON',
}

const arbitrumContract: OmniPointHardhat = {
    eid: EndpointId.ARBITRUM_V2_MAINNET,
    contractName: 'omniDRAGON',
}

const avalancheContract: OmniPointHardhat = {
    eid: EndpointId.AVALANCHE_V2_MAINNET,
    contractName: 'omniDRAGON',
}

const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: sonicContract,
        },
        {
            contract: arbitrumContract,
        },
        {
            contract: avalancheContract,
        },
    ],
    connections: [
        // Arbitrum <-> Sonic
        {
            from: arbitrumContract,
            to: sonicContract,
        },
        {
            from: sonicContract,
            to: arbitrumContract,
        },
        // Avalanche <-> Sonic
        {
            from: avalancheContract,
            to: sonicContract,
        },
        {
            from: sonicContract,
            to: avalancheContract,
        },
        // Arbitrum <-> Avalanche
        {
            from: arbitrumContract,
            to: avalancheContract,
        },
        {
            from: avalancheContract,
            to: arbitrumContract,
        },
    ],
}

export default config