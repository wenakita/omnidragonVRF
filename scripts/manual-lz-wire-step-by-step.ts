import { ethers } from "hardhat";

/**
 * Manual LayerZero Configuration - Step by Step
 * Bypass the lz:oapp:wire command and configure each component manually
 * This helps isolate which specific step is causing the 0xc4c52593 error
 */

const CONTRACTS = {
    SONIC_INTEGRATOR: "0x5aCd5D42605b925CEF3d8DdD9e83545E708904B4",
    ARBITRUM_CONSUMER: "0x1aFF9b2bCDe8a9c29d598c40558a23b61be78551"
};

const CHAIN_EIDS = {
    SONIC: 30332,
    ARBITRUM: 30110
};

const ENDPOINTS = {
    SONIC: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B",
    ARBITRUM: "0x1a44076050125825900e736c501f859c50fE728c"
};

const LIBRARIES = {
    SONIC: {
        SEND_ULN: "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7",
        RECEIVE_ULN: "0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043"
    },
    ARBITRUM: {
        SEND_ULN: "0x975bcD720be66659e3EB3C0e4F1866a3020E493A",
        RECEIVE_ULN: "0x7B9E184e07a6EE1aC23eAe0fe8D6Be2f663f05e6"
    }
};

async function manualLayerZeroConfiguration() {
    console.log("🔧 Manual LayerZero Configuration - Step by Step");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");

    // Connect to contracts
    const sonicIntegrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        CONTRACTS.SONIC_INTEGRATOR
    );

    const arbitrumConsumer = await ethers.getContractAt(
        "OmniDragonVRFConsumerV2_5", 
        CONTRACTS.ARBITRUM_CONSUMER
    );

    console.log("\n🔗 Connected to contracts:");
    console.log("   Sonic Integrator:", CONTRACTS.SONIC_INTEGRATOR);
    console.log("   Arbitrum Consumer:", CONTRACTS.ARBITRUM_CONSUMER);

    // Step 1: Set Peer Connections
    console.log("\n📡 Step 1: Setting Peer Connections");
    
    try {
        // Sonic → Arbitrum peer
        const sonicPeerTx = await sonicIntegrator.setPeer(
            CHAIN_EIDS.ARBITRUM,
            ethers.utils.hexZeroPad(CONTRACTS.ARBITRUM_CONSUMER, 32),
            { gasLimit: 200000, gasPrice: ethers.utils.parseUnits("100", "gwei") }
        );
        console.log("✅ Sonic → Arbitrum peer set:", sonicPeerTx.hash);
        await sonicPeerTx.wait();

        // Arbitrum → Sonic peer  
        const arbitrumPeerTx = await arbitrumConsumer.setPeer(
            CHAIN_EIDS.SONIC,
            ethers.utils.hexZeroPad(CONTRACTS.SONIC_INTEGRATOR, 32),
            { gasLimit: 200000 }
        );
        console.log("✅ Arbitrum → Sonic peer set:", arbitrumPeerTx.hash);
        await arbitrumPeerTx.wait();

    } catch (error: any) {
        console.log("❌ Peer connection failed:", error.message);
        return;
    }

    // Step 2: Check current library configurations
    console.log("\n📚 Step 2: Checking Current Library Configurations");
    
    const sonicEndpoint = await ethers.getContractAt("ILayerZeroEndpointV2", ENDPOINTS.SONIC);
    const arbitrumEndpoint = await ethers.getContractAt("ILayerZeroEndpointV2", ENDPOINTS.ARBITRUM);

    try {
        const sonicSendLib = await sonicEndpoint.getSendLibrary(CONTRACTS.SONIC_INTEGRATOR, CHAIN_EIDS.ARBITRUM);
        console.log("📖 Sonic → Arbitrum Send Library:", sonicSendLib);

        const arbitrumSendLib = await arbitrumEndpoint.getSendLibrary(CONTRACTS.ARBITRUM_CONSUMER, CHAIN_EIDS.SONIC);
        console.log("📖 Arbitrum → Sonic Send Library:", arbitrumSendLib);

    } catch (error: any) {
        console.log("❌ Library check failed:", error.message);
    }

    // Step 3: Try setting send library manually (the problematic step)
    console.log("\n⚠️  Step 3: Attempting Manual Send Library Configuration");
    console.log("This is where the 0xc4c52593 error typically occurs...");

    try {
        console.log("🔄 Attempting to set Sonic → Arbitrum send library...");
        
        // Try with higher gas limit and different approach
        const setSendLibTx = await sonicEndpoint.setSendLibrary(
            CONTRACTS.SONIC_INTEGRATOR,
            CHAIN_EIDS.ARBITRUM,
            LIBRARIES.SONIC.SEND_ULN,
            {
                gasLimit: 1000000, // Much higher gas limit
                gasPrice: ethers.utils.parseUnits("100", "gwei")
            }
        );

        console.log("✅ Send library transaction sent:", setSendLibTx.hash);
        const receipt = await setSendLibTx.wait();
        console.log("✅ Send library set successfully! Gas used:", receipt.gasUsed.toString());

    } catch (error: any) {
        console.log("❌ Send library configuration failed:", error.message);
        console.log("📋 Error code:", error.code);
        console.log("📋 Error data:", error.data);
        
        // Try to decode the error
        if (error.data === "0xc4c52593") {
            console.log("🔍 This is the same 0xc4c52593 error we've been seeing!");
            console.log("💡 Possible causes:");
            console.log("   - Library address is incorrect");
            console.log("   - Contract doesn't have permission");
            console.log("   - Configuration conflict");
            console.log("   - LayerZero infrastructure issue");
        }
    }

    console.log("\n📊 Configuration Summary:");
    console.log("✅ Peer connections: Working");
    console.log("📋 Send library configuration: Check logs above for status");
}

// Run the manual configuration
if (require.main === module) {
    manualLayerZeroConfiguration()
        .then(() => {
            console.log("\n🎉 Manual configuration attempt completed!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Manual configuration failed:", error);
            process.exit(1);
        });
}

export { manualLayerZeroConfiguration }; 