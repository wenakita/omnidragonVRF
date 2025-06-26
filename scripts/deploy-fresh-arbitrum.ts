import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Deploy Fresh Arbitrum VRF Consumer and save deployment info
 */

const ARBITRUM_CONFIG = {
    ENDPOINT: "0x1a44076050125825900e736c501f859c50fE728c",
    VRF_COORDINATOR: "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e", // CORRECT VRF Coordinator
    KEY_HASH: "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409", // CORRECT Key Hash
    SUBSCRIPTION_ID: 1, // Will be updated later
    REQUEST_CONFIRMATIONS: 3,
    CALLBACK_GAS_LIMIT: 2500000,
    NUM_WORDS: 1
};

async function deployFreshArbitrum() {
    console.log("🔷 Fresh Arbitrum VRF Consumer Deployment");
    console.log("=" .repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(balance), "ETH");
    
    if (balance.lt(ethers.utils.parseEther("0.01"))) {
        console.log("❌ Insufficient balance for deployment");
        return;
    }

    console.log("\n🔧 Deployment Parameters:");
    console.log("   - Endpoint:", ARBITRUM_CONFIG.ENDPOINT);
    console.log("   - VRF Coordinator:", ARBITRUM_CONFIG.VRF_COORDINATOR);
    console.log("   - Owner:", deployer.address);

    try {
        console.log("\n📦 Getting contract factory...");
        const OmniDragonVRFConsumerV2_5 = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
        console.log("✅ Contract factory loaded");

        console.log("\n🚀 Deploying contract...");
        const deployTx = await OmniDragonVRFConsumerV2_5.getDeployTransaction(
            ARBITRUM_CONFIG.ENDPOINT,
            deployer.address,
            ARBITRUM_CONFIG.VRF_COORDINATOR,
            ARBITRUM_CONFIG.SUBSCRIPTION_ID,
            ARBITRUM_CONFIG.KEY_HASH
        );

        console.log("📋 Deploy transaction data length:", deployTx.data?.length);
        
        // Estimate gas
        const gasEstimate = await ethers.provider.estimateGas({
            from: deployer.address,
            data: deployTx.data
        });
        console.log("⛽ Gas estimate:", gasEstimate.toString());

        // Deploy with manual gas settings
        const arbitrumConsumer = await OmniDragonVRFConsumerV2_5.deploy(
            ARBITRUM_CONFIG.ENDPOINT,
            deployer.address,
            ARBITRUM_CONFIG.VRF_COORDINATOR,
            ARBITRUM_CONFIG.SUBSCRIPTION_ID,
            ARBITRUM_CONFIG.KEY_HASH,
            {
                gasLimit: gasEstimate.mul(150).div(100), // 50% buffer
                gasPrice: ethers.utils.parseUnits("0.1", "gwei") // Arbitrum gas price
            }
        );

        console.log("⏳ Waiting for deployment transaction...");
        console.log("📋 TX Hash:", arbitrumConsumer.deployTransaction.hash);

        const receipt = await arbitrumConsumer.deployTransaction.wait();
        console.log("✅ Deployment successful!");
        console.log("📋 Contract Address:", arbitrumConsumer.address);
        console.log("📦 Block Number:", receipt.blockNumber);
        console.log("⛽ Gas Used:", receipt.gasUsed.toString());

        // VRF configuration is set in constructor
        console.log("✅ VRF configuration set in constructor");

        // Verify deployment
        console.log("\n🔍 Verifying deployment...");
        const endpoint = await arbitrumConsumer.endpoint();
        const owner = await arbitrumConsumer.owner();
        const vrfCoordinator = await arbitrumConsumer.vrfCoordinator();
        
        console.log("✅ Verification Results:");
        console.log("   - Contract Address:", arbitrumConsumer.address);
        console.log("   - Endpoint:", endpoint);
        console.log("   - Owner:", owner);
        console.log("   - VRF Coordinator:", vrfCoordinator);
        console.log("   - Endpoint Correct:", endpoint.toLowerCase() === ARBITRUM_CONFIG.ENDPOINT.toLowerCase());
        console.log("   - Owner Correct:", owner.toLowerCase() === deployer.address.toLowerCase());
        console.log("   - VRF Coordinator Correct:", vrfCoordinator.toLowerCase() === ARBITRUM_CONFIG.VRF_COORDINATOR.toLowerCase());

        // Save deployment info
        await saveDeployment("arbitrum", {
            contractName: "OmniDragonVRFConsumerV2_5",
            address: arbitrumConsumer.address,
            deployer: deployer.address,
            txHash: arbitrumConsumer.deployTransaction.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            timestamp: Date.now(),
            network: "arbitrum",
            chainId: 42161,
            endpoint: ARBITRUM_CONFIG.ENDPOINT,
            vrfCoordinator: ARBITRUM_CONFIG.VRF_COORDINATOR,
            verified: true
        });

        return arbitrumConsumer.address;

    } catch (error: any) {
        console.log("❌ Deployment failed:", error.message);
        
        if (error.message.includes("gas")) {
            console.log("⛽ Gas-related error - try increasing gas limit");
        } else if (error.message.includes("revert")) {
            console.log("🚨 Contract revert - check constructor parameters");
        } else if (error.message.includes("insufficient funds")) {
            console.log("💰 Insufficient funds for deployment");
        }
        
        console.log("🔍 Full error:", error);
        return null;
    }
}

async function saveDeployment(network: string, deploymentInfo: any) {
    const deploymentsDir = path.join(__dirname, "..", "deployments", network);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save deployment JSON
    const deploymentFile = path.join(deploymentsDir, "OmniDragonVRFConsumerV2_5.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("💾 Deployment saved to:", deploymentFile);

    // Update deployment addresses file
    const addressesFile = path.join(__dirname, "..", "deployments", "DEPLOYMENT_ADDRESSES.md");
    const timestamp = new Date().toISOString();
    const addressEntry = `\n## Fresh Arbitrum Deployment - ${timestamp}\n- **OmniDragonVRFConsumerV2_5**: \`${deploymentInfo.address}\`\n- **Network**: Arbitrum\n- **TX Hash**: \`${deploymentInfo.txHash}\`\n- **Block**: ${deploymentInfo.blockNumber}\n`;
    
    fs.appendFileSync(addressesFile, addressEntry);
    console.log("📝 Address added to DEPLOYMENT_ADDRESSES.md");
}

if (require.main === module) {
    deployFreshArbitrum()
        .then((address) => {
            if (address) {
                console.log("\n🎉 ARBITRUM DEPLOYMENT SUCCESSFUL!");
                console.log("📋 New Arbitrum Consumer:", address);
                console.log("💾 Deployment info saved to deployments/arbitrum/");
                console.log("🔄 Update layerzero-fresh.config.ts with this address");
            } else {
                console.log("\n❌ Arbitrum deployment failed");
            }
        })
        .catch((error) => {
            console.error("❌ Script failed:", error);
            process.exitCode = 1;
        });
} 