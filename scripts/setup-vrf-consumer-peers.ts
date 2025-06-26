import { ethers } from "hardhat";

/**
 * Set up peer connections for the Multi-Chain VRF Consumer
 * This connects the Arbitrum VRF Consumer with existing VRF Integrators
 */

const CONTRACTS = {
    // Multi-Chain VRF Consumer on Arbitrum
    ARBITRUM_CONSUMER: "0xD192343D5E351C983F6613e6d7c5c33f62C0eea4",
    
    // Existing VRF Integrators
    SONIC_INTEGRATOR: "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84",
    AVALANCHE_INTEGRATOR: "0xeFF1059a680388419F920748e7c9a0a9a80EfE11",
};

const CHAIN_EIDS = {
    ARBITRUM: 30110,
    SONIC: 30332,
    AVALANCHE: 30106,
};

async function setupVRFConsumerPeers() {
    console.log("🔗 Setting up Multi-Chain VRF Consumer Peer Connections");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    // Connect to the VRF Consumer on Arbitrum
    console.log("\n🏗️ Connecting to Arbitrum VRF Consumer...");
    const vrfConsumer = await ethers.getContractAt(
        "OmniDragonVRFConsumerV2_5",
        CONTRACTS.ARBITRUM_CONSUMER
    );

    console.log(`✅ Connected to VRF Consumer: ${CONTRACTS.ARBITRUM_CONSUMER}`);

    // Set up peer connections
    console.log("\n🌐 Setting up peer connections...");

    // 1. Set Sonic peer on Arbitrum VRF Consumer
    console.log("1️⃣ Setting Sonic peer on Arbitrum VRF Consumer...");
    try {
        const sonicPeerTx = await vrfConsumer.setPeer(
            CHAIN_EIDS.SONIC,
            ethers.utils.hexZeroPad(CONTRACTS.SONIC_INTEGRATOR, 32)
        );
        await sonicPeerTx.wait();
        console.log(`   ✅ Sonic peer set: ${CONTRACTS.SONIC_INTEGRATOR}`);
    } catch (error: any) {
        console.log(`   ❌ Error setting Sonic peer: ${error.message}`);
    }

    // 2. Set Avalanche peer on Arbitrum VRF Consumer  
    console.log("2️⃣ Setting Avalanche peer on Arbitrum VRF Consumer...");
    try {
        const avalanchePeerTx = await vrfConsumer.setPeer(
            CHAIN_EIDS.AVALANCHE,
            ethers.utils.hexZeroPad(CONTRACTS.AVALANCHE_INTEGRATOR, 32)
        );
        await avalanchePeerTx.wait();
        console.log(`   ✅ Avalanche peer set: ${CONTRACTS.AVALANCHE_INTEGRATOR}`);
    } catch (error: any) {
        console.log(`   ❌ Error setting Avalanche peer: ${error.message}`);
    }

    // 3. Check current peer connections
    console.log("\n📊 Verifying peer connections...");
    try {
        const sonicPeer = await vrfConsumer.peers(CHAIN_EIDS.SONIC);
        const avalanchePeer = await vrfConsumer.peers(CHAIN_EIDS.AVALANCHE);
        
        console.log(`   Sonic (${CHAIN_EIDS.SONIC}): ${sonicPeer}`);
        console.log(`   Avalanche (${CHAIN_EIDS.AVALANCHE}): ${avalanchePeer}`);
    } catch (error: any) {
        console.log(`   ❌ Error checking peers: ${error.message}`);
    }

    // 4. Check supported chains
    console.log("\n🌐 Checking supported chains...");
    try {
        const [eids, supported, gasLimits] = await vrfConsumer.getSupportedChains();
        
        console.log("   Supported Chains:");
        const chainNames = ["Ethereum", "BSC", "Avalanche", "Polygon", "Optimism", "Base"];
        
        for (let i = 0; i < Math.min(eids.length, chainNames.length); i++) {
            const status = supported[i] ? "✅ Supported" : "❌ Not Supported";
            console.log(`     ${chainNames[i]} (${eids[i]}): ${status} - Gas: ${gasLimits[i]}`);
        }
    } catch (error: any) {
        console.log(`   ❌ Error checking supported chains: ${error.message}`);
    }

    // 5. Fund the contract for LayerZero fees
    console.log("\n💰 Funding VRF Consumer for LayerZero fees...");
    try {
        const fundTx = await vrfConsumer.fundContract({
            value: ethers.utils.parseEther("0.05")
        });
        await fundTx.wait();
        console.log("   ✅ Contract funded with 0.05 ETH");
    } catch (error: any) {
        console.log(`   ❌ Error funding contract: ${error.message}`);
    }

    console.log("\n🎯 Next Steps:");
    console.log("1. Set reverse peer connections on Sonic and Avalanche integrators:");
    console.log(`   - Sonic: setPeer(${CHAIN_EIDS.ARBITRUM}, "${CONTRACTS.ARBITRUM_CONSUMER}")`);
    console.log(`   - Avalanche: setPeer(${CHAIN_EIDS.ARBITRUM}, "${CONTRACTS.ARBITRUM_CONSUMER}")`);
    console.log("2. Configure LayerZero DVN settings");
    console.log("3. Test VRF requests from multiple chains");

    console.log("\n📋 Multi-Chain VRF Architecture:");
    console.log("┌─────────────┐    ┌─────────────────┐    ┌─────────────┐");
    console.log("│    Sonic    │───▶│ Arbitrum VRF    │───▶│  Avalanche  │");
    console.log("│ Integrator  │◀───│   Consumer      │◀───│ Integrator  │");
    console.log("└─────────────┘    └─────────────────┘    └─────────────┘");
    console.log("                           │");
    console.log("                           ▼");
    console.log("                   Chainlink VRF 2.5");

    return {
        consumerAddress: CONTRACTS.ARBITRUM_CONSUMER,
        peersSet: true
    };
}

// Export for use in other scripts
export { setupVRFConsumerPeers, CONTRACTS, CHAIN_EIDS };

// Run if called directly
if (require.main === module) {
    setupVRFConsumerPeers()
        .then((result) => {
            console.log(`\n🎉 VRF Consumer peer setup complete!`);
            console.log(`📋 Consumer: ${result.consumerAddress}`);
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Error:", error);
            process.exit(1);
        });
} 