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
    
    console.log(`\n=== Testing LayerZero Connection for ${network} ===`)
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
    
    // Check basic contract info
    const name = await dragon.name()
    const symbol = await dragon.symbol()
    const totalSupply = await dragon.totalSupply()
    const balance = await dragon.balanceOf(deployer.address)
    
    console.log(`\n=== Token Info ===`)
    console.log(`Name: ${name}`)
    console.log(`Symbol: ${symbol}`)
    console.log(`Total Supply: ${ethers.utils.formatEther(totalSupply)} DRAGON`)
    console.log(`Your Balance: ${ethers.utils.formatEther(balance)} DRAGON`)
    
    // Test peers
    console.log(`\n=== Peer Verification ===`)
    const otherNetworks = Object.entries(NETWORK_CONFIG).filter(([key, config]) => 
        config.chainId !== currentConfig.chainId
    )
    
    for (const [networkName, config] of otherNetworks) {
        try {
            const peer = await dragon.peers(config.eid)
            const expectedPeer = ethers.utils.hexZeroPad(config.dragonAddress, 32).toLowerCase()
            
            if (peer.toLowerCase() === expectedPeer) {
                console.log(`✅ ${networkName} peer connected: ${peer}`)
            } else {
                console.log(`❌ ${networkName} peer mismatch. Expected: ${expectedPeer}, Got: ${peer}`)
            }
        } catch (error) {
            console.error(`❌ Error checking peer for ${networkName}:`, error.message)
        }
    }
    
    // Test quoteSend for cross-chain transfer
    console.log(`\n=== Testing Cross-Chain Quote ===`)
    
    if (balance.gt(0)) {
        const testAmount = ethers.utils.parseEther("1") // 1 DRAGON
        
        for (const [networkName, config] of otherNetworks) {
            try {
                console.log(`Getting quote for ${networkName}...`)
                
                // Prepare send parameters
                const sendParam = {
                    dstEid: config.eid,
                    to: ethers.utils.hexZeroPad(deployer.address, 32),
                    amountLD: testAmount,
                    minAmountLD: testAmount,
                    extraOptions: "0x",
                    composeMsg: "0x",
                    oftCmd: "0x"
                }
                
                const quote = await dragon.quoteSend(sendParam, false)
                
                console.log(`✅ ${networkName} quote:`)
                console.log(`  - Native Fee: ${ethers.utils.formatEther(quote.nativeFee)} ETH`)
                console.log(`  - LZ Token Fee: ${ethers.utils.formatEther(quote.lzTokenFee)} LZ`)
                
            } catch (error) {
                console.error(`❌ Error getting quote for ${networkName}:`, error.message)
            }
        }
    } else {
        console.log(`⚠️  No DRAGON balance to test quotes`)
    }
    
    console.log(`\n=== LayerZero Connection Test Complete ===`)
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
}) 