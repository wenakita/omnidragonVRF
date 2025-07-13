import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, ethers } = hre
    const { execute, get, getOrNull } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`\n--- Deploying omniDRAGON on ${hre.network.name} ---`)
    console.log(`Deployer: ${deployer}`)

    // CREATE2 Factory address (same on all chains)
    const CREATE2_FACTORY_ADDRESS = "0xAA28020DDA6b954D16208eccF873D79AC6533833"
    
    // Get the factory contract
    const factoryContract = await ethers.getContractAt("CREATE2FactoryWithOwnership", CREATE2_FACTORY_ADDRESS)
    
    // Get registry deployment
    const registry = await get("OmniDragonHybridRegistry")
    console.log(`Using registry at: ${registry.address}`)

    // Check if omniDRAGON already exists
    const existingDragon = await getOrNull("omniDRAGON")
    if (existingDragon) {
        console.log(`omniDRAGON already deployed at: ${existingDragon.address}`)
        return
    }

    // Deploy omniDRAGON via CREATE2
    // Using deterministic 32-byte salt for consistent cross-chain addresses
    const salt = "0x0000000000000000000000000000000000000000000000000000000000000002"
    
    // Get the contract factory
    const DragonFactory = await ethers.getContractFactory("omniDRAGON")
    const bytecode = DragonFactory.bytecode
    // IMPORTANT: Using deployer as owner to receive tokens
    const constructorArgs = ethers.utils.defaultAbiCoder.encode(
        ["string", "string", "address", "address", "address"],
        ["omniDRAGON", "DRAGON", registry.address, registry.address, deployer] // name, symbol, delegate, registry, owner
    )
    const deploymentBytecode = bytecode + constructorArgs.slice(2)
    
    // Calculate deployment address
    const computedAddress = ethers.utils.getCreate2Address(
        CREATE2_FACTORY_ADDRESS,
        salt,
        ethers.utils.keccak256(deploymentBytecode)
    )
    console.log(`Computed omniDRAGON address: ${computedAddress}`)

    // Deploy via CREATE2
    console.log("Deploying omniDRAGON via CREATE2...")
    
    // Check if already deployed
    const codeAtAddress = await ethers.provider.getCode(computedAddress)
    if (codeAtAddress !== '0x') {
        console.log(`omniDRAGON already deployed at ${computedAddress}`)
    } else {
        // Deploy via factory
        const tx = await factoryContract.deploy(deploymentBytecode, salt, "omniDRAGON")
        await tx.wait()
        console.log(`omniDRAGON deployment tx: ${tx.hash}`)
    }
    
    // Save deployment
    await deployments.save("omniDRAGON", {
        address: computedAddress,
        abi: DragonFactory.interface.format("json") as any,
        bytecode: bytecode,
        deployedBytecode: bytecode,
    })

    // Update registry with dragon token address
    const registryContract = await ethers.getContractAt("OmniDragonHybridRegistry", registry.address)
    const chainId = hre.network.config.chainId || 146
    
    console.log(`Updating registry with omniDRAGON address...`)
    
    // Get the current chain config to avoid overwriting existing values
    const currentConfig = await registryContract.getChainConfig(chainId)
    
    // Only update if the chain is already registered
    if (currentConfig.chainId == chainId) {
        await registryContract.updateChain(
            chainId,
            currentConfig.wrappedNativeToken, // Keep existing wrapped native token
            currentConfig.lotteryManager,     // Keep existing lottery manager
            currentConfig.randomnessProvider, // Keep existing randomness provider
            currentConfig.priceOracle,        // Keep existing price oracle
            currentConfig.vrfConsumer,        // Keep existing VRF consumer
            computedAddress,                  // Update dragon token address
            currentConfig.jackpotVault       // Keep existing jackpot vault
        )
    } else {
        console.log(`Chain ${chainId} not registered in registry, skipping update...`)
    }

    const omniDragon = await ethers.getContractAt("omniDRAGON", computedAddress)
    
    // Transfer ownership from factory to deployer
    const currentOwner = await omniDragon.owner()
    if (currentOwner.toLowerCase() !== deployer.toLowerCase()) {
        console.log(`Transferring omniDRAGON ownership from ${currentOwner} to ${deployer}...`)
        // Ownership should already be transferred by the factory during deployment
        console.log(`⚠️  Manual ownership transfer may be required from ${currentOwner}`)
    } else {
        console.log(`✅ omniDRAGON already owned by deployer: ${deployer}`)
    }
    
    // Check if this is Sonic chain (for initial mint)
    if (chainId === 146) {
        console.log("✅ omniDRAGON deployed on Sonic with initial supply of 6,942,000 DRAGON")
        const balance = await omniDragon.balanceOf(deployer)
        console.log(`Deployer balance: ${ethers.utils.formatEther(balance)} DRAGON`)
    } else {
        console.log("✅ omniDRAGON deployed on " + hre.network.name + " with 0 initial supply")
        console.log("Tokens will be bridged from Sonic via LayerZero")
    }

    console.log(`\n📝 Contract details:`)
    console.log(`Name: ${await omniDragon.name()}`)
    console.log(`Symbol: ${await omniDragon.symbol()}`)
    console.log(`Total Supply: ${ethers.utils.formatEther(await omniDragon.totalSupply())} DRAGON`)
    console.log(`Address: ${computedAddress}`)
}

export default func
func.tags = ["OmniDRAGON"]
func.dependencies = ["Registry"] 