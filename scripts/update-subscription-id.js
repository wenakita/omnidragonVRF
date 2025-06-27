const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Updating VRF Subscription ID in Arbitrum Contract...\n");

    // Contract details
    const ARBITRUM_CONTRACT = '0x77913403bC1841F87d884101b25B6230CB4fbe28';
    const NEW_SUBSCRIPTION_ID = '49130512167777098004519592693541429977179420141459329604059253338290818062746';
    
    // Current VRF config (keeping same values except subscription ID)
    const KEY_HASH = '0xe9f223d7d83ec85c4f78042a4845af3a1c8df7757b4997b815ce4b8d07aca68c';
    const CALLBACK_GAS_LIMIT = 690420;
    const REQUEST_CONFIRMATIONS = 3;
    const NATIVE_PAYMENT = false;

    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`📝 Using signer: ${signer.address}`);

    // Get contract instance
    const contract = await ethers.getContractAt(
        "OmniDragonVRFConsumerV2_5", 
        ARBITRUM_CONTRACT, 
        signer
    );

    try {
        // Check current subscription ID
        console.log("📊 Current VRF Configuration:");
        const currentSubId = await contract.subscriptionId();
        const currentKeyHash = await contract.keyHash();
        const currentGasLimit = await contract.callbackGasLimit();
        const currentConfirmations = await contract.requestConfirmations();
        const currentNativePayment = await contract.nativePayment();
        
        console.log(`   Subscription ID: ${currentSubId.toString()}`);
        console.log(`   Key Hash: ${currentKeyHash}`);
        console.log(`   Gas Limit: ${currentGasLimit}`);
        console.log(`   Confirmations: ${currentConfirmations}`);
        console.log(`   Native Payment: ${currentNativePayment}\n`);

        if (currentSubId.toString() === NEW_SUBSCRIPTION_ID) {
            console.log("✅ Subscription ID is already correct!");
            return;
        }

        // Update VRF configuration
        console.log("🔄 Updating VRF configuration...");
        const tx = await contract.setVRFConfig(
            NEW_SUBSCRIPTION_ID,
            KEY_HASH,
            CALLBACK_GAS_LIMIT,
            REQUEST_CONFIRMATIONS,
            NATIVE_PAYMENT
        );

        console.log(`📤 Transaction sent: ${tx.hash}`);
        console.log("⏳ Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

        // Verify the update
        console.log("\n📊 Updated VRF Configuration:");
        const newSubId = await contract.subscriptionId();
        console.log(`   Subscription ID: ${newSubId.toString()}`);
        
        if (newSubId.toString() === NEW_SUBSCRIPTION_ID) {
            console.log("✅ Subscription ID successfully updated!");
        } else {
            console.log("❌ Subscription ID update failed!");
        }

    } catch (error) {
        console.error("❌ Error updating subscription ID:", error.message);
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