require('dotenv').config();
const { ethers } = require('ethers');

const SONIC_RPC = "https://rpc.soniclabs.com";
const LOTTERY_MANAGER = "0xb6999c369c8f7256902526e7A97c9ea7CE39293e";
const VRF_INTEGRATOR = "0x6e11334470df61d62383892bd8e57a3a655718c8";

// ABI for instant lottery functions
const LOTTERY_ABI = [
    "function processInstantLottery(address user, uint256 swapAmount) external",
    "function authorizeSwapContract(address swapContract, bool authorized) external",
    "function getInstantLotteryConfig() external view returns (uint256 baseWinProbability, uint256 minSwapAmount, uint256 rewardPercentage, bool isActive)",
    "function getUserStats(address user) external view returns (uint256 totalSwaps, uint256 totalVolume, uint256 totalWins, uint256 totalRewards, uint256 winRate)",
    "function calculateWinProbability(address user, uint256 swapAmount) external view returns (uint256)",
    "function calculatePotentialReward(uint256 swapAmount) external view returns (uint256)",
    "function getRewardPoolBalance() external view returns (uint256)",
    "function owner() external view returns (address)",
    "event InstantLotteryProcessed(address indexed user, uint256 swapAmount, bool won, uint256 reward)"
];

const VRF_ABI = [
    "function requestCounter() view returns (uint256)",
    "function setAuthorizedCaller(address caller, bool authorized) external",
    "function isAuthorizedCaller(address caller) view returns (bool)"
];

