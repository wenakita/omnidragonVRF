const { ethers } = require("hardhat");

const LOTTERY_MANAGER = "0xb6999c369c8f7256902526e7A97c9ea7CE39293e";
const VRF_INTEGRATOR = "0x6e11334470df61d62383892bd8e57a3a655718c8";

async function main() {
    console.log("🔧 Simple Setup Test");
    console.log("====================");

    const [deployer] = await ethers.getSigners();
    console.log("👤 Account:", deployer.address);

    try {
        // Test VRF integrator connection
        console.log("\n📡 Testing VRF integrator...");
        const vrfIntegrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            VRF_INTEGRATOR
        );
        
        const counter = await vrfIntegrator.requestCounter();
        console.log("✅ VRF integrator connected, counter:", counter.toString());

        // Test lottery manager connection
        console.log("\n🎲 Testing lottery manager...");
        const lotteryManager = await ethers.getContractAt(
            "OmniDragonLotteryManager", 
            LOTTERY_MANAGER
        );
        
        const owner = await lotteryManager.owner();
        const balance = await ethers.provider.getBalance(LOTTERY_MANAGER);
        console.log("✅ Lottery manager connected");
        console.log("  Owner:", owner);
        console.log("  Balance:", ethers.utils.formatEther(balance), "S");

        // Try authorization
        console.log("\n🔐 Authorizing lottery manager...");
        const authTx = await vrfIntegrator.setAuthorizedCaller(LOTTERY_MANAGER, true, {
            gasLimit: 100000
        });
        await authTx.wait();
        console.log("✅ Authorization complete!");

        console.log("\n🎉 Setup successful! Ready to test lottery.");

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main(); 