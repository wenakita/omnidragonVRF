import { EndpointId } from '@layerzerolabs/lz-definitions';
import type { OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat';
import { OAppEnforcedOption } from '@layerzerolabs/toolbox-hardhat';
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities';

// omniDRAGON contract addresses (deployed via CREATE2)
const OMNIDRAGON_ADDRESS = "0x72fD13e87D9b35fe4591F32a75dDB212fdCbcBc9";

// Define contracts for each chain
const sonicContract: OmniPointHardhat = {
  eid: EndpointId.SONIC_V2_MAINNET,
  contractName: 'omniDRAGON',
  address: OMNIDRAGON_ADDRESS,
};

const arbitrumContract: OmniPointHardhat = {
  eid: EndpointId.ARBITRUM_V2_MAINNET,
  contractName: 'omniDRAGON',
  address: OMNIDRAGON_ADDRESS,
};

const avalancheContract: OmniPointHardhat = {
  eid: EndpointId.AVALANCHE_V2_MAINNET,
  contractName: 'omniDRAGON',
  address: OMNIDRAGON_ADDRESS,
};

// Enforced options for cross-chain transfers
const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
  {
    msgType: 1,
    optionType: ExecutorOptionType.LZ_RECEIVE,
    gas: 300000,
    value: 0,
  },
];

export default {
  contracts: [
    { contract: sonicContract },
    { contract: arbitrumContract },
    { contract: avalancheContract },
  ],
  connections: [
    // Sonic -> Arbitrum
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
          executorConfig: {
            maxMessageSize: 10000,
            executor: '0x31CAe3B7fB82d847621859fb1585353c5720660D',
          },
          ulnConfig: {
            confirmations: 1,
            requiredDVNs: ['0x282b3386571f7f794450d5789911a9804fa346b4'],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
        receiveConfig: {
          ulnConfig: {
            confirmations: 1,
            requiredDVNs: ['0x282b3386571f7f794450d5789911a9804fa346b4'],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
        enforcedOptions: EVM_ENFORCED_OPTIONS,
      },
    },
    // Arbitrum -> Sonic
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
          executorConfig: {
            maxMessageSize: 10000,
            executor: '0x31CAe3B7fB82d847621859fb1585353c5720660D',
          },
          ulnConfig: {
            confirmations: 1,
            requiredDVNs: ['0x2f55c492897526677c5b68fb199ea31e2c126416'],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
        receiveConfig: {
          ulnConfig: {
            confirmations: 1,
            requiredDVNs: ['0x2f55c492897526677c5b68fb199ea31e2c126416'],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
        enforcedOptions: EVM_ENFORCED_OPTIONS,
      },
    },
    // Sonic -> Avalanche
    {
      from: sonicContract,
      to: avalancheContract,
      config: {
        sendLibrary: '0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7',
        receiveLibraryConfig: {
          receiveLibrary: '0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043',
          gracePeriod: 0,
        },
        sendConfig: {
          executorConfig: {
            maxMessageSize: 10000,
            executor: '0x31CAe3B7fB82d847621859fb1585353c5720660D',
          },
          ulnConfig: {
            confirmations: 1,
            requiredDVNs: ['0x282b3386571f7f794450d5789911a9804fa346b4'],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
        receiveConfig: {
          ulnConfig: {
            confirmations: 1,
            requiredDVNs: ['0x282b3386571f7f794450d5789911a9804fa346b4'],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
        enforcedOptions: EVM_ENFORCED_OPTIONS,
      },
    },
    // Avalanche -> Sonic
    {
      from: avalancheContract,
      to: sonicContract,
      config: {
        sendLibrary: '0x197D1333DEA5Fe0D6600E9b396c7f1B1cFCc558a',
        receiveLibraryConfig: {
          receiveLibrary: '0xbf3521d309642FA9B1c91A08609505BA09752c61',
          gracePeriod: 0,
        },
        sendConfig: {
          executorConfig: {
            maxMessageSize: 10000,
            executor: '0x90E595783E43eb89fF07f63d27B8430e6B44bD9c',
          },
          ulnConfig: {
            confirmations: 1,
            requiredDVNs: ['0x962F502A63F5FBeB44DC9ab932122648E8352959'],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
        receiveConfig: {
          ulnConfig: {
            confirmations: 1,
            requiredDVNs: ['0x962F502A63F5FBeB44DC9ab932122648E8352959'],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
        enforcedOptions: EVM_ENFORCED_OPTIONS,
      },
    },
    // Arbitrum -> Avalanche
    {
      from: arbitrumContract,
      to: avalancheContract,
      config: {
        sendLibrary: '0x975bcD720be66659e3EB3C0e4F1866a3020E493A',
        receiveLibraryConfig: {
          receiveLibrary: '0x7B9E184e07a6EE1aC23eAe0fe8D6Be2f663f05e6',
          gracePeriod: 0,
        },
        sendConfig: {
          executorConfig: {
            maxMessageSize: 10000,
            executor: '0x31CAe3B7fB82d847621859fb1585353c5720660D',
          },
          ulnConfig: {
            confirmations: 1,
            requiredDVNs: ['0x2f55c492897526677c5b68fb199ea31e2c126416'],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
        receiveConfig: {
          ulnConfig: {
            confirmations: 1,
            requiredDVNs: ['0x2f55c492897526677c5b68fb199ea31e2c126416'],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
        enforcedOptions: EVM_ENFORCED_OPTIONS,
      },
    },
    // Avalanche -> Arbitrum
    {
      from: avalancheContract,
      to: arbitrumContract,
      config: {
        sendLibrary: '0x197D1333DEA5Fe0D6600E9b396c7f1B1cFCc558a',
        receiveLibraryConfig: {
          receiveLibrary: '0xbf3521d309642FA9B1c91A08609505BA09752c61',
          gracePeriod: 0,
        },
        sendConfig: {
          executorConfig: {
            maxMessageSize: 10000,
            executor: '0x90E595783E43eb89fF07f63d27B8430e6B44bD9c',
          },
          ulnConfig: {
            confirmations: 1,
            requiredDVNs: ['0x962F502A63F5FBeB44DC9ab932122648E8352959'],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
        receiveConfig: {
          ulnConfig: {
            confirmations: 1,
            requiredDVNs: ['0x962F502A63F5FBeB44DC9ab932122648E8352959'],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
        enforcedOptions: EVM_ENFORCED_OPTIONS,
      },
    },
  ],
}; 