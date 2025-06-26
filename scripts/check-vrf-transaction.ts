import { ethers } from "hardhat";

/**
 * Check VRF Transaction Status
 * Check the status of the VRF transaction that was just sent
 */

const WORKING_INTEGRATOR = "0x6e11334470df61d62383892bd8e57a3a655718c8";
const VRF_TX_HASH = "0xc841e8302be7dbf3ef4c59635c58a25f137de0aa05be9e884122b34ff3f00fa1";

async function checkVRFTransaction() {
    console.log("🔍 Checking VRF Transaction Status");
    console.log("==================================");
    console.log("📋 TX Hash:", VRF_TX_HASH);
    console.log("🔗 SonicScan:", `https://sonicscan.org/tx/${VRF_TX_HASH}`);

    const [deployer] = await ethers.getSigners();
    console.log("👤 Deployer:", deployer.address);

    try {
        const provider = ethers.provider;

        // Get transaction receipt
        console.log("\n1️⃣ Getting Transaction Receipt");
        console.log("===============================");

        const receipt = await provider.getTransactionReceipt(VRF_TX_HASH);
        
        if (!receipt) {
            console.log("❌ Transaction not found or still pending");
            console.log("⏳ Try again in a few seconds");
            return;
        }

        console.log("✅ Transaction found!");
        console.log("📦 Block Number:", receipt.blockNumber);
        console.log("⛽ Gas Used:", receipt.gasUsed.toString());
        console.log("📋 Status:", receipt.status === 1 ? "✅ SUCCESS" : "❌ FAILED");

        if (receipt.status === 0) {
            console.log("❌ Transaction failed - checking error details...");
            
            // Try to get the transaction to see what went wrong
            const tx = await provider.getTransaction(VRF_TX_HASH);
            if (tx) {
                console.log("💰 Value sent:", ethers.utils.formatEther(tx.value), "S");
                console.log("⛽ Gas limit:", tx.gasLimit.toString());
                console.log("💨 Gas price:", ethers.utils.formatUnits(tx.gasPrice || 0, "gwei"), "gwei");
            }
            return;
        }

        // Parse events if successful
        console.log("\n2️⃣ Parsing Transaction Events");
        console.log("==============================");

        const integrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            WORKING_INTEGRATOR
        );

        let requestId = null;
        let vrfEventFound = false;
        let messageEventFound = false;
        let layerZeroEvents = 0;

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
                // Count LayerZero events
                if (log.address.toLowerCase() === "0x6f475642a6e85809b1c36fa62763669b1b48dd5b" ||
                    log.address.toLowerCase() === "0xc39161c743d0307eb9bcc9fef03eeb9dc4802de7") {
                    layerZeroEvents++;
                }
            }
        }

        console.log(`\n📊 Event Summary:`);
        console.log(`   VRF Events: ${vrfEventFound ? "✅" : "❌"}`);
        console.log(`   Message Events: ${messageEventFound ? "✅" : "❌"}`);
        console.log(`   LayerZero Events: ${layerZeroEvents}`);

        // Check integrator state
        console.log("\n3️⃣ Checking Integrator State");
        console.log("=============================");

        const currentCounter = await integrator.requestCounter();
        console.log("🔢 Current Request Counter:", currentCounter.toString());

        if (requestId) {
            console.log(`🆔 Request ID: ${requestId}`);
            
            // Try to get the random word (might not be fulfilled yet)
            try {
                const randomWord = await integrator.getRandomWord(requestId);
                if (randomWord.toString() !== "0") {
                    console.log("🎉 RANDOM WORD FULFILLED!");
                    console.log("🎲 Random Word:", randomWord.toString());
                } else {
                    console.log("⏳ Random word not yet fulfilled (still pending)");
                }
            } catch (randomError: any) {
                console.log("⏳ Random word not yet available:", randomError.message);
            }
        }

        // Final assessment
        console.log("\n4️⃣ Final Assessment");
        console.log("===================");

        if (vrfEventFound && messageEventFound) {
            console.log("🎉 VRF REQUEST SUCCESSFUL!");
            console.log("┌─────────────────────────────────────────────────────┐");
            console.log("│ ✅ VRF request event emitted                       │");
            console.log("│ ✅ LayerZero message sent to Arbitrum              │");
            console.log("│ ✅ Cross-chain VRF flow initiated                  │");
            console.log("│ ⏳ Waiting for Chainlink VRF fulfillment           │");
            console.log("└─────────────────────────────────────────────────────┘");
            
            console.log("\n💡 What happens next:");
            console.log("1. LayerZero delivers message to Arbitrum");
            console.log("2. Arbitrum VRF Consumer requests from Chainlink");
            console.log("3. Chainlink VRF fulfills the request");
            console.log("4. Response is sent back to Sonic via LayerZero");
            console.log("5. Random word becomes available on Sonic");
            
            console.log("\n🔍 Monitor progress:");
            console.log(`   - Check request fulfillment: integrator.getRandomWord(${requestId})`);
            console.log("   - Expected time: 2-5 minutes for full cycle");
            
        } else if (vrfEventFound) {
            console.log("⚠️ VRF request created but LayerZero message may have failed");
        } else {
            console.log("❌ VRF request failed - no events found");
        }

    } catch (error: any) {
        console.log("❌ Error checking transaction:", error.message);
    }

    console.log("\n🏁 Transaction check completed!");
}

// Run the check
checkVRFTransaction()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Check failed:", error);
        process.exit(1);
    }); 