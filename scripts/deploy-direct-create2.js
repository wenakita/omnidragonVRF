const { ethers } = require('hardhat')
const crypto = require('crypto')

async function deployDirectCreate2() {
    const [deployer] = await ethers.getSigners()
    const factoryAddress = '0xAA28020DDA6b954D16208eccF873D79AC6533833'
    
    console.log('🚀 Direct CREATE2 Deployment')
    console.log('============================')
    console.log(`Network: ${hre.network.name}`)
    console.log(`Factory: ${factoryAddress}`)
    console.log(`Deployer: ${deployer.address}`)
    console.log('')
    
    // Get factory contract
    const factory = await ethers.getContractAt('CREATE2FactoryWithOwnership', factoryAddress)
    
    // Step 1: Deploy OmniDragonHybridRegistry
    console.log('📋 Deploying OmniDragonHybridRegistry...')
    
    const Registry = await ethers.getContractFactory('OmniDragonHybridRegistry')
    const registryBytecode = Registry.bytecode
    
    // Generate random salt for Registry
    const registrySalt = '0x' + crypto.randomBytes(32).toString('hex')
    console.log(`Registry Salt: ${registrySalt}`)
    
    // Predict Registry address
    const registryBytecodeHash = ethers.utils.keccak256(registryBytecode)
    const registryAddress = await factory.computeAddress(registryBytecodeHash, registrySalt)
    console.log(`Predicted Registry Address: ${registryAddress}`)
    
    // Deploy Registry
    const registryTx = await factory.deploy(
        registryBytecode,
        registrySalt,
        'OmniDragonHybridRegistry',
        { gasLimit: 5000000 }
    )
    await registryTx.wait()
    console.log(`✅ Registry deployed at: ${registryAddress}`)
    
    // Verify Registry deployment
    const registryCode = await ethers.provider.getCode(registryAddress)
    if (registryCode === '0x') {
        throw new Error('Registry deployment failed - no code at address')
    }
    
    // Get Registry contract instance
    const registry = await ethers.getContractAt('OmniDragonHybridRegistry', registryAddress)
    
    // Step 2: Deploy omniDRAGON
    console.log('')
    console.log('🐉 Deploying omniDRAGON...')
    
    const OmniDRAGON = await ethers.getContractFactory('omniDRAGON')
    
    // Encode constructor arguments for omniDRAGON
    const constructorArgs = ethers.utils.defaultAbiCoder.encode(
        ['string', 'string', 'address', 'address', 'address'],
        [
            'Dragon',               // name
            'DRAGON',               // symbol
            registryAddress,        // registry
            deployer.address,       // delegate
            deployer.address        // owner
        ]
    )
    
    // Combine bytecode with constructor arguments
    const omniDRAGONBytecode = OmniDRAGON.bytecode + constructorArgs.slice(2)
    
    // Generate random salt for omniDRAGON
    const omniDRAGONSalt = '0x' + crypto.randomBytes(32).toString('hex')
    console.log(`omniDRAGON Salt: ${omniDRAGONSalt}`)
    
    // Predict omniDRAGON address
    const omniDRAGONBytecodeHash = ethers.utils.keccak256(omniDRAGONBytecode)
    const omniDRAGONAddress = await factory.computeAddress(omniDRAGONBytecodeHash, omniDRAGONSalt)
    console.log(`Predicted omniDRAGON Address: ${omniDRAGONAddress}`)
    
    // Deploy omniDRAGON
    const omniDRAGONTx = await factory.deploy(
        omniDRAGONBytecode,
        omniDRAGONSalt,
        'omniDRAGON',
        { gasLimit: 8000000 }
    )
    await omniDRAGONTx.wait()
    console.log(`✅ omniDRAGON deployed at: ${omniDRAGONAddress}`)
    
    // Verify omniDRAGON deployment
    const omniDRAGONCode = await ethers.provider.getCode(omniDRAGONAddress)
    if (omniDRAGONCode === '0x') {
        throw new Error('omniDRAGON deployment failed - no code at address')
    }
    
    // Get omniDRAGON contract instance
    const omniDRAGON = await ethers.getContractAt('omniDRAGON', omniDRAGONAddress)
    
    // Verify deployment details
    const name = await omniDRAGON.name()
    const symbol = await omniDRAGON.symbol()
    const totalSupply = await omniDRAGON.totalSupply()
    const owner = await omniDRAGON.owner()
    
    console.log('')
    console.log('🎉 Deployment Complete!')
    console.log('=======================')
    console.log(`Factory: ${factoryAddress}`)
    console.log(`Registry: ${registryAddress}`)
    console.log(`omniDRAGON: ${omniDRAGONAddress}`)
    console.log('')
    console.log('📊 Token Details:')
    console.log(`- Name: ${name}`)
    console.log(`- Symbol: ${symbol}`)
    console.log(`- Total Supply: ${ethers.utils.formatEther(totalSupply)} tokens`)
    console.log(`- Owner: ${owner}`)
    console.log(`- Deployer: ${deployer.address}`)
    console.log('')
    
    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        timestamp: new Date().toISOString(),
        factory: factoryAddress,
        registry: {
            address: registryAddress,
            salt: registrySalt,
            bytecodeHash: registryBytecodeHash
        },
        omnidragon: {
            address: omniDRAGONAddress,
            salt: omniDRAGONSalt,
            bytecodeHash: omniDRAGONBytecodeHash
        },
        deployer: deployer.address
    }
    
    const fs = require('fs')
    fs.writeFileSync(
        `deployment-${hre.network.name}.json`,
        JSON.stringify(deploymentInfo, null, 2)
    )
    
    console.log(`📄 Deployment info saved to deployment-${hre.network.name}.json`)
    
    return deploymentInfo
}

deployDirectCreate2()
    .then(() => {
        console.log('')
        console.log('🔗 Next Steps:')
        console.log('1. Update LayerZero configurations with deployed addresses')
        console.log('2. Configure LayerZero peers')
        console.log('3. Set up DVNs and Executors')
        console.log('4. Test cross-chain transfers')
        process.exit(0)
    })
    .catch((error) => {
        console.error('❌ Deployment failed:', error.message)
        process.exit(1)
    }) 