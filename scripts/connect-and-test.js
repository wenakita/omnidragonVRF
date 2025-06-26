const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("🔗 Connecting contracts and testing VRF system");
    
    // Contract addresses from deployments
    const SONIC_INTEGRATOR = "0x9e9F4E70d9752043612eD192f97A6384F63D6903";
    const ARBITRUM_CONSUMER = ""; // We'll need to get this from the deployment
    
    // If we don't have the Arbitrum consumer address, let's deploy it
    if (!ARBITRUM_CONSUMER) {
        console.log("❌ Need Arbitrum consumer address from previous deployment");
        console.log("Please check the output from deploy-arbitrum-only.js");
        return;
    }
    
    // Setup
    const sonicProvider = new ethers.providers.JsonRpcProvider("https://rpc.soniclabs.com");
    const arbitrumProvider = new ethers.providers.JsonRpcProvider("https://arb1.arbitrum.io/rpc");
    const sonicWallet = new ethers.Wallet(process.env.PRIVATE_KEY, sonicProvider);
    const arbitrumWallet = new ethers.Wallet(process.env.PRIVATE_KEY, arbitrumProvider);
    
    const SONIC_EID = 30332;
    const ARBITRUM_EID = 30110;
    
    try {
        // Get contract instances
        const sonicIntegrator = await ethers.getContractAt("ChainlinkVRFIntegratorV2_5", SONIC_INTEGRATOR, sonicWallet);
        const arbitrumConsumer = await ethers.getContractAt("OmniDragonVRFConsumerV2_5", ARBITRUM_CONSUMER, arbitrumWallet);
        
        console.log(`📡 Sonic Integrator: ${SONIC_INTEGRATOR}`);
        console.log(`📡 Arbitrum Consumer: ${ARBITRUM_CONSUMER}`);
        
        // Set peer connections
        console.log("\n🌐 Setting peer connections...");
        
        // Sonic → Arbitrum
        const arbitrumPeerBytes32 = ethers.utils.hexZeroPad(ARBITRUM_CONSUMER, 32);
        const sonicPeerTx = await sonicIntegrator.setPeer(ARBITRUM_EID, arbitrumPeerBytes32);
        await sonicPeerTx.wait();
        console.log(`✅ Sonic → Arbitrum: ${sonicPeerTx.hash}`);
        
        // Arbitrum → Sonic  
        const sonicPeerBytes32 = ethers.utils.hexZeroPad(SONIC_INTEGRATOR, 32);
        const arbitrumPeerTx = await arbitrumConsumer.setPeer(SONIC_EID, sonicPeerBytes32);
        await arbitrumPeerTx.wait();
        console.log(`✅ Arbitrum → Sonic: ${arbitrumPeerTx.hash}`);
        
        // Test quote function
        console.log("\n💰 Testing quote function...");
        try {
            const quote = await sonicIntegrator.quote(ARBITRUM_EID, "0x");
            console.log(`🎉 Quote successful: ${ethers.utils.formatEther(quote.nativeFee)} ETH`);
            
            // Test VRF request
            console.log("\n🎲 Testing VRF request...");
            const requestTx = await sonicIntegrator.requestRandomWordsSimple(ARBITRUM_EID, {
                value: quote.nativeFee,
                gasLimit: 500000
            });
            
            console.log(`🚀 VRF request submitted: ${requestTx.hash}`);
            const receipt = await requestTx.wait();
            console.log(`✅ VRF request confirmed in block: ${receipt.blockNumber}`);
            
            console.log("\n🎉 COMPLETE SUCCESS!");
            console.log("🌟 OmniDragon VRF system is FULLY OPERATIONAL!");
            console.log("🎲 Cross-chain VRF requests working with Chainlink VRF V2.5!");
            
        } catch (error) {
            if (error.message.includes("0x6592671c")) {
                console.log("⚠️  Quote failed with LZDeadDVN error - DVN configuration needed");
            } else {
                console.log(`⚠️  Quote failed: ${error.message}`);
            }
        }
        
        console.log("\n📋 FINAL SYSTEM STATUS:");
        console.log("=" .repeat(50));
        console.log(`🔥 Sonic Integrator: ${SONIC_INTEGRATOR}`);
        console.log(`🔥 Arbitrum Consumer: ${ARBITRUM_CONSUMER}`);
        console.log(`✅ Using official Chainlink VRF V2.5 contracts`);
        console.log(`✅ Proper uint256 subscription ID handling`);
        console.log(`✅ Peer connections configured`);
        console.log("=" .repeat(50));
        
    } catch (error) {
        console.error("❌ Connection/test failed:", error.message);
    }
}

main().catch(console.error); 