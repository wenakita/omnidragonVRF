// Working LayerZero configuration with Sonic EID 30332 support
// This bypasses the official EndpointId validation

const SONIC_EID = 30332

const arbitrumContract = {
    eid: 30110, // EndpointId.ARBITRUM_V2_MAINNET
    contractName: 'omniDRAGON',
    address: '0x6986f9531cd91735025d6bEAAe30Bc9F012ad777',
}

const avalancheContract = {
    eid: 30106, // EndpointId.AVALANCHE_V2_MAINNET
    contractName: 'omniDRAGON',
    address: '0x6986f9531cd91735025d6bEAAe30Bc9F012ad777',
}

const sonicContract = {
    eid: SONIC_EID,
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
        {
            contract: sonicContract,
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
        {
            from: sonicContract,
            to: arbitrumContract,
        },
        {
            from: arbitrumContract,
            to: sonicContract,
        },
        {
            from: sonicContract,
            to: avalancheContract,
        },
        {
            from: avalancheContract,
            to: sonicContract,
        },
    ],
} 