const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking Current Gas Limits on Arbitrum...\n");

    const ARBITRUM_CONTRACT = "0x77913403bC1841F87d884101b25B6230CB4fbe28";
    
    const [signer] = await ethers.getSigners();
    console.log(`📝 Using signer: ${signer.address}`);

    try {
        const contract = await ethers.getContractAt("OmniDragonVRFConsumerV2_5", ARBITRUM_CONTRACT, signer);

        // Check current configuration
        console.log("🔍 Current VRF Configuration:");
        const callbackGasLimit = await contract.callbackGasLimit();
        const defaultGasLimit = await contract.defaultGasLimit();
        const subscriptionId = await contract.subscriptionId();
        const keyHash = await contract.keyHash();

        console.log(`   📊 Callback Gas Limit: ${callbackGasLimit.toString()}`);
        console.log(`   📊 Default Gas Limit: ${defaultGasLimit.toString()}`);
        console.log(`   🔑 Subscription ID: ${subscriptionId.toString()}`);
        console.log(`   🔑 Key Hash: ${keyHash}`);

        // Check supported chains gas limits
        console.log("\n🌐 Chain Gas Limits:");
        const sonicGasLimit = await contract.chainGasLimits(30332); // Sonic
        console.log(`   🎵 Sonic (30332): ${sonicGasLimit.toString()}`);

        // Analysis
        console.log("\n📋 Analysis:");
        if (callbackGasLimit.toString() === "690420") {
            console.log("   ❌ Callback gas limit is still 690,420 (too low)");
            console.log("   🔧 This explains why the VRF callback is still failing");
            console.log("   💡 Need to increase to 2,500,000 for successful callbacks");
        } else if (callbackGasLimit.toString() === "2500000") {
            console.log("   ✅ Callback gas limit is 2,500,000 (good!)");
            console.log("   🎯 VRF callbacks should work properly");
        } else {
            console.log(`   🤔 Callback gas limit is ${callbackGasLimit.toString()}`);
        }

        if (defaultGasLimit.toString() === "2500000") {
            console.log("   ✅ Default gas limit updated to 2,500,000");
        } else {
            console.log(`   📊 Default gas limit: ${defaultGasLimit.toString()}`);
        }

        console.log("\n🎯 Conclusion:");
        if (callbackGasLimit.toString() === "690420") {
            console.log("   🚨 The callback gas limit update hasn't been applied yet");
            console.log("   💰 This requires ETH to execute the setVRFConfig transaction");
            console.log("   🔄 Alternative: Use higher LayerZero fees to compensate");
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 