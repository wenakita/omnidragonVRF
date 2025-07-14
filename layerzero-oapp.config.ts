import { EndpointId } from '@layerzerolabs/lz-definitions'
import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

// Custom endpoint ID for Sonic
const SONIC_ENDPOINT_ID = 30332

const arbitrumContract: OmniPointHardhat = {
    eid: EndpointId.ARBITRUM_V2_MAINNET,
    contractName: 'omniDRAGON',
}

const avalancheContract: OmniPointHardhat = {
    eid: EndpointId.AVALANCHE_V2_MAINNET,
    contractName: 'omniDRAGON',
}

const sonicContract: OmniPointHardhat = {
    eid: SONIC_ENDPOINT_ID as any,
    contractName: 'omniDRAGON',
}

const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: arbitrumContract,
        },
        {
            contract: avalancheContract,
        },
        {
            contract: sonicContract,
        },
    ],
    connections: [
        // Arbitrum <-> Avalanche
        {
            from: arbitrumContract,
            to: avalancheContract,
        },
        {
            from: avalancheContract,
            to: arbitrumContract,
        },
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
    ],
}

export default config 