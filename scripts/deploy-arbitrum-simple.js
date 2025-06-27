const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying Fixed Arbitrum VRF Consumer...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`📝 Deploying with account: ${deployer.address}`);
    
    const balance = await deployer.getBalance();
    console.log(`💰 Account balance: ${ethers.utils.formatEther(balance)} ETH`);

    // Arbitrum configuration
    const ARBITRUM_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    const VRF_COORDINATOR = "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e";
    const SUBSCRIPTION_ID = "76197290230634444536112874207591481868701552347170354938929514079949640872745";
    const KEY_HASH = "0xe9f223d7d83ec85c4f78042a4845af3a1c8df7757b4997b815ce4b8d07aca68c";

    console.log("🔧 Contract Parameters:");
    console.log(`   LayerZero Endpoint: ${ARBITRUM_ENDPOINT}`);
    console.log(`   VRF Coordinator: ${VRF_COORDINATOR}`);
    console.log(`   Subscription ID: ${SUBSCRIPTION_ID}`);
    console.log(`   Key Hash: ${KEY_HASH}`);
    console.log(`   Owner: ${deployer.address}`);

    try {
        console.log("\n🚀 Deploying OmniDragonVRFConsumerV2_5...");
        
        const VRFConsumerFactory = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
        
        const vrfConsumer = await VRFConsumerFactory.deploy(
            ARBITRUM_ENDPOINT,
            deployer.address,
            VRF_COORDINATOR,
            SUBSCRIPTION_ID,
            KEY_HASH,
            {
                gasLimit: 2000000,  // Reduced from default
                gasPrice: ethers.utils.parseUnits("0.05", "gwei")  // Very low gas price
            }
        );

        console.log("⏳ Waiting for deployment confirmation...");
        await vrfConsumer.deployed();

        console.log(`✅ Contract deployed successfully!`);
        console.log(`📍 Address: ${vrfConsumer.address}`);
        console.log(`🔗 Transaction: ${vrfConsumer.deployTransaction.hash}`);

        // Verify deployment
        console.log("\n🔍 Verifying deployment...");
        const owner = await vrfConsumer.owner();
        const coordinator = await vrfConsumer.vrfCoordinator();
        const subId = await vrfConsumer.subscriptionId();
        
        console.log(`   Owner: ${owner}`);
        console.log(`   VRF Coordinator: ${coordinator}`);
        console.log(`   Subscription ID: ${subId.toString()}`);

        // Fund the contract with ETH for LayerZero fees
        console.log("\n💰 Funding contract with ETH for LayerZero fees...");
        const fundingAmount = ethers.utils.parseEther("0.001");
        
        const fundTx = await deployer.sendTransaction({
            to: vrfConsumer.address,
            value: fundingAmount
        });
        
        await fundTx.wait();
        console.log(`✅ Contract funded with ${ethers.utils.formatEther(fundingAmount)} ETH`);
        
        const contractBalance = await ethers.provider.getBalance(vrfConsumer.address);
        console.log(`   Contract balance: ${ethers.utils.formatEther(contractBalance)} ETH`);

        console.log("\n🎉 Deployment Complete!");
        console.log("\n📋 Summary:");
        console.log(`   Contract: ${vrfConsumer.address}`);
        console.log(`   Network: Arbitrum`);
        console.log(`   Owner: ${owner}`);
        console.log(`   Balance: ${ethers.utils.formatEther(contractBalance)} ETH`);
        console.log(`   Payment Fix: ✅ Included (_payNative override)`);
        
        console.log("\n🎯 Next Steps:");
        console.log("   1. Update layerzero.config.ts with new address");
        console.log("   2. Run verification if needed");
        console.log("   3. Set peer configurations");
        console.log("   4. Test VRF requests");

        return vrfConsumer.address;

    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        if (error.transaction) {
            console.error("   Transaction hash:", error.transaction.hash);
        }
        throw error;
    }
}

main()
    .then((address) => {
        console.log(`\n🎉 SUCCESS: Contract deployed at ${address}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 