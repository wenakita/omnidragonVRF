const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("🚀 Starting VRF Contract Redeployment...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "Chain ID:", network.chainId);

    if (network.chainId === 42161) {
        // Arbitrum deployment
        console.log("📍 Deploying to Arbitrum...");
        
        const lzEndpoint = process.env.ARBITRUM_LZ_ENDPOINT;
        const vrfCoordinator = process.env.CHAINLINK_VRF_COORDINATOR;
        const subscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID;
        const keyHash = process.env.CHAINLINK_KEY_HASH;

        console.log("Config:");
        console.log("- LZ Endpoint:", lzEndpoint);
        console.log("- VRF Coordinator:", vrfCoordinator);
        console.log("- Subscription ID:", subscriptionId);
        console.log("- Key Hash:", keyHash);

        const VRFConsumer = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
        const vrfConsumer = await VRFConsumer.deploy(
            lzEndpoint,
            deployer.address,
            vrfCoordinator,
            subscriptionId,
            keyHash,
            {
                gasLimit: 8000000,
                gasPrice: ethers.utils.parseUnits("0.5", "gwei")
            }
        );

        await vrfConsumer.deployed();
        console.log("✅ OmniDragonVRFConsumerV2_5 deployed to:", vrfConsumer.address);
        
        // Set Sonic chain as supported
        console.log("🔧 Setting Sonic chain support...");
        const tx = await vrfConsumer.setSupportedChain(30332, true, 2500000, {
            gasLimit: 200000
        });
        await tx.wait();
        console.log("✅ Sonic chain support enabled");

    } else if (network.chainId === 146) {
        // Sonic deployment
        console.log("📍 Deploying to Sonic...");
        
        const lzEndpoint = process.env.SONIC_LZ_ENDPOINT;
        console.log("- LZ Endpoint:", lzEndpoint);

        const VRFIntegrator = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
        const vrfIntegrator = await VRFIntegrator.deploy(
            lzEndpoint,
            deployer.address,
            {
                gasLimit: 4000000,
                gasPrice: ethers.utils.parseUnits("70", "gwei")
            }
        );

        await vrfIntegrator.deployed();
        console.log("✅ ChainlinkVRFIntegratorV2_5 deployed to:", vrfIntegrator.address);

    } else {
        console.log("❌ Unsupported network");
        return;
    }

    console.log("\n🎉 Deployment completed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }); 