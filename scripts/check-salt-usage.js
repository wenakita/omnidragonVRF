const { ethers } = require('hardhat')
const fs = require('fs')

async function checkSaltUsage() {
    const vanityData = JSON.parse(fs.readFileSync('vanity-addresses-sonic.json', 'utf8'))
    const factoryAddress = vanityData.factory
    
    console.log('🔍 Checking Salt Usage')
    console.log('======================')
    console.log(`Factory: ${factoryAddress}`)
    console.log('')
    
    // Get factory contract
    const factory = await ethers.getContractAt('CREATE2FactoryWithOwnership', factoryAddress)
    
    // Check Registry salt
    console.log('📋 Registry Salt Check:')
    console.log(`Salt: ${vanityData.registry.salt}`)
    
    try {
        const registrySaltUsed = await factory.deploymentBySalt(vanityData.registry.salt)
        console.log(`Salt used: ${registrySaltUsed !== ethers.constants.AddressZero}`)
        if (registrySaltUsed !== ethers.constants.AddressZero) {
            console.log(`Deployed at: ${registrySaltUsed}`)
        }
    } catch (error) {
        console.log(`Error checking salt: ${error.message}`)
    }
    
    console.log('')
    
    // Check omniDRAGON salt
    console.log('🐉 omniDRAGON Salt Check:')
    console.log(`Salt: ${vanityData.omnidragon.salt}`)
    
    try {
        const omnidragonSaltUsed = await factory.deploymentBySalt(vanityData.omnidragon.salt)
        console.log(`Salt used: ${omnidragonSaltUsed !== ethers.constants.AddressZero}`)
        if (omnidragonSaltUsed !== ethers.constants.AddressZero) {
            console.log(`Deployed at: ${omnidragonSaltUsed}`)
        }
    } catch (error) {
        console.log(`Error checking salt: ${error.message}`)
    }
    
    console.log('')
    console.log('💡 If salts are already used, we need to generate new vanity addresses')
}

checkSaltUsage()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error.message)
        process.exit(1)
    }) 