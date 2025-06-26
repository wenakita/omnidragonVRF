const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("🚀 Simple Fresh Deployment - OmniDragon VRF System");
    
    // Setup
    const sonicProvider = new ethers.providers.JsonRpcProvider("https://rpc.soniclabs.com");
    const arbitrumProvider = new ethers.providers.JsonRpcProvider("https://arb1.arbitrum.io/rpc");
    const sonicWallet = new ethers.Wallet(process.env.PRIVATE_KEY, sonicProvider);
    const arbitrumWallet = new ethers.Wallet(process.env.PRIVATE_KEY, arbitrumProvider);
    
    console.log(`Deploying from: ${sonicWallet.address}`);
    
    // Network configuration
    const SONIC_ENDPOINT = "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B";
    const ARBITRUM_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    const SONIC_EID = 30332;
    const ARBITRUM_EID = 30110;
    
    try {
        // Deploy Sonic Integrator
        console.log("\n📡 Deploying ChainlinkVRFIntegratorV2_5 on Sonic...");
        const SonicIntegratorFactory = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
        const sonicIntegrator = await SonicIntegratorFactory.connect(sonicWallet).deploy(
            SONIC_ENDPOINT,
            sonicWallet.address
        );
        await sonicIntegrator.deployed();
        console.log(`✅ Sonic Integrator: ${sonicIntegrator.address}`);
        
        // Deploy Arbitrum Consumer  
        console.log("\n📡 Deploying OmniDragonVRFConsumerV2_5 on Arbitrum...");
        const ArbitrumConsumerFactory = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
        
        const VRF_COORDINATOR = "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e";
        const TEMP_SUBSCRIPTION_ID = 1;
        const KEY_HASH = "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409";
        
        const arbitrumConsumer = await ArbitrumConsumerFactory.connect(arbitrumWallet).deploy(
            ARBITRUM_ENDPOINT,
            arbitrumWallet.address,
            VRF_COORDINATOR,
            TEMP_SUBSCRIPTION_ID,
            KEY_HASH
        );
        await arbitrumConsumer.deployed();
        console.log(`✅ Arbitrum Consumer: ${arbitrumConsumer.address}`);
        
        // Update subscription ID
        console.log("\n🔧 Updating subscription ID...");
        const REAL_SUBSCRIPTION_ID = ethers.BigNumber.from("491305121677770980045195926935414299771794201414593296040592533382908180627461");
        const updateTx = await arbitrumConsumer.setVRFConfig(
            REAL_SUBSCRIPTION_ID,
            KEY_HASH,
            690420,
            3,
            false
        );
        await updateTx.wait();
        console.log(`✅ Subscription ID updated`);
        
        // Set peers
        console.log("\n🌐 Setting peer connections...");
        
        const arbitrumPeerBytes32 = ethers.utils.hexZeroPad(arbitrumConsumer.address, 32);
        const sonicPeerTx = await sonicIntegrator.setPeer(ARBITRUM_EID, arbitrumPeerBytes32);
        await sonicPeerTx.wait();
        console.log(`✅ Sonic → Arbitrum peer set`);
        
        const sonicPeerBytes32 = ethers.utils.hexZeroPad(sonicIntegrator.address, 32);
        const arbitrumPeerTx = await arbitrumConsumer.setPeer(SONIC_EID, sonicPeerBytes32);
        await arbitrumPeerTx.wait();
        console.log(`✅ Arbitrum → Sonic peer set`);
        
        // Test quote
        console.log("\n💰 Testing quote function...");
        try {
            const quote = await sonicIntegrator.quote(ARBITRUM_EID, "0x");
            console.log(`🎉 Quote successful: ${ethers.utils.formatEther(quote.nativeFee)} ETH`);
            
            console.log("\n🎯 DEPLOYMENT SUCCESSFUL!");
            console.log(`Sonic Integrator: ${sonicIntegrator.address}`);
            console.log(`Arbitrum Consumer: ${arbitrumConsumer.address}`);
            
        } catch (error) {
            console.log(`⚠️  Quote failed: ${error.message}`);
            console.log("This is expected if DVN configuration needs time to propagate");
        }
        
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
    }
}

main().catch(console.error); 