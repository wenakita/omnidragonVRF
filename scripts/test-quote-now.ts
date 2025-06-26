import { ethers } from "hardhat";

async function main() {
    console.log("🧪 Testing Quote Function After LayerZero Configuration");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    const integratorAddress = "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84";
    
    // Connect to Sonic VRF Integrator
    console.log("🔗 Connecting to Sonic VRF Integrator...");
    const integrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        integratorAddress
    );

    console.log("✅ Connected to Sonic Integrator");

    // Check basic status first
    console.log("\n📊 Basic Status Check:");
    try {
        const balance = await ethers.provider.getBalance(integratorAddress);
        const peer = await integrator.peers(30110);
        const owner = await integrator.owner();
        
        console.log(`   Balance: ${ethers.utils.formatEther(balance)} S`);
        console.log(`   Owner: ${owner}`);
        console.log(`   Arbitrum Peer: ${peer}`);
        
        const expectedPeer = ethers.utils.hexZeroPad("0xD192343D5E351C983F6613e6d7c5c33f62C0eea4", 32);
        const isPeerSet = peer.toLowerCase() === expectedPeer.toLowerCase();
        console.log(`   Peer Correctly Set: ${isPeerSet ? '✅ Yes' : '❌ No'}`);
        
    } catch (error: any) {
        console.log(`   ❌ Status check error: ${error.message}`);
    }

    // Test the quote function - THE MAIN TEST
    console.log("\n💰 Testing Quote Function (Sonic → Arbitrum):");
    try {
        console.log("   🔄 Calling integrator.quote(30110, '0x')...");
        const fee = await integrator.quote(30110, "0x");
        
        console.log("   🎉 SUCCESS! Quote function worked!");
        console.log(`   ✅ Required Fee: ${ethers.utils.formatEther(fee.nativeFee)} S`);
        console.log(`   ✅ LZ Token Fee: ${ethers.utils.formatEther(fee.lzTokenFee)} LZ`);
        
        // Additional fee breakdown
        console.log("\n📋 Fee Details:");
        console.log(`   Native Fee (wei): ${fee.nativeFee.toString()}`);
        console.log(`   LZ Token Fee (wei): ${fee.lzTokenFee.toString()}`);
        
        return {
            success: true,
            nativeFee: fee.nativeFee.toString(),
            lzTokenFee: fee.lzTokenFee.toString(),
            nativeFeeEther: ethers.utils.formatEther(fee.nativeFee)
        };
        
    } catch (error: any) {
        console.log("   ❌ Quote function FAILED!");
        console.log(`   Error: ${error.message}`);
        
        if (error.data) {
            console.log(`   Error Data: ${error.data}`);
        }
        
        if (error.reason) {
            console.log(`   Reason: ${error.reason}`);
        }
        
        return {
            success: false,
            error: error.message,
            errorData: error.data
        };
    }
}

main()
    .then((result) => {
        if (result.success) {
            console.log("\n🎯 QUOTE TEST: ✅ SUCCESS!");
            console.log("🚀 Ready to test VRF request!");
            console.log(`💰 Fee required: ${result.nativeFeeEther} S`);
        } else {
            console.log("\n🎯 QUOTE TEST: ❌ FAILED");
            console.log("🔧 LayerZero configuration still needs work");
        }
        process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
        console.error("❌ Script error:", error);
        process.exit(1);
    }); 