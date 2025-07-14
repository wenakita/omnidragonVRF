import { ethers } from 'hardhat'
import hre from 'hardhat'

async function main() {
    console.log(`\n=== COMPREHENSIVE DEPLOYMENT VERIFICATION ===`)
    
    // Contract addresses based on deployment files
    const contracts = {
        sonic: {
            registry: "0x69637BfD5D2b851D870d9E0E38B5b73FaF950777",
            dragon: "0x69cb0574d4f7ca6879a72cb50123B391c4e60777" // New vanity address
        },
        arbitrum: {
            registry: "0x69637BfD5D2b851D870d9E0E38B5b73FaF950777",
            dragon: "0x69cb0574d4f7ca6879a72cb50123B391c4e60777" // Vanity address
        },
        avalanche: {
            registry: "0x69637BfD5D2b851D870d9E0E38B5b73FaF950777",
            dragon: "0x69cb0574d4f7ca6879a72cb50123B391c4e60777" // Vanity address
        }
    }

    const currentNetwork = hre.network.name
    console.log(`\nCurrent Network: ${currentNetwork}`)
    console.log(`Chain ID: ${(await ethers.provider.getNetwork()).chainId}`)

    let networkKey = ''
    if (currentNetwork.includes('sonic')) networkKey = 'sonic'
    else if (currentNetwork.includes('arbitrum')) networkKey = 'arbitrum'
    else if (currentNetwork.includes('avalanche')) networkKey = 'avalanche'
    
    if (!networkKey) {
        console.log("❌ Unknown network")
        return
    }

    const networkContracts = contracts[networkKey]
    
    console.log(`\n--- Checking ${networkKey.toUpperCase()} Network ---`)

    // Check Registry
    console.log(`\n🔍 Registry: ${networkContracts.registry}`)
    const registryCode = await ethers.provider.getCode(networkContracts.registry)
    const registryExists = registryCode !== "0x"
    console.log(`   Deployed: ${registryExists ? '✅' : '❌'} (${registryCode.length} bytes)`)
    
    if (registryExists) {
        try {
            const registry = await ethers.getContractAt("OmniDragonHybridRegistry", networkContracts.registry)
            const owner = await registry.owner()
            const currentChain = await registry.getCurrentChainId()
            console.log(`   Owner: ${owner}`)
            console.log(`   Current Chain ID: ${currentChain}`)
        } catch (error) {
            console.log(`   ❌ Error reading registry: ${error.message}`)
        }
    }

    // Check Dragon Token
    console.log(`\n🐉 Dragon Token: ${networkContracts.dragon}`)
    const dragonCode = await ethers.provider.getCode(networkContracts.dragon)
    const dragonExists = dragonCode !== "0x"
    console.log(`   Deployed: ${dragonExists ? '✅' : '❌'} (${dragonCode.length} bytes)`)
    
    if (dragonExists) {
        try {
            const dragon = await ethers.getContractAt("omniDRAGON", networkContracts.dragon)
            const name = await dragon.name()
            const symbol = await dragon.symbol()
            const totalSupply = await dragon.totalSupply()
            const owner = await dragon.owner()
            const [deployer] = await ethers.getSigners()
            const deployerBalance = await dragon.balanceOf(deployer.address)
            
            console.log(`   Name: ${name}`)
            console.log(`   Symbol: ${symbol}`)
            console.log(`   Total Supply: ${ethers.utils.formatEther(totalSupply)} DRAGON`)
            console.log(`   Owner: ${owner}`)
            console.log(`   Deployer Balance: ${ethers.utils.formatEther(deployerBalance)} DRAGON`)
        } catch (error) {
            console.log(`   ❌ Error reading dragon token: ${error.message}`)
        }
    }

    // Summary
    console.log(`\n📊 ${networkKey.toUpperCase()} SUMMARY:`)
    console.log(`   Registry: ${registryExists ? '✅ DEPLOYED' : '❌ NOT FOUND'}`)
    console.log(`   Dragon Token: ${dragonExists ? '✅ DEPLOYED' : '❌ NOT FOUND'}`)
    
    if (registryExists && dragonExists) {
        console.log(`   🎉 ALL CONTRACTS DEPLOYED SUCCESSFULLY!`)
    } else {
        console.log(`   ⚠️  MISSING CONTRACTS DETECTED`)
    }
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
}) 