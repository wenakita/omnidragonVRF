import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'

// OmniDragon VRF System Contracts
const arbitrumContract = {
    eid: EndpointId.ARBITRUM_V2_MAINNET,
    contractName: 'OmniDragonVRFConsumerV2_5',
    address: '0xe481621c393c622fe27a6dbbd94380f7ecb2a584',
}

const sonicContract = {
    eid: EndpointId.SONIC_V2_MAINNET,
    contractName: 'ChainlinkVRFIntegratorV2_5',
    address: '0xd91bc1b66a89E8f62F3525D996d3FAb36650B805',
}

// DVN addresses - LayerZero Labs DVN (from official LayerZero documentation)
const LAYERZERO_LABS_DVN_SONIC = '0x282b3386571f7f794450d5789911a9804fa346b4'    // LayerZero Labs DVN on Sonic
const LAYERZERO_LABS_DVN_ARBITRUM = '0x2f55c492897526677c5b68fb199ea31e2c126416'  // LayerZero Labs DVN on Arbitrum

export default {
    contracts: [
        {
            contract: sonicContract,
        },
        {
            contract: arbitrumContract,
        },
    ],
    connections: [
        // Sonic -> Arbitrum Connection (Primary direction: VRF requests)
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
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [LAYERZERO_LABS_DVN_ARBITRUM],  // Use Arbitrum DVN (as shown working in PayloadVerified event)
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [LAYERZERO_LABS_DVN_ARBITRUM],  // Use same Arbitrum DVN for receive
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                sendExecutorConfig: {
                    executor: '0x4208D6E27538189bB48E603D6123A94b8Abe0A0b',
                    maxMessageSize: 10000,
                },
                receiveExecutorConfig: {
                    executor: '0x4208D6E27538189bB48E603D6123A94b8Abe0A0b',
                    maxMessageSize: 10000,
                },
                enforcedOptions: [
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 700000,
                        value: 0,
                    },
                ],
            },
        },
        // Arbitrum -> Sonic Connection (Return direction: VRF responses)
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
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [LAYERZERO_LABS_DVN_ARBITRUM],  // Use same Arbitrum DVN for consistency
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [LAYERZERO_LABS_DVN_ARBITRUM],  // Use same Arbitrum DVN for consistency
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                sendExecutorConfig: {
                    executor: '0x31CAe3B7fB82d847621859fb1585353c5720660D',
                    maxMessageSize: 10000,
                },
                receiveExecutorConfig: {
                    executor: '0x31CAe3B7fB82d847621859fb1585353c5720660D',
                    maxMessageSize: 10000,
                },
                enforcedOptions: [
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 700000,
                        value: 0,
                    },
                ],
            },
        },
    ],
} 