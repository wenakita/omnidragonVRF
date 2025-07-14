import { ethers } from 'hardhat'
import hre from 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'

// Network configurations
const NETWORK_CONFIG = {
    sonic: {
        chainId: 146,
        eid: EndpointId.SONIC_V2_MAINNET,
        endpoint: '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B',
        dragonAddress: '0x69403746cc8611da542e70a7dd59e98206430777' // New vanity address
    },
    arbitrum: {
        chainId: 42161,
        eid: EndpointId.ARBITRUM_V2_MAINNET,
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        dragonAddress: '0x69403746cc8611da542e70a7dd59e98206430777' // New vanity address
    },
    avalanche: {
        chainId: 43114,
        eid: EndpointId.AVALANCHE_V2_MAINNET,
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        dragonAddress: '0x69403746cc8611da542e70a7dd59e98206430777' // New vanity address
    }
}

async function main() {
    const [deployer] = await ethers.getSigners()
    const network = hre.network.name
    
    console.log(`\n=== Setting up Custom OApp for ${network} ===`)
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
    console.log(`LayerZero EID: ${currentConfig.eid}`)
    console.log(`Dragon Address: ${currentConfig.dragonAddress}`)
    
    // Get dragon contract
    const dragon = await ethers.getContractAt("omniDRAGON", currentConfig.dragonAddress)
    
    // Check if contract exists
    const code = await ethers.provider.getCode(currentConfig.dragonAddress)
    if (code === "0x") {
        throw new Error(`No contract deployed at ${currentConfig.dragonAddress}`)
    }
    
    console.log(`✅ Dragon contract found`)
    
    // Get current owner
    const owner = await dragon.owner()
    console.log(`Contract Owner: ${owner}`)
    
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        throw new Error(`Only owner can configure OApp. Owner: ${owner}, Deployer: ${deployer.address}`)
    }
    
    // Set up peers for all other networks
    const otherNetworks = Object.entries(NETWORK_CONFIG).filter(([key, config]) => 
        config.chainId !== currentConfig.chainId
    )
    
    console.log(`\n=== Setting up peers ===`)
    
    for (const [networkName, config] of otherNetworks) {
        try {
            console.log(`Setting peer for ${networkName} (EID: ${config.eid})...`)
            
            // Convert address to bytes32
            const peerBytes32 = ethers.utils.hexZeroPad(config.dragonAddress, 32)
            
            // Check if peer is already set
            const currentPeer = await dragon.peers(config.eid)
            if (currentPeer === peerBytes32) {
                console.log(`✅ Peer already set for ${networkName}`)
                continue
            }
            
            // Set peer
            const tx = await dragon.setPeer(config.eid, peerBytes32)
            await tx.wait()
            
            console.log(`✅ Peer set for ${networkName}: ${tx.hash}`)
            
        } catch (error) {
            console.error(`❌ Error setting peer for ${networkName}:`, error.message)
        }
    }
    
    // Verify all peers are set
    console.log(`\n=== Verifying Peers ===`)
    for (const [networkName, config] of otherNetworks) {
        try {
            const peer = await dragon.peers(config.eid)
            const expectedPeer = ethers.utils.hexZeroPad(config.dragonAddress, 32)
            
            if (peer.toLowerCase() === expectedPeer.toLowerCase()) {
                console.log(`✅ ${networkName} peer verified: ${peer}`)
            } else {
                console.log(`❌ ${networkName} peer mismatch. Expected: ${expectedPeer}, Got: ${peer}`)
            }
        } catch (error) {
            console.error(`❌ Error verifying peer for ${networkName}:`, error.message)
        }
    }
    
    console.log(`\n=== OApp Setup Complete for ${network} ===`)
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
}) 