import { ethers } from 'hardhat'
import hre from 'hardhat'

async function main() {
    const [deployer] = await ethers.getSigners()
    console.log(`\n=== Contract Ownership Check ===`)
    console.log(`Deployer: ${deployer.address}`)
    console.log(`Network: ${hre.network.name}`)
    console.log(`Chain ID: ${(await ethers.provider.getNetwork()).chainId}`)
    
    // Contract addresses from deployments
    const dragonAddress = "0x69cb0574d4f7ca6879a72cb50123B391c4e60777"
    
    try {
        // Check if contract exists
        const code = await ethers.provider.getCode(dragonAddress)
        if (code === "0x") {
            console.log(`❌ No contract at ${dragonAddress}`)
            return
        }
        
        console.log(`✅ Contract exists at ${dragonAddress}`)
        
        // Get contract instance
        const dragon = await ethers.getContractAt("omniDRAGON", dragonAddress)
        
        // Check owner
        try {
            const owner = await dragon.owner()
            console.log(`Contract Owner: ${owner}`)
            console.log(`Is Deployer Owner: ${owner.toLowerCase() === deployer.address.toLowerCase()}`)
        } catch (error) {
            console.log(`❌ Error checking owner:`, error.message)
        }
        
        // Check LayerZero endpoint
        try {
            const endpoint = await dragon.endpoint()
            console.log(`LayerZero Endpoint: ${endpoint}`)
        } catch (error) {
            console.log(`❌ Error checking endpoint:`, error.message)
        }
        
        // Check if delegate is set
        try {
            const delegate = await dragon.delegate()
            console.log(`Delegate: ${delegate}`)
        } catch (error) {
            console.log(`❌ Error checking delegate:`, error.message)
        }
        
    } catch (error) {
        console.error(`❌ Error:`, error.message)
    }
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
}) 