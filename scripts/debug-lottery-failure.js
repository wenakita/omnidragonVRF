require('dotenv').config();
const { ethers } = require('ethers');

const SONIC_RPC = "https://rpc.soniclabs.com";
const LOTTERY_MANAGER = "0xb6999c369c8f7256902526e7A97c9ea7CE39293e";

// Extended ABI for debugging
const LOTTERY_ABI = [
    "function processInstantLottery(address user, uint256 swapAmount) external",
    "function authorizeSwapContract(address swapContract, bool authorized) external", 
    "function getInstantLotteryConfig() external view returns (uint256 baseWinProbability, uint256 minSwapAmount, uint256 rewardPercentage, bool isActive)",
    "function getUserStats(address user) external view returns (uint256 totalSwaps, uint256 totalVolume, uint256 totalWins, uint256 totalRewards, uint256 winRate)",
    "function randomnessProvider() external view returns (address)",
    "function jackpotDistributor() external view returns (address)",
    "function authorizedSwapContracts(address) external view returns (bool)",
    "function owner() external view returns (address)"
];

async function main() {
    console.log("🔍 Debugging Lottery Transaction Failure");
    console.log("=========================================");

    const provider = new ethers.providers.JsonRpcProvider(SONIC_RPC);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log("👤 Account:", wallet.address);
    
    const lotteryManager = new ethers.Contract(LOTTERY_MANAGER, LOTTERY_ABI, wallet);

    try {
        // Check all dependencies
        console.log("\n🔧 Checking Dependencies:");
        
        const randomnessProvider = await lotteryManager.randomnessProvider();
        console.log("  Randomness Provider:", randomnessProvider);
        console.log("  Is Zero Address:", randomnessProvider === ethers.constants.AddressZero);
        
        const jackpotDistributor = await lotteryManager.jackpotDistributor();
        console.log("  Jackpot Distributor:", jackpotDistributor);
        console.log("  Is Zero Address:", jackpotDistributor === ethers.constants.AddressZero);
        
        const isAuthorized = await lotteryManager.authorizedSwapContracts(wallet.address);
        console.log("  Is Authorized Swap Contract:", isAuthorized);
        
        const owner = await lotteryManager.owner();
        console.log("  Owner:", owner);
        console.log("  We are owner:", wallet.address.toLowerCase() === owner.toLowerCase());

        // Check lottery config
        console.log("\n⚙️ Lottery Configuration:");
        const config = await lotteryManager.getInstantLotteryConfig();
        console.log("  Base Win Probability:", config.baseWinProbability.toString());
        console.log("  Min Swap Amount:", ethers.utils.formatEther(config.minSwapAmount));
        console.log("  Reward Percentage:", config.rewardPercentage.toString());
        console.log("  Is Active:", config.isActive);

        // Check user stats for rate limiting
        console.log("\n👤 User Stats (Rate Limiting Check):");
        const userStats = await lotteryManager.getUserStats(wallet.address);
        console.log("  Total Swaps:", userStats.totalSwaps.toString());
        console.log("  Last Swap Time: (not available in this view)");

        // Try a static call first to see the revert reason
        console.log("\n🧪 Testing with Static Call:");
        const testSwapAmount = ethers.utils.parseEther("50");
        
        try {
            await lotteryManager.callStatic.processInstantLottery(
                wallet.address,
                testSwapAmount
            );
            console.log("✅ Static call succeeded - transaction should work");
        } catch (staticError) {
            console.log("❌ Static call failed:");
            console.log("  Error:", staticError.message);
            
            // Parse common error messages
            if (staticError.message.includes("Not authorized swap contract")) {
                console.log("  💡 Issue: Account not authorized as swap contract");
            } else if (staticError.message.includes("Instant lottery not active")) {
                console.log("  💡 Issue: Instant lottery is disabled");
            } else if (staticError.message.includes("Swap amount too small")) {
                console.log("  💡 Issue: Swap amount below minimum threshold");
            } else if (staticError.message.includes("Swap too frequent")) {
                console.log("  💡 Issue: Rate limiting - need to wait between swaps");
            } else {
                console.log("  💡 Issue: Unknown error, might be related to dependencies");
            }
        }

        // Check if dependencies are set up
        if (randomnessProvider === ethers.constants.AddressZero) {
            console.log("\n⚠️ CRITICAL: Randomness provider not set!");
            console.log("  The lottery needs a randomness provider to function");
        }
        
        if (jackpotDistributor === ethers.constants.AddressZero) {
            console.log("\n⚠️ CRITICAL: Jackpot distributor not set!");
            console.log("  The lottery needs a jackpot distributor to pay rewards");
        }

    } catch (error) {
        console.error("❌ Debug failed:", error.message);
    }
}

main()
    .then(() => console.log("\n✅ Debug completed!"))
    .catch(console.error); 