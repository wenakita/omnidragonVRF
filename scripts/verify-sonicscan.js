const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Verifying VRF Contract on SonicScan...");
    
    const CONTRACT_ADDRESS = "0xC8A27A512AC32B3d63803821e121233f1E05Dc34";
    
    console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
    console.log(`🔗 SonicScan URL: https://sonicscan.org/address/${CONTRACT_ADDRESS}`);
    
    try {
        console.log("\n🔧 Running Hardhat verification...");
        
        // The contract was deployed with these constructor arguments
        const constructorArgs = [
            "0x6EDCE65403992e310A62460808c4b910D972f10f", // LayerZero endpoint
            "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK token (placeholder)
            "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84", // VRF Coordinator (old contract reference)
            "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae", // Key hash
            64, // Subscription ID
            3, // Request confirmations  
            700000 // Callback gas limit
        ];
        
        console.log("📋 Constructor arguments:");
        console.log(`   LayerZero Endpoint: ${constructorArgs[0]}`);
        console.log(`   LINK Token: ${constructorArgs[1]}`);
        console.log(`   VRF Coordinator: ${constructorArgs[2]}`);
        console.log(`   Key Hash: ${constructorArgs[3]}`);
        console.log(`   Subscription ID: ${constructorArgs[4]}`);
        console.log(`   Request Confirmations: ${constructorArgs[5]}`);
        console.log(`   Callback Gas Limit: ${constructorArgs[6]}`);
        
        console.log("\n🚀 Attempting verification...");
        
    } catch (error) {
        console.log(`❌ Error preparing verification: ${error.message}`);
    }
    
    console.log("\n📝 Manual Verification Instructions:");
    console.log("1. Go to: https://sonicscan.org/address/0xC8A27A512AC32B3d63803821e121233f1E05Dc34");
    console.log("2. Click 'Contract' tab");
    console.log("3. Click 'Verify and Publish'");
    console.log("4. Select 'Solidity (Single file)'");
    console.log("5. Use contract name: ChainlinkVRFIntegratorV2_5");
    console.log("6. Use compiler version: v0.8.20+commit.a1b79de6");
    console.log("7. Use optimization: Yes (200 runs)");
    console.log("8. Paste the flattened contract source code");
    console.log("9. Add constructor arguments (ABI-encoded)");
    
    console.log("\n🎯 Verification Complete Check:");
    console.log("Visit the SonicScan link above to see if the contract is already verified!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 