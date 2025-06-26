const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("🚀 Deploying Arbitrum Consumer Only");
    
    try {
        // Setup
        const arbitrumProvider = new ethers.providers.JsonRpcProvider("https://arb1.arbitrum.io/rpc");
        const arbitrumWallet = new ethers.Wallet(process.env.PRIVATE_KEY, arbitrumProvider);
        
        console.log(`Deploying from: ${arbitrumWallet.address}`);
        
        // Check balance
        const balance = await arbitrumWallet.getBalance();
        console.log(`Arbitrum balance: ${ethers.utils.formatEther(balance)} ETH`);
        
        if (balance.lt(ethers.utils.parseEther("0.001"))) {
            throw new Error("Insufficient balance for deployment");
        }
        
        // Deploy Arbitrum Consumer
        console.log("\n📡 Deploying OmniDragonVRFConsumerV2_5 on Arbitrum...");
        
        const ARBITRUM_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
        const VRF_COORDINATOR = "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e";
        const TEMP_SUBSCRIPTION_ID = 1; // Temporary for deployment
        const KEY_HASH = "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409";
        
        const ConsumerFactory = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
        console.log("Factory created, deploying...");
        
        const consumer = await ConsumerFactory.connect(arbitrumWallet).deploy(
            ARBITRUM_ENDPOINT,
            arbitrumWallet.address,
            VRF_COORDINATOR,
            TEMP_SUBSCRIPTION_ID,
            KEY_HASH,
            {
                gasLimit: 3000000,
                gasPrice: ethers.utils.parseUnits("0.1", "gwei")
            }
        );
        
        console.log("Deployment transaction sent, waiting for confirmation...");
        await consumer.deployed();
        
        console.log(`✅ Arbitrum Consumer deployed: ${consumer.address}`);
        console.log(`Transaction hash: ${consumer.deployTransaction.hash}`);
        
        // Update subscription ID to the real one
        console.log("\n🔧 Updating subscription ID...");
        const REAL_SUBSCRIPTION_ID = ethers.BigNumber.from("491305121677770980045195926935414299771794201414593296040592533382908180627461");
        
        const updateTx = await consumer.setVRFConfig(
            REAL_SUBSCRIPTION_ID,
            KEY_HASH,
            690420, // callbackGasLimit
            3,      // requestConfirmations
            false   // nativePayment (use LINK)
        );
        await updateTx.wait();
        console.log(`✅ Subscription ID updated: ${updateTx.hash}`);
        
        // Test basic functionality
        console.log("\n🧪 Testing basic functions...");
        const owner = await consumer.owner();
        console.log(`Owner: ${owner}`);
        
        const subscriptionId = await consumer.subscriptionId();
        console.log(`Subscription ID: ${subscriptionId.toString()}`);
        
        console.log("🎉 Arbitrum deployment successful!");
        
        console.log("\n📋 Contract Addresses:");
        console.log(`Arbitrum Consumer: ${consumer.address}`);
        
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        if (error.transaction) {
            console.error("Transaction hash:", error.transaction.hash);
        }
    }
}

main().catch(console.error); 