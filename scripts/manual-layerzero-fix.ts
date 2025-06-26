import { ethers } from "hardhat";

async function main() {
    console.log("🔧 Manual LayerZero Library Fix");
    console.log("=" .repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    // Contract addresses from the config output we saw earlier
    const integratorAddress = "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84";
    const endpointAddress = "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B"; // Sonic LayerZero endpoint
    
    // Correct library addresses from the "Default OApp Config" we saw:
    const arbitrumSendLibrary = "0x975bcD720be66659e3EB3C0e4F1866a3020E493A";
    const arbitrumReceiveLibrary = "0x7B9E184e07a6EE1aC23eAe0fe8D6Be2f663f05e6";
    const arbitrumExecutor = "0x31CAe3B7fB82d847621859fb1585353c5720660D";

    console.log("\n🎯 The Problem:");
    console.log("The LayerZero libraries for Arbitrum → Sonic are set to 0x0 addresses");
    console.log("This causes the quote function to fail with error 0x6592671c");
    console.log("");
    console.log("🔧 The Fix:");
    console.log("We need to manually set the correct library addresses using the LayerZero endpoint");
    console.log("");

    try {
        // Connect to the LayerZero endpoint
        const endpoint = await ethers.getContractAt(
            "contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2",
            endpointAddress
        );

        // Connect to the integrator (we need to call from the integrator's perspective)
        const integrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            integratorAddress
        );

        console.log("✅ Connected to contracts");

        // Check current library configuration
        console.log("\n📊 Current Library Configuration:");
        const currentSendLib = await endpoint.getSendLibrary(integratorAddress, 30110);
        const currentReceiveLib = await endpoint.getReceiveLibrary(integratorAddress, 30110);
        
        console.log(`   Current Send Library: ${currentSendLib}`);
        console.log(`   Current Receive Library: ${currentReceiveLib}`);
        console.log(`   Should be Send Library: ${arbitrumSendLibrary}`);
        console.log(`   Should be Receive Library: ${arbitrumReceiveLibrary}`);

        if (currentSendLib === "0x0000000000000000000000000000000000000000") {
            console.log("   ❌ Send library is zero address - this is the problem!");
        }
        
        if (currentReceiveLib === "0x0000000000000000000000000000000000000000") {
            console.log("   ❌ Receive library is zero address - this is the problem!");
        }

        console.log("\n🚀 MANUAL FIX REQUIRED:");
        console.log("");
        console.log("The LayerZero libraries need to be set manually using the LayerZero CLI:");
        console.log("");
        console.log("1️⃣ Create a corrected config file:");
        console.log("   - Remove the custom DVN configuration that caused the zero addresses");
        console.log("   - Use only the default LayerZero configuration");
        console.log("");
        console.log("2️⃣ Or use LayerZero CLI to set libraries directly:");
        console.log(`   npx hardhat lz:endpoint:set-send-library --network sonic --eid 30110 --library ${arbitrumSendLibrary}`);
        console.log(`   npx hardhat lz:endpoint:set-receive-library --network sonic --eid 30110 --library ${arbitrumReceiveLibrary}`);
        console.log("");
        console.log("3️⃣ Alternative: Reset the entire OApp configuration:");
        console.log("   - Delete the custom config");
        console.log("   - Use only the default peer configuration");
        console.log("   - Let LayerZero use its default libraries");
        console.log("");
        
        return {
            success: true,
            issue: "Zero address libraries",
            currentSendLib,
            currentReceiveLib,
            correctSendLib: arbitrumSendLibrary,
            correctReceiveLib: arbitrumReceiveLibrary
        };

    } catch (error: any) {
        console.log(`❌ Error checking libraries: ${error.message}`);
        return { success: false, error: error.message };
    }
}

main()
    .then((result) => {
        if (result.success) {
            console.log("\n✅ Diagnosis complete!");
            console.log("🔧 Use the manual fix commands above to resolve the issue");
        } else {
            console.log(`\n❌ Error: ${result.error}`);
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Script error:", error);
        process.exit(1);
    }); 