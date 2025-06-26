const { ethers } = require("hardhat");

async function main() {
    console.log("Quick Lottery Check");
    
    const LOTTERY_MANAGER = "0xb6999c369c8f7256902526e7A97c9ea7CE39293e";
    
    const [signer] = await ethers.getSigners();
    console.log("Signer:", signer.address);
    
    const lotteryManager = await ethers.getContractAt("OmniDragonLotteryManager", LOTTERY_MANAGER);
    
    try {
        const rewardBalance = await lotteryManager.getRewardPoolBalance();
        console.log("Reward Pool:", ethers.utils.formatEther(rewardBalance), "S");
    } catch (e) {
        console.log("Error getting reward pool:", e.message);
    }
    
    console.log("Check complete");
}

main().catch(console.error); 