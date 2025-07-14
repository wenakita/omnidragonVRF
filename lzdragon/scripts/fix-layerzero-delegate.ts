import { ethers } from 'hardhat'
import hre from 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'

// Network configurations
const NETWORK_CONFIG = {
    sonic: {
        chainId: 146,
        eid: EndpointId.SONIC_V2_MAINNET,
        dragonAddress: '0x69403746cc8611da542e70a7dd59e98206430777'
    },
    arbitrum: {
        chainId: 42161,
        eid: EndpointId.ARBITRUM_V2_MAINNET,
        dragonAddress: '0x69403746cc8611da542e70a7dd59e98206430777'
    },
    avalanche: {
        chainId: 43114,
        eid: EndpointId.AVALANCHE_V2_MAINNET,
        dragonAddress: '0x69403746cc8611da542e70a7dd59e98206430777'
    }
}

async function main() {
    const [deployer] = await ethers.getSigners()
    const network = hre.network.name
    
    console.log(`\n=== Fixing LayerZero Delegate for ${network} ===`)
    console.log(`Deployer: ${deployer.address}`)
    
    // Get current network config
    const currentChainId = (await ethers.provider.getNetwork()).chainId
    const currentConfig = Object.values(NETWORK_CONFIG).find(config => 
        config.chainId === currentChainId
    )
    
    if (!currentConfig) {
        throw new Error(`Network ${network} not supported`)
    }
    
    console.log(`Chain ID: ${currentConfig.chainId}`)
    console.log(`Dragon Address: ${currentConfig.dragonAddress}`)
    
    // Get dragon contract
    const dragon = await ethers.getContractAt("omniDRAGON", currentConfig.dragonAddress)
    
    // Check current delegate
    const currentDelegate = await dragon.delegate()
    console.log(`Current Delegate: ${currentDelegate}`)
    
    // Check if we're owner
    const owner = await dragon.owner()
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        throw new Error(`Only owner can modify delegate. Owner: ${owner}, Deployer: ${deployer.address}`)
    }
    
    // Registry address (will be the delegate)
    const registryAddress = "0x69637BfD5D2b851D870d9E0E38B5b73FaF950777"
    
    if (currentDelegate.toLowerCase() === registryAddress.toLowerCase()) {
        console.log(`✅ Delegate is correctly set to registry`)
        console.log(`LayerZero wiring should work with this setup`)
    } else {
        console.log(`⚠️  Delegate is not set to registry, updating...`)
        
        // Set delegate to registry (this might fix the issue)
        const tx = await dragon.setDelegate(registryAddress)
        await tx.wait()
        
        console.log(`✅ Delegate updated to registry: ${tx.hash}`)
        
        // Verify
        const newDelegate = await dragon.delegate()
        console.log(`New Delegate: ${newDelegate}`)
    }
    
    // Check endpoint
    const endpoint = await dragon.endpoint()
    console.log(`LayerZero Endpoint: ${endpoint}`)
    
    console.log(`\n=== Delegate Fix Complete ===`)
    console.log(`You can now try running: npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts`)
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
}) 