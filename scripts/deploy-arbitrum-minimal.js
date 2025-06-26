const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Minimal Arbitrum VRF Consumer Deployment...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");

    // Configuration
    const ARBITRUM_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    const ARBITRUM_VRF_COORDINATOR = "0x50d47e4142598E3411aA864e08a44284e471AC6f";
    const PLACEHOLDER_SUBSCRIPTION_ID = 1;
    const PLACEHOLDER_KEY_HASH = "0x1234567890123456789012345678901234567890123456789012345678901234";
    
    console.log("\n📦 Getting contract factory...");
    const VRFConsumerFactory = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
    
    console.log("📦 Deploying contract...");
    console.log("- Endpoint:", ARBITRUM_ENDPOINT);
    console.log("- VRF Coordinator:", ARBITRUM_VRF_COORDINATOR);
    console.log("- Owner:", deployer.address);
    console.log("- Subscription ID:", PLACEHOLDER_SUBSCRIPTION_ID);
    console.log("- Key Hash:", PLACEHOLDER_KEY_HASH);
    
    try {
        // Just deploy, no configuration
        const vrfConsumer = await VRFConsumerFactory.deploy(
            ARBITRUM_ENDPOINT,
            deployer.address,
            ARBITRUM_VRF_COORDINATOR,
            PLACEHOLDER_SUBSCRIPTION_ID,
            PLACEHOLDER_KEY_HASH
        );
        
        console.log("⏳ Waiting for deployment to be mined...");
        await vrfConsumer.deployed();
        
        const consumerAddress = vrfConsumer.address;
        console.log("✅ VRF Consumer deployed successfully!");
        console.log("📍 Contract Address:", consumerAddress);
        
        // Verify it's working
        console.log("\n🔍 Verifying deployment...");
        const owner = await vrfConsumer.owner();
        const subscriptionId = await vrfConsumer.subscriptionId();
        const keyHash = await vrfConsumer.keyHash();
        
        console.log("- Owner:", owner);
        console.log("- Subscription ID:", subscriptionId.toString());
        console.log("- Key Hash:", keyHash);
        
        console.log("\n🎉 SUCCESS! Contract deployed and verified.");
        console.log("📍 Address:", consumerAddress);
        
        return consumerAddress;
        
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        console.error("Full error:", error);
        throw error;
    }
}

main()
    .then((address) => {
        console.log("\n✅ Deployment complete! Address:", address);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Script failed:", error.message);
        process.exit(1);
    }); 