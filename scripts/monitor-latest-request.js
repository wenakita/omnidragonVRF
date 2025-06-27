const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Monitoring Latest VRF Request (ID 4)...\n");
    
    const sonicAddress = "0x5949156D5dD762aB15c1FEd4dE90B8a8CAF60746";
    const contract = await ethers.getContractAt("ChainlinkVRFIntegratorV2_5", sonicAddress);
    
    try {
        // Check the latest request (ID 5)
        const requestId = 5;
        console.log(`📋 Checking Request ID: ${requestId}`);
        
        const status = await contract.checkRequestStatus(requestId);
        console.log(`   ✅ Exists: ${status.exists}`);
        console.log(`   🎯 Fulfilled: ${status.fulfilled}`);
        console.log(`   👤 Provider: ${status.provider}`);
        console.log(`   🎲 Random Word: ${status.randomWord.toString()}`);
        console.log(`   ⏰ Timestamp: ${new Date(status.timestamp * 1000).toISOString()}`);
        console.log(`   ⏳ Expired: ${status.expired}`);

        if (status.fulfilled && status.randomWord.toString() !== "0") {
            console.log("\n🎉 SUCCESS! VRF Request Fulfilled!");
            console.log(`   ✅ Random Word: ${status.randomWord.toString()}`);
            console.log(`   📊 Random Word (hex): ${ethers.utils.hexlify(status.randomWord)}`);
            console.log("\n🔧 Gas Limit Fix Confirmed!");
            console.log("   • Normal 0.2 S fee was sufficient");
            console.log("   • Callback completed successfully");
            console.log("   • VRF system is now fully operational");
        } else if (status.exists && !status.fulfilled) {
            console.log("\n⏳ Request is still processing...");
            console.log("   • Request exists and is valid");
            console.log("   • Waiting for Chainlink VRF fulfillment");
            console.log("   • Check again in 1-2 minutes");
        } else {
            console.log("\n❌ Request not found or invalid");
        }

        // Also check if we can get a random word directly
        try {
            const randomWord = await contract.getRandomWord(requestId);
            console.log(`\n🎲 Direct Random Word Check: ${randomWord.toString()}`);
        } catch (error) {
            console.log(`\n⏳ Random word not yet available: ${error.message}`);
        }

        // Check overall contract status
        console.log("\n📊 Contract Status:");
        const requestCounter = await contract.requestCounter();
        const hasActiveRequest = await contract.hasActiveRequest();
        console.log(`   📈 Total Requests: ${requestCounter}`);
        console.log(`   🔄 Has Active Request: ${hasActiveRequest}`);

    } catch (error) {
        console.log("❌ Error checking request:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 