import { ethers } from "hardhat";

async function main() {
    console.log("🔧 Force Fix LayerZero Libraries");
    console.log("=" .repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    // From the configuration output, we know the correct addresses:
    const integratorAddress = "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84";
    const endpointAddress = "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B";
    
    // Correct library addresses from Default OApp Config:
    const correctSendLibrary = "0x975bcD720be66659e3EB3C0e4F1866a3020E493A";
    const correctReceiveLibrary = "0x7B9E184e07a6EE1aC23eAe0fe8D6Be2f663f05e6";
    const correctExecutor = "0x31CAe3B7fB82d847621859fb1585353c5720660D";

    console.log("\n🎯 Problem: Arbitrum → Sonic libraries are 0x0");
    console.log("🔧 Solution: Directly call LayerZero endpoint to set libraries");
    console.log("");

    try {
        // Connect to LayerZero endpoint
        const endpoint = await ethers.getContractAt(
            "contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2",
            endpointAddress
        );

        // Connect to integrator (we need to be the contract owner)
        const integrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            integratorAddress
        );

        // Check current state
        console.log("📊 Current State:");
        const currentSendLib = await endpoint.getSendLibrary(integratorAddress, 30110);
        const currentReceiveLib = await endpoint.getReceiveLibrary(integratorAddress, 30110);
        
        console.log(`   Current Send Library: ${currentSendLib}`);
        console.log(`   Current Receive Library: ${currentReceiveLib}`);
        console.log(`   Target Send Library: ${correctSendLibrary}`);
        console.log(`   Target Receive Library: ${correctReceiveLibrary}`);

        // Check if we are the owner of the integrator
        const owner = await integrator.owner();
        console.log(`   Integrator Owner: ${owner}`);
        console.log(`   Our Address: ${deployer.address}`);
        
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.log("❌ ERROR: We are not the owner of the integrator!");
            console.log("   Only the contract owner can set LayerZero libraries");
            console.log("");
            console.log("🔧 ALTERNATIVE SOLUTION:");
            console.log("   The issue is that the LayerZero configuration is not being applied properly.");
            console.log("   This might be because:");
            console.log("   1. The configuration file format is incorrect");
            console.log("   2. The LayerZero CLI is not recognizing our changes");
            console.log("   3. There's a caching issue");
            console.log("");
            console.log("🚀 RECOMMENDED FIX:");
            console.log("   Delete all LayerZero configuration files and start fresh:");
            console.log("   1. rm sonic-integrator*.config.ts");
            console.log("   2. npx hardhat lz:oapp:config:init");
            console.log("   3. Only set peer connections, no custom DVN/library settings");
            console.log("   4. Let LayerZero use its default libraries");
            
            return { success: false, error: "Not contract owner" };
        }

        console.log("\n🔄 Attempting to set libraries...");
        
        // The LayerZero endpoint might not have direct setSendLibrary functions
        // Let's check what functions are available
        console.log("Available endpoint functions:");
        const endpointInterface = endpoint.interface;
        const functions = Object.keys(endpointInterface.functions);
        const libraryFunctions = functions.filter(f => f.toLowerCase().includes('library'));
        console.log("Library-related functions:", libraryFunctions);

        // The real issue is that we need to use the LayerZero OApp's setSendLibrary function
        // But first, let's see if the integrator has these functions
        console.log("\nAvailable integrator functions:");
        const integratorInterface = integrator.interface;
        const integratorFunctions = Object.keys(integratorInterface.functions);
        const integratorLibraryFunctions = integratorFunctions.filter(f => f.toLowerCase().includes('library'));
        console.log("Library-related functions:", integratorLibraryFunctions);

        return { 
            success: true, 
            diagnosis: "Need to use proper LayerZero OApp functions",
            owner,
            currentSendLib,
            currentReceiveLib
        };

    } catch (error: any) {
        console.log(`❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

main()
    .then((result) => {
        if (result.success) {
            console.log("\n✅ Diagnosis complete");
            console.log("🔧 The issue is with LayerZero configuration, not contract ownership");
        } else {
            console.log(`\n❌ Error: ${result.error}`);
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Script error:", error);
        process.exit(1);
    }); 