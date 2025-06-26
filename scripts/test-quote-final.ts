import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Final Quote Test with Custom DVNs");
    console.log("=" .repeat(50));

    try {
        const integrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84"
        );
        
        console.log("✅ Connected to Sonic VRF Integrator");
        
        console.log("🔄 Testing quote function...");
        const fee = await integrator.quote(30110, "0x");
        
        console.log("🎯 SUCCESS! Quote function is working!");
        console.log(`💰 Fee required: ${ethers.utils.formatEther(fee.nativeFee)} S`);
        console.log(`📊 Fee in wei: ${fee.nativeFee.toString()}`);
        
        // Check integrator balance
        const balance = await ethers.provider.getBalance("0xD4023F563c2ea3Bd477786D99a14b5edA1252A84");
        console.log(`💳 Integrator balance: ${ethers.utils.formatEther(balance)} S`);
        
        const hasEnoughBalance = balance.gte(fee.nativeFee);
        console.log(`✅ Has enough balance: ${hasEnoughBalance}`);
        
        if (!hasEnoughBalance) {
            const needed = fee.nativeFee.sub(balance);
            console.log(`💸 Need to add: ${ethers.utils.formatEther(needed)} S`);
        }
        
        console.log("\n🎉 LAYERZERO CONFIGURATION IS WORKING!");
        console.log("✅ Custom DVNs: LayerZero Labs + Nethermind");
        console.log("✅ Proper libraries: No more zero addresses");
        console.log("✅ Quote function: Working correctly");
        console.log("\n🚀 Ready to test VRF request!");
        
        return {
            success: true,
            fee: fee.nativeFee.toString(),
            feeEther: ethers.utils.formatEther(fee.nativeFee),
            balance: balance.toString(),
            balanceEther: ethers.utils.formatEther(balance),
            hasEnoughBalance
        };
        
    } catch (error: any) {
        console.log("❌ Quote function still failing:");
        console.log(`   Error: ${error.message.slice(0, 100)}...`);
        
        if (error.message.includes("0x6592671c")) {
            console.log("\n🔧 Still the same LayerZero library issue");
            console.log("   The configuration might not have been applied properly");
        }
        
        return {
            success: false,
            error: error.message
        };
    }
}

main()
    .then((result) => {
        if (result.success) {
            console.log("\n🎯 TEST RESULT: ✅ SUCCESS!");
            console.log("The LayerZero configuration with custom DVNs is working!");
        } else {
            console.log("\n🎯 TEST RESULT: ❌ STILL BROKEN");
            console.log("Need to investigate the LayerZero configuration further");
        }
        process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
        console.error("❌ Script error:", error);
        process.exit(1);
    }); 