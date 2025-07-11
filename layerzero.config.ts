import { EndpointId } from '@layerzerolabs/lz-definitions'

// Clean LayerZero configuration for Arbitrum <-> Avalanche
const arbitrumContract = {
    eid: EndpointId.ARBITRUM_V2_MAINNET,
    contractName: 'omniDRAGON',
    address: '0x6986f9531cd91735025d6bEAAe30Bc9F012ad777',
}

const avalancheContract = {
    eid: EndpointId.AVALANCHE_V2_MAINNET,
    contractName: 'omniDRAGON',
    address: '0x6986f9531cd91735025d6bEAAe30Bc9F012ad777',
}

export default {
    contracts: [
        {
            contract: arbitrumContract,
        },
        {
            contract: avalancheContract,
        },
    ],
    connections: [
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