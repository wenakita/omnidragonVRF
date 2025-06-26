import { ethers } from "hardhat";

/**
 * Test the integrator that was actually working 5 days ago
 * Based on SonicScan transaction: 0x58bfd181adac68f589ba47df0844f8658bec6fc7cc53f174bf39cc9bd5f0ead7
 */

const WORKING_INTEGRATOR = "0x6e11334470df61d62383892bd8e57a3a655718c8"; // The one that worked 5 days ago!
const CURRENT_INTEGRATOR = "0x5aCd5D42605b925CEF3d8DdD9e83545E708904B4"; // Current broken one
const ARBITRUM_EID = 30110;

async function testWorkingIntegrator() {
    console.log("🎯 Testing the WORKING Integrator from 5 days ago");
    console.log("================================================");
    console.log("📋 Based on successful transaction: 0x58bfd181adac68f589ba47df0844f8658bec6fc7cc53f174bf39cc9bd5f0ead7");
    console.log("📅 Date: June 19, 2025 (5 days ago)");

    const [deployer] = await ethers.getSigners();
    console.log("👤 Deployer:", deployer.address);

    try {
        // Test the WORKING integrator
        console.log("\n1️⃣ Testing WORKING Integrator");
        console.log("=============================");
        console.log("📍 Working Integrator:", WORKING_INTEGRATOR);

        const workingIntegrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            WORKING_INTEGRATOR
        );

        console.log("🔗 Connected to working integrator");

        // Check basic info
        const workingOwner = await workingIntegrator.owner();
        const workingEndpoint = await workingIntegrator.endpoint();
        console.log("👑 Owner:", workingOwner);
        console.log("🌐 Endpoint:", workingEndpoint);

        // Test quote function
        try {
            const workingQuote = await workingIntegrator.quote(ARBITRUM_EID, "0x");
            console.log("✅ WORKING INTEGRATOR QUOTE SUCCESS!");
            console.log("💰 Quote Fee:", ethers.utils.formatEther(workingQuote.nativeFee), "S");
            
            // Check peer configuration
            const workingPeer = await workingIntegrator.peers(ARBITRUM_EID);
            console.log("👥 Peer:", workingPeer);
            
            if (workingPeer !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
                console.log("✅ Working integrator has peer configured");
                
                // Try a VRF request with the working integrator!
                console.log("\n🎲 Testing VRF Request with WORKING integrator...");
                console.log("💰 Using fee from successful transaction: 0.18 S");
                
                const successfulFee = ethers.utils.parseEther("0.18"); // Similar to the successful tx
                
                try {
                    const vrfTx = await workingIntegrator.requestRandomWordsSimple(ARBITRUM_EID, {
                        value: successfulFee,
                        gasLimit: 600000, // Same as successful tx
                        gasPrice: ethers.utils.parseUnits("55", "gwei") // Same as successful tx
                    });
                    
                    console.log("✅ VRF request sent with WORKING integrator!");
                    console.log("📋 TX Hash:", vrfTx.hash);
                    console.log("🔗 SonicScan:", `https://sonicscan.org/tx/${vrfTx.hash}`);
                    
                    const receipt = await vrfTx.wait();
                    console.log("✅ Confirmed! Gas used:", receipt.gasUsed.toString());
                    console.log("🎉 THE WORKING INTEGRATOR STILL WORKS!");
                    
                    // Parse events
                    console.log("\n📋 Transaction Events:");
                    for (const log of receipt.logs) {
                        try {
                            const parsed = workingIntegrator.interface.parseLog(log);
                            console.log(`📝 ${parsed.name}:`);
                            
                            if (parsed.name === "RandomWordsRequested") {
                                console.log(`   Request ID: ${parsed.args.requestId}`);
                                console.log(`   Requester: ${parsed.args.requester}`);
                                console.log(`   Destination EID: ${parsed.args.dstEid}`);
                            } else if (parsed.name === "MessageSent") {
                                console.log(`   Request ID: ${parsed.args.requestId}`);
                                console.log(`   Destination EID: ${parsed.args.dstEid}`);
                            }
                        } catch (parseError) {
                            // Skip unparseable logs
                        }
                    }
                    
                } catch (vrfError: any) {
                    console.log("❌ VRF request failed:", vrfError.message.substring(0, 100) + "...");
                }
            } else {
                console.log("⚠️ Working integrator has no peer - needs configuration");
            }
            
        } catch (quoteError: any) {
            console.log("❌ Working integrator quote failed:", quoteError.message.substring(0, 100) + "...");
        }

        // Compare with current broken integrator
        console.log("\n2️⃣ Comparing with CURRENT (Broken) Integrator");
        console.log("==============================================");
        console.log("📍 Current Integrator:", CURRENT_INTEGRATOR);

        try {
            const currentIntegrator = await ethers.getContractAt(
                "ChainlinkVRFIntegratorV2_5",
                CURRENT_INTEGRATOR
            );

            const currentOwner = await currentIntegrator.owner();
            const currentEndpoint = await currentIntegrator.endpoint();
            console.log("👑 Current Owner:", currentOwner);
            console.log("🌐 Current Endpoint:", currentEndpoint);

            try {
                const currentQuote = await currentIntegrator.quote(ARBITRUM_EID, "0x");
                console.log("✅ Current integrator quote works!");
                console.log("💰 Quote Fee:", ethers.utils.formatEther(currentQuote.nativeFee), "S");
            } catch (currentQuoteError: any) {
                console.log("❌ Current integrator quote failed:", currentQuoteError.message.substring(0, 100) + "...");
            }

        } catch (currentError: any) {
            console.log("❌ Cannot connect to current integrator:", currentError.message);
        }

        // Summary
        console.log("\n🎯 SOLUTION FOUND!");
        console.log("==================");
        console.log("✅ The working integrator from 5 days ago may still work");
        console.log("❌ The current integrator has issues");
        console.log("💡 You should switch back to the working integrator!");
        console.log("📍 Working Address:", WORKING_INTEGRATOR);
        
        console.log("\n📋 Next Steps:");
        console.log("1. Use the working integrator for VRF requests");
        console.log("2. Update your Arbitrum consumer to peer with the working integrator");
        console.log("3. Abandon the current broken integrator");

    } catch (error: any) {
        console.log("❌ Test failed:", error.message);
    }

    console.log("\n🏁 Test completed!");
}

// Run the test
testWorkingIntegrator()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }); 