const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying OmniDragonVRFConsumerV2_5 to Arbitrum with Updated Gas Limits...\n");

    // Arbitrum configuration
    const LAYERZERO_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    const VRF_COORDINATOR = "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e";
    const SUBSCRIPTION_ID = "49130512167777098004519592693541429977179420141459329604059253338290818062746";
    const KEY_HASH = "0xe9f223d7d83ec85c4f78042a4845af3a1c8df7757b4997b815ce4b8d07aca68c";

    const [deployer] = await ethers.getSigners();
    console.log(`📝 Deploying with account: ${deployer.address}`);
    console.log(`💰 Account balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH\n`);

    try {
        console.log("🔄 Deploying OmniDragonVRFConsumerV2_5...");
        
        const OmniDragonVRFConsumerV2_5 = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
        const contract = await OmniDragonVRFConsumerV2_5.deploy(
            LAYERZERO_ENDPOINT,
            deployer.address, // owner
            VRF_COORDINATOR,
            SUBSCRIPTION_ID,
            KEY_HASH,
            {
                gasLimit: 3000000 // Increased deployment gas limit
            }
        );

        console.log(`⏳ Waiting for deployment confirmation...`);
        await contract.deployed();

        console.log(`✅ OmniDragonVRFConsumerV2_5 deployed to: ${contract.address}`);
        console.log(`📋 Transaction hash: ${contract.deployTransaction.hash}`);
        console.log(`⛽ Gas used: ${contract.deployTransaction.gasLimit?.toString()}`);

        // Verify the configuration
        console.log("\n🔍 Verifying contract configuration...");
        const callbackGasLimit = await contract.callbackGasLimit();
        const defaultGasLimit = await contract.defaultGasLimit();
        const subscriptionId = await contract.subscriptionId();
        const keyHash = await contract.keyHash();

        console.log(`   📊 Callback Gas Limit: ${callbackGasLimit.toString()}`);
        console.log(`   📊 Default Gas Limit: ${defaultGasLimit.toString()}`);
        console.log(`   🔑 Subscription ID: ${subscriptionId.toString()}`);
        console.log(`   🔑 Key Hash: ${keyHash}`);

        // Check supported chains
        console.log("\n🌐 Checking supported chains...");
        const sonicSupported = await contract.supportedChains(30332);
        const sonicGasLimit = await contract.chainGasLimits(30332);
        console.log(`   🎵 Sonic (30332): ${sonicSupported}, Gas Limit: ${sonicGasLimit.toString()}`);

        console.log("\n🎯 Deployment Summary:");
        console.log(`   📍 Contract Address: ${contract.address}`);
        console.log(`   🎲 Callback Gas Limit: ${callbackGasLimit.toString()} (was 690,420)`);
        console.log(`   📊 Default Gas Limit: ${defaultGasLimit.toString()}`);
        console.log(`   🔗 LayerZero Endpoint: ${LAYERZERO_ENDPOINT}`);
        console.log(`   🎰 VRF Coordinator: ${VRF_COORDINATOR}`);

        console.log("\n📋 Next Steps:");
        console.log("   1. Update layerzero.config.ts with new contract address");
        console.log("   2. Run: npx @layerzerolabs/toolbox-hardhat lz:oapp:wire");
        console.log("   3. Set peer on Sonic contract");
        console.log("   4. Test VRF request with higher gas limits");

        // Save deployment info
        const deploymentInfo = {
            address: contract.address,
            transactionHash: contract.deployTransaction.hash,
            blockNumber: contract.deployTransaction.blockNumber,
            gasUsed: contract.deployTransaction.gasLimit?.toString(),
            callbackGasLimit: callbackGasLimit.toString(),
            defaultGasLimit: defaultGasLimit.toString(),
            subscriptionId: subscriptionId.toString(),
            keyHash: keyHash,
            deployer: deployer.address,
            timestamp: new Date().toISOString()
        };

        console.log("\n💾 Deployment Info:");
        console.log(JSON.stringify(deploymentInfo, null, 2));

    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        if (error.reason) {
            console.error("   Reason:", error.reason);
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 