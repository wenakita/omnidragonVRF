require('dotenv').config();

import { HardhatUserConfig } from 'hardhat/config';
import { EndpointId } from '@layerzerolabs/lz-definitions';
import '@nomiclabs/hardhat-ethers';
import '@layerzerolabs/toolbox-hardhat';
import '@nomicfoundation/hardhat-verify';
import '@typechain/hardhat';
import 'hardhat-deploy';

const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
          evmVersion: "shanghai",
        },
      },
      {
        version: "0.8.22",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
          evmVersion: "shanghai",
        },
      },
    ],
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sonic: {
      url: process.env.SONIC_RPC_URL || 'https://rpc.soniclabs.org',
      accounts,
      chainId: 146,
      gasPrice: 100000000000, // 100 gwei (increased for Sonic)
      eid: 30332 as EndpointId
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      accounts,
      chainId: 42161,
      eid: 30110
    },
    avalanche: {
      url: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
      accounts,
      chainId: 43114,
      eid: 30106
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v5",
  },
  etherscan: {
    apiKey: {
      sonic: process.env.SONICSCAN_API_KEY || "",
      arbitrumOne: process.env.ARBITRUM_API_KEY || "",
      avalanche: process.env.AVALANCHE_API_KEY || "",
    },
    customChains: [
      {
        network: "sonic",
        chainId: 146,
        urls: {
          apiURL: "https://api.sonicscan.org/api",
          browserURL: "https://sonicscan.org"
        }
      }
    ]
  },
};

export default config; 