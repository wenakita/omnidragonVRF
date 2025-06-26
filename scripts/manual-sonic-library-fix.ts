import { ethers } from "hardhat";

/**
 * Manually fix the failed send library configuration for Sonic → Arbitrum
 * The LayerZero wire command failed on this specific transaction
 */

const CONTRACTS = {
    SONIC_INTEGRATOR: "0x89Ce5E25d8c635Bd41E5Ee33bF7c63DC50A3F0fb",
    ARBITRUM_CONSUMER: "0xD192343D5E351C983F6613e6d7c5c33f62C0eea4"
};

const OFFICIAL_CONFIG = {
    SONIC_LZ_ENDPOINT: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B",
    SONIC_SEND_ULN302: "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7"
};

const CHAIN_EIDS = {
    ARBITRUM: 30110
};

async function manualSonicLibraryFix() {
    console.log("🔧 Manual Fix for Sonic Send Library Configuration");
    console.log("Attempting to set the library that failed in LayerZero wire");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    // Connect to LayerZero endpoint directly
    console.log("\n🔗 Connecting to LayerZero Endpoint...");
    const endpoint = await ethers.getContractAt(
        "contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2",
        OFFICIAL_CONFIG.SONIC_LZ_ENDPOINT
    );

    console.log("✅ Connected to endpoint:", OFFICIAL_CONFIG.SONIC_LZ_ENDPOINT);

    // Check current send library
    console.log("\n🔍 Checking Current Send Library...");
    try {
        const currentSendLib = await endpoint.getSendLibrary(
            CONTRACTS.SONIC_INTEGRATOR,
            CHAIN_EIDS.ARBITRUM
        );
        console.log("📚 Current send library:", currentSendLib);
        console.log("🎯 Target send library:", OFFICIAL_CONFIG.SONIC_SEND_ULN302);
        console.log("✅ Libraries match:", currentSendLib.toLowerCase() === OFFICIAL_CONFIG.SONIC_SEND_ULN302.toLowerCase());
        
        if (currentSendLib.toLowerCase() === OFFICIAL_CONFIG.SONIC_SEND_ULN302.toLowerCase()) {
            console.log("🎉 Send library is already correctly configured!");
            return await testQuoteFunction();
        }
    } catch (error: any) {
        console.log("⚠️ Could not check current library:", error.message);
    }

    // Try to set the send library manually
    console.log("\n🔧 Attempting Manual Send Library Configuration...");
    try {
        const setSendLibTx = await endpoint.setSendLibrary(
            CONTRACTS.SONIC_INTEGRATOR,
            CHAIN_EIDS.ARBITRUM,
            OFFICIAL_CONFIG.SONIC_SEND_ULN302,
            { gasLimit: 500000 }
        );
        
        console.log("⏳ Setting send library...");
        await setSendLibTx.wait();
        console.log("✅ Send library set successfully!");
        console.log("📋 Transaction:", setSendLibTx.hash);
        
    } catch (error: any) {
        console.log("❌ Failed to set send library:", error.message);
        if (error.message.includes("0xc4c52593")) {
            console.log("🚨 Same error as LayerZero wire - permission issue");
        }
        return false;
    }

    // Test quote function after fix
    return await testQuoteFunction();
}

async function testQuoteFunction() {
    console.log("\n🧪 Testing Quote Function...");
    
    const sonicIntegrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        CONTRACTS.SONIC_INTEGRATOR
    );
    
    const options = "0x00030100110100000000000000000000000000030d40";
    
    try {
        const fee = await sonicIntegrator.quote(CHAIN_EIDS.ARBITRUM, options);
        console.log("✅ Quote successful!");
        console.log("💰 Native fee:", ethers.utils.formatEther(fee.nativeFee), "ETH");
        console.log("🎯 VRF system is ready!");
        return true;
    } catch (error: any) {
        console.log("❌ Quote still failing:", error.message);
        return false;
    }
}

if (require.main === module) {
    manualSonicLibraryFix()
        .then((success) => {
            if (success) {
                console.log("\n🎉 Manual fix successful!");
            } else {
                console.log("\n❌ Manual fix failed - may need different approach");
            }
        })
        .catch((error) => {
            console.error("❌ Script failed:", error);
            process.exitCode = 1;
        });
} 