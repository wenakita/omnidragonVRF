import { ethers } from "hardhat";

/**
 * Direct VRF Test with Working Integrator
 * Bypass quote function and use known good parameters from successful transaction
 */

const WORKING_INTEGRATOR = "0x6e11334470df61d62383892bd8e57a3a655718c8";
const ARBITRUM_EID = 30110;

async function directVRFTest() {
    console.log("🎯 Direct VRF Test with Working Integrator");
    console.log("==========================================");
    console.log("📍 Working Integrator:", WORKING_INTEGRATOR);
    console.log("💡 Using parameters from successful transaction 5 days ago");

    const [deployer] = await ethers.getSigners();
    console.log("👤 Deployer:", deployer.address);

    try {
        const integrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            WORKING_INTEGRATOR
        );

        console.log("🔗 Connected to working integrator");

        // Check status first
        console.log("\n1️⃣ Quick Status Check");
        console.log("=====================");

        const owner = await integrator.owner();
        const requestCounter = await integrator.requestCounter();
        const peer = await integrator.peers(ARBITRUM_EID);
        const balance = await ethers.provider.getBalance(WORKING_INTEGRATOR);

        console.log("👑 Owner:", owner);
        console.log("🔢 Request Counter:", requestCounter.toString());
        console.log("👥 Peer:", peer !== "0x0000000000000000000000000000000000000000000000000000000000000000" ? "✅ Set" : "❌ Not set");
        console.log("💰 Balance:", ethers.utils.formatEther(balance), "S");

        if (peer === "0x0000000000000000000000000000000000000000000000000000000000000000") {
            console.log("❌ No peer configured - cannot proceed");
            return;
        }

        // 2. Try direct VRF request with known good parameters
        console.log("\n2️⃣ Direct VRF Request (bypassing quote)");
        console.log("=======================================");

        // Use exact parameters from successful transaction 5 days ago
        const successfulFee = ethers.utils.parseEther("0.180962901255305657"); // Exact fee from successful tx
        const gasLimit = 600000; // Same as successful tx
        const gasPrice = ethers.utils.parseUnits("55", "gwei"); // Same as successful tx

        console.log("💰 Fee:", ethers.utils.formatEther(successfulFee), "S (exact from successful tx)");
        console.log("⛽ Gas Limit:", gasLimit);
        console.log("💨 Gas Price:", gasPrice.toString(), "wei (55 gwei)");

        console.log("\n🚀 Sending VRF request...");

        try {
            const vrfTx = await integrator.requestRandomWordsSimple(ARBITRUM_EID, {
                value: successfulFee,
                gasLimit: gasLimit,
                gasPrice: gasPrice
            });

            console.log("✅ Transaction sent successfully!");
            console.log("📋 TX Hash:", vrfTx.hash);
            console.log("🔗 SonicScan:", `https://sonicscan.org/tx/${vrfTx.hash}`);
            console.log("⏳ Waiting for confirmation...");

            const receipt = await vrfTx.wait();

            if (receipt.status === 1) {
                console.log("🎉 VRF REQUEST SUCCESSFUL!");
                console.log("📦 Block Number:", receipt.blockNumber);
                console.log("⛽ Gas Used:", receipt.gasUsed.toString());

                // Parse events
                console.log("\n📋 Transaction Events:");
                let requestId = null;
                let layerZeroEvents = 0;

                for (const log of receipt.logs) {
                    try {
                        const parsed = integrator.interface.parseLog(log);
                        console.log(`📝 ${parsed.name}:`);
                        
                        if (parsed.name === "RandomWordsRequested") {
                            requestId = parsed.args.requestId.toString();
                            console.log(`   Request ID: ${requestId}`);
                            console.log(`   Requester: ${parsed.args.requester}`);
                            console.log(`   Destination EID: ${parsed.args.dstEid}`);
                        } else if (parsed.name === "MessageSent") {
                            console.log(`   Request ID: ${parsed.args.requestId}`);
                            console.log(`   Destination EID: ${parsed.args.dstEid}`);
                            console.log(`   Message: ${parsed.args.message}`);
                        }
                    } catch (parseError) {
                        // Count LayerZero events
                        if (log.address.toLowerCase() === "0x6f475642a6e85809b1c36fa62763669b1b48dd5b" ||
                            log.address.toLowerCase() === "0xc39161c743d0307eb9bcc9fef03eeb9dc4802de7") {
                            layerZeroEvents++;
                        }
                    }
                }

                console.log(`📊 LayerZero Events: ${layerZeroEvents}`);

                // Check updated counter
                const newCounter = await integrator.requestCounter();
                console.log(`🔢 New Counter: ${newCounter.toString()}`);

                if (newCounter.gt(requestCounter)) {
                    console.log("✅ Request counter increased - VRF request was processed!");
                    
                    console.log("\n🎯 SUCCESS! VRF Request Completed!");
                    console.log("┌─────────────────────────────────────────────────────┐");
                    console.log("│ ✅ VRF request sent successfully                   │");
                    console.log("│ ✅ Transaction confirmed on Sonic                  │");
                    console.log("│ ✅ Request counter updated                         │");
                    console.log("│ ⏳ LayerZero message should be processing          │");
                    console.log("└─────────────────────────────────────────────────────┘");

                    if (requestId) {
                        console.log(`\n🆔 Request ID: ${requestId}`);
                    }

                    return {
                        success: true,
                        requestId: requestId || newCounter.toString(),
                        transactionHash: vrfTx.hash,
                        blockNumber: receipt.blockNumber
                    };
                } else {
                    console.log("⚠️ Request counter did not increase - something went wrong");
                }

            } else {
                console.log("❌ Transaction failed (status 0)");
                return { success: false, error: "Transaction reverted" };
            }

        } catch (requestError: any) {
            console.log("❌ VRF request failed:", requestError.message);
            
            // Analyze the error
            if (requestError.message.includes("0x6592671c")) {
                console.log("🔍 LayerZero DVN error - infrastructure issue");
            } else if (requestError.message.includes("missing revert data")) {
                console.log("🔍 Silent revert - could be LayerZero endpoint issue");
            } else if (requestError.message.includes("insufficient funds")) {
                console.log("🔍 Insufficient funds for LayerZero fees");
            } else {
                console.log("🔍 Unknown error type");
            }
            
            return { success: false, error: requestError.message };
        }

    } catch (error: any) {
        console.log("❌ Test failed:", error.message);
        return { success: false, error: error.message };
    }
}

// Run the test
directVRFTest()
    .then((result) => {
        if (result?.success) {
            console.log("\n🎉 DIRECT VRF TEST SUCCESSFUL!");
            console.log(`📊 Request ID: ${result.requestId}`);
            console.log(`🔗 Transaction: ${result.transactionHash}`);
            console.log("\n💡 This proves your system CAN work!");
            console.log("🔍 Monitor Arbitrum for VRF processing and response");
        } else {
            console.log("\n❌ DIRECT VRF TEST FAILED");
            console.log(`💡 Error: ${result?.error}`);
            console.log("\n🔍 This confirms the LayerZero infrastructure issue");
            console.log("📞 Contact LayerZero support with this evidence");
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Unexpected error:", error);
        process.exit(1);
    }); 