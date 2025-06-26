import { ethers } from "hardhat";

/**
 * Deploy the Multi-Chain OmniDragonVRFConsumerV2_5 to Arbitrum
 * This contract can now accept VRF requests from multiple chains and respond back dynamically
 */

async function deployMultiChainVRFConsumer() {
    console.log("🚀 Deploying Multi-Chain OmniDragonVRFConsumerV2_5 to Arbitrum");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer address:", deployer.address);
    console.log("💰 Deployer balance:", ethers.utils.formatEther(await deployer.provider!.getBalance(deployer.address)), "ETH");

    // Arbitrum configuration
    const ARBITRUM_CONFIG = {
        LAYERZERO_ENDPOINT: "0x1a44076050125825900e736c501f859c50fE728c", // Arbitrum LayerZero V2 Endpoint
        VRF_COORDINATOR: "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e",     // Arbitrum Chainlink VRF 2.5 Coordinator
        SUBSCRIPTION_ID: ethers.BigNumber.from("49130512167777098004519592693541429977179420141459329604059253338290818062746"),  // Your VRF subscription
        KEY_HASH: "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409" // Your key hash
    };

    console.log("\n🔧 Configuration:");
    console.log("  LayerZero Endpoint:", ARBITRUM_CONFIG.LAYERZERO_ENDPOINT);
    console.log("  VRF Coordinator:", ARBITRUM_CONFIG.VRF_COORDINATOR);
    console.log("  Subscription ID:", ARBITRUM_CONFIG.SUBSCRIPTION_ID);
    console.log("  Key Hash:", ARBITRUM_CONFIG.KEY_HASH);

    // Deploy the contract
    console.log("\n🏗️ Deploying OmniDragonVRFConsumerV2_5...");
    
    const VRFConsumerFactory = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
    
    const vrfConsumer = await VRFConsumerFactory.deploy(
        ARBITRUM_CONFIG.LAYERZERO_ENDPOINT,
        deployer.address,                    // Owner
        ARBITRUM_CONFIG.VRF_COORDINATOR,
        ARBITRUM_CONFIG.SUBSCRIPTION_ID,
        ARBITRUM_CONFIG.KEY_HASH,
        {
            gasLimit: 3000000,              // Set explicit gas limit
            gasPrice: ethers.utils.parseUnits("0.1", "gwei") // Very low gas price for Arbitrum
        }
    );

    await vrfConsumer.deployed();
    const consumerAddress = vrfConsumer.address;
    
    console.log(`✅ OmniDragonVRFConsumerV2_5 deployed to: ${consumerAddress}`);

    // Fund the contract
    console.log("\n💰 Funding contract with 0.1 ETH for LayerZero fees...");
    const fundTx = await vrfConsumer.fundContract({ 
        value: ethers.utils.parseEther("0.1") 
    });
    await fundTx.wait();
    console.log("✅ Contract funded!");

    // Check supported chains
    console.log("\n📊 Checking supported chains...");
    try {
        const [eids, supported, gasLimits] = await vrfConsumer.getSupportedChains();
        
        const chainNames = [
            "Ethereum", "BSC", "Avalanche", "Polygon", "Optimism", "Base", "Sonic"
        ];

        console.log("  Supported Chains:");
        for (let i = 0; i < Math.min(eids.length, chainNames.length); i++) {
            if (supported[i]) {
                console.log(`    ✅ ${chainNames[i]} (${eids[i]}): Gas Limit ${gasLimits[i]}`);
            } else {
                console.log(`    ❌ ${chainNames[i]} (${eids[i]}): Not supported`);
            }
        }
        
    } catch (error: any) {
        console.log("❌ Error getting supported chains:", error.message);
    }

    // Get contract status
    console.log("\n📈 Contract Status:");
    try {
        const [balance, minBalance, canSendResponses, gasLimit, supportedChainsCount] = await vrfConsumer.getContractStatus();
        console.log(`  Balance: ${ethers.utils.formatEther(balance)} ETH`);
        console.log(`  Min Balance: ${ethers.utils.formatEther(minBalance)} ETH`);
        console.log(`  Can Send Responses: ${canSendResponses ? '✅ Yes' : '❌ No'}`);
        console.log(`  Default Gas Limit: ${gasLimit}`);
        console.log(`  Supported Chains Count: ${supportedChainsCount}`);
    } catch (error: any) {
        console.log("❌ Error getting contract status:", error.message);
    }

    console.log("\n🎯 Next Steps:");
    console.log("1. Create Chainlink VRF 2.5 subscription and add this contract as consumer");
    console.log("2. Set up peer connections with existing VRF integrators:");
    console.log(`   - Sonic: await vrfConsumer.setPeer(30332, "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84")`);
    console.log(`   - Avalanche: await vrfConsumer.setPeer(30106, "0xeFF1059a680388419F920748e7c9a0a9a80EfE11")`);
    console.log("3. Configure LayerZero DVN settings");
    console.log("4. Test VRF requests from multiple chains");

    console.log("\n📋 Deployment Summary:");
    console.log(`  Contract Address: ${consumerAddress}`);
    console.log(`  Network: Arbitrum`);
    console.log(`  Owner: ${deployer.address}`);
    console.log(`  Multi-Chain Support: ✅ Enabled`);
    console.log(`  Chains Ready: Sonic, Avalanche, Base, Ethereum, Polygon, BSC, Optimism`);

    return {
        contractAddress: consumerAddress,
        owner: deployer.address,
        network: "arbitrum"
    };
}

// Run deployment
if (require.main === module) {
    deployMultiChainVRFConsumer()
        .then((result) => {
            console.log(`\n🎉 Multi-Chain VRF Consumer deployment complete!`);
            console.log(`📋 Contract Address: ${result.contractAddress}`);
            process.exit(0);
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

export { deployMultiChainVRFConsumer }; 