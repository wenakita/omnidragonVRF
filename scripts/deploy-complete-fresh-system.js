const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("🚀 COMPLETE FRESH DEPLOYMENT - OmniDragon VRF System");
    console.log("=" .repeat(60));
    
    // Setup providers and wallets
    const sonicProvider = new ethers.providers.JsonRpcProvider("https://rpc.soniclabs.com");
    const arbitrumProvider = new ethers.providers.JsonRpcProvider("https://arb1.arbitrum.io/rpc");
    const sonicWallet = new ethers.Wallet(process.env.PRIVATE_KEY, sonicProvider);
    const arbitrumWallet = new ethers.Wallet(process.env.PRIVATE_KEY, arbitrumProvider);
    
    console.log(`Deploying from wallet: ${sonicWallet.address}`);
    
    // Network configuration
    const SONIC_ENDPOINT = "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B";
    const ARBITRUM_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    const SONIC_EID = 30332;
    const ARBITRUM_EID = 30110;
    
    let sonicIntegrator, arbitrumConsumer;
    
    try {
        // STEP 1: Deploy Sonic Integrator
        console.log("\n📡 STEP 1: Deploying ChainlinkVRFIntegratorV2_5 on Sonic...");
        const SonicIntegratorFactory = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
        sonicIntegrator = await SonicIntegratorFactory.connect(sonicWallet).deploy(
            SONIC_ENDPOINT,
            sonicWallet.address,
            {
                gasLimit: 3000000,
                gasPrice: ethers.utils.parseUnits("100", "gwei")
            }
        );
        await sonicIntegrator.deployed();
        console.log(`✅ Sonic Integrator deployed: ${sonicIntegrator.address}`);
        
        // STEP 2: Deploy Arbitrum Consumer
        console.log("\n📡 STEP 2: Deploying OmniDragonVRFConsumerV2_5 on Arbitrum...");
        const ArbitrumConsumerFactory = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
        
        // Arbitrum VRF 2.5 configuration
        const VRF_COORDINATOR = "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e";
        const TEMP_SUBSCRIPTION_ID = 1; // Temporary ID for deployment - will update after
        const KEY_HASH = "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409"; // Arbitrum VRF key hash
        
        arbitrumConsumer = await ArbitrumConsumerFactory.connect(arbitrumWallet).deploy(
            ARBITRUM_ENDPOINT,
            arbitrumWallet.address,
            VRF_COORDINATOR,
            TEMP_SUBSCRIPTION_ID, // Temporary subscription ID
            KEY_HASH,
            {
                gasLimit: 3000000,
                gasPrice: ethers.utils.parseUnits("0.1", "gwei")
            }
        );
        await arbitrumConsumer.deployed();
        console.log(`✅ Arbitrum Consumer deployed: ${arbitrumConsumer.address}`);
        
        // STEP 2.1: Update subscription ID to the correct value
        console.log("\n🔧 STEP 2.1: Updating subscription ID to correct value...");
        const REAL_SUBSCRIPTION_ID = ethers.BigNumber.from("491305121677770980045195926935414299771794201414593296040592533382908180627461");
        const updateConfigTx = await arbitrumConsumer.setVRFConfig(
            REAL_SUBSCRIPTION_ID,
            KEY_HASH,
            690420, // callbackGasLimit
            3,      // requestConfirmations
            false   // nativePayment (use LINK)
        );
        await updateConfigTx.wait();
        console.log(`✅ Subscription ID updated: ${updateConfigTx.hash}`);
        
        // STEP 3: Set delegates on both contracts
        console.log("\n🔗 STEP 3: Setting delegates...");
        
        const sonicDelegateTx = await sonicIntegrator.setDelegate(sonicWallet.address, { gasLimit: 200000 });
        await sonicDelegateTx.wait();
        console.log(`✅ Sonic delegate set: ${sonicDelegateTx.hash}`);
        
        const arbitrumDelegateTx = await arbitrumConsumer.setDelegate(arbitrumWallet.address, { gasLimit: 200000 });
        await arbitrumDelegateTx.wait();
        console.log(`✅ Arbitrum delegate set: ${arbitrumDelegateTx.hash}`);
        
        // STEP 4: Set peer connections
        console.log("\n🌐 STEP 4: Setting peer connections...");
        
        // Sonic → Arbitrum
        const arbitrumPeerBytes32 = ethers.utils.hexZeroPad(arbitrumConsumer.address, 32);
        const sonicPeerTx = await sonicIntegrator.setPeer(ARBITRUM_EID, arbitrumPeerBytes32, { gasLimit: 200000 });
        await sonicPeerTx.wait();
        console.log(`✅ Sonic → Arbitrum peer set: ${sonicPeerTx.hash}`);
        
        // Arbitrum → Sonic
        const sonicPeerBytes32 = ethers.utils.hexZeroPad(sonicIntegrator.address, 32);
        const arbitrumPeerTx = await arbitrumConsumer.setPeer(SONIC_EID, sonicPeerBytes32, { gasLimit: 200000 });
        await arbitrumPeerTx.wait();
        console.log(`✅ Arbitrum → Sonic peer set: ${arbitrumPeerTx.hash}`);
        
        // STEP 5: Test quote function immediately (before DVN config)
        console.log("\n💰 STEP 5: Testing quote function on fresh deployments...");
        try {
            const sonicQuote = await sonicIntegrator.quote(ARBITRUM_EID, "0x");
            console.log("🎉 SUCCESS! Sonic quote working on fresh deployment:");
            console.log(`  Native fee: ${ethers.utils.formatEther(sonicQuote.nativeFee)} ETH`);
            
            // Test VRF request immediately
            console.log("\n🎲 Testing VRF request on fresh system...");
            const requestTx = await sonicIntegrator.requestRandomWordsSimple(ARBITRUM_EID, {
                value: sonicQuote.nativeFee,
                gasLimit: 500000
            });
            
            console.log(`🚀 VRF request submitted: ${requestTx.hash}`);
            const receipt = await requestTx.wait();
            console.log(`✅ VRF request confirmed in block: ${receipt.blockNumber}`);
            
            // Extract request ID from events
            const requestEvent = receipt.events?.find(e => e.event === 'RandomWordsRequested');
            if (requestEvent) {
                const requestId = requestEvent.args[0];
                console.log(`🎯 Request ID: ${requestId}`);
                console.log("\n🎉 COMPLETE SUCCESS!");
                console.log("🌟 Fresh deployment works WITHOUT DVN configuration!");
                console.log("🎲 OmniDragon cross-chain VRF system is FULLY OPERATIONAL!");
            }
            
        } catch (error) {
            if (error.message.includes("0x6592671c")) {
                console.log("❌ Fresh deployment still has LZDeadDVN error");
                console.log("   Will proceed with DVN configuration...");
            } else {
                console.log(`❌ Different error: ${error.message}`);
            }
        }
        
        // STEP 6: Output deployment summary
        console.log("\n📋 FRESH DEPLOYMENT SUMMARY:");
        console.log("=" .repeat(50));
        console.log(`🔥 Sonic Integrator (FRESH): ${sonicIntegrator.address}`);
        console.log(`🔥 Arbitrum Consumer (FRESH): ${arbitrumConsumer.address}`);
        console.log(`🌐 Sonic EID: ${SONIC_EID}`);
        console.log(`🌐 Arbitrum EID: ${ARBITRUM_EID}`);
        console.log(`✅ Peer connections: Bidirectional`);
        console.log(`✅ Delegates: Set on both contracts`);
        console.log("=" .repeat(50));
        
        // Save addresses for next steps
        console.log("\n🔄 NEXT STEPS:");
        console.log("1. Update LayerZero configuration file with new addresses");
        console.log("2. Apply DVN configuration if needed");
        console.log("3. Test VRF requests");
        
        // Write addresses to file for easy access
        const deploymentInfo = {
            sonic: {
                address: sonicIntegrator.address,
                eid: SONIC_EID,
                endpoint: SONIC_ENDPOINT
            },
            arbitrum: {
                address: arbitrumConsumer.address,
                eid: ARBITRUM_EID,
                endpoint: ARBITRUM_ENDPOINT
            },
            timestamp: new Date().toISOString()
        };
        
        require('fs').writeFileSync(
            'fresh-deployment-addresses.json',
            JSON.stringify(deploymentInfo, null, 2)
        );
        console.log("\n📄 Addresses saved to: fresh-deployment-addresses.json");
        
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        if (error.transaction) {
            console.error("Transaction:", error.transaction);
        }
    }
}

main().catch(console.error); 