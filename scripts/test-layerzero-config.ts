import { HardhatRuntimeEnvironment } from 'hardhat/types'
import config from '../layerzero.config'

async function main() {
    console.log('Testing LayerZero configuration...')
    
    try {
        // Load the configuration
        const lzConfig = await config()
        
        console.log('\n✅ Configuration loaded successfully!')
        console.log('\nContracts:')
        lzConfig.contracts.forEach((c: any) => {
            console.log(`  - ${c.contract.contractName} on chain ${c.contract.eid}`)
        })
        
        console.log('\nConnections:')
        lzConfig.connections.forEach((conn: any, idx: number) => {
            console.log(`  ${idx + 1}. From ${conn.from.contractName} (${conn.from.eid}) → To ${conn.to.contractName} (${conn.to.eid})`)
        })
        
        console.log('\n✅ Configuration structure is valid!')
    } catch (error) {
        console.error('❌ Configuration error:', error)
        process.exit(1)
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
}) 