const { ethers } = require("hardhat");

const LOTTERY_MANAGER = "0xb6999c369c8f7256902526e7A97c9ea7CE39293e";

async function main() {
    console.log("🔍 Testing Current Lottery System State");
    console.log("======================================");

    try {
        const [deployer] = await ethers.getSigners();
        console.log("👤 Account:", deployer.address);
        console.log("💰 Balance:", ethers.utils.formatEther(await deployer.getBalance()), "S");

        // Connect to lottery manager
        const lotteryManager = await ethers.getContractAt("OmniDragonLotteryManager", LOTTERY_MANAGER);
        
        // Check current configuration
        console.log("\n📋 Current Configuration:");
        
        try {
            const randomnessProvider = await lotteryManager.randomnessProvider();
            console.log("  Randomness Provider:", randomnessProvider);
        } catch (e) {
            console.log("  Randomness Provider: ERROR -", e.message);
        }

        try {
            const jackpotDistributor = await lotteryManager.jackpotDistributor();
            console.log("  Jackpot Distributor:", jackpotDistributor);
        } catch (e) {
            console.log("  Jackpot Distributor: ERROR -", e.message);
        }

        try {
            const rewardPoolBalance = await lotteryManager.getRewardPoolBalance();
            console.log("  Reward Pool Balance:", ethers.utils.formatEther(rewardPoolBalance), "S");
        } catch (e) {
            console.log("  Reward Pool Balance: ERROR -", e.message);
        }

        console.log("\n✅ System check completed!");

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error); 