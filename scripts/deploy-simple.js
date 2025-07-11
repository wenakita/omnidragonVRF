const { ethers } = require('hardhat')

async function deploySimple() {
    const [deployer] = await ethers.getSigners()
    
    console.log('🚀 Simple Deployment Test')
    console.log('=========================')
    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer.address}`)
    console.log('')
    
    try {
        // Deploy Registry first
        console.log('📋 Deploying OmniDragonHybridRegistry...')
        const Registry = await ethers.getContractFactory('OmniDragonHybridRegistry')
        const registry = await Registry.deploy(deployer.address) // Pass initial owner
        await registry.deployed()
        console.log(`✅ Registry deployed at: ${registry.address}`)
        
        // Deploy omniDRAGON
        console.log('🐉 Deploying omniDRAGON...')
        const OmniDRAGON = await ethers.getContractFactory('omniDRAGON')
        const omniDRAGON = await OmniDRAGON.deploy(
            'Dragon',           // name
            'DRAGON',           // symbol
            registry.address,   // registry
            deployer.address,   // delegate
            deployer.address    // owner
        )
        await omniDRAGON.deployed()
        console.log(`✅ omniDRAGON deployed at: ${omniDRAGON.address}`)
        
        // Verify
        const name = await omniDRAGON.name()
        const symbol = await omniDRAGON.symbol()
        const totalSupply = await omniDRAGON.totalSupply()
        const owner = await omniDRAGON.owner()
        
        console.log('')
        console.log('🎉 Simple Deployment Successful!')
        console.log('================================')
        console.log(`Registry: ${registry.address}`)
        console.log(`omniDRAGON: ${omniDRAGON.address}`)
        console.log(`Name: ${name}`)
        console.log(`Symbol: ${symbol}`)
        console.log(`Total Supply: ${ethers.utils.formatEther(totalSupply)}`)
        console.log(`Owner: ${owner}`)
        
        console.log('')
        console.log('✅ Contracts work fine! The issue is with CREATE2 deployment.')
        
    } catch (error) {
        console.log('❌ Simple deployment failed:', error.message)
        console.log('This suggests there\'s an issue with the contracts themselves.')
    }
}

deploySimple()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error)
        process.exit(1)
    }) 