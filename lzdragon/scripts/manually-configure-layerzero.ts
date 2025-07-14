import { ethers } from 'hardhat'
import hre from 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'

// Network configurations from the config:get output
const LAYERZERO_CONFIG = {
    sonic: {
        chainId: 146,
        eid: EndpointId.SONIC_V2_MAINNET,
        endpoint: '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B',
        sendLib: '0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7',
        receiveLib: '0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043',
        executor: '0x4208D6E27538189bB48E603D6123A94b8Abe0A0b',
        dvn: '0x6788f52439ACA6BFF597d3eeC2DC9a44B8FEE842',
        confirmations: 20
    },
    arbitrum: {
        chainId: 42161,
        eid: EndpointId.ARBITRUM_V2_MAINNET,
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        sendLib: '0x975bcD720be66659e3EB3C0e4F1866a3020E493A',
        receiveLib: '0x7B9E184e07a6EE1aC23eAe0fe8D6Be2f663f05e6',
        executor: '0x31CAe3B7fB82d847621859fb1585353c5720660D',
        dvn: '0x758C419533ad64Ce9D3413BC8d3A97B026098EC1',
        confirmations: 20
    },
    avalanche: {
        chainId: 43114,
        eid: EndpointId.AVALANCHE_V2_MAINNET,
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        sendLib: '0x197D1333DEA5Fe0D6600E9b396c7f1B1cFCc558a',
        receiveLib: '0xbf3521d309642FA9B1c91A08609505BA09752c61',
        executor: '0x90E595783E43eb89fF07f63d27B8430e6B44bD9c',
        dvn: '0x90cCA24D1338Bd284C25776D9c12f96764Bde5e1',
        confirmations: 12
    }
}

const DRAGON_ADDRESS = "0x69403746cc8611da542e70a7dd59e98206430777"

async function main() {
    const [deployer] = await ethers.getSigners()
    const network = hre.network.name
    
    console.log(`\n=== Manually Configuring LayerZero for ${network} ===`)
    console.log(`Deployer: ${deployer.address}`)
    
    // Get current network config
    const currentChainId = (await ethers.provider.getNetwork()).chainId
    const currentConfig = Object.values(LAYERZERO_CONFIG).find(config => 
        config.chainId === currentChainId
    )
    
    if (!currentConfig) {
        throw new Error(`Network ${network} not supported`)
    }
    
    console.log(`Chain ID: ${currentConfig.chainId}`)
    console.log(`Dragon Address: ${DRAGON_ADDRESS}`)
    
    // Get dragon contract
    const dragon = await ethers.getContractAt("omniDRAGON", DRAGON_ADDRESS)
    
    // Check ownership
    const owner = await dragon.owner()
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        throw new Error(`Only owner can configure. Owner: ${owner}, Deployer: ${deployer.address}`)
    }
    
    console.log(`✅ Verified ownership`)
    
    // Get LayerZero endpoint
    const endpoint = await ethers.getContractAt("ILayerZeroEndpointV2", currentConfig.endpoint)
    
    console.log(`\n=== Configuring Libraries ===`)
    
    // Configure send library for each remote chain
    const otherNetworks = Object.entries(LAYERZERO_CONFIG).filter(([key, config]) => 
        config.chainId !== currentConfig.chainId
    )
    
    for (const [networkName, remoteConfig] of otherNetworks) {
        try {
            console.log(`\nConfiguring for ${networkName} (EID: ${remoteConfig.eid})...`)
            
            // Set send library
            console.log(`Setting send library: ${remoteConfig.sendLib}`)
            const setSendLibTx = await endpoint.setSendLibrary(DRAGON_ADDRESS, remoteConfig.eid, remoteConfig.sendLib)
            await setSendLibTx.wait()
            console.log(`✅ Send library set: ${setSendLibTx.hash}`)
            
            // Set receive library  
            console.log(`Setting receive library: ${remoteConfig.receiveLib}`)
            const setReceiveLibTx = await endpoint.setReceiveLibrary(DRAGON_ADDRESS, remoteConfig.eid, remoteConfig.receiveLib, 0)
            await setReceiveLibTx.wait()
            console.log(`✅ Receive library set: ${setReceiveLibTx.hash}`)
            
        } catch (error) {
            console.error(`❌ Error configuring ${networkName}:`, error.message)
        }
    }
    
    console.log(`\n=== Configuration Complete ===`)
    console.log(`You can now test cross-chain transfers!`)
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
}) 