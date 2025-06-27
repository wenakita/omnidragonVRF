const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Updating Sonic Chain Gas Limit (Final Fix)...\n");

    const ARBITRUM_CONTRACT = "0x77913403bC1841F87d884101b25B6230CB4fbe28";
    const SONIC_EID = 30332;
    const NEW_GAS_LIMIT = 2500000;
    
    const [signer] = await ethers.getSigners();
    console.log(`📝 Using signer: ${signer.address}`);
    console.log(`💰 Balance: ${ethers.utils.formatEther(await signer.getBalance())} ETH\n`);

    try {
        const contract = await ethers.getContractAt("OmniDragonVRFConsumerV2_5", ARBITRUM_CONTRACT, signer);

        // Check current Sonic chain gas limit
        const currentSonicGasLimit = await contract.chainGasLimits(SONIC_EID);
        console.log("🔍 Current Configuration:");
        console.log(`   Sonic Chain Gas Limit: ${currentSonicGasLimit.toString()}`);

        if (currentSonicGasLimit.toString() === NEW_GAS_LIMIT.toString()) {
            console.log("✅ Sonic chain gas limit is already correct!");
            return;
        }

        // Update Sonic chain support with higher gas limit
        console.log(`\n🚀 Updating Sonic chain gas limit to ${NEW_GAS_LIMIT.toLocaleString()}...`);
        
        const tx = await contract.setSupportedChain(
            SONIC_EID,
            true, // supported
            NEW_GAS_LIMIT
        );

        console.log(`   Transaction Hash: ${tx.hash}`);
        console.log("   ⏳ Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log(`   ✅ Confirmed in block: ${receipt.blockNumber}`);
        console.log(`   ⛽ Gas Used: ${receipt.gasUsed.toString()}`);

        // Verify the update
        const newSonicGasLimit = await contract.chainGasLimits(SONIC_EID);
        console.log(`\n🔍 Verification:`);
        console.log(`   New Sonic Chain Gas Limit: ${newSonicGasLimit.toString()}`);

        if (newSonicGasLimit.toString() === NEW_GAS_LIMIT.toString()) {
            console.log("🎉 SUCCESS! Sonic chain gas limit updated!");
            
            // Final status check
            const callbackGasLimit = await contract.callbackGasLimit();
            const defaultGasLimit = await contract.defaultGasLimit();
            
            console.log("\n📊 Final Configuration:");
            console.log(`   ✅ Callback Gas Limit: ${callbackGasLimit.toString()}`);
            console.log(`   ✅ Default Gas Limit: ${defaultGasLimit.toString()}`);
            console.log(`   ✅ Sonic Chain Gas Limit: ${newSonicGasLimit.toString()}`);
            
            console.log("\n🎯 ALL GAS LIMITS FIXED!");
            console.log("📋 Next Steps:");
            console.log("   1. VRF system should now work perfectly");
            console.log("   2. Test with normal 0.2 S fee");
            console.log("   3. No more gas limit failures expected");
        } else {
            console.log("❌ Update failed - Sonic gas limit not changed");
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