const { ethers } = require('hardhat')
const { execSync } = require('child_process')
const fs = require('fs')

async function getFactoryAddress() {
    // Deploy factory if not exists
    console.log('🏗️  Deploying CREATE2 Factory...')
    
    const [deployer] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory('CREATE2FactoryWithOwnership')
    const factory = await Factory.deploy()
    await factory.deployed()
    
    console.log(`✅ Factory deployed at: ${factory.address}`)
    console.log(`Deployer: ${deployer.address}`)
    
    return factory.address
}

async function getBytecodeHashes() {
    console.log('📋 Getting contract bytecode hashes...')
    
    // Get Registry bytecode hash
    const Registry = await ethers.getContractFactory('OmniDragonHybridRegistry')
    const registryBytecodeHash = ethers.utils.keccak256(Registry.bytecode)
    
    // Get omniDRAGON bytecode hash (without constructor args)
    const OmniDRAGON = await ethers.getContractFactory('omniDRAGON')
    const omniDRAGONBytecodeHash = ethers.utils.keccak256(OmniDRAGON.bytecode)
    
    console.log(`Registry Bytecode Hash: ${registryBytecodeHash}`)
    console.log(`omniDRAGON Bytecode Hash: ${omniDRAGONBytecodeHash}`)
    
    return {
        registry: registryBytecodeHash,
        omniDRAGON: omniDRAGONBytecodeHash
    }
}

async function runRustVanityGenerator(factoryAddress, bytecodeHashes, network = 'sonic') {
    console.log('')
    console.log('🦀 Running Rust Vanity Generator...')
    console.log('===================================')
    
    // Check if Rust is installed
    try {
        execSync('cargo --version', { stdio: 'ignore' })
    } catch (error) {
        console.log('❌ Rust/Cargo not found!')
        console.log('💡 Install Rust: https://rustup.rs/')
        console.log('   curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh')
        return
    }
    
    // Build the Rust project
    console.log('🔨 Building Rust vanity generator...')
    try {
        execSync('cd vanity-generator && cargo build --release', { stdio: 'inherit' })
    } catch (error) {
        console.log('❌ Failed to build Rust project')
        return
    }
    
    // Run the vanity generator
    console.log('🎯 Generating vanity addresses...')
    const command = `cd vanity-generator && cargo run --release -- \\
        --factory ${factoryAddress} \\
        --registry-bytecode ${bytecodeHashes.registry} \\
        --omnidragon-bytecode ${bytecodeHashes.omniDRAGON} \\
        --prefix 0x69 \\
        --suffix d777 \\
        --max-attempts 10000000 \\
        --network ${network}`
    
    console.log(`Running: ${command}`)
    
    try {
        execSync(command, { stdio: 'inherit' })
        console.log('✅ Rust vanity generator completed!')
    } catch (error) {
        console.log('❌ Rust vanity generator failed')
        console.log('Error:', error.message)
    }
}

async function main() {
    console.log('🎯 Rust-Powered Vanity Address Generator')
    console.log('========================================')
    console.log(`Network: ${hre.network.name}`)
    console.log('')
    
    try {
        // Step 1: Deploy factory
        const factoryAddress = await getFactoryAddress()
        
        // Step 2: Get bytecode hashes
        const bytecodeHashes = await getBytecodeHashes()
        
        // Step 3: Run Rust vanity generator
        await runRustVanityGenerator(factoryAddress, bytecodeHashes, hre.network.name)
        
        console.log('')
        console.log('🎉 Vanity Address Generation Process Complete!')
        console.log('==============================================')
        console.log('📄 Check the generated vanity-addresses-*.json file')
        console.log('')
        console.log('🔗 Next Steps:')
        console.log('1. Deploy contracts using vanity addresses:')
        console.log(`   npx hardhat run scripts/deploy-vanity-omnidragon.js --network ${hre.network.name}`)
        console.log('2. Update LayerZero configurations:')
        console.log('   npx hardhat run scripts/update-layerzero-configs.js')
        console.log('3. Test LayerZero setup:')
        console.log('   npx hardhat lz:oapp:config:get --oapp-config sonic-layerzero.config.ts')
        
    } catch (error) {
        console.error('❌ Process failed:', error.message)
        process.exit(1)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    }) 