async function main() {
    console.log("🎰 Instant Swap Lottery Test");
    console.log("=============================");

    // Connect to Sonic network
    const provider = new ethers.providers.JsonRpcProvider(SONIC_RPC);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log("👤 Account:", wallet.address);
    const balance = await wallet.getBalance();
    console.log("💰 Balance:", ethers.utils.formatEther(balance), "S");

    // Connect to contracts
    const lotteryManager = new ethers.Contract(LOTTERY_MANAGER, LOTTERY_ABI, wallet);
    const vrfIntegrator = new ethers.Contract(VRF_INTEGRATOR, VRF_ABI, wallet);

    try {
        // Check VRF status
        console.log("\n📊 VRF Status:");
        const vrfCounter = await vrfIntegrator.requestCounter();
        console.log("  Request Counter:", vrfCounter.toString());

        // Check instant lottery configuration
        console.log("\n🎰 Instant Lottery Configuration:");
        const config = await lotteryManager.getInstantLotteryConfig();
        console.log("  Base Win Probability:", config.baseWinProbability.toString(), "basis points");
        console.log("  Min Swap Amount:", ethers.utils.formatEther(config.minSwapAmount), "tokens");
        console.log("  Reward Percentage:", config.rewardPercentage.toString(), "basis points");
        console.log("  Is Active:", config.isActive);

        // Check reward pool
        const rewardPool = await lotteryManager.getRewardPoolBalance();
        console.log("  Reward Pool Balance:", ethers.utils.formatEther(rewardPool), "S");

        // Check user stats
        console.log("\n👤 User Stats:");
        const userStats = await lotteryManager.getUserStats(wallet.address);
        console.log("  Total Swaps:", userStats.totalSwaps.toString());
        console.log("  Total Volume:", ethers.utils.formatEther(userStats.totalVolume));
        console.log("  Total Wins:", userStats.totalWins.toString());
        console.log("  Total Rewards:", ethers.utils.formatEther(userStats.totalRewards), "S");
        console.log("  Win Rate:", userStats.winRate.toString(), "basis points");

        // Test different swap amounts and their probabilities (USD-equivalent)
        console.log("\n🎲 Win Probability Analysis (USD-equivalent swaps):");
        const testAmounts = [
            ethers.utils.parseEther("5"),     // $5 - below minimum
            ethers.utils.parseEther("10"),    // $10 - minimum
            ethers.utils.parseEther("50"),    // $50 
            ethers.utils.parseEther("100"),   // $100
            ethers.utils.parseEther("500"),   // $500
            ethers.utils.parseEther("1000"),  // $1000
            ethers.utils.parseEther("5000"),  // $5000
            ethers.utils.parseEther("10000"), // $10000 - maximum
            ethers.utils.parseEther("20000")  // $20000 - above maximum
        ];

        for (const amount of testAmounts) {
            const probability = await lotteryManager.calculateWinProbability(wallet.address, amount);
            const reward = await lotteryManager.calculatePotentialReward(amount);
            const usdAmount = parseFloat(ethers.utils.formatEther(amount));
            console.log(`  $${usdAmount} swap:`);
            console.log(`    Win Probability: ${probability.toString()} basis points (${(probability.toNumber() / 100).toFixed(3)}%)`);
            console.log(`    Potential Reward: ${ethers.utils.formatEther(reward)} S`);
        }

        // Check if we're authorized as a swap contract
        console.log("\n🔐 Authorization Check:");
        const owner = await lotteryManager.owner();
        console.log("  Contract Owner:", owner);
        console.log("  Our Address:", wallet.address);
        
        if (wallet.address.toLowerCase() === owner.toLowerCase()) {
            console.log("  ✅ We are the owner, can authorize ourselves");
            
            // Authorize ourselves as a swap contract for testing
            console.log("\n🔧 Authorizing test account as swap contract...");
            try {
                const authTx = await lotteryManager.authorizeSwapContract(wallet.address, true, {
                    gasLimit: 100000
                });
                await authTx.wait();
                console.log("✅ Authorization successful!");
            } catch (authError) {
                console.log("⚠️ Authorization failed:", authError.message.substring(0, 50) + "...");
            }

            // Test instant lottery with a simulated swap
            console.log("\n🎰 Testing Instant Lottery with Simulated Swap...");
            const testSwapAmount = ethers.utils.parseEther("50"); // 50 token swap
            
            try {
                console.log(`🔄 Processing instant lottery for ${ethers.utils.formatEther(testSwapAmount)} token swap...`);
                
                const processTx = await lotteryManager.processInstantLottery(
                    wallet.address,
                    testSwapAmount,
                    { gasLimit: 500000 }
                );
                const receipt = await processTx.wait();
                
                console.log("✅ Instant lottery processed!");
                console.log("📋 TX Hash:", receipt.transactionHash);
                console.log("⛽ Gas Used:", receipt.gasUsed.toString());
                console.log("🔗 SonicScan:", `https://sonicscan.org/tx/${receipt.transactionHash}`);

                // Check for InstantLotteryProcessed event
                const lotteryEvent = receipt.events?.find(e => e.event === 'InstantLotteryProcessed');
                if (lotteryEvent) {
                    console.log("\n🎉 LOTTERY RESULT:");
                    console.log("  User:", lotteryEvent.args.user);
                    console.log("  Swap Amount:", ethers.utils.formatEther(lotteryEvent.args.swapAmount));
                    console.log("  Won:", lotteryEvent.args.won ? "🎊 YES!" : "❌ No");
                    console.log("  Reward:", ethers.utils.formatEther(lotteryEvent.args.reward), "S");
                } else {
                    console.log("⚠️ No lottery event found in transaction");
                }

                // Check updated user stats
                console.log("\n📊 Updated User Stats:");
                const updatedStats = await lotteryManager.getUserStats(wallet.address);
                console.log("  Total Swaps:", updatedStats.totalSwaps.toString());
                console.log("  Total Volume:", ethers.utils.formatEther(updatedStats.totalVolume));
                console.log("  Total Wins:", updatedStats.totalWins.toString());
                console.log("  Total Rewards:", ethers.utils.formatEther(updatedStats.totalRewards), "S");
                console.log("  Win Rate:", updatedStats.winRate.toString(), "basis points");

            } catch (processError) {
                console.log("❌ Instant lottery processing failed:", processError.message);
                
                // Check if it's a rate limiting issue
                if (processError.message.includes("Swap too frequent")) {
                    console.log("⏰ Rate limited - wait 1 second between swaps");
                } else if (processError.message.includes("Swap amount too small")) {
                    console.log("💰 Swap amount below minimum threshold");
                } else if (processError.message.includes("Instant lottery not active")) {
                    console.log("🚫 Instant lottery is currently disabled");
                }
            }

        } else {
            console.log("  ❌ We are not the owner, cannot authorize for testing");
            console.log("  ℹ️ This test requires owner privileges to authorize swap contracts");
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error("Stack:", error.stack);
    }
}

main()
    .then(() => console.log("\n✅ Instant swap lottery test completed!"))
    .catch(console.error); 