require('dotenv').config();
const { ethers } = require('ethers');

const SONIC_RPC = "https://rpc.soniclabs.com";
const LOTTERY_MANAGER = "0xb6999c369c8f7256902526e7A97c9ea7CE39293e";

// Extended ABI for diagnostics
const LOTTERY_ABI = [
    "function getInstantLotteryConfig() external view returns (uint256 baseWinProbability, uint256 minSwapAmount, uint256 rewardPercentage, bool isActive)",
    "function getRewardPoolBalance() external view returns (uint256)",
    "function getJackpotVaultBalance() external view returns (uint256)",
    "function getJackpotContracts() external view returns (address vault, address distributor)",
    "function randomnessProvider() external view returns (address)",
    "function vrfIntegrator() external view returns (address)",
    "function authorizedSwapContracts(address) external view returns (bool)",
    "function userStats(address) external view returns (uint256 totalSwaps, uint256 totalVolume, uint256 totalWins, uint256 totalRewards, uint256 lastSwapTime)",
    "function owner() external view returns (address)",
    "function fundJackpot(uint256 amount) external payable"
];

async function main() {
    console.log("🔍 Instant Lottery Diagnostic");
    console.log("==============================");

    const provider = new ethers.providers.JsonRpcProvider(SONIC_RPC);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log("👤 Account:", wallet.address);
    console.log("💰 Balance:", ethers.utils.formatEther(await wallet.getBalance()), "S");

    const lotteryManager = new ethers.Contract(LOTTERY_MANAGER, LOTTERY_ABI, wallet);

    try {
        console.log("\n🔧 Contract Dependencies:");
        
        // Check all dependencies
        const [vault, distributor] = await lotteryManager.getJackpotContracts();
        const randomnessProvider = await lotteryManager.randomnessProvider();
        const vrfIntegrator = await lotteryManager.vrfIntegrator();
        
        console.log("  Jackpot Vault:", vault);
        console.log("  Jackpot Distributor:", distributor);
        console.log("  Randomness Provider:", randomnessProvider);
        console.log("  VRF Integrator:", vrfIntegrator);

        // Check if dependencies are set
        const dependenciesSet = {
            vault: vault !== ethers.constants.AddressZero,
            distributor: distributor !== ethers.constants.AddressZero,
            randomnessProvider: randomnessProvider !== ethers.constants.AddressZero,
            vrfIntegrator: vrfIntegrator !== ethers.constants.AddressZero
        };

        console.log("\n✅ Dependencies Status:");
        console.log("  Vault Set:", dependenciesSet.vault ? "✅" : "❌");
        console.log("  Distributor Set:", dependenciesSet.distributor ? "✅" : "❌");
        console.log("  Randomness Provider Set:", dependenciesSet.randomnessProvider ? "✅" : "❌");
        console.log("  VRF Integrator Set:", dependenciesSet.vrfIntegrator ? "✅" : "❌");

        // Check balances
        console.log("\n💰 Balance Check:");
        const rewardPool = await lotteryManager.getRewardPoolBalance();
        const vaultBalance = await lotteryManager.getJackpotVaultBalance();
        const contractBalance = await provider.getBalance(LOTTERY_MANAGER);
        
        console.log("  Reward Pool:", ethers.utils.formatEther(rewardPool), "S");
        console.log("  Vault Balance:", ethers.utils.formatEther(vaultBalance), "S");
        console.log("  Contract Balance:", ethers.utils.formatEther(contractBalance), "S");

        // Check authorization
        console.log("\n🔐 Authorization Check:");
        const isAuthorized = await lotteryManager.authorizedSwapContracts(wallet.address);
        console.log("  Our Address Authorized:", isAuthorized ? "✅" : "❌");

        // Check user stats for rate limiting
        console.log("\n⏰ Rate Limiting Check:");
        const userStats = await lotteryManager.userStats(wallet.address);
        const currentTime = Math.floor(Date.now() / 1000);
        const lastSwapTime = userStats.lastSwapTime.toNumber();
        const timeSinceLastSwap = currentTime - lastSwapTime;
        
        console.log("  Last Swap Time:", lastSwapTime, "(", new Date(lastSwapTime * 1000).toLocaleString(), ")");
        console.log("  Current Time:", currentTime, "(", new Date(currentTime * 1000).toLocaleString(), ")");
        console.log("  Time Since Last Swap:", timeSinceLastSwap, "seconds");
        console.log("  Rate Limit OK:", timeSinceLastSwap >= 1 ? "✅" : "❌");

        // Check instant lottery config
        console.log("\n🎰 Configuration Check:");
        const config = await lotteryManager.getInstantLotteryConfig();
        console.log("  Is Active:", config.isActive ? "✅" : "❌");
        console.log("  Min Swap Amount:", ethers.utils.formatEther(config.minSwapAmount), "tokens");
        console.log("  Base Win Probability:", config.baseWinProbability.toString(), "basis points");
        console.log("  Reward Percentage:", config.rewardPercentage.toString(), "basis points");

        // Diagnosis and recommendations
        console.log("\n🩺 Diagnosis:");
        const issues = [];
        
        if (!dependenciesSet.distributor) {
            issues.push("❌ Jackpot Distributor not set - rewards cannot be paid");
        }
        
        if (!dependenciesSet.randomnessProvider && !dependenciesSet.vrfIntegrator) {
            issues.push("❌ No randomness source available");
        }
        
        if (rewardPool.eq(0) && vaultBalance.eq(0)) {
            issues.push("❌ No funds in reward pool or vault - cannot pay rewards");
        }
        
        if (!config.isActive) {
            issues.push("❌ Instant lottery is disabled");
        }
        
        if (!isAuthorized) {
            issues.push("❌ Not authorized as swap contract");
        }

        if (issues.length === 0) {
            console.log("✅ All systems appear to be working!");
            console.log("🤔 The failure might be due to:");
            console.log("  - Insufficient randomness provider balance");
            console.log("  - Internal contract logic issues");
            console.log("  - Gas estimation problems");
        } else {
            console.log("Found", issues.length, "issues:");
            issues.forEach(issue => console.log(" ", issue));
        }

        // Try to fund the jackpot if we're the owner and have no funds
        const owner = await lotteryManager.owner();
        if (wallet.address.toLowerCase() === owner.toLowerCase() && 
            rewardPool.eq(0) && vaultBalance.eq(0)) {
            
            console.log("\n💰 Attempting to fund jackpot...");
            try {
                const fundTx = await lotteryManager.fundJackpot(0, {
                    value: ethers.utils.parseEther("1.0"), // Fund with 1 S
                    gasLimit: 200000
                });
                await fundTx.wait();
                console.log("✅ Jackpot funded with 1.0 S");
                
                // Check updated balance
                const newRewardPool = await lotteryManager.getRewardPoolBalance();
                console.log("  New Reward Pool:", ethers.utils.formatEther(newRewardPool), "S");
                
            } catch (fundError) {
                console.log("❌ Funding failed:", fundError.message.substring(0, 100) + "...");
            }
        }

    } catch (error) {
        console.error("❌ Diagnostic failed:", error.message);
    }
}

main()
    .then(() => console.log("\n✅ Diagnostic completed!"))
    .catch(console.error); 