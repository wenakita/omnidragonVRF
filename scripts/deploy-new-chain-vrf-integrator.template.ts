import { ethers } from "hardhat";

/**
 * Template script to deploy ChainlinkVRFIntegratorV2_5 on a new chain
 * 
 * INSTRUCTIONS:
 * 1. Copy this file to scripts/deploy-[CHAIN_NAME]-vrf-integrator.ts
 * 2. Update the configuration below for your target chain
 * 3. Run: npx hardhat run scripts/deploy-[CHAIN_NAME]-vrf-integrator.ts --network [CHAIN_NAME]
 */

// 🔧 CHAIN-SPECIFIC CONFIGURATION
const CHAIN_CONFIG = {
    // Update these for your target chain
    CHAIN_NAME: "POLYGON",                    // Human readable name
    CHAIN_EID: 30109,                        // LayerZero V2 Endpoint ID
    ARBITRUM_CONSUMER: "0xfc1f46fd517ed4193D605c59a4B27b5375457cE1", // Your Arbitrum VRF Consumer
    
    // LayerZero V2 Endpoint on target chain (find at: https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts)
    LAYERZERO_ENDPOINT: "0x1a44076050125825900e736c501f859c50fE728c", // Polygon endpoint
    
    // Contract deployment settings
    GAS_LIMIT: 600000,                       // Gas limit for responses from this chain
    INITIAL_FUNDING: "0.05"                  // ETH to fund the integrator
};

async function deployNewChainVRFIntegrator() {
    console.log(`🚀 Deploying VRF Integrator on ${CHAIN_CONFIG.CHAIN_NAME}`);
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer address:", deployer.address);
    console.log("💰 Deployer balance:", ethers.utils.formatEther(await deployer.provider!.getBalance(deployer.address)), "ETH");

    // Deploy ChainlinkVRFIntegratorV2_5
    console.log(`\n🏗️ Deploying ChainlinkVRFIntegratorV2_5 on ${CHAIN_CONFIG.CHAIN_NAME}...`);
    
    const VRFIntegratorFactory = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
    
    const vrfIntegrator = await VRFIntegratorFactory.deploy(
        CHAIN_CONFIG.LAYERZERO_ENDPOINT,     // LayerZero endpoint on target chain
        deployer.address                     // Owner
    );

    await vrfIntegrator.deployed();
    const integratorAddress = vrfIntegrator.address;
    
    console.log(`✅ ChainlinkVRFIntegratorV2_5 deployed to: ${integratorAddress}`);

    // Fund the integrator
    console.log(`\n💰 Funding integrator with ${CHAIN_CONFIG.INITIAL_FUNDING} ETH...`);
    const fundTx = await vrfIntegrator.fundContract({ 
        value: ethers.utils.parseEther(CHAIN_CONFIG.INITIAL_FUNDING) 
    });
    await fundTx.wait();
    console.log("✅ Integrator funded!");

    // Set up peer connection to Arbitrum VRF Consumer
    console.log("\n🔗 Setting up peer connection to Arbitrum VRF Consumer...");
    const setPeerTx = await vrfIntegrator.setPeer(
        30110,                               // Arbitrum EID
        ethers.utils.hexZeroPad(CHAIN_CONFIG.ARBITRUM_CONSUMER, 32) // Arbitrum VRF Consumer address
    );
    await setPeerTx.wait();
    console.log("✅ Peer connection set!");

    // Display configuration info
    console.log("\n📊 Deployment Summary:");
    console.log(`  Chain: ${CHAIN_CONFIG.CHAIN_NAME} (EID: ${CHAIN_CONFIG.CHAIN_EID})`);
    console.log(`  VRF Integrator: ${integratorAddress}`);
    console.log(`  LayerZero Endpoint: ${CHAIN_CONFIG.LAYERZERO_ENDPOINT}`);
    console.log(`  Arbitrum Consumer: ${CHAIN_CONFIG.ARBITRUM_CONSUMER}`);
    console.log(`  Owner: ${deployer.address}`);

    console.log("\n🎯 Next Steps:");
    console.log("1. Add chain support to Arbitrum VRF Consumer:");
    console.log(`   await vrfConsumer.setSupportedChain(${CHAIN_CONFIG.CHAIN_EID}, true, ${CHAIN_CONFIG.GAS_LIMIT});`);
    console.log("\n2. Set peer on Arbitrum VRF Consumer:");
    console.log(`   await vrfConsumer.setPeer(${CHAIN_CONFIG.CHAIN_EID}, "${integratorAddress}");`);
    console.log("\n3. Configure LayerZero DVN settings");
    console.log("4. Test VRF request flow");

    console.log("\n🧪 Test Command:");
    console.log(`   await ${CHAIN_CONFIG.CHAIN_NAME.toLowerCase()}Integrator.requestRandomWords();`);

    return {
        integratorAddress,
        chainEid: CHAIN_CONFIG.CHAIN_EID,
        chainName: CHAIN_CONFIG.CHAIN_NAME
    };
}

/**
 * Function to add this chain to the Arbitrum VRF Consumer
 * Run this after deploying the integrator
 */
async function addChainToArbitrumConsumer(integratorAddress: string) {
    console.log(`\n🌐 Adding ${CHAIN_CONFIG.CHAIN_NAME} support to Arbitrum VRF Consumer...`);
    
    // Connect to Arbitrum VRF Consumer (you'll need to run this on Arbitrum network)
    const vrfConsumer = await ethers.getContractAt(
        "OmniDragonVRFConsumerV2_5",
        CHAIN_CONFIG.ARBITRUM_CONSUMER
    );

    try {
        // Add chain support
        const addChainTx = await vrfConsumer.addNewChain(
            CHAIN_CONFIG.CHAIN_EID,
            CHAIN_CONFIG.CHAIN_NAME,
            CHAIN_CONFIG.GAS_LIMIT
        );
        await addChainTx.wait();
        console.log(`✅ ${CHAIN_CONFIG.CHAIN_NAME} support added to VRF Consumer!`);

        // Set peer connection
        const setPeerTx = await vrfConsumer.setPeer(
            CHAIN_CONFIG.CHAIN_EID,
            ethers.utils.hexZeroPad(integratorAddress, 32)
        );
        await setPeerTx.wait();
        console.log(`✅ Peer connection set on VRF Consumer!`);

    } catch (error: any) {
        console.log("❌ Error configuring Arbitrum consumer:", error.message);
        console.log("💡 You may need to run this step manually on Arbitrum network");
    }
}

// Export for use in other scripts
export { deployNewChainVRFIntegrator, addChainToArbitrumConsumer, CHAIN_CONFIG };

// Run if called directly
if (require.main === module) {
    deployNewChainVRFIntegrator()
        .then((result) => {
            console.log(`\n🎉 ${result.chainName} VRF Integrator deployment complete!`);
            console.log(`📋 Save this address: ${result.integratorAddress}`);
            process.exit(0);
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
} 