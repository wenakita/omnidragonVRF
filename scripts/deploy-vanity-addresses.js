const { ethers } = require('hardhat')
const fs = require('fs')

async function deployVanityAddresses() {
    const [deployer] = await ethers.getSigners()
    
    // Load vanity addresses
    const vanityData = JSON.parse(fs.readFileSync('vanity-addresses-sonic.json', 'utf8'))
    const factoryAddress = vanityData.factory
    
    console.log('🎯 Deploying Vanity Addresses')
    console.log('=============================')
    console.log(`Network: ${hre.network.name}`)
    console.log(`Factory: ${factoryAddress}`)
    console.log(`Deployer: ${deployer.address}`)
    console.log('')
    console.log('🎯 Target Vanity Addresses:')
    console.log(`Registry: ${vanityData.registry.address}`)
    console.log(`omniDRAGON: ${vanityData.omnidragon.address}`)
    console.log('')
    
    // Check if contracts already exist
    const registryCode = await ethers.provider.getCode(vanityData.registry.address)
    const omnidragonCode = await ethers.provider.getCode(vanityData.omnidragon.address)
    
    console.log('📋 Checking existing deployments...')
    console.log(`Registry exists: ${registryCode !== '0x'}`)
    console.log(`omniDRAGON exists: ${omnidragonCode !== '0x'}`)
    console.log('')
    
    // Get factory contract
    const factory = await ethers.getContractAt('CREATE2FactoryWithOwnership', factoryAddress)
    
    // Deploy Registry if it doesn't exist
    if (registryCode === '0x') {
        console.log('📋 Deploying OmniDragonHybridRegistry...')
        
        const Registry = await ethers.getContractFactory('OmniDragonHybridRegistry')
        const registryBytecode = Registry.bytecode
        
        try {
            const registryTx = await factory.deploy(
                registryBytecode,
                vanityData.registry.salt,
                'OmniDragonHybridRegistry',
                { gasLimit: 5000000 }
            )
            await registryTx.wait()
            console.log(`✅ Registry deployed at: ${vanityData.registry.address}`)
        } catch (error) {
            console.log(`❌ Registry deployment failed: ${error.message}`)
            return
        }
    } else {
        console.log('✅ Registry already exists')
    }
    
    // Deploy omniDRAGON if it doesn't exist
    if (omnidragonCode === '0x') {
        console.log('🐉 Deploying omniDRAGON...')
        
        const OmniDRAGON = await ethers.getContractFactory('omniDRAGON')
        
        // Encode constructor arguments
        const constructorArgs = ethers.utils.defaultAbiCoder.encode(
            ['string', 'string', 'address', 'address', 'address'],
            [
                'Dragon',                       // name
                'DRAGON',                       // symbol
                vanityData.registry.address,    // registry
                deployer.address,               // delegate
                deployer.address                // owner
            ]
        )
        
        // Combine bytecode with constructor arguments
        const omniDRAGONBytecode = OmniDRAGON.bytecode + constructorArgs.slice(2)
        
        try {
            const omniDRAGONTx = await factory.deploy(
                omniDRAGONBytecode,
                vanityData.omnidragon.salt,
                'omniDRAGON',
                { gasLimit: 8000000 }
            )
            await omniDRAGONTx.wait()
            console.log(`✅ omniDRAGON deployed at: ${vanityData.omnidragon.address}`)
        } catch (error) {
            console.log(`❌ omniDRAGON deployment failed: ${error.message}`)
            return
        }
    } else {
        console.log('✅ omniDRAGON already exists')
    }
    
    // Verify deployments
    console.log('')
    console.log('🔍 Verifying deployments...')
    
    // Check Registry
    const finalRegistryCode = await ethers.provider.getCode(vanityData.registry.address)
    if (finalRegistryCode === '0x') {
        console.log('❌ Registry verification failed')
        return
    }
    
    // Check omniDRAGON
    const finalOmnidragonCode = await ethers.provider.getCode(vanityData.omnidragon.address)
    if (finalOmnidragonCode === '0x') {
        console.log('❌ omniDRAGON verification failed')
        return
    }
    
    // Get contract instances and verify details
    const registry = await ethers.getContractAt('OmniDragonHybridRegistry', vanityData.registry.address)
    const omniDRAGON = await ethers.getContractAt('omniDRAGON', vanityData.omnidragon.address)
    
    const name = await omniDRAGON.name()
    const symbol = await omniDRAGON.symbol()
    const totalSupply = await omniDRAGON.totalSupply()
    const owner = await omniDRAGON.owner()
    
    console.log('')
    console.log('🎉 Deployment Complete!')
    console.log('=======================')
    console.log(`Factory: ${factoryAddress}`)
    console.log(`Registry: ${vanityData.registry.address}`)
    console.log(`omniDRAGON: ${vanityData.omnidragon.address}`)
    console.log('')
    console.log('📊 Token Details:')
    console.log(`- Name: ${name}`)
    console.log(`- Symbol: ${symbol}`)
    console.log(`- Total Supply: ${ethers.utils.formatEther(totalSupply)} tokens`)
    console.log(`- Owner: ${owner}`)
    console.log('')
    console.log('🎯 Vanity Address Verification:')
    console.log(`Registry starts with 0x69: ${vanityData.registry.address.startsWith('0x69')}`)
    console.log(`Registry ends with d777: ${vanityData.registry.address.toLowerCase().endsWith('d777')}`)
    console.log(`omniDRAGON starts with 0x69: ${vanityData.omnidragon.address.startsWith('0x69')}`)
    console.log(`omniDRAGON ends with d777: ${vanityData.omnidragon.address.toLowerCase().endsWith('d777')}`)
    
    return {
        factory: factoryAddress,
        registry: vanityData.registry.address,
        omnidragon: vanityData.omnidragon.address,
        deployer: deployer.address
    }
}

deployVanityAddresses()
    .then((result) => {
        console.log('')
        console.log('🔗 Next Steps:')
        console.log('1. Update LayerZero configurations')
        console.log('2. Configure LayerZero peers')
        console.log('3. Set up DVNs and Executors')
        console.log('4. Test cross-chain transfers')
        process.exit(0)
    })
    .catch((error) => {
        console.error('❌ Deployment failed:', error.message)
        process.exit(1)
    }) 