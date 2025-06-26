import { ethers } from "hardhat";

async function main() {
    console.log("🔧 Force Apply LayerZero Configuration");
    console.log("=" .repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    const integratorAddress = "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84";
    
    try {
        // Connect to the integrator
        const integrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            integratorAddress
        );

        // Check if we're the owner
        const owner = await integrator.owner();
        console.log(`📋 Contract Owner: ${owner}`);
        console.log(`📋 Our Address: ${deployer.address}`);
        
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.log("❌ We are not the contract owner!");
            console.log("   Cannot force configuration changes");
            return { success: false, error: "Not owner" };
        }

        console.log("✅ We are the contract owner - can make changes");

        // Check current peer configuration
        const currentPeer = await integrator.peers(30110);
        const expectedPeer = ethers.utils.hexZeroPad("0xD192343D5E351C983F6613e6d7c5c33f62C0eea4", 32);
        
        console.log(`📊 Current Arbitrum Peer: ${currentPeer}`);
        console.log(`📊 Expected Arbitrum Peer: ${expectedPeer}`);
        
        if (currentPeer.toLowerCase() !== expectedPeer.toLowerCase()) {
            console.log("🔄 Setting peer connection...");
            const tx = await integrator.setPeer(30110, expectedPeer);
            await tx.wait();
            console.log("✅ Peer connection set");
        } else {
            console.log("✅ Peer connection already correct");
        }

        // The real issue might be that we need to trigger LayerZero library updates
        // Let's check if the integrator has any LayerZero configuration functions
        console.log("\n🔍 Available LayerZero functions:");
        const functions = Object.keys(integrator.interface.functions);
        const lzFunctions = functions.filter(f => 
            f.toLowerCase().includes('library') || 
            f.toLowerCase().includes('config') ||
            f.toLowerCase().includes('dvn') ||
            f.toLowerCase().includes('executor')
        );
        console.log("LayerZero config functions:", lzFunctions);

        // Try to test quote again
        console.log("\n🧪 Testing quote function after peer check...");
        try {
            const fee = await integrator.quote(30110, "0x");
            console.log("🎉 SUCCESS! Quote works!");
            console.log(`💰 Fee: ${ethers.utils.formatEther(fee.nativeFee)} S`);
            return { success: true, fee: fee.nativeFee.toString() };
        } catch (error: any) {
            console.log("❌ Quote still failing:", error.message.slice(0, 50) + "...");
            
            // The issue is likely that LayerZero libraries are not set correctly
            // We need to use LayerZero's endpoint directly
            console.log("\n🔧 DIAGNOSIS:");
            console.log("The LayerZero CLI says configuration is applied,");
            console.log("but the quote function still fails with 0x6592671c error.");
            console.log("This means the ULN libraries are still zero addresses.");
            console.log("");
            console.log("🚀 SOLUTION:");
            console.log("We need to manually trigger LayerZero library updates");
            console.log("or find why the CLI configuration is not being applied.");
            
            return { success: false, error: "Quote still failing" };
        }

    } catch (error: any) {
        console.log(`❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

main()
    .then((result) => {
        if (result.success) {
            console.log("\n🎯 CONFIGURATION APPLIED SUCCESSFULLY!");
        } else {
            console.log("\n🎯 CONFIGURATION ISSUE PERSISTS");
            console.log("Need to investigate LayerZero CLI vs on-chain state mismatch");
        }
        process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
        console.error("❌ Script error:", error);
        process.exit(1);
    }); 