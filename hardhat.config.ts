require('dotenv').config();

import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-ethers';
import '@nomicfoundation/hardhat-verify';
import '@typechain/hardhat';
import 'hardhat-deploy';
import './tasks/deploy-hybrid-registry';
import './tasks/deploy-sonic-consistent-registry';
import './tasks/deploy-omnidragon-vanity';
import './tasks/verify-create2-omnidragon';

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
      url: process.env.SONIC_RPC_URL || 'https://rpc.sonic.tech',
      accounts,
      chainId: 146,
      gasPrice: 100000000000, // 100 gwei (increased for Sonic)
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      accounts,
      chainId: 42161,
    },
    avalanche: {
      url: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
      accounts,
      chainId: 43114,
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