import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Deploying Arbitrum VRF Consumer (Low Gas Version)...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    const balance = await deployer.provider!.getBalance(deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");

    // 📍 ARBITRUM CONFIGURATION
    const ARBITRUM_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    const ARBITRUM_VRF_COORDINATOR = "0x50d47e4142598E3411aA864e08a44284e471AC6f";
    
    // 🔧 PLACEHOLDER VALUES for deployment
    const PLACEHOLDER_SUBSCRIPTION_ID = 1;
    const PLACEHOLDER_KEY_HASH = "0x1234567890123456789012345678901234567890123456789012345678901234";
    
    console.log("\n📦 Deploying OmniDragonVRFConsumerV2_5 with low gas settings...");
    
    try {
        // Deploy with lower gas settings
        const VRFConsumerFactory = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
        
        // Estimate gas first
        const deploymentData = VRFConsumerFactory.getDeployTransaction(
            ARBITRUM_ENDPOINT,
            deployer.address,
            ARBITRUM_VRF_COORDINATOR,
            PLACEHOLDER_SUBSCRIPTION_ID,
            PLACEHOLDER_KEY_HASH
        );
        
        const gasEstimate = await deployer.estimateGas(deploymentData);
        console.log("Estimated gas for deployment:", gasEstimate.toString());
        
        // Calculate cost
        const gasPrice = await deployer.provider!.getGasPrice();
        const estimatedCost = gasEstimate.mul(gasPrice);
        console.log("Estimated cost:", ethers.utils.formatEther(estimatedCost), "ETH");
        
        if (balance.lt(estimatedCost.mul(120).div(100))) { // 20% buffer
            console.log("❌ Insufficient funds for deployment");
            console.log("Need:", ethers.utils.formatEther(estimatedCost.mul(120).div(100)), "ETH");
            console.log("Have:", ethers.utils.formatEther(balance), "ETH");
            return;
        }
        
        // Deploy with manual gas settings
        const vrfConsumer = await VRFConsumerFactory.deploy(
            ARBITRUM_ENDPOINT,
            deployer.address,
            ARBITRUM_VRF_COORDINATOR,
            PLACEHOLDER_SUBSCRIPTION_ID,
            PLACEHOLDER_KEY_HASH,
            {
                gasLimit: gasEstimate.mul(110).div(100), // 10% buffer
                gasPrice: gasPrice
            }
        );
        
        console.log("⏳ Waiting for deployment...");
        const receipt = await vrfConsumer.waitForDeployment();
        const consumerAddress = await vrfConsumer.getAddress();
        
        console.log("✅ VRF Consumer deployed at:", consumerAddress);
        
        // Now do the configuration steps one by one with error handling
        console.log("\n🔧 Setting VRF configuration...");
        
        try {
            const REAL_SUBSCRIPTION_ID = "491305121677770980045195926935414299771794201414593296040592533382908180627461";
            const REAL_KEY_HASH = "0x1770bdc7eec7771f7ba4ffd640f34260d7f095b79c92d34a5b2551d6f6cfd2be";
            
            const setConfigTx = await vrfConsumer.setVRFConfig(
                REAL_SUBSCRIPTION_ID,
                REAL_KEY_HASH,
                690420, // callbackGasLimit
                3,      // requestConfirmations
                false   // nativePayment
            );
            
            await setConfigTx.wait();
            console.log("✅ VRF configuration updated!");
            
        } catch (error: any) {
            console.log("⚠️ VRF config failed:", error.message);
        }
        
        // Set peer connection
        console.log("\n🔗 Setting Sonic peer...");
        try {
            const SONIC_EID = 30332;
            const SONIC_INTEGRATOR = "0x9e9F4E70d9752043612eD192f97A6384F63D6903";
            const sonicPeerBytes32 = ethers.utils.hexZeroPad(SONIC_INTEGRATOR, 32);
            
            const setPeerTx = await vrfConsumer.setPeer(SONIC_EID, sonicPeerBytes32);
            await setPeerTx.wait();
            console.log("✅ Sonic peer set!");
            
        } catch (error: any) {
            console.log("⚠️ Peer setup failed:", error.message);
        }
        
        // Fund with smaller amount
        console.log("\n💰 Funding contract...");
        try {
            const fundTx = await vrfConsumer.fundContract({ 
                value: ethers.utils.parseEther("0.005") // Smaller funding amount
            });
            await fundTx.wait();
            console.log("✅ Contract funded with 0.005 ETH");
            
        } catch (error: any) {
            console.log("⚠️ Funding failed:", error.message);
        }
        
        console.log("\n🎉 DEPLOYMENT COMPLETE!");
        console.log("📍 Contract Address:", consumerAddress);
        
        return consumerAddress;
        
    } catch (error: any) {
        console.error("❌ Deployment failed:", error);
        
        // More specific error handling
        if (error.message.includes("insufficient funds")) {
            console.log("\n💡 Insufficient funds troubleshooting:");
            console.log("- Current balance:", ethers.utils.formatEther(balance), "ETH");
            console.log("- Try bridging more ETH to Arbitrum");
            console.log("- Or reduce gas limit in deployment");
        }
        
        throw error;
    }
}

main()
    .then((address) => {
        console.log("\n✅ Success! Contract deployed at:", address);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Failed:", error.message);
        process.exit(1);
    }); 