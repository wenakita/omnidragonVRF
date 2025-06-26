import { ethers } from "hardhat";

/**
 * Retry VRF Request - Fresh Test
 * Testing if LayerZero infrastructure issue has been resolved
 */

const WORKING_INTEGRATOR = "0x6e11334470df61d62383892bd8e57a3a655718c8";
const ARBITRUM_EID = 30110;

async function retryVRFRequest() {
    console.log("🔄 Retry VRF Request - Fresh Test");
    console.log("=================================");
    console.log("📍 Working Integrator:", WORKING_INTEGRATOR);
    console.log("🎯 Target: Arbitrum (EID 30110)");
    console.log("💡 Testing if LayerZero infrastructure issue is resolved");

    const [deployer] = await ethers.getSigners();
    console.log("👤 Deployer:", deployer.address);

    try {
        const integrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            WORKING_INTEGRATOR
        );

        console.log("🔗 Connected to working integrator");

        // 1. Quick status check
        console.log("\n1️⃣ Quick Status Check");
        console.log("=====================");

        const owner = await integrator.owner();
        const requestCounter = await integrator.requestCounter();
        const peer = await integrator.peers(ARBITRUM_EID);
        const balance = await ethers.provider.getBalance(WORKING_INTEGRATOR);

        console.log("👑 Owner:", owner);
        console.log("🔢 Request Counter:", requestCounter.toString());
        console.log("👥 Peer:", peer !== "0x0000000000000000000000000000000000000000000000000000000000000000" ? "✅ Configured" : "❌ Not set");
        console.log("💰 Contract Balance:", ethers.utils.formatEther(balance), "S");

        if (peer === "0x0000000000000000000000000000000000000000000000000000000000000000") {
            console.log("❌ No peer configured - cannot proceed");
            return { success: false, error: "No peer configured" };
        }

        // 2. Test quote function first
        console.log("\n2️⃣ Testing Quote Function");
        console.log("==========================");

        try {
            const quote = await integrator.quote(ARBITRUM_EID, "0x");
            console.log("✅ Quote function works!");
            console.log("💰 Required Fee:", ethers.utils.formatEther(quote.nativeFee), "S");
            
            // 3. Try VRF request with quote
            console.log("\n3️⃣ VRF Request with Quote");
            console.log("=========================");

            const feeWithBuffer = quote.nativeFee.mul(120).div(100); // 20% buffer
            console.log("💰 Using fee with buffer:", ethers.utils.formatEther(feeWithBuffer), "S");

            const vrfTx = await integrator.requestRandomWordsSimple(ARBITRUM_EID, {
                value: feeWithBuffer,
                gasLimit: 600000,
                gasPrice: ethers.utils.parseUnits("55", "gwei")
            });

            console.log("✅ VRF request sent!");
            console.log("📋 TX Hash:", vrfTx.hash);
            console.log("🔗 SonicScan:", `https://sonicscan.org/tx/${vrfTx.hash}`);

            const receipt = await vrfTx.wait();
            
            if (receipt.status === 1) {
                console.log("🎉 SUCCESS! VRF request completed!");
                return await analyzeSuccessfulTransaction(receipt, integrator, requestCounter);
            } else {
                console.log("❌ Transaction failed");
                return { success: false, error: "Transaction reverted" };
            }

        } catch (quoteError: any) {
            console.log("❌ Quote failed:", quoteError.message.substring(0, 100) + "...");
            
            // 4. Try direct VRF request without quote
            console.log("\n4️⃣ Direct VRF Request (bypass quote)");
            console.log("====================================");
            
            const directFee = ethers.utils.parseEther("0.2"); // Slightly higher than successful tx
            console.log("💰 Using direct fee:", ethers.utils.formatEther(directFee), "S");

            try {
                const vrfTx = await integrator.requestRandomWordsSimple(ARBITRUM_EID, {
                    value: directFee,
                    gasLimit: 600000,
                    gasPrice: ethers.utils.parseUnits("55", "gwei")
                });

                console.log("✅ Direct VRF request sent!");
                console.log("📋 TX Hash:", vrfTx.hash);
                console.log("🔗 SonicScan:", `https://sonicscan.org/tx/${vrfTx.hash}`);

                const receipt = await vrfTx.wait();
                
                if (receipt.status === 1) {
                    console.log("🎉 SUCCESS! Direct VRF request completed!");
                    return await analyzeSuccessfulTransaction(receipt, integrator, requestCounter);
                } else {
                    console.log("❌ Direct transaction also failed");
                    return { success: false, error: "Both quote and direct methods failed" };
                }

            } catch (directError: any) {
                console.log("❌ Direct VRF request failed:", directError.message.substring(0, 100) + "...");
                return { success: false, error: directError.message };
            }
        }

    } catch (error: any) {
        console.log("❌ Test failed:", error.message);
        return { success: false, error: error.message };
    }
}

async function analyzeSuccessfulTransaction(receipt: any, integrator: any, oldCounter: any) {
    console.log("📦 Block Number:", receipt.blockNumber);
    console.log("⛽ Gas Used:", receipt.gasUsed.toString());

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
            // Skip unparseable logs
        }
    }

    // Check counter update
    const newCounter = await integrator.requestCounter();
    console.log(`\n🔢 Counter Update: ${oldCounter} → ${newCounter}`);

    if (vrfEventFound && messageEventFound) {
        console.log("\n🎉 COMPLETE SUCCESS!");
        console.log("┌─────────────────────────────────────────────────────┐");
        console.log("│ ✅ VRF request event emitted                       │");
        console.log("│ ✅ LayerZero message sent successfully             │");
        console.log("│ ✅ Cross-chain VRF flow initiated                  │");
        console.log("│ ⏳ Waiting for Chainlink VRF fulfillment           │");
        console.log("└─────────────────────────────────────────────────────┘");

        console.log("\n💡 Next Steps:");
        console.log("1. LayerZero delivers message to Arbitrum");
        console.log("2. Arbitrum VRF Consumer requests from Chainlink");
        console.log("3. Chainlink VRF fulfills the request");
        console.log("4. Response sent back to Sonic via LayerZero");
        console.log("5. Random word becomes available");

        if (requestId) {
            console.log(`\n🆔 Request ID: ${requestId}`);
            console.log("🔍 Check fulfillment: integrator.getRandomWord(" + requestId + ")");
        }

        return {
            success: true,
            requestId: requestId || newCounter.toString(),
            transactionHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber
        };
    } else {
        console.log("⚠️ Partial success - some events missing");
        return { success: false, error: "Missing expected events" };
    }
}

// Run the retry test
retryVRFRequest()
    .then((result) => {
        if (result?.success && 'requestId' in result) {
            console.log("\n🎉 RETRY SUCCESSFUL!");
            console.log("🔧 LayerZero infrastructure issue appears to be resolved!");
            console.log(`📊 Request ID: ${result.requestId}`);
            console.log(`🔗 Transaction: ${result.transactionHash}`);
            console.log("⏱️ Expected fulfillment: 2-5 minutes");
        } else {
            console.log("\n❌ RETRY FAILED");
            console.log(`💡 Error: ${result?.error}`);
            console.log("🔧 LayerZero infrastructure issue persists");
            console.log("📞 Continue monitoring LayerZero status for resolution");
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Unexpected error:", error);
        process.exit(1);
    }); 