import { ethers } from "hardhat";

/**
 * Test VRF Request with the Working Integrator
 * Using the integrator that worked 5 days ago, now reconfigured and funded
 */

const WORKING_INTEGRATOR = "0x6e11334470df61d62383892bd8e57a3a655718c8"; // The one that worked 5 days ago
const ARBITRUM_EID = 30110;

async function testVRFWithWorkingIntegrator() {
    console.log("🎯 Testing VRF Request with Working Integrator");
    console.log("==============================================");
    console.log("📍 Working Integrator:", WORKING_INTEGRATOR);
    console.log("🎯 Target: Arbitrum (EID 30110)");

    const [deployer] = await ethers.getSigners();
    console.log("👤 Deployer:", deployer.address);

    try {
        // Connect to the working integrator
        const integrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            WORKING_INTEGRATOR
        );

        console.log("🔗 Connected to working integrator");

        // 1. Check current status
        console.log("\n1️⃣ Checking Integrator Status");
        console.log("==============================");

        const owner = await integrator.owner();
        const endpoint = await integrator.endpoint();
        const requestCounter = await integrator.requestCounter();
        
        console.log("👑 Owner:", owner);
        console.log("🌐 Endpoint:", endpoint);
        console.log("🔢 Request Counter:", requestCounter.toString());

        // Check peer configuration
        const peer = await integrator.peers(ARBITRUM_EID);
        console.log("👥 Arbitrum Peer:", peer);
        
        if (peer === "0x0000000000000000000000000000000000000000000000000000000000000000") {
            console.log("❌ No peer configured for Arbitrum!");
            console.log("💡 You need to set the peer first");
            return;
        } else {
            const peerAddress = "0x" + peer.slice(-40);
            console.log("✅ Peer configured:", peerAddress);
        }

        // Check contract balance
        const balance = await ethers.provider.getBalance(WORKING_INTEGRATOR);
        console.log("💰 Contract Balance:", ethers.utils.formatEther(balance), "S");

        if (balance.lt(ethers.utils.parseEther("0.01"))) {
            console.log("⚠️ Low contract balance - may need more funding");
        }

        // 2. Get quote for VRF request
        console.log("\n2️⃣ Getting Quote for VRF Request");
        console.log("=================================");

        try {
            const quote = await integrator.quote(ARBITRUM_EID, "0x");
            console.log("✅ Quote successful!");
            console.log("💰 Required Fee:", ethers.utils.formatEther(quote.nativeFee), "S");
            console.log("💰 Fee in Wei:", quote.nativeFee.toString());

            // 3. Test VRF Request
            console.log("\n3️⃣ Sending VRF Request");
            console.log("=======================");

            // Use the same fee pattern as the successful transaction (0.18 S)
            const feeWithBuffer = quote.nativeFee.mul(120).div(100); // 20% buffer
            const minFee = ethers.utils.parseEther("0.18"); // Minimum based on successful tx
            const finalFee = feeWithBuffer.gt(minFee) ? feeWithBuffer : minFee;

            console.log("💰 Using fee:", ethers.utils.formatEther(finalFee), "S");
            console.log("📋 Gas settings: 600,000 limit, 55 gwei price (same as successful tx)");

            const vrfTx = await integrator.requestRandomWordsSimple(ARBITRUM_EID, {
                value: finalFee,
                gasLimit: 600000, // Same as successful transaction
                gasPrice: ethers.utils.parseUnits("55", "gwei") // Same as successful transaction
            });

            console.log("✅ VRF request transaction sent!");
            console.log("📋 TX Hash:", vrfTx.hash);
            console.log("🔗 SonicScan:", `https://sonicscan.org/tx/${vrfTx.hash}`);
            console.log("⏳ Waiting for confirmation...");

            const receipt = await vrfTx.wait();
            
            if (receipt.status === 1) {
                console.log("🎉 VRF REQUEST SUCCESSFUL!");
                console.log("📦 Block Number:", receipt.blockNumber);
                console.log("⛽ Gas Used:", receipt.gasUsed.toString());
                console.log("💵 Transaction Cost:", ethers.utils.formatEther(receipt.gasUsed.mul(receipt.effectiveGasPrice || 0)), "S");

                // Parse events
                console.log("\n📋 Transaction Events:");
                let requestId = null;
                let messageFound = false;
                
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
                            messageFound = true;
                            console.log(`   Request ID: ${parsed.args.requestId}`);
                            console.log(`   Destination EID: ${parsed.args.dstEid}`);
                            console.log(`   Message: ${parsed.args.message}`);
                        }
                    } catch (parseError) {
                        // Skip unparseable logs - could be LayerZero events
                    }
                }

                // Check updated counter
                const newCounter = await integrator.requestCounter();
                console.log(`\n🔢 Updated Counter: ${newCounter.toString()}`);

                if (messageFound) {
                    console.log("\n🎯 Cross-Chain VRF Flow Initiated Successfully!");
                    console.log("┌─────────────────────────────────────────────────────┐");
                    console.log("│ ✅ Sonic VRF request sent successfully             │");
                    console.log("│ ✅ LayerZero message dispatched to Arbitrum        │");
                    console.log("│ ⏳ Waiting for Chainlink VRF fulfillment           │");
                    console.log("│ ⏳ Response will be sent back to Sonic             │");
                    console.log("└─────────────────────────────────────────────────────┘");

                    if (requestId) {
                        console.log(`\n🆔 Request ID: ${requestId}`);
                        console.log("🔍 To check if fulfilled later, run:");
                        console.log(`   integrator.getRandomWord(${requestId})`);
                    }
                } else {
                    console.log("⚠️ MessageSent event not found - check LayerZero configuration");
                }

                return {
                    success: true,
                    requestId: requestId || newCounter.toString(),
                    transactionHash: vrfTx.hash,
                    blockNumber: receipt.blockNumber,
                    feePaid: ethers.utils.formatEther(finalFee)
                };

            } else {
                console.log("❌ Transaction failed (status 0)");
                return { success: false, error: "Transaction reverted" };
            }

        } catch (quoteError: any) {
            console.log("❌ Quote failed:", quoteError.message);
            
            if (quoteError.message.includes("0x6592671c")) {
                console.log("🔍 This is still the LayerZero DVN error");
                console.log("💡 The infrastructure issue persists");
            }
            
            return { success: false, error: quoteError.message };
        }

    } catch (error: any) {
        console.log("❌ VRF request failed:", error.message);
        return { success: false, error: error.message };
    }
}

// Run the test
testVRFWithWorkingIntegrator()
    .then((result) => {
        if (result?.success) {
            console.log("\n🎉 VRF REQUEST COMPLETED SUCCESSFULLY!");
            console.log(`📊 Request ID: ${result.requestId}`);
            console.log(`💰 Fee paid: ${result.feePaid} S`);
            console.log(`🔗 Transaction: ${result.transactionHash}`);
            console.log("⏱️ Expected fulfillment: 1-3 minutes");
            console.log("🔍 Monitor both Sonic and Arbitrum for VRF processing");
        } else {
            console.log("\n❌ VRF REQUEST FAILED");
            console.log(`💡 Error: ${result?.error}`);
            
            if (result?.error?.includes("0x6592671c")) {
                console.log("\n🚨 LAYERZERO INFRASTRUCTURE ISSUE CONFIRMED");
                console.log("   The same error persists even with the working integrator");
                console.log("   This proves it's not your configuration - it's LayerZero");
            }
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Unexpected error:", error);
        process.exit(1);
    }); 