const { ethers } = require("hardhat");

async function main() {
    console.log("🎲 VRF Request with Normal Fee (0.2 S) - Testing Updated Gas Limits...\n");

    const SONIC_CONTRACT = '0x5949156D5dD762aB15c1FEd4dE90B8a8CAF60746';
    const ARBITRUM_EID = 30110;
    
    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`📝 Using signer: ${signer.address}`);
    console.log(`💰 Balance: ${ethers.utils.formatEther(await signer.getBalance())} S\n`);

    try {
        const contract = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5", 
            SONIC_CONTRACT, 
            signer
        );

        // Check contract status
        const contractBalance = await ethers.provider.getBalance(SONIC_CONTRACT);
        const requestCounter = await contract.requestCounter();
        const peer = await contract.peers(ARBITRUM_EID);
        
        console.log(`📊 Pre-Request Status:`);
        console.log(`   Contract Balance: ${ethers.utils.formatEther(contractBalance)} S`);
        console.log(`   Request Counter: ${requestCounter}`);
        console.log(`   Arbitrum Peer: ${peer}`);

        // Send VRF request with normal 0.2 S fee
        console.log("\n🚀 Sending VRF Request with 0.2 S fee (Normal - Testing Gas Fix)...");
        const fee = ethers.utils.parseEther("0.2");
        
        console.log(`   LayerZero Fee: ${ethers.utils.formatEther(fee)} S`);
        console.log(`   🔧 Testing if increased gas limits work with normal fee`);
        
        const tx = await contract.requestRandomWordsSimple(ARBITRUM_EID, {
            value: fee,
            gasLimit: 800000
        });

        console.log(`   Transaction Hash: ${tx.hash}`);
        console.log("   ⏳ Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log(`   ✅ Confirmed in block: ${receipt.blockNumber}`);
        console.log(`   ⛽ Gas Used: ${receipt.gasUsed.toString()}`);

        // Check new request counter
        const newRequestCounter = await contract.requestCounter();
        console.log(`   📊 New Request Counter: ${newRequestCounter}`);

        // Parse events
        console.log("\n📋 Transaction Events:");
        if (receipt.events && receipt.events.length > 0) {
            for (const event of receipt.events) {
                if (event.event) {
                    console.log(`   📡 ${event.event}`);
                    if (event.event === 'RandomWordsRequested') {
                        const requestId = event.args.requestId;
                        const provider = event.args.provider;
                        const dstEid = event.args.dstEid;
                        
                        console.log(`      🎲 Request ID: ${requestId}`);
                        console.log(`      👤 Provider: ${provider}`);
                        console.log(`      🌐 Destination: ${dstEid}`);
                        
                        // Check request status
                        console.log("\n🔍 Checking request status...");
                        const status = await contract.checkRequestStatus(requestId);
                        console.log(`      ✅ Exists: ${status.exists}`);
                        console.log(`      🎯 Fulfilled: ${status.fulfilled}`);
                        console.log(`      👤 Provider: ${status.provider}`);
                        console.log(`      🎲 Random Word: ${status.randomWord}`);
                        console.log(`      ⏰ Timestamp: ${new Date(status.timestamp * 1000).toISOString()}`);
                        console.log(`      ⏳ Expired: ${status.expired}`);
                    }
                    
                    if (event.event === 'MessageSent') {
                        console.log(`      📤 Message sent to LayerZero`);
                        console.log(`      🆔 Request ID: ${event.args.requestId}`);
                        console.log(`      🌐 Destination EID: ${event.args.dstEid}`);
                    }
                }
            }
        } else {
            console.log("   ⚠️ No events found in receipt");
        }

        console.log("\n🎯 Normal Fee VRF Request sent!");
        console.log("💡 Testing Strategy:");
        console.log("   • Using normal 0.2 S fee");
        console.log("   • Should work if gas limits were increased");
        console.log("   • This will confirm the gas limit fix");
        console.log("\n📋 Next Steps:");
        console.log("   1. Monitor the request for ~2-5 minutes");
        console.log("   2. Check if callback completes successfully");
        console.log("   3. Verify random word is delivered");
        console.log("\n⏰ Expected completion time: 2-5 minutes");
        console.log(`🔍 Monitor with: npx hardhat run scripts/check-vrf-result.js --network sonic`);

    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.reason) {
            console.error("   Reason:", error.reason);
        }
        if (error.data) {
            console.error("   Data:", error.data);
        }
        
        // Additional debugging info
        if (error.transaction) {
            console.error("   Transaction Hash:", error.transaction.hash);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 