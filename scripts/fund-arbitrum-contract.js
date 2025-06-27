const { ethers } = require("hardhat");

async function main() {
    console.log("💰 Funding Arbitrum VRF Contract with ETH...\n");

    const ARBITRUM_CONTRACT = "0x77913403bC1841F87d884101b25B6230CB4fbe28";
    const FUNDING_AMOUNT = "0.001"; // 0.001 ETH should be plenty for LayerZero fees
    
    const [signer] = await ethers.getSigners();
    console.log(`📝 Using signer: ${signer.address}`);
    console.log(`💰 Signer balance: ${ethers.utils.formatEther(await signer.getBalance())} ETH`);

    try {
        // Check current contract balance
        const contractBalance = await ethers.provider.getBalance(ARBITRUM_CONTRACT);
        console.log(`🔍 Current contract balance: ${ethers.utils.formatEther(contractBalance)} ETH`);

        if (contractBalance.gte(ethers.utils.parseEther("0.001"))) {
            console.log("✅ Contract already has sufficient balance!");
            return;
        }

        // Check if signer has enough balance
        const signerBalance = await signer.getBalance();
        const fundingAmount = ethers.utils.parseEther(FUNDING_AMOUNT);
        
        if (signerBalance.lt(fundingAmount.mul(110).div(100))) { // 10% buffer for gas
            console.log("❌ Insufficient signer balance");
            console.log(`   Need: ${ethers.utils.formatEther(fundingAmount.mul(110).div(100))} ETH`);
            console.log(`   Have: ${ethers.utils.formatEther(signerBalance)} ETH`);
            return;
        }

        // Send ETH to contract
        console.log(`\n🚀 Sending ${FUNDING_AMOUNT} ETH to contract...`);
        
        const tx = await signer.sendTransaction({
            to: ARBITRUM_CONTRACT,
            value: fundingAmount
        });

        console.log(`   Transaction Hash: ${tx.hash}`);
        console.log("   ⏳ Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log(`   ✅ Confirmed in block: ${receipt.blockNumber}`);
        console.log(`   ⛽ Gas Used: ${receipt.gasUsed.toString()}`);

        // Verify the funding
        const newContractBalance = await ethers.provider.getBalance(ARBITRUM_CONTRACT);
        console.log(`\n🔍 New contract balance: ${ethers.utils.formatEther(newContractBalance)} ETH`);

        console.log("🎉 SUCCESS! Contract funded!");
        console.log("\n📋 Impact:");
        console.log("   • Contract can now pay LayerZero fees");
        console.log("   • VRF responses should complete successfully");
        console.log("   • Random words will be delivered to Sonic");
        
        console.log("\n🎯 Next Steps:");
        console.log("   1. The VRF system should now work end-to-end");
        console.log("   2. Test with a new VRF request");
        console.log("   3. Monitor for successful completion");

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