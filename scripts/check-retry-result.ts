import { ethers } from "hardhat";

/**
 * Check Retry VRF Request Result
 * Analyzing the transaction from the retry attempt
 */

const TX_HASH = "0xe19af114565d3593a7dcda34dc9a1cccaf1cbc652b1d2495c78da506f76d6c5e";
const WORKING_INTEGRATOR = "0x6e11334470df61d62383892bd8e57a3a655718c8";

async function checkRetryResult() {
    console.log("🔍 Checking Retry VRF Request Result");
    console.log("====================================");
    console.log("📋 TX Hash:", TX_HASH);
    console.log("🔗 SonicScan:", `https://sonicscan.org/tx/${TX_HASH}`);

    try {
        const receipt = await ethers.provider.getTransactionReceipt(TX_HASH);
        
        if (!receipt) {
            console.log("⏳ Transaction not yet mined...");
            return;
        }

        console.log("\n📊 Transaction Details:");
        console.log("======================");
        console.log("✅ Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
        console.log("📦 Block Number:", receipt.blockNumber);
        console.log("⛽ Gas Used:", receipt.gasUsed.toString());
        console.log("⚡ Gas Price:", ethers.utils.formatUnits(receipt.effectiveGasPrice || 0, "gwei"), "gwei");

        if (receipt.status === 1) {
            console.log("\n🎉 TRANSACTION SUCCESSFUL!");
            
            // Connect to integrator to parse events
            const integrator = await ethers.getContractAt(
                "ChainlinkVRFIntegratorV2_5",
                WORKING_INTEGRATOR
            );

            // Parse events
            console.log("\n📋 Transaction Events:");
            let requestId = null;
            let vrfEventFound = false;
            let messageEventFound = false;

            for (const log of receipt.logs) {
                try {
                    const parsed = integrator.interface.parseLog(log);
                    console.log(`📝 ${parsed.name}:`);
                    
                    if (parsed.name === "RandomWordsRequested") {
                        vrfEventFound = true;
                        requestId = parsed.args.requestId.toString();
                        console.log(`   ✅ Request ID: ${requestId}`);
                        console.log(`   👤 Requester: ${parsed.args.requester}`);
                        console.log(`   🎯 Destination EID: ${parsed.args.dstEid}`);
                    } else if (parsed.name === "MessageSent") {
                        messageEventFound = true;
                        console.log(`   ✅ Request ID: ${parsed.args.requestId}`);
                        console.log(`   🎯 Destination EID: ${parsed.args.dstEid}`);
                        console.log(`   📨 Message: ${parsed.args.message}`);
                    }
                } catch (parseError) {
                    // Skip unparseable logs - might be LayerZero events
                    if (log.topics.length > 0) {
                        console.log(`📝 Unknown Event: ${log.topics[0].substring(0, 10)}...`);
                    }
                }
            }

            // Check current counter
            const currentCounter = await integrator.requestCounter();
            console.log(`\n🔢 Current Request Counter: ${currentCounter}`);

            if (vrfEventFound && messageEventFound) {
                console.log("\n🎉 COMPLETE SUCCESS!");
                console.log("┌─────────────────────────────────────────────────────┐");
                console.log("│ ✅ VRF request event emitted                       │");
                console.log("│ ✅ LayerZero message sent successfully             │");
                console.log("│ ✅ Cross-chain VRF flow initiated                  │");
                console.log("│ 🔧 LayerZero infrastructure issue RESOLVED!        │");
                console.log("└─────────────────────────────────────────────────────┘");

                console.log("\n💡 Next Steps:");
                console.log("1. LayerZero delivers message to Arbitrum");
                console.log("2. Arbitrum VRF Consumer requests from Chainlink");
                console.log("3. Chainlink VRF fulfills the request");
                console.log("4. Response sent back to Sonic via LayerZero");
                console.log("5. Random word becomes available");

                if (requestId) {
                    console.log(`\n🆔 Request ID: ${requestId}`);
                    console.log("🔍 Check fulfillment in 2-5 minutes:");
                    console.log(`   integrator.getRandomWord(${requestId})`);
                }

                console.log("\n🎯 BREAKTHROUGH ACHIEVED!");
                console.log("The OmniDragon VRF system is now working!");

            } else if (vrfEventFound) {
                console.log("\n⚠️ Partial Success");
                console.log("VRF event found but LayerZero message event missing");
                console.log("This suggests the VRF request was made but LayerZero didn't send");
            } else {
                console.log("\n❌ No VRF Events Found");
                console.log("Transaction succeeded but no VRF events detected");
            }

        } else {
            console.log("\n❌ TRANSACTION FAILED");
            console.log("The retry attempt also failed");
            console.log("LayerZero infrastructure issue persists");
        }

    } catch (error: any) {
        console.log("❌ Error checking transaction:", error.message);
    }
}

// Run the check
checkRetryResult()
    .then(() => {
        console.log("\n✅ Analysis complete");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Unexpected error:", error);
        process.exit(1);
    }); 