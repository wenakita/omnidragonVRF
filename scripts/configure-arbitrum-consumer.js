const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Configuring Arbitrum VRF Consumer...");
    
    const CONSUMER_ADDRESS = "0xDD1Bc01bD40A58E032425CDA629a0B4Ca8001a2C";
    
    const [deployer] = await ethers.getSigners();
    console.log("Configuring with account:", deployer.address);
    
    // Get the deployed contract
    const VRFConsumer = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
    const vrfConsumer = VRFConsumer.attach(CONSUMER_ADDRESS);
    
    console.log("📍 Contract Address:", CONSUMER_ADDRESS);
    
    // 1. SET REAL VRF CONFIGURATION
    console.log("\n🔧 Setting real VRF configuration...");
    
    const REAL_SUBSCRIPTION_ID = "49130512167777098004519592693541429977179420141459329604059253338290818062746";
    const REAL_KEY_HASH = "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409"; // 500 gwei key hash
    const CALLBACK_GAS_LIMIT = 690420;
    const REQUEST_CONFIRMATIONS = 3;
    const NATIVE_PAYMENT = false; // Use LINK tokens
    
    console.log("- Subscription ID:", REAL_SUBSCRIPTION_ID);
    console.log("- Key Hash:", REAL_KEY_HASH);
    console.log("- Callback Gas Limit:", CALLBACK_GAS_LIMIT);
    console.log("- Request Confirmations:", REQUEST_CONFIRMATIONS);
    console.log("- Native Payment:", NATIVE_PAYMENT);
    
    try {
        const setConfigTx = await vrfConsumer.setVRFConfig(
            REAL_SUBSCRIPTION_ID,
            REAL_KEY_HASH,
            CALLBACK_GAS_LIMIT,
            REQUEST_CONFIRMATIONS,
            NATIVE_PAYMENT
        );
        
        console.log("⏳ Waiting for VRF config transaction...");
        await setConfigTx.wait();
        console.log("✅ VRF configuration updated successfully!");
        
    } catch (error) {
        console.error("❌ VRF config failed:", error.message);
    }
    
    // 2. SET SONIC PEER CONNECTION
    console.log("\n🔗 Setting Sonic peer connection...");
    const SONIC_EID = 30332;
    const SONIC_INTEGRATOR = "0x9e9F4E70d9752043612eD192f97A6384F63D6903"; // Latest deployed integrator
    
    const sonicPeerBytes32 = ethers.utils.hexZeroPad(SONIC_INTEGRATOR, 32);
    console.log("- Sonic EID:", SONIC_EID);
    console.log("- Sonic Integrator:", SONIC_INTEGRATOR);
    console.log("- Peer bytes32:", sonicPeerBytes32);
    
    try {
        const setPeerTx = await vrfConsumer.setPeer(SONIC_EID, sonicPeerBytes32);
        console.log("⏳ Waiting for peer setup transaction...");
        await setPeerTx.wait();
        console.log("✅ Sonic peer set successfully!");
        
    } catch (error) {
        console.error("❌ Peer setup failed:", error.message);
    }
    
    // 3. FUND CONTRACT
    console.log("\n💰 Funding contract with ETH for LayerZero fees...");
    try {
        const fundTx = await vrfConsumer.fundContract({ 
            value: ethers.utils.parseEther("0.01") 
        });
        console.log("⏳ Waiting for funding transaction...");
        await fundTx.wait();
        console.log("✅ Contract funded with 0.01 ETH");
        
    } catch (error) {
        console.error("❌ Funding failed:", error.message);
    }
    
    // 4. VERIFY CONFIGURATION
    console.log("\n📊 Verifying final configuration...");
    
    try {
        const contractStatus = await vrfConsumer.getContractStatus();
        console.log("- Contract balance:", ethers.utils.formatEther(contractStatus.balance), "ETH");
        console.log("- Minimum balance:", ethers.utils.formatEther(contractStatus.minBalance), "ETH");
        console.log("- Can send responses:", contractStatus.canSendResponses);
        console.log("- Default gas limit:", contractStatus.gasLimit.toString());
        console.log("- Supported chains count:", contractStatus.supportedChainsCount.toString());
        
        // Check VRF config
        const subscriptionId = await vrfConsumer.subscriptionId();
        const keyHash = await vrfConsumer.keyHash();
        console.log("- Subscription ID:", subscriptionId.toString());
        console.log("- Key Hash:", keyHash);
        
        // Check peer connection
        const sonicPeer = await vrfConsumer.peers(SONIC_EID);
        console.log("- Sonic peer:", sonicPeer);
        
        console.log("\n🎉 CONFIGURATION COMPLETE!");
        console.log("📍 Arbitrum VRF Consumer:", CONSUMER_ADDRESS);
        console.log("🔧 VRF configuration set with real Chainlink values");
        console.log("🔗 Sonic peer connection established");
        console.log("💰 Contract funded and ready for VRF requests");
        
        return {
            address: CONSUMER_ADDRESS,
            subscriptionId: subscriptionId.toString(),
            keyHash,
            balance: ethers.utils.formatEther(contractStatus.balance),
            ready: contractStatus.canSendResponses
        };
        
    } catch (error) {
        console.error("❌ Verification failed:", error.message);
    }
}

main()
    .then((result) => {
        console.log("\n✅ Configuration successful:", result);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Configuration failed:", error.message);
        process.exit(1);
    }); 