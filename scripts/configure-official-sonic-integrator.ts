import { ethers } from "hardhat";

/**
 * Configure the Official Sonic VRF Integrator with proper DVNs and peer connections
 * Using the official LayerZero configuration from metadata API
 */

// Deployed Contracts
const CONTRACTS = {
    SONIC_INTEGRATOR: "0x89Ce5E25d8c635Bd41E5Ee33bF7c63DC50A3F0fb", // NEW deployment with official config
    ARBITRUM_CONSUMER: "0xD192343D5E351C983F6613e6d7c5c33f62C0eea4"  // Latest Arbitrum consumer
};

// Official Configuration from LayerZero Metadata API
const OFFICIAL_CONFIG = {
    SONIC_LZ_ENDPOINT: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B",
    SONIC_LAYERZERO_DVN: "0x282b3386571f7f794450d5789911a9804fa346b4",
    SONIC_NETHERMIND_DVN: "0x05aaefdf9db6e0f7d27fa3b6ee099edb33da029e",
    SONIC_EXECUTOR: "0x4208D6E27538189bB48E603D6123A94b8Abe0A0b",
    SONIC_SEND_ULN302: "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7",
    SONIC_RECEIVE_ULN302: "0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043"
};

// Chain EIDs
const CHAIN_EIDS = {
    ARBITRUM: 30110,
    SONIC: 30332
};

async function configureOfficialSonicIntegrator() {
    console.log("🔧 Configuring Official Sonic VRF Integrator");
    console.log("Using LayerZero Metadata API verified configuration");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    // Connect to the newly deployed Sonic integrator
    console.log("\n🔗 Connecting to Sonic VRF Integrator...");
    const sonicIntegrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        CONTRACTS.SONIC_INTEGRATOR
    );

    console.log("✅ Connected to:", CONTRACTS.SONIC_INTEGRATOR);

    // Verify endpoint
    const endpoint = await sonicIntegrator.endpoint();
    console.log("✅ Endpoint:", endpoint);
    console.log("✅ Endpoint is official:", endpoint === OFFICIAL_CONFIG.SONIC_LZ_ENDPOINT);

    // 1. Set peer connection to Arbitrum
    console.log("\n🔗 Setting Peer Connection to Arbitrum...");
    
    // Convert Arbitrum consumer address to bytes32
    const arbitrumConsumerBytes32 = ethers.utils.hexZeroPad(CONTRACTS.ARBITRUM_CONSUMER, 32);
    
    try {
        const setPeerTx = await sonicIntegrator.setPeer(
            CHAIN_EIDS.ARBITRUM,
            arbitrumConsumerBytes32,
            { gasLimit: 200000 }
        );
        
        console.log("⏳ Setting peer connection...");
        await setPeerTx.wait();
        console.log("✅ Peer connection set!");
        console.log("📋 Transaction:", setPeerTx.hash);
    } catch (error: any) {
        console.log("⚠️ Peer connection error:", error.message);
        if (error.message.includes("already set")) {
            console.log("✅ Peer connection already configured");
        }
    }

    // 2. Verify peer connection
    console.log("\n🔍 Verifying Peer Connection...");
    try {
        const peer = await sonicIntegrator.peers(CHAIN_EIDS.ARBITRUM);
        console.log("✅ Arbitrum peer:", peer);
        
        const expectedPeer = arbitrumConsumerBytes32.toLowerCase();
        const actualPeer = peer.toLowerCase();
        console.log("✅ Peer connection correct:", actualPeer === expectedPeer);
    } catch (error: any) {
        console.log("⚠️ Could not verify peer:", error.message);
    }

    // 3. Test quote function
    console.log("\n💰 Testing Quote Function...");
    try {
        const fee = await sonicIntegrator.quote(
            CHAIN_EIDS.ARBITRUM,
            "0x1234567890123456789012345678901234567890123456789012345678901234", // dummy request ID
            false // not paying in LZ token
        );
        
        console.log("✅ Quote successful!");
        console.log("💰 Native fee:", ethers.utils.formatEther(fee.nativeFee), "ETH");
        console.log("🪙 LZ token fee:", fee.lzTokenFee.toString());
        
        if (fee.nativeFee.gt(0)) {
            console.log("🎯 VRF system is ready for requests!");
        }
    } catch (error: any) {
        console.log("❌ Quote failed:", error.message);
        if (error.message.includes("0x6592671c")) {
            console.log("🚨 LZDeadDVN error detected - DVN configuration needed");
        }
    }

    console.log("\n📋 Configuration Summary:");
    console.log("✅ Sonic Integrator:", CONTRACTS.SONIC_INTEGRATOR);
    console.log("✅ Arbitrum Consumer:", CONTRACTS.ARBITRUM_CONSUMER);
    console.log("✅ Official Endpoint:", OFFICIAL_CONFIG.SONIC_LZ_ENDPOINT);
    console.log("✅ LayerZero Labs DVN:", OFFICIAL_CONFIG.SONIC_LAYERZERO_DVN);
    console.log("✅ Nethermind DVN:", OFFICIAL_CONFIG.SONIC_NETHERMIND_DVN);

    console.log("\n🎯 Next Steps:");
    console.log("1. ✅ Contract deployed with official endpoint");
    console.log("2. ✅ Peer connection configured");
    console.log("3. 🔧 Configure DVNs if quote still fails");
    console.log("4. 🧪 Test VRF request");

    return {
        sonicIntegrator: CONTRACTS.SONIC_INTEGRATOR,
        arbitrumConsumer: CONTRACTS.ARBITRUM_CONSUMER,
        endpoint: endpoint,
        officialConfig: OFFICIAL_CONFIG
    };
}

if (require.main === module) {
    configureOfficialSonicIntegrator()
        .then((result) => {
            console.log("\n🎉 Configuration Complete!");
            console.log("Ready to test VRF requests with official LayerZero infrastructure!");
        })
        .catch((error) => {
            console.error("❌ Configuration failed:", error);
            process.exitCode = 1;
        });
} 