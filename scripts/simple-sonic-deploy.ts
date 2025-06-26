import { ethers } from "hardhat";

/**
 * Simple Sonic Deployment with Better Error Handling
 */

const SONIC_CONFIG = {
    ENDPOINT: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B"
};

async function simpleSonicDeploy() {
    console.log("🎵 Simple Sonic VRF Integrator Deployment");
    console.log("=" .repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(balance), "ETH");
    
    if (balance.lt(ethers.utils.parseEther("1"))) {
        console.log("❌ Insufficient balance for deployment");
        return;
    }

    console.log("\n🔧 Deployment Parameters:");
    console.log("   - Endpoint:", SONIC_CONFIG.ENDPOINT);
    console.log("   - Owner:", deployer.address);

    try {
        console.log("\n📦 Getting contract factory...");
        const ChainlinkVRFIntegratorV2_5 = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
        console.log("✅ Contract factory loaded");

        console.log("\n🚀 Deploying contract...");
        const deployTx = await ChainlinkVRFIntegratorV2_5.getDeployTransaction(
            SONIC_CONFIG.ENDPOINT,
            deployer.address
        );

        console.log("📋 Deploy transaction data length:", deployTx.data?.length);
        
        // Estimate gas
        const gasEstimate = await ethers.provider.estimateGas({
            from: deployer.address,
            data: deployTx.data
        });
        console.log("⛽ Gas estimate:", gasEstimate.toString());

        // Deploy with manual gas settings
        const sonicIntegrator = await ChainlinkVRFIntegratorV2_5.deploy(
            SONIC_CONFIG.ENDPOINT,
            deployer.address,
            {
                gasLimit: gasEstimate.mul(150).div(100), // 50% buffer
                gasPrice: ethers.utils.parseUnits("100", "gwei") // Higher gas price for Sonic
            }
        );

        console.log("⏳ Waiting for deployment transaction...");
        console.log("📋 TX Hash:", sonicIntegrator.deployTransaction.hash);

        const receipt = await sonicIntegrator.deployTransaction.wait();
        console.log("✅ Deployment successful!");
        console.log("📋 Contract Address:", sonicIntegrator.address);
        console.log("📦 Block Number:", receipt.blockNumber);
        console.log("⛽ Gas Used:", receipt.gasUsed.toString());

        // Verify deployment
        console.log("\n🔍 Verifying deployment...");
        const endpoint = await sonicIntegrator.endpoint();
        const owner = await sonicIntegrator.owner();
        
        console.log("✅ Verification Results:");
        console.log("   - Contract Address:", sonicIntegrator.address);
        console.log("   - Endpoint:", endpoint);
        console.log("   - Owner:", owner);
        console.log("   - Endpoint Correct:", endpoint.toLowerCase() === SONIC_CONFIG.ENDPOINT.toLowerCase());
        console.log("   - Owner Correct:", owner.toLowerCase() === deployer.address.toLowerCase());

        return sonicIntegrator.address;

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

if (require.main === module) {
    simpleSonicDeploy()
        .then((address) => {
            if (address) {
                console.log("\n🎉 DEPLOYMENT SUCCESSFUL!");
                console.log("📋 New Sonic Integrator:", address);
                console.log("🔄 Use this address for LayerZero configuration");
            } else {
                console.log("\n❌ Deployment failed");
            }
        })
        .catch((error) => {
            console.error("❌ Script failed:", error);
            process.exitCode = 1;
        });
} 