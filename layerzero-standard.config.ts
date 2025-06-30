import { EndpointId } from '@layerzerolabs/lz-definitions'

const sonicContract = {
    eid: EndpointId.SONIC_V2_MAINNET,
    contractName: 'omniDRAGON',
    address: '0xd10Eb95C3a235BBeD76eA6691ab43013b7Aa39ae', // Deployed via OmniDragonDeployer
}

const arbitrumContract = {
    eid: EndpointId.ARBITRUM_V2_MAINNET,
    contractName: 'omniDRAGON',
    address: '0x2f8ad1c558C43Fa05F4A43a2C78C595443e4763c', // Deployed via simple method
}

const avalancheContract = {
    eid: EndpointId.AVALANCHE_V2_MAINNET,
    contractName: 'omniDRAGON',
    address: '0x14D44493F6777c2f6accbDDd6936d33437c5e337', // Deployed via simple method
}

export default {
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
        // Sonic <-> Arbitrum
        {
            from: sonicContract,
            to: arbitrumContract,
            config: {
                sendLibrary: '0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7', // SendUln302 on Sonic
                receiveLibraryConfig: {
                    receiveLibrary: '0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043', // ReceiveUln302 on Sonic
                    gracePeriod: BigInt(0),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        executor: '0x4208D6E27538189bB48E603D6123A94b8Abe0A0b', // LZ Executor on Sonic
                    },
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: [
                            '0x282b3386571f7f794450d5789911a9804fa346b4', // LayerZero Labs DVN on Sonic
                        ],
                        optionalDVNs: [
                            '0xdd7b5e1db4aafd5c8ec3b764efb8ed265aa5445b', // Stargate DVN on Sonic
                        ],
                        optionalDVNThreshold: 1,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: [
                            '0x282b3386571f7f794450d5789911a9804fa346b4', // LayerZero Labs DVN on Sonic
                        ],
                        optionalDVNs: [
                            '0xdd7b5e1db4aafd5c8ec3b764efb8ed265aa5445b', // Stargate DVN on Sonic
                        ],
                        optionalDVNThreshold: 1,
                    },
                },
            },
        },
        // Arbitrum <-> Sonic
        {
            from: arbitrumContract,
            to: sonicContract,
            config: {
                sendLibrary: '0x975bcD720be66659e3EB3C0e4F1866a3020E493A', // SendUln302 on Arbitrum
                receiveLibraryConfig: {
                    receiveLibrary: '0x7B9E184e07a6EE1aC23eAe0fe8D6Be2f663f05e6', // ReceiveUln302 on Arbitrum
                    gracePeriod: BigInt(0),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        executor: '0x31CAe3B7fB82d847621859fb1585353c5720660D', // LZ Executor on Arbitrum
                    },
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: [
                            '0x2f55C492897526677C5B68fb199037c7B29E2b5f', // LayerZero Labs DVN on Arbitrum
                        ],
                        optionalDVNs: [
                            '0x4f7cd4da19ABB31b0eC98b9066B9e857B1bf9C0e', // Stargate DVN on Arbitrum
                        ],
                        optionalDVNThreshold: 1,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: [
                            '0x2f55C492897526677C5B68fb199037c7B29E2b5f', // LayerZero Labs DVN on Arbitrum
                        ],
                        optionalDVNs: [
                            '0x4f7cd4da19ABB31b0eC98b9066B9e857B1bf9C0e', // Stargate DVN on Arbitrum
                        ],
                        optionalDVNThreshold: 1,
                    },
                },
            },
        },
        // Sonic <-> Avalanche
        {
            from: sonicContract,
            to: avalancheContract,
            config: {
                sendLibrary: '0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7', // SendUln302 on Sonic
                receiveLibraryConfig: {
                    receiveLibrary: '0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043', // ReceiveUln302 on Sonic
                    gracePeriod: BigInt(0),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        executor: '0x4208D6E27538189bB48E603D6123A94b8Abe0A0b', // LZ Executor on Sonic
                    },
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: [
                            '0x282b3386571f7f794450d5789911a9804fa346b4', // LayerZero Labs DVN on Sonic
                        ],
                        optionalDVNs: [
                            '0xdd7b5e1db4aafd5c8ec3b764efb8ed265aa5445b', // Stargate DVN on Sonic
                        ],
                        optionalDVNThreshold: 1,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: [
                            '0x282b3386571f7f794450d5789911a9804fa346b4', // LayerZero Labs DVN on Sonic
                        ],
                        optionalDVNs: [
                            '0xdd7b5e1db4aafd5c8ec3b764efb8ed265aa5445b', // Stargate DVN on Sonic
                        ],
                        optionalDVNThreshold: 1,
                    },
                },
            },
        },
        // Avalanche <-> Sonic
        {
            from: avalancheContract,
            to: sonicContract,
            config: {
                sendLibrary: '0x197D1333DEA5Fe0D6600E9b396c7f1B1cFCc558a', // SendUln302 on Avalanche
                receiveLibraryConfig: {
                    receiveLibrary: '0xbf3521d309642FA9B1c91A08609505BA09752c61', // ReceiveUln302 on Avalanche
                    gracePeriod: BigInt(0),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        executor: '0x90E595783E43eb89fF07f63d27B8430e6B44bD9c', // LZ Executor on Avalanche
                    },
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: [
                            '0x962F502A63F5FBeB44DC9ab932122648E8352959', // LayerZero Labs DVN on Avalanche
                        ],
                        optionalDVNs: [
                            '0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc', // Stargate DVN on Avalanche
                        ],
                        optionalDVNThreshold: 1,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: [
                            '0x962F502A63F5FBeB44DC9ab932122648E8352959', // LayerZero Labs DVN on Avalanche
                        ],
                        optionalDVNs: [
                            '0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc', // Stargate DVN on Avalanche
                        ],
                        optionalDVNThreshold: 1,
                    },
                },
            },
        },
        // Arbitrum <-> Avalanche
        {
            from: arbitrumContract,
            to: avalancheContract,
            config: {
                sendLibrary: '0x975bcD720be66659e3EB3C0e4F1866a3020E493A', // SendUln302 on Arbitrum
                receiveLibraryConfig: {
                    receiveLibrary: '0x7B9E184e07a6EE1aC23eAe0fe8D6Be2f663f05e6', // ReceiveUln302 on Arbitrum
                    gracePeriod: BigInt(0),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        executor: '0x31CAe3B7fB82d847621859fb1585353c5720660D', // LZ Executor on Arbitrum
                    },
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: [
                            '0x2f55C492897526677C5B68fb199037c7B29E2b5f', // LayerZero Labs DVN on Arbitrum
                        ],
                        optionalDVNs: [
                            '0x4f7cd4da19ABB31b0eC98b9066B9e857B1bf9C0e', // Stargate DVN on Arbitrum
                        ],
                        optionalDVNThreshold: 1,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: [
                            '0x2f55C492897526677C5B68fb199037c7B29E2b5f', // LayerZero Labs DVN on Arbitrum
                        ],
                        optionalDVNs: [
                            '0x4f7cd4da19ABB31b0eC98b9066B9e857B1bf9C0e', // Stargate DVN on Arbitrum
                        ],
                        optionalDVNThreshold: 1,
                    },
                },
            },
        },
        // Avalanche <-> Arbitrum
        {
            from: avalancheContract,
            to: arbitrumContract,
            config: {
                sendLibrary: '0x197D1333DEA5Fe0D6600E9b396c7f1B1cFCc558a', // SendUln302 on Avalanche
                receiveLibraryConfig: {
                    receiveLibrary: '0xbf3521d309642FA9B1c91A08609505BA09752c61', // ReceiveUln302 on Avalanche
                    gracePeriod: BigInt(0),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        executor: '0x90E595783E43eb89fF07f63d27B8430e6B44bD9c', // LZ Executor on Avalanche
                    },
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: [
                            '0x962F502A63F5FBeB44DC9ab932122648E8352959', // LayerZero Labs DVN on Avalanche
                        ],
                        optionalDVNs: [
                            '0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc', // Stargate DVN on Avalanche
                        ],
                        optionalDVNThreshold: 1,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: [
                            '0x962F502A63F5FBeB44DC9ab932122648E8352959', // LayerZero Labs DVN on Avalanche
                        ],
                        optionalDVNs: [
                            '0xD56e4eAb23cb81f43168F9F45211Eb027b9aC7cc', // Stargate DVN on Avalanche
                        ],
                        optionalDVNThreshold: 1,
                    },
                },
            },
        },
    ],
} 