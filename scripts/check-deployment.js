const { ethers } = require('hardhat')

const OMNIDRAGON_ADDRESS = '0x6986f9531cd91735025d6bEAAe30Bc9F012ad777'

async function checkDeployment(networkName, address) {
    try {
        const provider = ethers.getDefaultProvider(hre.network.config.url)
        const code = await provider.getCode(address)
        
        const isDeployed = code !== '0x'
        console.log(`${networkName}: ${isDeployed ? '✅ DEPLOYED' : '❌ NOT DEPLOYED'} at ${address}`)
        
        if (isDeployed) {
            // Try to get contract info
            const contract = await ethers.getContractAt('omniDRAGON', address)
            try {
                const name = await contract.name()
                const symbol = await contract.symbol()
                const totalSupply = await contract.totalSupply()
                console.log(`  - Name: ${name}`)
                console.log(`  - Symbol: ${symbol}`)
                console.log(`  - Total Supply: ${ethers.utils.formatEther(totalSupply)} tokens`)
            } catch (e) {
                console.log(`  - Contract exists but interface may differ`)
            }
        }
        
        return isDeployed
    } catch (error) {
        console.log(`${networkName}: ❌ ERROR - ${error.message}`)
        return false
    }
}

async function main() {
    console.log('🔍 Checking omniDRAGON Deployment Status')
    console.log('=========================================')
    console.log(`Target Address: ${OMNIDRAGON_ADDRESS}`)
    console.log('')
    
    // Check current network
    const networkName = hre.network.name
    console.log(`Current Network: ${networkName}`)
    
    const isDeployed = await checkDeployment(networkName, OMNIDRAGON_ADDRESS)
    
    console.log('')
    if (isDeployed) {
        console.log('✅ Contract is deployed on this network!')
        console.log('💡 You can proceed with LayerZero configuration')
    } else {
        console.log('❌ Contract is NOT deployed on this network')
        console.log('💡 You need to deploy the contract first')
    }
    
    console.log('')
    console.log('🚀 To check all networks, run:')
    console.log('  npx hardhat run scripts/check-deployment.js --network sonic')
    console.log('  npx hardhat run scripts/check-deployment.js --network arbitrum')
    console.log('  npx hardhat run scripts/check-deployment.js --network avalanche')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    }) 