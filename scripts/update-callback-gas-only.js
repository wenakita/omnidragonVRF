const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Updating Only Callback Gas Limit (Minimal Gas Usage)...\n");

    const ARBITRUM_CONTRACT = "0x77913403bC1841F87d884101b25B6230CB4fbe28";
    const NEW_CALLBACK_GAS_LIMIT = 2500000;
    
    const [signer] = await ethers.getSigners();
    console.log(`📝 Using signer: ${signer.address}`);
    console.log(`💰 Balance: ${ethers.utils.formatEther(await signer.getBalance())} ETH\n`);

    try {
        const contract = await ethers.getContractAt("OmniDragonVRFConsumerV2_5", ARBITRUM_CONTRACT, signer);

        // Get current configuration
        const currentCallbackGasLimit = await contract.callbackGasLimit();
        const subscriptionId = await contract.subscriptionId();
        const keyHash = await contract.keyHash();
        const requestConfirmations = await contract.requestConfirmations();
        const nativePayment = false; // Keep current setting

        console.log("🔍 Current Configuration:");
        console.log(`   Callback Gas Limit: ${currentCallbackGasLimit.toString()}`);
        console.log(`   Subscription ID: ${subscriptionId.toString()}`);
        console.log(`   Request Confirmations: ${requestConfirmations}`);

        if (currentCallbackGasLimit.toString() === NEW_CALLBACK_GAS_LIMIT.toString()) {
            console.log("✅ Callback gas limit is already correct!");
            return;
        }

        // Estimate gas for the transaction
        console.log("\n⛽ Estimating gas...");
        const gasEstimate = await contract.estimateGas.setVRFConfig(
            subscriptionId.toString(),
            keyHash,
            NEW_CALLBACK_GAS_LIMIT,
            requestConfirmations,
            nativePayment
        );
        
        console.log(`   Estimated gas: ${gasEstimate.toString()}`);
        
        // Get current gas price
        const gasPrice = await ethers.provider.getGasPrice();
        const estimatedCost = gasEstimate.mul(gasPrice);
        console.log(`   Estimated cost: ${ethers.utils.formatEther(estimatedCost)} ETH`);
        
        const balance = await signer.getBalance();
        if (balance.lt(estimatedCost.mul(110).div(100))) { // 10% buffer
            console.log("❌ Insufficient balance for transaction");
            console.log(`   Need: ${ethers.utils.formatEther(estimatedCost.mul(110).div(100))} ETH`);
            console.log(`   Have: ${ethers.utils.formatEther(balance)} ETH`);
            console.log("\n💡 Options:");
            console.log("   1. Add more ETH to Arbitrum account");
            console.log("   2. Continue using ultra-high fees as workaround");
            return;
        }

        // Update VRF configuration
        console.log(`\n🚀 Updating callback gas limit to ${NEW_CALLBACK_GAS_LIMIT.toLocaleString()}...`);
        
        const tx = await contract.setVRFConfig(
            subscriptionId.toString(),
            keyHash,
            NEW_CALLBACK_GAS_LIMIT,
            requestConfirmations,
            nativePayment,
            {
                gasLimit: gasEstimate.mul(110).div(100), // 10% buffer
                gasPrice: gasPrice
            }
        );

        console.log(`   Transaction Hash: ${tx.hash}`);
        console.log("   ⏳ Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log(`   ✅ Confirmed in block: ${receipt.blockNumber}`);
        console.log(`   ⛽ Gas Used: ${receipt.gasUsed.toString()}`);

        // Verify the update
        const newCallbackGasLimit = await contract.callbackGasLimit();
        console.log(`\n🔍 Verification:`);
        console.log(`   New Callback Gas Limit: ${newCallbackGasLimit.toString()}`);

        if (newCallbackGasLimit.toString() === NEW_CALLBACK_GAS_LIMIT.toString()) {
            console.log("🎉 SUCCESS! Callback gas limit updated!");
            console.log("\n📋 Next Steps:");
            console.log("   1. VRF callbacks should now work with normal fees");
            console.log("   2. Test with 0.2 S fee VRF request");
            console.log("   3. No more gas limit failures expected");
        } else {
            console.log("❌ Update failed - gas limit not changed");
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.reason) {
            console.error("   Reason:", error.reason);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 