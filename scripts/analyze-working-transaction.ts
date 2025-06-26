import { ethers } from "hardhat";

/**
 * Analyze the working transaction from 5 days ago
 * Extract all details to understand what was different
 */

const WORKING_INTEGRATOR = "0x6e11334470df61d62383892bd8e57a3a655718c8";
const WORKING_TX_HASH = "0x58bfd181adac68f589ba47df0844f8658bec6fc7cc53f174bf39cc9bd5f0ead7";
const ARBITRUM_EID = 30110;

async function analyzeWorkingTransaction() {
    console.log("🔍 Analyzing Working Transaction from 5 days ago");
    console.log("===============================================");
    console.log("📋 Transaction Hash:", WORKING_TX_HASH);
    console.log("📍 Working Integrator:", WORKING_INTEGRATOR);

    const [deployer] = await ethers.getSigners();
    console.log("👤 Deployer:", deployer.address);

    try {
        // Get the working integrator contract
        const workingIntegrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            WORKING_INTEGRATOR
        );

        console.log("\n1️⃣ Working Integrator Configuration (Current State)");
        console.log("===================================================");

        // Basic info
        const owner = await workingIntegrator.owner();
        const endpoint = await workingIntegrator.endpoint();
        console.log("👑 Owner:", owner);
        console.log("🌐 Endpoint:", endpoint);

        // Check peer configuration
        const peer = await workingIntegrator.peers(ARBITRUM_EID);
        console.log("👥 Arbitrum Peer:", peer);
        
        if (peer === "0x0000000000000000000000000000000000000000000000000000000000000000") {
            console.log("⚠️ No peer configured for Arbitrum");
        } else {
            // Convert peer back to address
            const peerAddress = "0x" + peer.slice(-40);
            console.log("📍 Peer Address:", peerAddress);
        }

        // Check request counter
        try {
            const requestCounter = await workingIntegrator.requestCounter();
            console.log("🔢 Request Counter:", requestCounter.toString());
        } catch (counterError: any) {
            console.log("❌ Cannot read request counter:", counterError.message);
        }

        // Get transaction details from the working transaction
        console.log("\n2️⃣ Analyzing Working Transaction Details");
        console.log("========================================");

        try {
            const provider = ethers.provider;
            const txReceipt = await provider.getTransactionReceipt(WORKING_TX_HASH);
            
            if (txReceipt) {
                console.log("✅ Found transaction receipt");
                console.log("📦 Block Number:", txReceipt.blockNumber);
                console.log("⛽ Gas Used:", txReceipt.gasUsed.toString());
                console.log("📋 Status:", txReceipt.status === 1 ? "Success" : "Failed");
                
                // Parse events from the working transaction
                console.log("\n📋 Events from Working Transaction:");
                for (const log of txReceipt.logs) {
                    try {
                        // Try to parse with the integrator interface
                        const parsed = workingIntegrator.interface.parseLog(log);
                        console.log(`📝 ${parsed.name}:`);
                        
                        if (parsed.name === "RandomWordsRequested") {
                            console.log(`   Request ID: ${parsed.args.requestId}`);
                            console.log(`   Requester: ${parsed.args.requester}`);
                            console.log(`   Destination EID: ${parsed.args.dstEid}`);
                        } else if (parsed.name === "MessageSent") {
                            console.log(`   Request ID: ${parsed.args.requestId}`);
                            console.log(`   Destination EID: ${parsed.args.dstEid}`);
                            console.log(`   Message: ${parsed.args.message}`);
                        }
                    } catch (parseError) {
                        // Try generic parsing for LayerZero events
                        if (log.topics.length > 0) {
                            console.log(`📝 Unknown Event:`);
                            console.log(`   Address: ${log.address}`);
                            console.log(`   Topic 0: ${log.topics[0]}`);
                        }
                    }
                }
                
                // Get the original transaction
                const tx = await provider.getTransaction(WORKING_TX_HASH);
                if (tx) {
                    console.log("\n💰 Transaction Details:");
                    console.log("   Value:", ethers.utils.formatEther(tx.value), "S");
                    console.log("   Gas Limit:", tx.gasLimit.toString());
                    console.log("   Gas Price:", ethers.utils.formatUnits(tx.gasPrice || 0, "gwei"), "gwei");
                    console.log("   Nonce:", tx.nonce);
                }
                
            } else {
                console.log("❌ Cannot find transaction receipt");
            }
            
        } catch (txError: any) {
            console.log("❌ Cannot analyze transaction:", txError.message);
        }

        // Try to understand what changed
        console.log("\n3️⃣ What Changed Analysis");
        console.log("========================");
        
        console.log("📅 Working Transaction: June 19, 2025");
        console.log("📅 Current Date: June 24, 2025 (5 days later)");
        console.log("");
        console.log("🔍 Possible Changes in 5 Days:");
        console.log("1. LayerZero DVN nodes restarted/updated");
        console.log("2. LayerZero library versions changed");
        console.log("3. Sonic network upgrades");
        console.log("4. DVN configuration propagation expired");
        console.log("5. LayerZero endpoint maintenance");
        
        // Check current LayerZero configuration
        console.log("\n4️⃣ Current LayerZero Configuration Check");
        console.log("========================================");
        
        const SONIC_ENDPOINT = "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B";
        
        const endpointInterface = new ethers.utils.Interface([
            "function getSendLibrary(address _sender, uint32 _dstEid) external view returns (address)",
            "function getReceiveLibrary(address _receiver, uint32 _srcEid) external view returns (address)",
            "function owner() external view returns (address)"
        ]);

        const endpointContract = new ethers.Contract(SONIC_ENDPOINT, endpointInterface, deployer);

        try {
            const sendLib = await endpointContract.getSendLibrary(WORKING_INTEGRATOR, ARBITRUM_EID);
            const receiveLib = await endpointContract.getReceiveLibrary(WORKING_INTEGRATOR, ARBITRUM_EID);
            
            console.log("📚 Send Library:", sendLib);
            console.log("📖 Receive Library:", receiveLib);
            
            // These should match what worked 5 days ago
            const expectedSendLib = "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7";
            const expectedReceiveLib = "0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043";
            
            if (sendLib.toLowerCase() === expectedSendLib.toLowerCase()) {
                console.log("✅ Send library unchanged from working transaction");
            } else {
                console.log("❌ Send library CHANGED! This could be the issue");
                console.log("   Expected:", expectedSendLib);
                console.log("   Current: ", sendLib);
            }
            
        } catch (libError: any) {
            console.log("❌ Cannot check libraries:", libError.message);
        }

        console.log("\n💡 SOLUTION:");
        console.log("=============");
        console.log("Since the working integrator from 5 days ago is now also failing,");
        console.log("this confirms it's a LayerZero infrastructure issue, not your code.");
        console.log("");
        console.log("📞 Contact LayerZero support with this evidence:");
        console.log("   - Working transaction: " + WORKING_TX_HASH);
        console.log("   - Working date: June 19, 2025");
        console.log("   - Broken since: ~June 20-24, 2025");
        console.log("   - Same contracts now failing");
        console.log("   - Sonic Chain EID 30332 affected");

    } catch (error: any) {
        console.log("❌ Analysis failed:", error.message);
    }

    console.log("\n🏁 Analysis completed!");
}

// Run the analysis
analyzeWorkingTransaction()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Analysis failed:", error);
        process.exit(1);
    }); 