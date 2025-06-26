import { ethers } from "hardhat";

/**
 * What Changed? Investigation
 * Since you've gotten it to connect before, let's find what's different now
 */

const SONIC_INTEGRATOR = "0x5aCd5D42605b925CEF3d8DdD9e83545E708904B4";
const ARBITRUM_CONSUMER = "0x1aFF9b2bCDe8a9c29d598c40558a23b61be78551";
const ARBITRUM_EID = 30110;
const SONIC_ENDPOINT = "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B";

async function whatChanged() {
    console.log("🔍 What Changed? Investigation");
    console.log("==============================");

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    try {
        const integrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            SONIC_INTEGRATOR
        );

        console.log("🔗 Connected to Sonic Integrator");

        // 1. Check deployment timestamps
        console.log("\n1️⃣ Checking Contract Deployment Times...");
        
        try {
            // Get contract creation transaction
            const provider = ethers.provider;
            
            // Check current block and recent activity
            const currentBlock = await provider.getBlockNumber();
            console.log("📦 Current Block:", currentBlock);
            
            // Check if there have been any recent transactions to our contracts
            console.log("🔍 Checking recent activity...");
            
            // Look at recent blocks for our contract addresses
            const recentBlocks = 100; // Check last 100 blocks
            let foundActivity = false;
            
            for (let i = 0; i < recentBlocks; i++) {
                const blockNumber = currentBlock - i;
                try {
                    const block = await provider.getBlockWithTransactions(blockNumber);
                    
                    const relevantTxs = block.transactions.filter(tx => 
                        tx.to?.toLowerCase() === SONIC_INTEGRATOR.toLowerCase() ||
                        tx.to?.toLowerCase() === SONIC_ENDPOINT.toLowerCase()
                    );
                    
                    if (relevantTxs.length > 0) {
                        console.log(`📋 Block ${blockNumber}: Found ${relevantTxs.length} relevant transactions`);
                        relevantTxs.forEach(tx => {
                            console.log(`   - TX: ${tx.hash} to ${tx.to}`);
                        });
                        foundActivity = true;
                        break;
                    }
                } catch (blockError) {
                    // Skip blocks that can't be fetched
                    continue;
                }
            }
            
            if (!foundActivity) {
                console.log("✅ No recent transactions to our contracts");
            }
            
        } catch (deployError: any) {
            console.log("❌ Cannot check deployment info:", deployError.message);
        }

        // 2. Check if libraries have changed
        console.log("\n2️⃣ Checking Library Changes...");
        
        const endpointInterface = new ethers.utils.Interface([
            "function getSendLibrary(address _sender, uint32 _dstEid) external view returns (address)",
            "function getReceiveLibrary(address _receiver, uint32 _srcEid) external view returns (address)"
        ]);

        const endpoint = new ethers.Contract(SONIC_ENDPOINT, endpointInterface, deployer);

        try {
            const currentSendLib = await endpoint.getSendLibrary(SONIC_INTEGRATOR, ARBITRUM_EID);
            const currentReceiveLib = await endpoint.getReceiveLibrary(SONIC_INTEGRATOR, ARBITRUM_EID);
            
            console.log("📚 Current Send Library:", currentSendLib);
            console.log("📖 Current Receive Library:", currentReceiveLib);
            
            // These are the libraries we expect based on our CLI output
            const expectedSendLib = "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7";
            const expectedReceiveLib = "0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043";
            
            console.log("📚 Expected Send Library:", expectedSendLib);
            console.log("📖 Expected Receive Library:", expectedReceiveLib);
            
            if (currentSendLib.toLowerCase() !== expectedSendLib.toLowerCase()) {
                console.log("❌ SEND LIBRARY CHANGED!");
                console.log("   This could be the issue!");
            } else {
                console.log("✅ Send library unchanged");
            }
            
            if (currentReceiveLib.toLowerCase() !== expectedReceiveLib.toLowerCase()) {
                console.log("❌ RECEIVE LIBRARY CHANGED!");
                console.log("   This could be the issue!");
            } else {
                console.log("✅ Receive library unchanged");
            }
            
        } catch (libError: any) {
            console.log("❌ Cannot check libraries:", libError.message);
        }

        // 3. Check peer configuration changes
        console.log("\n3️⃣ Checking Peer Configuration...");
        
        const currentPeer = await integrator.peers(ARBITRUM_EID);
        const expectedPeer = ethers.utils.hexZeroPad(ARBITRUM_CONSUMER, 32);
        
        console.log("👥 Current Peer:", currentPeer);
        console.log("👥 Expected Peer:", expectedPeer);
        
        if (currentPeer.toLowerCase() !== expectedPeer.toLowerCase()) {
            console.log("❌ PEER CONFIGURATION CHANGED!");
            console.log("   This could be the issue!");
        } else {
            console.log("✅ Peer configuration unchanged");
        }

        // 4. Check if DVN configuration changed
        console.log("\n4️⃣ Checking DVN Configuration Changes...");
        
        try {
            const sendLib = await endpoint.getSendLibrary(SONIC_INTEGRATOR, ARBITRUM_EID);
            const dvnConfig = await endpoint.getConfig(SONIC_INTEGRATOR, sendLib, ARBITRUM_EID, 2);
            
            console.log("🛡️ Current DVN Config Length:", dvnConfig.length);
            
            // If config length is 642, it should be correct based on our CLI output
            if (dvnConfig.length !== 642) {
                console.log("❌ DVN CONFIGURATION LENGTH CHANGED!");
                console.log("   Expected: 642, Got:", dvnConfig.length);
                console.log("   This could be the issue!");
            } else {
                console.log("✅ DVN configuration length unchanged");
            }
            
        } catch (dvnError: any) {
            console.log("❌ Cannot check DVN config:", dvnError.message);
        }

        // 5. Check LayerZero endpoint status
        console.log("\n5️⃣ Checking LayerZero Endpoint Status...");
        
        try {
            // Try to call a simple endpoint function
            const endpointOwner = await endpoint.owner();
            console.log("👑 Endpoint Owner:", endpointOwner);
            console.log("✅ Endpoint is responding");
        } catch (endpointError: any) {
            console.log("❌ Endpoint not responding:", endpointError.message);
            console.log("   This could indicate LayerZero infrastructure issues!");
        }

        // 6. Check for network/RPC issues
        console.log("\n6️⃣ Checking Network Status...");
        
        try {
            const gasPrice = await ethers.provider.getGasPrice();
            const balance = await deployer.getBalance();
            
            console.log("⛽ Current Gas Price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");
            console.log("💰 Deployer Balance:", ethers.utils.formatEther(balance), "ETH");
            
            if (gasPrice.gt(ethers.utils.parseUnits("1000", "gwei"))) {
                console.log("⚠️ Very high gas prices - could affect LayerZero");
            }
            
            if (balance.lt(ethers.utils.parseEther("0.01"))) {
                console.log("⚠️ Low balance - might affect transactions");
            }
            
        } catch (networkError: any) {
            console.log("❌ Network issues:", networkError.message);
        }

        // 7. Summary of potential changes
        console.log("\n🎯 What Could Have Changed?");
        console.log("===========================");
        console.log("1. 📚 LayerZero library updates/changes");
        console.log("2. 🛡️ DVN node status or configuration");
        console.log("3. 🌐 LayerZero infrastructure maintenance");
        console.log("4. ⛽ Network congestion or gas issues");
        console.log("5. 🔄 LayerZero endpoint upgrades");
        console.log("6. 👥 Peer configuration modifications");
        
        console.log("\n💡 Debugging Steps:");
        console.log("1. Try the exact same transaction that worked before");
        console.log("2. Check LayerZero status page/Discord for maintenance");
        console.log("3. Test with a different destination chain");
        console.log("4. Check if other LayerZero apps are working on Sonic");

    } catch (error: any) {
        console.log("❌ Investigation failed:", error.message);
    }

    console.log("\n🏁 Investigation completed!");
}

// Run the investigation
whatChanged()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Investigation failed:", error);
        process.exit(1);
    }); 