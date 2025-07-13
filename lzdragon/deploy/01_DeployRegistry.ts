import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, ethers } = hre
    const { execute, getOrNull } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`\n--- Deploying OmniDragonHybridRegistry on ${hre.network.name} ---`)
    console.log(`Deployer: ${deployer}`)

    // CREATE2 Factory address (same on all chains)
    const CREATE2_FACTORY_ADDRESS = "0xAA28020DDA6b954D16208eccF873D79AC6533833"
    
    // Get the factory contract
    const factoryContract = await ethers.getContractAt("CREATE2FactoryWithOwnership", CREATE2_FACTORY_ADDRESS)
    
    // Check if registry already exists
    const existingRegistry = await getOrNull("OmniDragonHybridRegistry")
    if (existingRegistry) {
        console.log(`Registry already deployed at: ${existingRegistry.address}`)
        return
    }

    // Deploy OmniDragonHybridRegistry via CREATE2
    // Using vanity salt to get address 0x69092c4af14b13ae15e1bf822bc38b072ee1d777
    const salt = "0x8b1e85e5301fe0d9fe499daa95956af04e5d37eeee55aa914f2a514ef517239c"
    
    // Get the contract factory
    const RegistryFactory = await ethers.getContractFactory("OmniDragonHybridRegistry")
    const bytecode = RegistryFactory.bytecode
    // IMPORTANT: Using factory address as constructor argument to match vanity address calculation
    const constructorArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [CREATE2_FACTORY_ADDRESS]
    )
    const deploymentBytecode = bytecode + constructorArgs.slice(2)
    
    // Calculate deployment address
    const computedAddress = ethers.utils.getCreate2Address(
        CREATE2_FACTORY_ADDRESS,
        salt,
        ethers.utils.keccak256(deploymentBytecode)
    )
    console.log(`Computed registry address: ${computedAddress}`)

    // Deploy via CREATE2
    console.log("Deploying registry via CREATE2...")
    
    // Check if already deployed
    const codeAtAddress = await ethers.provider.getCode(computedAddress)
    if (codeAtAddress !== '0x') {
        console.log(`Registry already deployed at ${computedAddress}`)
    } else {
        // Deploy via factory
        const tx = await factoryContract.deploy(deploymentBytecode, salt, "OmniDragonHybridRegistry")
        await tx.wait()
        console.log(`Registry deployment tx: ${tx.hash}`)
    }
    
    // Save deployment
    await deployments.save("OmniDragonHybridRegistry", {
        address: computedAddress,
        abi: RegistryFactory.interface.format("json") as any,
        bytecode: bytecode,
        deployedBytecode: bytecode,
    })

    // Get registry contract
    const registry = await ethers.getContractAt("OmniDragonHybridRegistry", computedAddress)
    
    // Check ownership (factory may have already transferred it)
    const currentOwner = await registry.owner()
    if (currentOwner.toLowerCase() !== deployer.toLowerCase()) {
        console.log(`Transferring ownership from ${currentOwner} to ${deployer}...`)
        // This would need to be done by the current owner
        console.log(`⚠️  Manual ownership transfer required from ${currentOwner}`)
    } else {
        console.log(`✅ Registry already owned by deployer: ${deployer}`)
    }
    
    // Set current chain ID in registry
    const chainId = hre.network.config.chainId || 146 // Default to Sonic
    
    console.log(`Setting current chain ID to: ${chainId}`)
    await registry.setCurrentChainId(chainId)

    // Register chain configuration
    const chainConfigs: Record<number, { name: string; wrappedNative: string }> = {
        146: { // Sonic
            name: "Sonic",
            wrappedNative: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38", // Wrapped S
        },
        42161: { // Arbitrum
            name: "Arbitrum",
            wrappedNative: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
        },
        43114: { // Avalanche
            name: "Avalanche",
            wrappedNative: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
        }
    }

    if (chainConfigs[chainId]) {
        const config = chainConfigs[chainId]
        console.log(`Registering ${config.name} chain configuration...`)
        await registry.registerChain(
            chainId,
            config.name,
            config.wrappedNative,
            ethers.constants.AddressZero, // lotteryManager (will be set later)
            ethers.constants.AddressZero, // randomnessProvider
            ethers.constants.AddressZero, // priceOracle
            ethers.constants.AddressZero, // vrfConsumer
            ethers.constants.AddressZero, // dragonToken (will be set after deployment)
            ethers.constants.AddressZero  // jackpotVault
        )
    }

    console.log(`✅ Registry deployed and configured at: ${computedAddress}`)
}

export default func
func.tags = ["Registry"]
func.dependencies = [] 