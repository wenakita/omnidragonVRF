const { ExecutorOptionType } = require('@layerzerolabs/lz-v2-utilities')

/**
 * LayerZero V2 Configuration for OmniDragon VRF System
 * 
 * This configuration defines the cross-chain VRF architecture:
 * - Source chains (Sonic, Avalanche) send VRF requests
 * - Destination chain (Arbitrum) processes VRF via Chainlink
 * - Responses flow back to source chains
 */

// Contract definitions
const sonicContract = {
    eid: 30332, // SONIC_V2_MAINNET
    contractName: 'ChainlinkVRFIntegratorV2_5',
}

const arbitrumContract = {
    eid: 30110, // ARBITRUM_V2_MAINNET
    contractName: 'OmniDragonVRFConsumerV2_5',
}

const avalancheContract = {
    eid: 30106, // AVALANCHE_V2_MAINNET
    contractName: 'ChainlinkVRFIntegratorV2_5',
}

// Enforced options for VRF operations
const VRF_REQUEST_OPTIONS = [
    {
        msgType: 1, // Standard message type
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 200000, // Gas for VRF request processing
        value: 0,
    },
]

const VRF_RESPONSE_OPTIONS = [
    {
        msgType: 1, // Standard message type
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 150000, // Gas for VRF response processing
        value: 0,
    },
]

// DVN addresses for each chain
const DVN_ADDRESSES = {
    30332: '0x282b3386571f7f794450d5789911a9804fa346b4', // SONIC_V2_MAINNET
    30110: '0x2f55c492897526677c5b68fb199ea31e2c126416',  // ARBITRUM_V2_MAINNET
    30106: '0x962f502a63f5fbeb44dc9ab932122648e8352959', // AVALANCHE_V2_MAINNET
}

// Executor addresses for each chain
const EXECUTOR_ADDRESSES = {
    30332: '0x4208D6E27538189bB48E603D6123A94b8Abe0A0b', // SONIC_V2_MAINNET
    30110: '0x31CAe3B7fB82d847621859fb1585353c5720660D', // ARBITRUM_V2_MAINNET
    30106: '0x90E595783E43eb89fF07f63d27B8430e6B44bD9c', // AVALANCHE_V2_MAINNET
}

// SendUln302 addresses for each chain
const SEND_ULN_ADDRESSES = {
    30332: '0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7', // SONIC_V2_MAINNET
    30110: '0x975bcD720be66659e3EB3C0e4F1866a3020E493A', // ARBITRUM_V2_MAINNET
    30106: '0x197D1333DEA5Fe0D6600E9b396c7f1B1cFCc558a', // AVALANCHE_V2_MAINNET
}

// ReceiveUln302 addresses for each chain
const RECEIVE_ULN_ADDRESSES = {
    30332: '0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043', // SONIC_V2_MAINNET
    30110: '0x7B9E184e07a6EE1aC23eAe0fe8D6Be2f663f05e6', // ARBITRUM_V2_MAINNET
    30106: '0xbf3521d309642FA9B1c91A08609505BA09752c61', // AVALANCHE_V2_MAINNET
}

module.exports = {
    contracts: [
        {
            contract: sonicContract
        },
        {
            contract: arbitrumContract
        },
        {
            contract: avalancheContract
        },
    ],
    connections: [
        // Sonic → Arbitrum (VRF Request)
        {
            from: sonicContract,
            to: arbitrumContract,
            config: {
                enforcedOptions: VRF_REQUEST_OPTIONS,
            },
        },
        
        // Arbitrum → Sonic (VRF Response)
        {
            from: arbitrumContract,
            to: sonicContract,
            config: {
                enforcedOptions: VRF_RESPONSE_OPTIONS,
            },
        },
        
        // Avalanche → Arbitrum (VRF Request)
        {
            from: avalancheContract,
            to: arbitrumContract,
            config: {
                enforcedOptions: VRF_REQUEST_OPTIONS,
            },
        },
        
        // Arbitrum → Avalanche (VRF Response)
        {
            from: arbitrumContract,
            to: avalancheContract,
            config: {
                enforcedOptions: VRF_RESPONSE_OPTIONS,
            },
        },
    ],
}

