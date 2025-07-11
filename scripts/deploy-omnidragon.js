const { ethers } = require('hardhat')

// Deployment configuration
const DEPLOYMENT_CONFIG = {
    sonic: {
        chainId: 146,
        eid: 30332,
        endpoint: '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B',
        isOriginChain: true // Only Sonic mints initial supply
    },
    arbitrum: {
        chainId: 42161,
        eid: 30110,
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        isOriginChain: false
    },
    avalanche: {
        chainId: 43114,
        eid: 30106,
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        isOriginChain: false
    }
}

async function deployOmniDRAGON() {
    const [deployer] = await ethers.getSigners()
    const networkName = hre.network.name
    const config = DEPLOYMENT_CONFIG[networkName]
    
    if (!config) {
        throw new Error(`Network ${networkName} not supported`)
    }
    
    console.log('🚀 Deploying omniDRAGON')
    console.log('======================')
    console.log(`Network: ${networkName}`)
    console.log(`Chain ID: ${config.chainId}`)
    console.log(`LayerZero EID: ${config.eid}`)
    console.log(`Deployer: ${deployer.address}`)
    console.log(`Origin Chain: ${config.isOriginChain ? 'YES' : 'NO'}`)
    console.log('')
    
    // Deploy registry first (if needed)
    console.log('📋 Deploying OmniDragonHybridRegistry...')
    const Registry = await ethers.getContractFactory('OmniDragonHybridRegistry')
    const registry = await Registry.deploy()
    await registry.deployed()
    console.log(`✅ Registry deployed at: ${registry.address}`)
    
    // Configure registry
    await registry.registerChain(config.chainId, networkName, config.endpoint, true)
    console.log(`✅ Chain ${networkName} registered in registry`)
    
    // Deploy omniDRAGON
    console.log('🐉 Deploying omniDRAGON...')
    const OmniDRAGON = await ethers.getContractFactory('omniDRAGON')
    const omniDRAGON = await OmniDRAGON.deploy(
        'omniDRAGON',           // name
        'omniDRAGON',           // symbol
        registry.address,       // registry
        deployer.address,       // delegate
        deployer.address        // owner
    )
    await omniDRAGON.deployed()
    
    console.log(`✅ omniDRAGON deployed at: ${omniDRAGON.address}`)
    
    // Verify deployment
    const name = await omniDRAGON.name()
    const symbol = await omniDRAGON.symbol()
    const totalSupply = await omniDRAGON.totalSupply()
    
    console.log('')
    console.log('📊 Deployment Summary:')
    console.log(`- Name: ${name}`)
    console.log(`- Symbol: ${symbol}`)
    console.log(`- Total Supply: ${ethers.utils.formatEther(totalSupply)} tokens`)
    console.log(`- Registry: ${registry.address}`)
    console.log(`- omniDRAGON: ${omniDRAGON.address}`)
    
    if (config.isOriginChain) {
        console.log(`- Initial Supply Minted: ${ethers.utils.formatEther(totalSupply)} tokens`)
    }
    
    console.log('')
    console.log('🔗 Next Steps:')
    console.log('1. Deploy on other chains (Arbitrum, Avalanche)')
    console.log('2. Configure LayerZero peers')
    console.log('3. Set up DVNs and Executors')
    console.log('4. Test cross-chain transfers')
    
    return {
        registry: registry.address,
        omniDRAGON: omniDRAGON.address,
        deployer: deployer.address
    }
}

async function main() {
    try {
        const result = await deployOmniDRAGON()
        
        console.log('')
        console.log('🎉 Deployment Complete!')
        console.log('========================')
        console.log(`Registry: ${result.registry}`)
        console.log(`omniDRAGON: ${result.omniDRAGON}`)
        console.log(`Deployer: ${result.deployer}`)
        
        // Save deployment info
        const fs = require('fs')
        const deploymentInfo = {
            network: hre.network.name,
            timestamp: new Date().toISOString(),
            ...result
        }
        
        fs.writeFileSync(
            `deployment-${hre.network.name}.json`,
            JSON.stringify(deploymentInfo, null, 2)
        )
        
        console.log(`📄 Deployment info saved to deployment-${hre.network.name}.json`)
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message)
        process.exit(1)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    }) 