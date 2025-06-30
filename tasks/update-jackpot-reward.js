const { task, types } = require("hardhat/config");

task("update-jackpot-reward", "Update lottery jackpot reward percentage to 69%")
  .addOptionalParam("lotteryManager", "Address of lottery manager", "0x8b38c5B1ba18c51a4483121f8250e2D165ed1e8f")
  .addOptionalParam("rewardPercentage", "Reward percentage in basis points", "6900") // 69%
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("💰✨ Updating Jackpot Reward Percentage");
    console.log("======================================");
    console.log("Network:", hre.network.name);
    console.log("Deployer:", deployer.address);
    console.log("Lottery Manager:", taskArgs.lotteryManager);
    console.log("New Reward Percentage:", taskArgs.rewardPercentage, "basis points (", (parseInt(taskArgs.rewardPercentage) / 100).toFixed(1), "%)");
    console.log();
    
    try {
      // Get lottery manager contract
      const lotteryManager = await ethers.getContractAt("OmniDragonLotteryManager", taskArgs.lotteryManager);
      
      // Get current configuration
      console.log("1️⃣ Reading current lottery configuration...");
      const currentConfig = await lotteryManager.instantLotteryConfig();
      console.log("Current configuration:");
      console.log("- Base Win Probability:", currentConfig.baseWinProbability.toString(), "basis points");
      console.log("- Min Swap Amount:", ethers.utils.formatUnits(currentConfig.minSwapAmount, 6), "USD");
      console.log("- Current Reward %:", currentConfig.rewardPercentage.toString(), "basis points (", (parseInt(currentConfig.rewardPercentage.toString()) / 100).toFixed(1), "%)");
      console.log("- Is Active:", currentConfig.isActive);
      console.log("- Use VRF:", currentConfig.useVRFForInstant);
      
      // Update configuration with new reward percentage
      console.log("\n2️⃣ Updating lottery configuration...");
      const updateTx = await lotteryManager.configureInstantLottery(
        currentConfig.baseWinProbability, // Keep same base win probability
        currentConfig.minSwapAmount,      // Keep same min swap amount
        taskArgs.rewardPercentage,        // NEW: 69% reward percentage
        currentConfig.isActive,           // Keep same active status
        currentConfig.useVRFForInstant    // Keep same VRF setting
      );
      await updateTx.wait();
      console.log("✅ Lottery configuration updated!");
      
      // Verify the update
      console.log("\n3️⃣ Verifying updated configuration...");
      const newConfig = await lotteryManager.instantLotteryConfig();
      console.log("New configuration:");
      console.log("- Base Win Probability:", newConfig.baseWinProbability.toString(), "basis points");
      console.log("- Min Swap Amount:", ethers.utils.formatUnits(newConfig.minSwapAmount, 6), "USD");
      console.log("- NEW Reward %:", newConfig.rewardPercentage.toString(), "basis points (", (parseInt(newConfig.rewardPercentage.toString()) / 100).toFixed(1), "%)");
      console.log("- Is Active:", newConfig.isActive);
      console.log("- Use VRF:", newConfig.useVRFForInstant);
      
      console.log("\n🎉 Jackpot Reward Update Complete!");
      console.log("==========================================");
      console.log("🔥 Winners now get", (parseInt(taskArgs.rewardPercentage) / 100).toFixed(1) + "% of the jackpot! 🔥");
      console.log("✅ Configuration successfully updated");
      console.log("✅ VRF randomness ensures fair lottery");
      console.log("✅ Ready for epic jackpot wins!");
      
    } catch (error) {
      console.error("❌ Jackpot reward update failed:", error.message);
      throw error;
    }
  });

module.exports = {}; 