import { ethers } from 'hardhat'
import hre from 'hardhat'

async function main() {
    const [deployer] = await ethers.getSigners()
    const network = hre.network.name
    
    console.log(`\n=== Checking Token Distribution on ${network} ===`)
    console.log(`Deployer: ${deployer.address}`)
    console.log(`Network: ${network}`)
    
    const dragonAddress = "0x69cb0574d4f7ca6879a72cb50123B391c4e60777"
    
    // Get dragon contract
    const dragon = await ethers.getContractAt("omniDRAGON", dragonAddress)
    
    // Check basic info
    const name = await dragon.name()
    const symbol = await dragon.symbol()
    const totalSupply = await dragon.totalSupply()
    const deployerBalance = await dragon.balanceOf(deployer.address)
    
    console.log(`\n=== Token Info ===`)
    console.log(`Name: ${name}`)
    console.log(`Symbol: ${symbol}`)
    console.log(`Total Supply: ${ethers.utils.formatEther(totalSupply)} DRAGON`)
    console.log(`Deployer Balance: ${ethers.utils.formatEther(deployerBalance)} DRAGON`)
    
    // Check owner
    const owner = await dragon.owner()
    console.log(`Contract Owner: ${owner}`)
    const ownerBalance = await dragon.balanceOf(owner)
    console.log(`Owner Balance: ${ethers.utils.formatEther(ownerBalance)} DRAGON`)
    
    // Check if tokens are in the contract itself
    const contractBalance = await dragon.balanceOf(dragonAddress)
    console.log(`Contract Balance: ${ethers.utils.formatEther(contractBalance)} DRAGON`)
    
    // Check if chain ID is correct for minting
    const chainId = (await ethers.provider.getNetwork()).chainId
    console.log(`Current Chain ID: ${chainId}`)
    console.log(`Expected Sonic Chain ID: 146`)
    console.log(`Should have initial supply: ${chainId === 146}`)
    
    // Check if initial mint was completed
    try {
        const initialMintCompleted = await dragon.initialMintCompleted()
        console.log(`Initial Mint Completed: ${initialMintCompleted}`)
    } catch (error) {
        console.log(`Could not check initial mint status: ${error.message}`)
    }
    
    // Try to get more addresses to check
    console.log(`\n=== Checking Additional Addresses ===`)
    
    // Check registry
    try {
        const registry = await dragon.registry()
        console.log(`Registry: ${registry}`)
        const registryBalance = await dragon.balanceOf(registry)
        console.log(`Registry Balance: ${ethers.utils.formatEther(registryBalance)} DRAGON`)
    } catch (error) {
        console.log(`Could not check registry: ${error.message}`)
    }
    
    // Check delegate
    try {
        const delegate = await dragon.delegate()
        console.log(`Delegate: ${delegate}`)
        const delegateBalance = await dragon.balanceOf(delegate)
        console.log(`Delegate Balance: ${ethers.utils.formatEther(delegateBalance)} DRAGON`)
    } catch (error) {
        console.log(`Could not check delegate: ${error.message}`)
    }
    
    console.log(`\n=== Distribution Check Complete ===`)
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
}) 