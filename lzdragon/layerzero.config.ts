import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import { TwoWayConfig, generateConnectionsConfig } from '@layerzerolabs/metadata-tools'
import { OAppEnforcedOption, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const sonicContract: OmniPointHardhat = {
    eid: EndpointId.SONIC_V2_MAINNET,
    contractName: 'omniDRAGON',
    address: '0x6999c894f6ee7b59b0271245f27b6c371d08d777', // Correct vanity address
}

const arbitrumContract: OmniPointHardhat = {
    eid: EndpointId.ARBITRUM_V2_MAINNET,
    contractName: 'omniDRAGON',
    address: '0x6999c894f6ee7b59b0271245f27b6c371d08d777', // Correct vanity address
}

const avalancheContract: OmniPointHardhat = {
    eid: EndpointId.AVALANCHE_V2_MAINNET,
    contractName: 'omniDRAGON',
    address: '0x6999c894f6ee7b59b0271245f27b6c371d08d777', // Correct vanity address
}

// For this example's simplicity, we will use the same enforced options values for sending to all chains
// To learn more, read https://docs.layerzero.network/v2/concepts/applications/oapp-standard#execution-options-and-enforced-settings
const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 80000,
        value: 0,
    },
]

// Configure all pathways between chains
const pathways: TwoWayConfig[] = [
    [
        // Sonic <-> Arbitrum
        sonicContract,
        arbitrumContract,
        [['LayerZero Labs'], []],
        [1, 1],
        [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
    ],
    [
        // Sonic <-> Avalanche
        sonicContract,
        avalancheContract,
        [['LayerZero Labs'], []],
        [1, 1],
        [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
    ],
    [
        // Arbitrum <-> Avalanche
        arbitrumContract,
        avalancheContract,
        [['LayerZero Labs'], []],
        [1, 1],
        [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
    ],
]

export default async function () {
    // Generate the connections config based on the pathways
    const connections = await generateConnectionsConfig(pathways)
    return {
        contracts: [
            { contract: sonicContract }, 
            { contract: arbitrumContract }, 
            { contract: avalancheContract }
        ],
        connections,
    }
}
