const { ethers } = require("hardhat");
const fs = require("fs");

// Constants to reduce duplications
const FEEM_REGISTRATION_ID = 143;  // Single ID for both contracts
const SONIC_CHAIN_ID = 146;
const ARBITRUM_CHAIN_ID = 42161;
const AVALANCHE_CHAIN_ID = 43114;

// Helper function to get network name
function getNetworkName(chainId) {
    switch (chainId) {
        case SONIC_CHAIN_ID: return "sonic";
        case ARBITRUM_CHAIN_ID: return "arbitrum";
        case AVALANCHE_CHAIN_ID: return "avalanche";
        default: return "unknown";
    }
}

// Helper function to check if Sonic chain
function isSonicChain(chainId) {
    return chainId === SONIC_CHAIN_ID;
}

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying OmniDragon ecosystem with account:", deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()));

    const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
    const networkName = getNetworkName(chainId);
    const isOnSonic = isSonicChain(chainId);
    
    console.log(`Chain ID: ${chainId} (${networkName})`);

    console.log("\n🚀 Starting OmniDragon Ecosystem Deployment...");
    
    // Step 1: Deploy OmniDragonHybridRegistry
    console.log("\n📋 Deploying OmniDragonHybridRegistry...");
    const RegistryFactory = await ethers.getContractFactory("OmniDragonHybridRegistry");
    const registry = await RegistryFactory.deploy(deployer.address);
    await registry.deployed();
    console.log("✅ Registry deployed at:", registry.address);

    // Step 2: Deploy omniDRAGON token
    console.log("\n🐉 Deploying omniDRAGON token...");
    const DragonFactory = await ethers.getContractFactory("omniDRAGON");
    const omniDragon = await DragonFactory.deploy(
        "Dragon",               // name
        "DRAGON",               // symbol
        registry.address,       // delegate (registry address)
        registry.address,       // registry address - Note: Currently same as delegate
        deployer.address        // owner
    );
    await omniDragon.deployed();
    console.log("✅ omniDRAGON deployed at:", omniDragon.address);
    
    // FeeM registration notification
    if (isOnSonic) {
        console.log(`📝 omniDRAGON registered with FeeM ID: ${FEEM_REGISTRATION_ID}`);
    }

    // Step 3: Deploy DragonFeeMHelper (only on Sonic chain)
    let feeMHelper = null;
    if (isOnSonic) {
        console.log("\n💰 Deploying DragonFeeMHelper...");
        const FeeMHelperFactory = await ethers.getContractFactory("DragonFeeMHelper");
        feeMHelper = await FeeMHelperFactory.deploy(
            registry.address,          // registry
            FEEM_REGISTRATION_ID,      // FeeM registration ID (same as main contract)
            deployer.address           // owner
        );
        await feeMHelper.deployed();
        console.log("✅ DragonFeeMHelper deployed at:", feeMHelper.address);
        console.log(`📝 DragonFeeMHelper registered with FeeM ID: ${FEEM_REGISTRATION_ID}`);
    } else {
        console.log("\n⏭️ Skipping DragonFeeMHelper (not on Sonic chain)");
    }

    // Save deployment addresses
    const deploymentInfo = {
        network: networkName,
        chainId: chainId,
        timestamp: new Date().toISOString(),
        contracts: {
            OmniDragonHybridRegistry: {
                address: registry.address,
                txHash: registry.deployTransaction.hash
            },
            omniDRAGON: {
                address: omniDragon.address,
                txHash: omniDragon.deployTransaction.hash,
                feeMRegistrationId: isOnSonic ? FEEM_REGISTRATION_ID : null
            },
            ...(feeMHelper && {
                DragonFeeMHelper: {
                    address: feeMHelper.address,
                    txHash: feeMHelper.deployTransaction.hash,
                    feeMRegistrationId: FEEM_REGISTRATION_ID
                }
            })
        },
        deployer: deployer.address
    };

    const filename = `deployment_${chainId}_${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));

    console.log("\n🎉 Deployment Summary:");
    console.log("=".repeat(50));
    console.log(`Network: ${networkName} (${chainId})`);
    console.log(`Registry: ${registry.address}`);
    console.log(`omniDRAGON: ${omniDragon.address}`);
    if (feeMHelper) {
        console.log(`DragonFeeMHelper: ${feeMHelper.address}`);
    }
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Results saved to: ${filename}`);

    // Verification instructions
    console.log("\n📋 Next Steps:");
    console.log("1. Verify contracts on block explorer");
    console.log("2. Configure chain settings in registry");
    console.log("3. Set up LP manager and other ecosystem contracts");
    
    if (isOnSonic) {
        console.log("4. Monitor FeeM revenue in both contracts");
        console.log(`   - Both contracts use FeeM ID: ${FEEM_REGISTRATION_ID}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });