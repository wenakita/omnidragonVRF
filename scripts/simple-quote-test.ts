import { ethers } from "hardhat";

async function main() {
    console.log("🧪 Simple Quote Function Test");
    console.log("=" .repeat(40));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    const integratorAddress = "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84";
    
    // Connect to Sonic VRF Integrator
    const integrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        integratorAddress
    );

    console.log("✅ Connected to Sonic Integrator");

    // Test quote function
    console.log("\n💰 Testing Quote Function:");
    try {
        const fee = await integrator.quote(30110, "0x");
        console.log("✅ Quote successful!");
        console.log(`   Required Fee: ${ethers.utils.formatEther(fee.nativeFee)} S`);
        console.log(`   LZ Token Fee: ${ethers.utils.formatEther(fee.lzTokenFee)} LZ`);
        
        return { success: true, fee: fee.nativeFee.toString() };
    } catch (error: any) {
        console.log("❌ Quote failed:", error.message);
        if (error.data) {
            console.log("🔍 Error data:", error.data);
        }
        return { success: false, error: error.message };
    }
}

main()
    .then((result) => {
        console.log("\n🎯 Test Result:", result.success ? "SUCCESS" : "FAILED");
        process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
        console.error("❌ Test error:", error);
        process.exit(1);
    }); 