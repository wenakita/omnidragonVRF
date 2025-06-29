import { EndpointId } from '@layerzerolabs/lz-definitions'

const sonicContract = {
    eid: 30332, // Sonic EID
    contractName: 'omniDRAGON',
    address: '0xf00F4Fe8c4C1Ac02539dFeE71423eaAD52AE363D', // Universal address
}

const arbitrumContract = {
    eid: EndpointId.ARBITRUM_V2_MAINNET,
    contractName: 'omniDRAGON',
    address: '0xf00F4Fe8c4C1Ac02539dFeE71423eaAD52AE363D', // Universal address
}

const avalancheContract = {
    eid: EndpointId.AVALANCHE_V2_MAINNET,
    contractName: 'omniDRAGON',
    address: '0xf00F4Fe8c4C1Ac02539dFeE71423eaAD52AE363D', // Universal address
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
        {
            from: sonicContract,
            to: arbitrumContract,
            config: {
                sendLibrary: '0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7', // SendUln302
                receiveLibraryConfig: {
                    receiveLibrary: '0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043', // ReceiveUln302
                    gracePeriod: 0,
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        executor: '0x4208D6E27538189bB48E603D6123A94b8Abe0A0b', // LZ Executor
                    },
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [
                            '0x282b3386571f7f794450d5789911a9804fa346b4', // LayerZero Labs DVN
                            '0xdd7b5e1db4aafd5c8ec3b764efb8ed265aa5445b', // Stargate DVN
                        ],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [
                            '0x282b3386571f7f794450d5789911a9804fa346b4', // LayerZero Labs DVN
                            '0xdd7b5e1db4aafd5c8ec3b764efb8ed265aa5445b', // Stargate DVN
                        ],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
            },
        },
        {
            from: arbitrumContract,
            to: sonicContract,
            config: {
                sendLibrary: '0x975bcD720be66659e3EB3C0e4F1866a3020E493A', // SendUln302
                receiveLibraryConfig: {
                    receiveLibrary: '0x7B9E184e07a6EE1aC23eAe0fe8D6Be2f663f05e6', // ReceiveUln302
                    gracePeriod: 0,
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        executor: '0x31CAe3B7fB82d847621859fb1585353c5720660D', // LZ Executor
                    },
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [
                            '0x2f55c492897526677c5b68fb199fae2e26d02115', // LayerZero DVN (Arbitrum)
                            '0xa7b5189bca84cd304d8553977c7c614329750d99', // Stargate DVN (Arbitrum)
                        ],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [
                            '0x2f55c492897526677c5b68fb199fae2e26d02115', // LayerZero DVN (Arbitrum)
                            '0xa7b5189bca84cd304d8553977c7c614329750d99', // Stargate DVN (Arbitrum)
                        ],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
            },
        },
        // Sonic <-> Avalanche connections
        {
            from: sonicContract,
            to: avalancheContract,
            config: {
                sendLibrary: '0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7', // SendUln302
                receiveLibraryConfig: {
                    receiveLibrary: '0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043', // ReceiveUln302
                    gracePeriod: 0,
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        executor: '0x4208D6E27538189bB48E603D6123A94b8Abe0A0b', // LZ Executor
                    },
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [
                            '0x282b3386571f7f794450d5789911a9804fa346b4', // LayerZero Labs DVN
                            '0xdd7b5e1db4aafd5c8ec3b764efb8ed265aa5445b', // Stargate DVN
                        ],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [
                            '0x282b3386571f7f794450d5789911a9804fa346b4', // LayerZero Labs DVN
                            '0xdd7b5e1db4aafd5c8ec3b764efb8ed265aa5445b', // Stargate DVN
                        ],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
            },
        },
        {
            from: avalancheContract,
            to: sonicContract,
            config: {
                sendLibrary: '0x197D1333DEA5Fe0D6600E9b396c7f1B1cFCc558a', // SendUln302
                receiveLibraryConfig: {
                    receiveLibrary: '0xbf3521d309642FA9B1c91A08609505BA09752c61', // ReceiveUln302
                    gracePeriod: 0,
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        executor: '0x90E595783E43eb89fF07f63d27B8430e6B44bD9c', // LZ Executor
                    },
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [
                            '0x962f502a63f5fbeb44dc9ab932122648e8352959', // LayerZero DVN (Avalanche)
                            '0xd46270746acbca85dab8de1ce1d71c46c2f2994c', // CCIP DVN (Avalanche)
                        ],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [
                            '0x962f502a63f5fbeb44dc9ab932122648e8352959', // LayerZero DVN (Avalanche)
                            '0xd46270746acbca85dab8de1ce1d71c46c2f2994c', // CCIP DVN (Avalanche)
                        ],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
            },
        },
        // Arbitrum <-> Avalanche connections
        {
            from: arbitrumContract,
            to: avalancheContract,
            config: {
                sendLibrary: '0x975bcD720be66659e3EB3C0e4F1866a3020E493A', // SendUln302
                receiveLibraryConfig: {
                    receiveLibrary: '0x7B9E184e07a6EE1aC23eAe0fe8D6Be2f663f05e6', // ReceiveUln302
                    gracePeriod: 0,
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        executor: '0x31CAe3B7fB82d847621859fb1585353c5720660D', // LZ Executor
                    },
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [
                            '0x2f55c492897526677c5b68fb199ea31e2c126416', // LayerZero DVN (Arbitrum)
                            '0xa7b5189bca84cd304d8553977c7c614329750d99', // Nethermind DVN (Arbitrum)
                        ],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [
                            '0x2f55c492897526677c5b68fb199ea31e2c126416', // LayerZero DVN (Arbitrum)
                            '0xa7b5189bca84cd304d8553977c7c614329750d99', // Nethermind DVN (Arbitrum)
                        ],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
            },
        },
        {
            from: avalancheContract,
            to: arbitrumContract,
            config: {
                sendLibrary: '0x197D1333DEA5Fe0D6600E9b396c7f1B1cFCc558a', // SendUln302
                receiveLibraryConfig: {
                    receiveLibrary: '0xbf3521d309642FA9B1c91A08609505BA09752c61', // ReceiveUln302
                    gracePeriod: 0,
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        executor: '0x90E595783E43eb89fF07f63d27B8430e6B44bD9c', // LZ Executor
                    },
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [
                            '0x962f502a63f5fbeb44dc9ab932122648e8352959', // LayerZero DVN (Avalanche)
                            '0xd46270746acbca85dab8de1ce1d71c46c2f2994c', // CCIP DVN (Avalanche)
                        ],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [
                            '0x962f502a63f5fbeb44dc9ab932122648e8352959', // LayerZero DVN (Avalanche)
                            '0xd46270746acbca85dab8de1ce1d71c46c2f2994c', // CCIP (Avalanche)
                        ],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
            },
        },
    ],
} 