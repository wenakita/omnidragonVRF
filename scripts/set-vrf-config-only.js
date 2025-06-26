const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Setting VRF Configuration Only...");
    
    const CONSUMER_ADDRESS = "0xDD1Bc01bD40A58E032425CDA629a0B4Ca8001a2C";
    
    const [deployer] = await ethers.getSigners();
    console.log("Configuring with account:", deployer.address);
    
    // Check balance first
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");
    
    // Get the deployed contract
    const VRFConsumer = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
    const vrfConsumer = VRFConsumer.attach(CONSUMER_ADDRESS);
    
    console.log("📍 Contract Address:", CONSUMER_ADDRESS);
    
    // Check current VRF config
    console.log("\n📊 Current VRF Configuration:");
    const currentSubId = await vrfConsumer.subscriptionId();
    const currentKeyHash = await vrfConsumer.keyHash();
    console.log("- Current Subscription ID:", currentSubId.toString());
    console.log("- Current Key Hash:", currentKeyHash);
    
    // SET REAL VRF CONFIGURATION
    console.log("\n🔧 Setting real VRF configuration...");
    
    const REAL_SUBSCRIPTION_ID = "49130512167777098004519592693541429977179420141459329604059253338290818062746";
    const REAL_KEY_HASH = "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409";
    const CALLBACK_GAS_LIMIT = 690420;
    const REQUEST_CONFIRMATIONS = 3;
    const NATIVE_PAYMENT = false; // Use LINK tokens
    
    console.log("New configuration:");
    console.log("- Subscription ID:", REAL_SUBSCRIPTION_ID);
    console.log("- Key Hash:", REAL_KEY_HASH);
    console.log("- Callback Gas Limit:", CALLBACK_GAS_LIMIT);
    console.log("- Request Confirmations:", REQUEST_CONFIRMATIONS);
    console.log("- Native Payment:", NATIVE_PAYMENT);
    
    try {
        // Estimate gas first
        const gasEstimate = await vrfConsumer.estimateGas.setVRFConfig(
            REAL_SUBSCRIPTION_ID,
            REAL_KEY_HASH,
            CALLBACK_GAS_LIMIT,
            REQUEST_CONFIRMATIONS,
            NATIVE_PAYMENT
        );
        
        console.log("⛽ Estimated gas:", gasEstimate.toString());
        
        const gasPrice = await deployer.provider.getGasPrice();
        const estimatedCost = gasEstimate.mul(gasPrice);
        console.log("💰 Estimated cost:", ethers.utils.formatEther(estimatedCost), "ETH");
        
        if (balance.lt(estimatedCost.mul(120).div(100))) {
            console.log("❌ Insufficient funds for transaction");
            console.log("Need:", ethers.utils.formatEther(estimatedCost.mul(120).div(100)), "ETH");
            console.log("Have:", ethers.utils.formatEther(balance), "ETH");
            return;
        }
        
        console.log("✅ Sufficient funds available");
        console.log("⏳ Sending VRF config transaction...");
        
        const setConfigTx = await vrfConsumer.setVRFConfig(
            REAL_SUBSCRIPTION_ID,
            REAL_KEY_HASH,
            CALLBACK_GAS_LIMIT,
            REQUEST_CONFIRMATIONS,
            NATIVE_PAYMENT,
            {
                gasLimit: gasEstimate.mul(110).div(100), // 10% buffer
                gasPrice: gasPrice
            }
        );
        
        console.log("📝 Transaction hash:", setConfigTx.hash);
        console.log("⏳ Waiting for confirmation...");
        
        const receipt = await setConfigTx.wait();
        console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
        console.log("⛽ Gas used:", receipt.gasUsed.toString());
        
        // Verify the new configuration
        console.log("\n🔍 Verifying new VRF configuration...");
        const newSubId = await vrfConsumer.subscriptionId();
        const newKeyHash = await vrfConsumer.keyHash();
        const callbackGasLimit = await vrfConsumer.callbackGasLimit();
        const requestConfirmations = await vrfConsumer.requestConfirmations();
        const nativePayment = await vrfConsumer.nativePayment();
        
        console.log("✅ New VRF Configuration:");
        console.log("- Subscription ID:", newSubId.toString());
        console.log("- Key Hash:", newKeyHash);
        console.log("- Callback Gas Limit:", callbackGasLimit.toString());
        console.log("- Request Confirmations:", requestConfirmations.toString());
        console.log("- Native Payment:", nativePayment);
        
        console.log("\n🎉 VRF CONFIGURATION UPDATED SUCCESSFULLY!");
        console.log("📍 Contract:", CONSUMER_ADDRESS);
        console.log("🔧 Ready for Chainlink VRF 2.5 requests");
        
        return {
            address: CONSUMER_ADDRESS,
            subscriptionId: newSubId.toString(),
            keyHash: newKeyHash,
            transactionHash: setConfigTx.hash,
            gasUsed: receipt.gasUsed.toString()
        };
        
    } catch (error) {
        console.error("❌ VRF config failed:", error.message);
        
        if (error.message.includes("insufficient funds")) {
            console.log("\n💡 Need more ETH for gas fees");
        } else if (error.message.includes("out-of-bounds")) {
            console.log("\n💡 Subscription ID format issue");
        }
        
        throw error;
    }
}

main()
    .then((result) => {
        console.log("\n✅ VRF Configuration successful:", result);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Configuration failed:", error.message);
        process.exit(1);
    }); 