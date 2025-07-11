const { ethers } = require('hardhat')
const crypto = require('crypto')

// Vanity address pattern: 0x69...d777
const VANITY_PREFIX = '0x69'
const VANITY_SUFFIX = 'd777'

// Factory address (will be deployed first)
let FACTORY_ADDRESS = null

function generateSalt() {
    return '0x' + crypto.randomBytes(32).toString('hex')
}

function computeCreate2Address(factoryAddress, salt, bytecodeHash) {
    return ethers.utils.getCreate2Address(factoryAddress, salt, bytecodeHash)
}

function isVanityAddress(address) {
    const addr = address.toLowerCase()
    return addr.startsWith(VANITY_PREFIX.toLowerCase()) && 
           addr.endsWith(VANITY_SUFFIX.toLowerCase())
}

async function findVanityAddress(contractName, bytecodeHash, maxAttempts = 1000000) {
    console.log(`🔍 Searching for vanity address for ${contractName}...`)
    console.log(`Pattern: ${VANITY_PREFIX}...${VANITY_SUFFIX}`)
    console.log(`Factory: ${FACTORY_ADDRESS}`)
    console.log(`Bytecode Hash: ${bytecodeHash}`)
    console.log('')
    
    let attempts = 0
    const startTime = Date.now()
    
    while (attempts < maxAttempts) {
        const salt = generateSalt()
        const address = computeCreate2Address(FACTORY_ADDRESS, salt, bytecodeHash)
        
        if (isVanityAddress(address)) {
            const elapsed = (Date.now() - startTime) / 1000
            console.log(`🎉 Found vanity address for ${contractName}!`)
            console.log(`Address: ${address}`)
            console.log(`Salt: ${salt}`)
            console.log(`Attempts: ${attempts + 1}`)
            console.log(`Time: ${elapsed.toFixed(2)}s`)
            console.log('')
            
            return { address, salt, attempts: attempts + 1 }
        }
        
        attempts++
        
        // Progress update every 10k attempts
        if (attempts % 10000 === 0) {
            const elapsed = (Date.now() - startTime) / 1000
            const rate = attempts / elapsed
            console.log(`⏳ Attempt ${attempts.toLocaleString()} (${rate.toFixed(0)} attempts/sec)`)
        }
    }
    
    throw new Error(`Could not find vanity address after ${maxAttempts} attempts`)
}

async function deployFactory() {
    console.log('🏗️  Deploying CREATE2 Factory...')
    
    const [deployer] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory('CREATE2FactoryWithOwnership')
    const factory = await Factory.deploy()
    await factory.deployed()
    
    FACTORY_ADDRESS = factory.address
    
    console.log(`✅ Factory deployed at: ${factory.address}`)
    console.log(`Deployer: ${deployer.address}`)
    console.log('')
    
    return factory
}

async function generateVanityAddresses() {
    console.log('🎯 Vanity Address Generator for omniDRAGON')
    console.log('==========================================')
    console.log(`Target Pattern: ${VANITY_PREFIX}...${VANITY_SUFFIX}`)
    console.log('')
    
    // Deploy factory first
    const factory = await deployFactory()
    
    // Get bytecode hashes
    const Registry = await ethers.getContractFactory('OmniDragonHybridRegistry')
    const registryBytecodeHash = ethers.utils.keccak256(Registry.bytecode)
    
    const OmniDRAGON = await ethers.getContractFactory('omniDRAGON')
    const omniDRAGONBytecodeHash = ethers.utils.keccak256(OmniDRAGON.bytecode)
    
    console.log('📋 Contract Information:')
    console.log(`Registry Bytecode Hash: ${registryBytecodeHash}`)
    console.log(`omniDRAGON Bytecode Hash: ${omniDRAGONBytecodeHash}`)
    console.log('')
    
    // Find vanity addresses
    const registryVanity = await findVanityAddress('OmniDragonHybridRegistry', registryBytecodeHash)
    const omniDRAGONVanity = await findVanityAddress('omniDRAGON', omniDRAGONBytecodeHash)
    
    // Save results
    const results = {
        factory: factory.address,
        network: hre.network.name,
        timestamp: new Date().toISOString(),
        registry: {
            ...registryVanity,
            bytecodeHash: registryBytecodeHash
        },
        omniDRAGON: {
            ...omniDRAGONVanity,
            bytecodeHash: omniDRAGONBytecodeHash
        }
    }
    
    const fs = require('fs')
    const filename = `vanity-addresses-${hre.network.name}.json`
    fs.writeFileSync(filename, JSON.stringify(results, null, 2))
    
    console.log('🎉 Vanity Address Generation Complete!')
    console.log('=====================================')
    console.log(`Factory: ${factory.address}`)
    console.log(`Registry: ${registryVanity.address} (Salt: ${registryVanity.salt})`)
    console.log(`omniDRAGON: ${omniDRAGONVanity.address} (Salt: ${omniDRAGONVanity.salt})`)
    console.log('')
    console.log(`📄 Results saved to: ${filename}`)
    console.log('')
    console.log('🔗 Next Steps:')
    console.log('1. Deploy Registry with vanity salt')
    console.log('2. Deploy omniDRAGON with vanity salt')
    console.log('3. Configure LayerZero connections')
    
    return results
}

async function main() {
    try {
        const results = await generateVanityAddresses()
        
        console.log('')
        console.log('🚀 Ready for deployment with vanity addresses!')
        console.log('Use the generated salts in your deployment scripts.')
        
    } catch (error) {
        console.error('❌ Vanity generation failed:', error.message)
        process.exit(1)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    }) 