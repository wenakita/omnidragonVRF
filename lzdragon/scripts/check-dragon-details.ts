import { ethers } from 'hardhat'

async function main() {
    const [deployer] = await ethers.getSigners()
    
    // omniDRAGON address on Sonic
    const dragonAddress = "0x69cb0574d4f7ca6879a72cb50123B391c4e60777"
    
    const dragon = await ethers.getContractAt("omniDRAGON", dragonAddress)
    
    console.log("\n=== Dragon Token Details on Sonic ===")
    console.log(`Address: ${dragonAddress}`)
    console.log(`Network: ${(await ethers.provider.getNetwork()).name}`)
    console.log(`Chain ID: ${(await ethers.provider.getNetwork()).chainId}`)
    console.log(`Deployer: ${deployer.address}`)
    
    try {
        const name = await dragon.name()
        const symbol = await dragon.symbol()
        const decimals = await dragon.decimals()
        const totalSupply = await dragon.totalSupply()
        const deployerBalance = await dragon.balanceOf(deployer.address)
        
        console.log(`\n📋 Token Information:`)
        console.log(`Name: ${name}`)
        console.log(`Symbol: ${symbol}`)
        console.log(`Decimals: ${decimals}`)
        console.log(`Total Supply: ${ethers.utils.formatEther(totalSupply)} DRAGON`)
        console.log(`Deployer Balance: ${ethers.utils.formatEther(deployerBalance)} DRAGON`)
        
        // Check if owner
        const owner = await dragon.owner()
        console.log(`\n🔐 Ownership:`)
        console.log(`Owner: ${owner}`)
        console.log(`Is Deployer Owner: ${owner.toLowerCase() === deployer.address.toLowerCase()}`)
        
    } catch (error) {
        console.error("Error fetching token details:", error)
    }
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
}) 