import { ethers } from 'hardhat'
import hre from 'hardhat'

async function main() {
    const [deployer] = await ethers.getSigners()
    const network = hre.network.name
    
    console.log(`\n=== Checking Old Contract on ${network} ===`)
    console.log(`Deployer: ${deployer.address}`)
    
    // Old contract address
    const oldDragonAddress = "0xa693A8ba4005F4AD8EC37Ef9806843c4646994BA"
    // New contract address
    const newDragonAddress = "0x69cb0574d4f7ca6879a72cb50123B391c4e60777"
    
    console.log(`\n=== Checking Old Contract: ${oldDragonAddress} ===`)
    
    // Check if old contract exists
    const oldCode = await ethers.provider.getCode(oldDragonAddress)
    if (oldCode !== "0x") {
        console.log(`✅ Old contract exists`)
        
        try {
            const oldDragon = await ethers.getContractAt("omniDRAGON", oldDragonAddress)
            
            const oldName = await oldDragon.name()
            const oldSymbol = await oldDragon.symbol()
            const oldTotalSupply = await oldDragon.totalSupply()
            const oldDeployerBalance = await oldDragon.balanceOf(deployer.address)
            
            console.log(`Name: ${oldName}`)
            console.log(`Symbol: ${oldSymbol}`)
            console.log(`Total Supply: ${ethers.utils.formatEther(oldTotalSupply)} DRAGON`)
            console.log(`Deployer Balance: ${ethers.utils.formatEther(oldDeployerBalance)} DRAGON`)
            
            const oldOwner = await oldDragon.owner()
            console.log(`Owner: ${oldOwner}`)
            const oldOwnerBalance = await oldDragon.balanceOf(oldOwner)
            console.log(`Owner Balance: ${ethers.utils.formatEther(oldOwnerBalance)} DRAGON`)
            
        } catch (error) {
            console.log(`❌ Error checking old contract: ${error.message}`)
        }
    } else {
        console.log(`❌ Old contract does not exist`)
    }
    
    console.log(`\n=== Checking New Contract: ${newDragonAddress} ===`)
    
    // Check if new contract exists
    const newCode = await ethers.provider.getCode(newDragonAddress)
    if (newCode !== "0x") {
        console.log(`✅ New contract exists`)
        
        try {
            const newDragon = await ethers.getContractAt("omniDRAGON", newDragonAddress)
            
            const newName = await newDragon.name()
            const newSymbol = await newDragon.symbol()
            const newTotalSupply = await newDragon.totalSupply()
            const newDeployerBalance = await newDragon.balanceOf(deployer.address)
            
            console.log(`Name: ${newName}`)
            console.log(`Symbol: ${newSymbol}`)
            console.log(`Total Supply: ${ethers.utils.formatEther(newTotalSupply)} DRAGON`)
            console.log(`Deployer Balance: ${ethers.utils.formatEther(newDeployerBalance)} DRAGON`)
            
            const newOwner = await newDragon.owner()
            console.log(`Owner: ${newOwner}`)
            const newOwnerBalance = await newDragon.balanceOf(newOwner)
            console.log(`Owner Balance: ${ethers.utils.formatEther(newOwnerBalance)} DRAGON`)
            
        } catch (error) {
            console.log(`❌ Error checking new contract: ${error.message}`)
        }
    } else {
        console.log(`❌ New contract does not exist`)
    }
    
    console.log(`\n=== Contract Check Complete ===`)
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
}) 