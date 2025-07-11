const { ethers } = require('hardhat')

async function debugFactoryDeploy() {
    const factoryAddress = '0xAA28020DDA6b954D16208eccF873D79AC6533833'
    const [deployer] = await ethers.getSigners()
    
    console.log('🔍 Debug Factory Deployment')
    console.log('===========================')
    console.log(`Factory: ${factoryAddress}`)
    console.log(`Deployer: ${deployer.address}`)
    console.log('')
    
    // Get factory contract
    const factory = await ethers.getContractAt('CREATE2FactoryWithOwnership', factoryAddress)
    
    // Get Registry bytecode
    const Registry = await ethers.getContractFactory('OmniDragonHybridRegistry')
    const registryBytecode = Registry.bytecode
    console.log(`Registry Bytecode Length: ${registryBytecode.length}`)
    
    // Test salt
    const testSalt = '0x116d55201629edf434af889a9ca8dea76886b6ee17464c5335b9ed9a6e7c299f'
    
    // Try to estimate gas for deployment
    console.log('Testing deployment gas estimation...')
    
    try {
        const gasEstimate = await factory.estimateGas.deploy(
            registryBytecode,
            testSalt,
            'OmniDragonHybridRegistry'
        )
        console.log(`✅ Gas estimate: ${gasEstimate.toString()}`)
        
        // Try to call the deploy function
        console.log('Attempting deployment...')
        const tx = await factory.deploy(
            registryBytecode,
            testSalt,
            'OmniDragonHybridRegistry',
            { gasLimit: gasEstimate.mul(120).div(100) } // 20% buffer
        )
        
        console.log(`Transaction hash: ${tx.hash}`)
        const receipt = await tx.wait()
        console.log(`✅ Deployment successful! Block: ${receipt.blockNumber}`)
        
    } catch (error) {
        console.log('❌ Deployment failed')
        console.log('Error:', error.message)
        
        // Try to get revert reason
        if (error.reason) {
            console.log('Revert reason:', error.reason)
        }
        
        // Check if it's a salt collision
        console.log('')
        console.log('🔍 Checking for salt collision...')
        
        try {
            const predictedAddress = await factory.computeAddress(
                ethers.utils.keccak256(registryBytecode),
                testSalt
            )
            console.log(`Predicted address: ${predictedAddress}`)
            
            const code = await ethers.provider.getCode(predictedAddress)
            if (code !== '0x') {
                console.log('⚠️  Contract already exists at predicted address!')
                console.log('This is likely a salt collision. Need to use a different salt.')
            } else {
                console.log('✅ No contract at predicted address')
            }
        } catch (err) {
            console.log('Could not check predicted address:', err.message)
        }
    }
}

debugFactoryDeploy()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error)
        process.exit(1)
    }) 