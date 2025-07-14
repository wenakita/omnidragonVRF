import { ethers } from "hardhat"

async function main() {
    console.log("\n=== CREATE2 Deployment Address Calculations ===\n")
    
    const CREATE2_FACTORY_ADDRESS = "0xAA28020DDA6b954D16208eccF873D79AC6533833"
    
    // Use the actual deployer address from env
    const deployerAddress = "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F"
    console.log(`Deployer address: ${deployerAddress}`)
    
    // Calculate Registry address
    const registrySalt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("OmniDragonHybridRegistry:v1"))
    console.log(`Registry salt: ${registrySalt}`)
    
    const RegistryFactory = await ethers.getContractFactory("OmniDragonHybridRegistry")
    const registryConstructorArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [deployerAddress]
    )
    const registryBytecode = RegistryFactory.bytecode + registryConstructorArgs.slice(2)
    const registryAddress = ethers.utils.getCreate2Address(
        CREATE2_FACTORY_ADDRESS,
        registrySalt,
        ethers.utils.keccak256(registryBytecode)
    )
    
    console.log(`\n📍 OmniDragonHybridRegistry will be deployed at: ${registryAddress}`)
    console.log(`   (Same address on all chains)`)
    
    // Calculate omniDRAGON address
    const dragonSalt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("omniDRAGON:v1"))
    console.log(`\nomniDRAGON salt: ${dragonSalt}`)
    
    const DragonFactory = await ethers.getContractFactory("omniDRAGON")
    const dragonConstructorArgs = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "address"],
        [registryAddress, registryAddress, deployerAddress]
    )
    const dragonBytecode = DragonFactory.bytecode + dragonConstructorArgs.slice(2)
    const dragonAddress = ethers.utils.getCreate2Address(
        CREATE2_FACTORY_ADDRESS,
        dragonSalt,
        ethers.utils.keccak256(dragonBytecode)
    )
    
    console.log(`\n🐉 omniDRAGON will be deployed at: ${dragonAddress}`)
    console.log(`   (Same address on all chains)`)
    
    console.log(`\n=== Deployment Instructions ===\n`)
    console.log(`1. Deploy Registry first:`)
    console.log(`   npx hardhat deploy --network sonic-mainnet --tags Registry`)
    console.log(`   npx hardhat deploy --network arbitrum-mainnet --tags Registry`)
    console.log(`   npx hardhat deploy --network avalanche-mainnet --tags Registry`)
    
    console.log(`\n2. Deploy omniDRAGON:`)
    console.log(`   npx hardhat deploy --network sonic-mainnet --tags OmniDRAGON`)
    console.log(`   npx hardhat deploy --network arbitrum-mainnet --tags OmniDRAGON`)
    console.log(`   npx hardhat deploy --network avalanche-mainnet --tags OmniDRAGON`)
    
    console.log(`\n3. Wire LayerZero connections:`)
    console.log(`   npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts`)
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
}) 