import { ethers } from 'hardhat'

async function main() {
    // Check both addresses
    const dragonAddressVanity = "0x69cb0574d4f7ca6879a72cb50123B391c4e60777"
    const dragonAddressOld = "0xa693A8ba4005F4AD8EC37Ef9806843c4646994BA"
    
    console.log(`\n=== Checking Contract Addresses ===`)
    
    // Check vanity address
    console.log(`\n--- Checking Vanity Address: ${dragonAddressVanity} ---`)
    const codeVanity = await ethers.provider.getCode(dragonAddressVanity)
    console.log(`Contract code length: ${codeVanity.length}`)
    console.log(`Has code: ${codeVanity !== "0x"}`)
    
    // Check old address
    console.log(`\n--- Checking Old Address: ${dragonAddressOld} ---`)
    const codeOld = await ethers.provider.getCode(dragonAddressOld)
    console.log(`Contract code length: ${codeOld.length}`)
    console.log(`Has code: ${codeOld !== "0x"}`)
    
    if (codeOld !== "0x") {
        console.log("✅ Contract exists at old address")
        
        // Try to get basic token info
        try {
            const dragon = await ethers.getContractAt("omniDRAGON", dragonAddressOld)
            const name = await dragon.name()
            const symbol = await dragon.symbol()
            const totalSupply = await dragon.totalSupply()
            const [deployer] = await ethers.getSigners()
            const balance = await dragon.balanceOf(deployer.address)
            
            console.log(`\n📋 Token Information (Old Address):`)
            console.log(`Name: ${name}`)
            console.log(`Symbol: ${symbol}`)
            console.log(`Total Supply: ${ethers.utils.formatEther(totalSupply)} DRAGON`)
            console.log(`Deployer Balance: ${ethers.utils.formatEther(balance)} DRAGON`)
            
        } catch (error) {
            console.log("❌ Error reading contract:", error.message)
        }
    } else {
        console.log("❌ No contract found at old address")
    }
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
}) 