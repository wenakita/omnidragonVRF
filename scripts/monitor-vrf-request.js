const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Monitoring VRF Request Status...\n");

    const SONIC_CONTRACT = '0x5949156D5dD762aB15c1FEd4dE90B8a8CAF60746';
    const REQUEST_ID = 2; // The latest request ID
    
    const [signer] = await ethers.getSigners();
    console.log(`📝 Monitoring from: ${signer.address}`);
    console.log(`🎲 Request ID: ${REQUEST_ID}\n`);

    try {
        const contract = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5", 
            SONIC_CONTRACT, 
            signer
        );

        // Check current status
        console.log("📊 Current Request Status:");
        const status = await contract.checkRequestStatus(REQUEST_ID);
        console.log(`   ✅ Exists: ${status.exists}`);
        console.log(`   🎯 Fulfilled: ${status.fulfilled}`);
        console.log(`   👤 Provider: ${status.provider}`);
        console.log(`   🎲 Random Word: ${status.randomWord}`);
        console.log(`   ⏰ Timestamp: ${new Date(status.timestamp * 1000).toISOString()}`);
        console.log(`   ⏳ Expired: ${status.expired}`);

        if (status.fulfilled) {
            console.log("\n🎉 REQUEST FULFILLED!");
            console.log(`🎲 Random Word: ${status.randomWord}`);
            console.log("✅ The VRF system is working perfectly!");
        } else {
            console.log("\n⏳ Request is still pending...");
            console.log("📋 This is normal - VRF requests can take 2-5 minutes");
            console.log("🔄 The process involves:");
            console.log("   1. LayerZero cross-chain message delivery");
            console.log("   2. Chainlink VRF randomness generation");
            console.log("   3. Cross-chain response delivery");
        }

        // Check if we can get the random word directly
        console.log("\n🔍 Checking random word getter...");
        const randomWordResult = await contract.getRandomWord(REQUEST_ID);
        console.log(`   Random Word: ${randomWordResult.randomWord}`);
        console.log(`   Fulfilled: ${randomWordResult.fulfilled}`);

        // Check contract balance
        const contractBalance = await ethers.provider.getBalance(SONIC_CONTRACT);
        console.log(`\n💰 Contract Balance: ${ethers.utils.formatEther(contractBalance)} S`);

        console.log("\n📋 Next Steps:");
        console.log("   - Run this script again in a few minutes to check status");
        console.log("   - The random word will appear when VRF fulfillment is complete");
        console.log("   - You can also check the Arbitrum side for VRF activity");

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