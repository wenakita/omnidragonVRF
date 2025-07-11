const fs = require('fs')
const path = require('path')

// Load vanity addresses from all networks
function loadAllVanityAddresses() {
    const networks = ['sonic', 'arbitrum', 'avalanche']
    const vanityAddresses = {}
    
    for (const network of networks) {
        const filename = `vanity-addresses-${network}.json`
        if (fs.existsSync(filename)) {
            const data = JSON.parse(fs.readFileSync(filename, 'utf8'))
            vanityAddresses[network] = data
        }
    }
    
    return vanityAddresses
}

// Update LayerZero configuration files
function updateLayerZeroConfigs(vanityAddresses) {
    console.log('🔄 Updating LayerZero Configuration Files')
    console.log('=========================================')
    
    // Check if we have addresses for all networks
    const sonicAddr = vanityAddresses.sonic?.omniDRAGON?.address
    const arbitrumAddr = vanityAddresses.arbitrum?.omniDRAGON?.address
    const avalancheAddr = vanityAddresses.avalanche?.omniDRAGON?.address
    
    if (!sonicAddr || !arbitrumAddr || !avalancheAddr) {
        console.log('⚠️  Warning: Not all vanity addresses found')
        console.log(`Sonic: ${sonicAddr || 'MISSING'}`)
        console.log(`Arbitrum: ${arbitrumAddr || 'MISSING'}`)
        console.log(`Avalanche: ${avalancheAddr || 'MISSING'}`)
        console.log('')
        console.log('💡 Generate vanity addresses for missing networks first:')
        if (!sonicAddr) console.log('  npx hardhat run scripts/generate-vanity-addresses.js --network sonic')
        if (!arbitrumAddr) console.log('  npx hardhat run scripts/generate-vanity-addresses.js --network arbitrum')
        if (!avalancheAddr) console.log('  npx hardhat run scripts/generate-vanity-addresses.js --network avalanche')
        return
    }
    
    console.log('✅ All vanity addresses found:')
    console.log(`Sonic: ${sonicAddr}`)
    console.log(`Arbitrum: ${arbitrumAddr}`)
    console.log(`Avalanche: ${avalancheAddr}`)
    console.log('')
    
    // Update sonic-layerzero.config.ts
    const sonicConfig = `// Working LayerZero configuration with Sonic EID 30332 support
// This bypasses the official EndpointId validation
// Updated with vanity addresses: 0x69...d777

const SONIC_EID = 30332

const arbitrumContract = {
    eid: 30110, // EndpointId.ARBITRUM_V2_MAINNET
    contractName: 'omniDRAGON',
    address: '${arbitrumAddr}',
}

const avalancheContract = {
    eid: 30106, // EndpointId.AVALANCHE_V2_MAINNET
    contractName: 'omniDRAGON',
    address: '${avalancheAddr}',
}

const sonicContract = {
    eid: SONIC_EID,
    contractName: 'omniDRAGON',
    address: '${sonicAddr}',
}

export default {
    contracts: [
        {
            contract: arbitrumContract,
        },
        {
            contract: avalancheContract,
        },
        {
            contract: sonicContract,
        },
    ],
    connections: [
        {
            from: arbitrumContract,
            to: avalancheContract,
        },
        {
            from: avalancheContract,
            to: arbitrumContract,
        },
        {
            from: sonicContract,
            to: arbitrumContract,
        },
        {
            from: arbitrumContract,
            to: sonicContract,
        },
        {
            from: sonicContract,
            to: avalancheContract,
        },
        {
            from: avalancheContract,
            to: sonicContract,
        },
    ],
}`
    
    // Update layerzero.config.ts
    const layerzeroConfig = `import { CustomEndpointId } from './custom-eids'

// LayerZero configuration using custom EID registry
// Updated with vanity addresses: 0x69...d777

const arbitrumContract = {
    eid: CustomEndpointId.ARBITRUM_V2_MAINNET,
    contractName: 'omniDRAGON',
    address: '${arbitrumAddr}',
}

const avalancheContract = {
    eid: CustomEndpointId.AVALANCHE_V2_MAINNET,
    contractName: 'omniDRAGON',
    address: '${avalancheAddr}',
}

const sonicContract = {
    eid: CustomEndpointId.SONIC_V2_MAINNET,
    contractName: 'omniDRAGON',
    address: '${sonicAddr}',
}

export default {
    contracts: [
        {
            contract: arbitrumContract,
        },
        {
            contract: avalancheContract,
        },
        {
            contract: sonicContract,
        },
    ],
    connections: [
        {
            from: arbitrumContract,
            to: avalancheContract,
        },
        {
            from: avalancheContract,
            to: arbitrumContract,
        },
        {
            from: sonicContract,
            to: arbitrumContract,
        },
        {
            from: arbitrumContract,
            to: sonicContract,
        },
        {
            from: sonicContract,
            to: avalancheContract,
        },
        {
            from: avalancheContract,
            to: sonicContract,
        },
    ],
}`
    
    // Update layerzero-working.config.ts
    const workingConfig = `import { EndpointId } from '@layerzerolabs/lz-definitions'

// Working LayerZero configuration (Arbitrum <-> Avalanche)
// Updated with vanity addresses: 0x69...d777

const arbitrumContract = {
    eid: EndpointId.ARBITRUM_V2_MAINNET,
    contractName: 'omniDRAGON',
    address: '${arbitrumAddr}',
}

const avalancheContract = {
    eid: EndpointId.AVALANCHE_V2_MAINNET,
    contractName: 'omniDRAGON',
    address: '${avalancheAddr}',
}

export default {
    contracts: [
        {
            contract: arbitrumContract,
        },
        {
            contract: avalancheContract,
        },
    ],
    connections: [
        {
            from: arbitrumContract,
            to: avalancheContract,
        },
        {
            from: avalancheContract,
            to: arbitrumContract,
        },
    ],
}`
    
    // Write updated configs
    fs.writeFileSync('sonic-layerzero.config.ts', sonicConfig)
    fs.writeFileSync('layerzero.config.ts', layerzeroConfig)
    fs.writeFileSync('layerzero-working.config.ts', workingConfig)
    
    console.log('✅ Updated LayerZero configuration files:')
    console.log('  - sonic-layerzero.config.ts')
    console.log('  - layerzero.config.ts')
    console.log('  - layerzero-working.config.ts')
    console.log('')
    
    // Create a summary file
    const summary = {
        timestamp: new Date().toISOString(),
        vanityPattern: '0x69...d777',
        addresses: {
            sonic: sonicAddr,
            arbitrum: arbitrumAddr,
            avalanche: avalancheAddr
        },
        networks: {
            sonic: { chainId: 146, eid: 30332 },
            arbitrum: { chainId: 42161, eid: 30110 },
            avalanche: { chainId: 43114, eid: 30106 }
        }
    }
    
    fs.writeFileSync('vanity-addresses-summary.json', JSON.stringify(summary, null, 2))
    console.log('📄 Summary saved to: vanity-addresses-summary.json')
}

async function main() {
    try {
        console.log('🎯 LayerZero Config Updater')
        console.log('===========================')
        console.log('')
        
        const vanityAddresses = loadAllVanityAddresses()
        
        if (Object.keys(vanityAddresses).length === 0) {
            console.log('❌ No vanity addresses found!')
            console.log('💡 Generate vanity addresses first:')
            console.log('  npx hardhat run scripts/generate-vanity-addresses.js --network sonic')
            console.log('  npx hardhat run scripts/generate-vanity-addresses.js --network arbitrum')
            console.log('  npx hardhat run scripts/generate-vanity-addresses.js --network avalanche')
            return
        }
        
        updateLayerZeroConfigs(vanityAddresses)
        
        console.log('')
        console.log('🎉 LayerZero configs updated with vanity addresses!')
        console.log('🔗 Next steps:')
        console.log('1. Deploy contracts with vanity addresses on all chains')
        console.log('2. Test LayerZero configuration:')
        console.log('   npx hardhat lz:oapp:config:get --oapp-config sonic-layerzero.config.ts')
        console.log('3. Configure cross-chain peers and DVNs')
        
    } catch (error) {
        console.error('❌ Config update failed:', error.message)
        process.exit(1)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    }) 