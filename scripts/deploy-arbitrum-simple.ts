import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Deploying Arbitrum VRF Consumer with placeholder values...");
    
    // Check if we have signers configured
    const signers = await ethers.getSigners();
    if (signers.length === 0) {
        console.error("❌ No signers available. Please configure your private key in hardhat.config.ts");
        return;
    }
    
    const [deployer] = signers;
    console.log("Deploying with account:", deployer.address);
    
    try {
        const balance = await deployer.provider!.getBalance(deployer.address);
        console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");
    } catch (error) {
        console.log("Could not fetch balance:", error);
    }

    // 📍 ARBITRUM CONFIGURATION
    const ARBITRUM_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    const ARBITRUM_VRF_COORDINATOR = "0x50d47e4142598E3411aA864e08a44284e471AC6f";
    
    // 🔧 PLACEHOLDER VALUES for deployment
    const PLACEHOLDER_SUBSCRIPTION_ID = 1; // Simple placeholder
    const PLACEHOLDER_KEY_HASH = "0x1234567890123456789012345678901234567890123456789012345678901234"; // 32-byte placeholder
    
    console.log("\n📦 Deploying OmniDragonVRFConsumerV2_5...");
    console.log("- Endpoint:", ARBITRUM_ENDPOINT);
    console.log("- VRF Coordinator:", ARBITRUM_VRF_COORDINATOR);
    console.log("- Owner:", deployer.address);
    console.log("- Placeholder Subscription ID:", PLACEHOLDER_SUBSCRIPTION_ID);
    console.log("- Placeholder Key Hash:", PLACEHOLDER_KEY_HASH);
    
    // Deploy with placeholder values
    const VRFConsumerFactory = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
    
    const vrfConsumer = await VRFConsumerFactory.deploy(
        ARBITRUM_ENDPOINT,
        deployer.address,
        ARBITRUM_VRF_COORDINATOR,
        PLACEHOLDER_SUBSCRIPTION_ID,
        PLACEHOLDER_KEY_HASH
    );
    
    console.log("⏳ Waiting for deployment...");
    await vrfConsumer.waitForDeployment();
    const consumerAddress = await vrfConsumer.getAddress();
    
    console.log("✅ VRF Consumer deployed at:", consumerAddress);
    
    // 🔧 NOW SET THE REAL VRF CONFIGURATION
    console.log("\n🔧 Setting real VRF configuration...");
    
    // REAL Chainlink VRF 2.5 values for Arbitrum
    const REAL_SUBSCRIPTION_ID = "491305121677770980045195926935414299771794201414593296040592533382908180627461";
    const REAL_KEY_HASH = "0x1770bdc7eec7771f7ba4ffd640f34260d7f095b79c92d34a5b2551d6f6cfd2be"; // 500 gwei key hash
    const CALLBACK_GAS_LIMIT = 690420;
    const REQUEST_CONFIRMATIONS = 3;
    const NATIVE_PAYMENT = false; // Use LINK tokens
    
    console.log("Setting VRF config with:");
    console.log("- Subscription ID:", REAL_SUBSCRIPTION_ID);
    console.log("- Key Hash:", REAL_KEY_HASH);
    console.log("- Callback Gas Limit:", CALLBACK_GAS_LIMIT);
    console.log("- Request Confirmations:", REQUEST_CONFIRMATIONS);
    console.log("- Native Payment:", NATIVE_PAYMENT);
    
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
    
    // 🔗 SET SONIC PEER CONNECTION
    console.log("\n🔗 Setting Sonic peer connection...");
    const SONIC_EID = 30332;
    const SONIC_INTEGRATOR = "0x9e9F4E70d9752043612eD192f97A6384F63D6903"; // Latest deployed integrator
    
    // Convert to 32-byte format
    const sonicPeerBytes32 = ethers.utils.hexZeroPad(SONIC_INTEGRATOR, 32);
    console.log("- Sonic EID:", SONIC_EID);
    console.log("- Sonic Integrator:", SONIC_INTEGRATOR);
    console.log("- Peer bytes32:", sonicPeerBytes32);
    
    const setPeerTx = await vrfConsumer.setPeer(SONIC_EID, sonicPeerBytes32);
    console.log("⏳ Waiting for peer setup transaction...");
    await setPeerTx.wait();
    console.log("✅ Sonic peer set successfully!");
    
    // 💰 FUND CONTRACT
    console.log("\n💰 Funding contract with ETH for LayerZero fees...");
    const fundTx = await vrfConsumer.fundContract({ value: ethers.utils.parseEther("0.01") });
    console.log("⏳ Waiting for funding transaction...");
    await fundTx.wait();
    console.log("✅ Contract funded with 0.01 ETH");
    
    // 📊 VERIFY DEPLOYMENT
    console.log("\n📊 Verifying deployment...");
    const contractStatus = await vrfConsumer.getContractStatus();
    console.log("Contract balance:", ethers.utils.formatEther(contractStatus.balance), "ETH");
    console.log("Minimum balance:", ethers.utils.formatEther(contractStatus.minBalance), "ETH");
    console.log("Can send responses:", contractStatus.canSendResponses);
    console.log("Default gas limit:", contractStatus.gasLimit.toString());
    console.log("Supported chains count:", contractStatus.supportedChainsCount.toString());
    
    // Check VRF config
    const subscriptionId = await vrfConsumer.subscriptionId();
    const keyHash = await vrfConsumer.keyHash();
    console.log("Subscription ID:", subscriptionId.toString());
    console.log("Key Hash:", keyHash);
    
    console.log("\n🎉 DEPLOYMENT COMPLETE!");
    console.log("📍 Arbitrum VRF Consumer:", consumerAddress);
    console.log("🔧 VRF configuration set with real values");
    console.log("🔗 Sonic peer connection established");
    console.log("💰 Contract funded and ready for use");
    
    return {
        consumerAddress,
        subscriptionId: subscriptionId.toString(),
        keyHash
    };
}

main()
    .then((result) => {
        console.log("\n✅ Deployment successful:", result);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }); 