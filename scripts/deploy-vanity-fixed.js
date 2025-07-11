const { ethers } = require('hardhat')
const fs = require('fs')

async function deployVanityFixed() {
    const [deployer] = await ethers.getSigners()
    
    // Load vanity addresses
    const vanityData = JSON.parse(fs.readFileSync('vanity-addresses-sonic.json', 'utf8'))
    const factoryAddress = vanityData.factory
    
    console.log('🎯 Deploying Vanity Addresses (Fixed)')
    console.log('====================================')
    console.log(`Network: ${hre.network.name}`)
    console.log(`Factory: ${factoryAddress}`)
    console.log(`Deployer: ${deployer.address}`)
    console.log('')
    console.log('🎯 Target Vanity Addresses:')
    console.log(`Registry: ${vanityData.registry.address}`)
    console.log(`omniDRAGON: ${vanityData.omnidragon.address}`)
    console.log('')
    
    // Get factory contract
    const factory = await ethers.getContractAt('CREATE2FactoryWithOwnership', factoryAddress)
    
    // Check if contracts already exist
    const registryCode = await ethers.provider.getCode(vanityData.registry.address)
    const omnidragonCode = await ethers.provider.getCode(vanityData.omnidragon.address)
    
    console.log('📋 Checking existing deployments...')
    console.log(`Registry exists: ${registryCode !== '0x'}`)
    console.log(`omniDRAGON exists: ${omnidragonCode !== '0x'}`)
    console.log('')
    
    // Deploy Registry if it doesn't exist
    if (registryCode === '0x') {
        console.log('📋 Deploying OmniDragonHybridRegistry...')
        
        const Registry = await ethers.getContractFactory('OmniDragonHybridRegistry')
        const registryBytecode = Registry.bytecode
        const registryBytecodeHash = ethers.utils.keccak256(registryBytecode)
        
        // Verify the predicted address matches
        const predictedAddress = await factory.computeAddress(vanityData.registry.salt, registryBytecodeHash)
        console.log(`Expected: ${vanityData.registry.address}`)
        console.log(`Predicted: ${predictedAddress}`)
        
        if (predictedAddress.toLowerCase() !== vanityData.registry.address.toLowerCase()) {
            console.log('❌ Address mismatch! The salt or bytecode might be wrong.')
            return
        }
        
        try {
            console.log('Deploying Registry...')
            const registryTx = await factory.deploy(
                registryBytecode,
                vanityData.registry.salt,
                'OmniDragonHybridRegistry',
                { gasLimit: 5000000 }
            )
            const receipt = await registryTx.wait()
            console.log(`✅ Registry deployed at: ${vanityData.registry.address}`)
            console.log(`Transaction: ${receipt.transactionHash}`)
        } catch (error) {
            console.log(`❌ Registry deployment failed: ${error.message}`)
            
            // Check if it's a revert with reason
            if (error.reason) {
                console.log(`Revert reason: ${error.reason}`)
            }
            
            // Check if salt is already used
            const saltUsed = await factory.deploymentBySalt(vanityData.registry.salt)
            if (saltUsed !== ethers.constants.AddressZero) {
                console.log(`⚠️  Salt already used, deployed at: ${saltUsed}`)
            }
            
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
        const omniDRAGONBytecodeHash = ethers.utils.keccak256(omniDRAGONBytecode)
        
        // Verify the predicted address matches
        const predictedAddress = await factory.computeAddress(vanityData.omnidragon.salt, omniDRAGONBytecodeHash)
        console.log(`Expected: ${vanityData.omnidragon.address}`)
        console.log(`Predicted: ${predictedAddress}`)
        
        if (predictedAddress.toLowerCase() !== vanityData.omnidragon.address.toLowerCase()) {
            console.log('❌ Address mismatch! The salt or bytecode might be wrong.')
            return
        }
        
        try {
            console.log('Deploying omniDRAGON...')
            const omniDRAGONTx = await factory.deploy(
                omniDRAGONBytecode,
                vanityData.omnidragon.salt,
                'omniDRAGON',
                { gasLimit: 8000000 }
            )
            const receipt = await omniDRAGONTx.wait()
            console.log(`✅ omniDRAGON deployed at: ${vanityData.omnidragon.address}`)
            console.log(`Transaction: ${receipt.transactionHash}`)
        } catch (error) {
            console.log(`❌ omniDRAGON deployment failed: ${error.message}`)
            
            // Check if it's a revert with reason
            if (error.reason) {
                console.log(`Revert reason: ${error.reason}`)
            }
            
            // Check if salt is already used
            const saltUsed = await factory.deploymentBySalt(vanityData.omnidragon.salt)
            if (saltUsed !== ethers.constants.AddressZero) {
                console.log(`⚠️  Salt already used, deployed at: ${saltUsed}`)
            }
            
            return
        }
    } else {
        console.log('✅ omniDRAGON already exists')
    }
    
    // Final verification
    console.log('')
    console.log('🔍 Final Verification...')
    
    const finalRegistryCode = await ethers.provider.getCode(vanityData.registry.address)
    const finalOmnidragonCode = await ethers.provider.getCode(vanityData.omnidragon.address)
    
    if (finalRegistryCode === '0x' || finalOmnidragonCode === '0x') {
        console.log('❌ Deployment verification failed')
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
    console.log(`Registry: ${vanityData.registry.address} (starts with 0x69, ends with d777)`)
    console.log(`omniDRAGON: ${vanityData.omnidragon.address} (starts with 0x69, ends with d777)`)
    
    return {
        factory: factoryAddress,
        registry: vanityData.registry.address,
        omnidragon: vanityData.omnidragon.address,
        deployer: deployer.address
    }
}

deployVanityFixed()
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