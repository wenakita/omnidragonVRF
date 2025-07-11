const { ethers } = require('hardhat')

async function checkFactory() {
    const factoryAddress = '0xAA28020DDA6b954D16208eccF873D79AC6533833'
    
    console.log('🔍 Checking CREATE2 Factory')
    console.log('==========================')
    console.log(`Network: ${hre.network.name}`)
    console.log(`Factory Address: ${factoryAddress}`)
    
    // Check if contract exists
    const code = await ethers.provider.getCode(factoryAddress)
    console.log(`Contract Code Length: ${code.length}`)
    
    if (code === '0x') {
        console.log('❌ Factory contract not found at this address')
        console.log('💡 Options:')
        console.log('1. Deploy a new CREATE2 factory')
        console.log('2. Use a different factory address')
        console.log('3. Use the factory from our vanity addresses file')
        return false
    } else {
        console.log('✅ Factory contract found!')
        
        // Try to get contract info
        try {
            const factory = await ethers.getContractAt('CREATE2FactoryWithOwnership', factoryAddress)
            const owner = await factory.owner()
            console.log(`Factory Owner: ${owner}`)
            
            const [deployer] = await ethers.getSigners()
            console.log(`Deployer: ${deployer.address}`)
            console.log(`Is Owner: ${owner.toLowerCase() === deployer.address.toLowerCase()}`)
            
            return true
        } catch (error) {
            console.log('⚠️  Factory found but interface mismatch')
            console.log('Error:', error.message)
            return false
        }
    }
}

checkFactory()
    .then((exists) => {
        if (!exists) {
            console.log('')
            console.log('🚀 Suggested Solutions:')
            console.log('1. Deploy new factory:')
            console.log('   npx hardhat run scripts/rust-vanity-generator.js --network sonic')
            console.log('2. Use existing factory from vanity file:')
            console.log('   npx hardhat run scripts/deploy-vanity-omnidragon.js --network sonic')
        }
        process.exit(0)
    })
    .catch((error) => {
        console.error('❌ Error:', error.message)
        process.exit(1)
    }) 