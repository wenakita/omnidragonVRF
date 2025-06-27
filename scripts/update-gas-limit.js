const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Updating VRF Callback Gas Limit on Arbitrum...\n");

    const ARBITRUM_CONTRACT = "0x77913403bC1841F87d884101b25B6230CB4fbe28";
    const NEW_CALLBACK_GAS_LIMIT = 2500000; // Increased from 690,420 to 2.5M
    
    const [signer] = await ethers.getSigners();
    console.log(`📝 Using signer: ${signer.address}`);
    console.log(`💰 Balance: ${ethers.utils.formatEther(await signer.getBalance())} ETH\n`);

    try {
        const contract = await ethers.getContractAt("OmniDragonVRFConsumerV2_5", ARBITRUM_CONTRACT, signer);

        // Check current configuration
        console.log("🔍 Current Configuration:");
        const currentCallbackGasLimit = await contract.callbackGasLimit();
        const currentDefaultGasLimit = await contract.defaultGasLimit();
        const subscriptionId = await contract.subscriptionId();
        const keyHash = await contract.keyHash();

        console.log(`   Current Callback Gas Limit: ${currentCallbackGasLimit.toString()}`);
        console.log(`   Current Default Gas Limit: ${currentDefaultGasLimit.toString()}`);
        console.log(`   Subscription ID: ${subscriptionId.toString()}`);
        console.log(`   Key Hash: ${keyHash}`);

        // Update VRF configuration with higher gas limit
        console.log(`\n🚀 Updating VRF configuration...`);
        console.log(`   New Callback Gas Limit: ${NEW_CALLBACK_GAS_LIMIT.toLocaleString()}`);
        
        const tx = await contract.setVRFConfig(
            subscriptionId.toString(),
            keyHash,
            NEW_CALLBACK_GAS_LIMIT,
            3, // requestConfirmations (keep current value)
            false // nativePayment (keep current value)
        );

        console.log(`   Transaction Hash: ${tx.hash}`);
        console.log("   ⏳ Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log(`   ✅ Confirmed in block: ${receipt.blockNumber}`);
        console.log(`   ⛽ Gas Used: ${receipt.gasUsed.toString()}`);

        // Verify the update
        console.log("\n🔍 Verifying Update:");
        const newCallbackGasLimit = await contract.callbackGasLimit();
        const newDefaultGasLimit = await contract.defaultGasLimit();

        console.log(`   New Callback Gas Limit: ${newCallbackGasLimit.toString()}`);
        console.log(`   New Default Gas Limit: ${newDefaultGasLimit.toString()}`);

        if (newCallbackGasLimit.toString() === NEW_CALLBACK_GAS_LIMIT.toString()) {
            console.log("   ✅ Gas limit updated successfully!");
        } else {
            console.log("   ❌ Gas limit update failed!");
        }

        // Also update default gas limit
        console.log("\n🔧 Updating Default Gas Limit...");
        const tx2 = await contract.setDefaultGasLimit(NEW_CALLBACK_GAS_LIMIT);
        console.log(`   Transaction Hash: ${tx2.hash}`);
        await tx2.wait();
        console.log("   ✅ Default gas limit updated!");

        console.log("\n🎯 Configuration Update Complete!");
        console.log("📋 Summary:");
        console.log(`   ✅ Callback Gas Limit: ${currentCallbackGasLimit.toString()} → ${NEW_CALLBACK_GAS_LIMIT.toLocaleString()}`);
        console.log(`   ✅ Default Gas Limit: ${currentDefaultGasLimit.toString()} → ${NEW_CALLBACK_GAS_LIMIT.toLocaleString()}`);
        console.log("\n🔄 Next Steps:");
        console.log("   1. The VRF callback now has sufficient gas limit");
        console.log("   2. Try making a new VRF request");
        console.log("   3. The callback should complete successfully");

    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.reason) {
            console.error("   Reason:", error.reason);
        }
        if (error.data) {
            console.error("   Data:", error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 