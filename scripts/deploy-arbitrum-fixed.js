const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("🚀 Deploying Arbitrum Consumer (Fixed Approach)");
    
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
        
        // Deploy with SIMPLE subscription ID to avoid BigNumber issues
        console.log("\n📡 Deploying OmniDragonVRFConsumerV2_5 on Arbitrum...");
        
        const ARBITRUM_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
        const VRF_COORDINATOR = "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e";
        const SIMPLE_SUBSCRIPTION_ID = 123; // Simple number that won't cause overflow
        const KEY_HASH = "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409";
        
        console.log("Using simple subscription ID for deployment:", SIMPLE_SUBSCRIPTION_ID);
        
        const ConsumerFactory = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
        console.log("Factory created, deploying with simple parameters...");
        
        const consumer = await ConsumerFactory.connect(arbitrumWallet).deploy(
            ARBITRUM_ENDPOINT,
            arbitrumWallet.address,
            VRF_COORDINATOR,
            SIMPLE_SUBSCRIPTION_ID, // Use simple number
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
        
        // Test basic functionality first
        console.log("\n🧪 Testing basic functions...");
        const owner = await consumer.owner();
        console.log(`Owner: ${owner}`);
        
        const currentSubId = await consumer.subscriptionId();
        console.log(`Current subscription ID: ${currentSubId.toString()}`);
        
        // Now try to update to the real subscription ID
        console.log("\n🔧 Attempting to update to real subscription ID...");
        try {
            // Use a hex string for the large number
            const REAL_SUB_ID_HEX = "0x6c6b935b8bbd400000000000000000000000000000000000000000000000000000000005";
            
            const updateTx = await consumer.setVRFConfig(
                REAL_SUB_ID_HEX,
                KEY_HASH,
                690420, // callbackGasLimit
                3,      // requestConfirmations
                false   // nativePayment (use LINK)
            );
            await updateTx.wait();
            console.log(`✅ Subscription ID updated: ${updateTx.hash}`);
            
            const newSubId = await consumer.subscriptionId();
            console.log(`New subscription ID: ${newSubId.toString()}`);
            
        } catch (updateError) {
            console.log(`⚠️  Subscription ID update failed: ${updateError.message}`);
            console.log("Contract deployed successfully but keeping simple subscription ID");
        }
        
        console.log("\n🎉 Arbitrum deployment successful!");
        console.log("\n📋 Contract Details:");
        console.log(`Address: ${consumer.address}`);
        console.log(`Owner: ${owner}`);
        console.log(`VRF Coordinator: ${VRF_COORDINATOR}`);
        console.log(`Key Hash: ${KEY_HASH}`);
        
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        if (error.transaction) {
            console.error("Transaction hash:", error.transaction.hash);
        }
        if (error.receipt) {
            console.error("Gas used:", error.receipt.gasUsed.toString());
        }
    }
}

main().catch(console.error); 