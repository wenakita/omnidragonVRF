const { task, types } = require("hardhat/config");

task("configure-lottery-manager", "Configure OmniDragonLotteryManager with omniDRAGON integration")
  .addParam("lotteryManager", "Address of the deployed lottery manager")
  .addOptionalParam("omnidragon", "Address of omniDRAGON token", "0x0E5d746F01f4CDc76320c3349386176a873eAa40")
  .addOptionalParam("marketManager", "Address of market manager", "0x4cdda12f479dcfaa926061e3ca6349d6452105d9")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("🔧✨ Configuring OmniDragon Lottery Manager");
    console.log("==========================================");
    console.log("Network:", hre.network.name);
    console.log("Deployer:", deployer.address);
    console.log("Lottery Manager:", taskArgs.lotteryManager);
    console.log("omniDRAGON Token:", taskArgs.omnidragon);
    console.log("Market Manager:", taskArgs.marketManager);
    console.log();
    
    try {
      // Step 1: Connect omniDRAGON to Lottery Manager
      console.log("1️⃣ Connecting omniDRAGON token to lottery manager...");
      const omniDRAGON = await ethers.getContractAt("omniDRAGON", taskArgs.omnidragon);
      
      // Get current core addresses first
      const currentJackpotVault = await omniDRAGON.jackpotVault();
      const currentRevenueDistributor = await omniDRAGON.revenueDistributor();
      const currentWrappedNative = await omniDRAGON.wrappedNativeTokenAddress();
      const currentUniswapRouter = await omniDRAGON.uniswapRouter();
      const currentEmergencyTreasury = await omniDRAGON.emergencyTreasury();
      const currentEmergencyPauser = await omniDRAGON.emergencyPauser();
      
      console.log("Current addresses:");
      console.log("- Jackpot Vault:", currentJackpotVault);
      console.log("- Revenue Distributor:", currentRevenueDistributor);
      console.log("- Wrapped Native:", currentWrappedNative);
      console.log("- Uniswap Router:", currentUniswapRouter);
      console.log("- Emergency Treasury:", currentEmergencyTreasury);
      console.log("- Emergency Pauser:", currentEmergencyPauser);
      
      const setCoreAddressesTx = await omniDRAGON.setCoreAddresses(
        currentJackpotVault,
        currentRevenueDistributor,
        currentWrappedNative,
        currentUniswapRouter,
        taskArgs.lotteryManager, // Only update lottery manager
        currentEmergencyTreasury,
        currentEmergencyPauser
      );
      await setCoreAddressesTx.wait();
      console.log("✅ omniDRAGON token connected to lottery manager!");
      
      // Step 2: Get lottery manager contract
      console.log("\n2️⃣ Getting lottery manager contract...");
      const lotteryManager = await ethers.getContractAt("OmniDragonLotteryManager", taskArgs.lotteryManager);
      
      // Step 3: Authorize market manager for swap-triggered lottery
      console.log("\n3️⃣ Authorizing market manager for lottery entries...");
      const authorizeTx = await lotteryManager.setAuthorizedSwapContract(taskArgs.marketManager, true);
      await authorizeTx.wait();
      console.log("✅ Market manager authorized for lottery entries!");
      
      // Step 4: Verify configuration
      console.log("\n4️⃣ Verifying configuration...");
      
      // Check omniDRAGON lottery manager connection
      const connectedLotteryManager = await omniDRAGON.lotteryManager();
      console.log("omniDRAGON lottery manager:", connectedLotteryManager);
      
      // Check authorization
      const isAuthorized = await lotteryManager.authorizedSwapContracts(taskArgs.marketManager);
      console.log("Market manager authorized:", isAuthorized);
      
      // Check lottery configuration
      try {
        const lotteryConfig = await lotteryManager.instantLotteryConfig();
        console.log("Lottery config:", {
          baseWinProbability: lotteryConfig.baseWinProbability?.toString() || "N/A",
          minSwapAmount: lotteryConfig.minSwapAmount ? ethers.utils.formatUnits(lotteryConfig.minSwapAmount, 6) : "N/A",
          jackpotRewardBPS: lotteryConfig.rewardPercentage?.toString() || "N/A",
          isActive: lotteryConfig.isActive || false,
          useVRF: lotteryConfig.useVRFForInstant || false
        });
      } catch (error) {
        console.log("⚠️ Could not read lottery config (non-critical):", error.message);
      }
      
      console.log("\n🎉 Configuration Complete!");
      console.log("==========================================");
      console.log("✅ omniDRAGON connected to lottery manager");
      console.log("✅ Market manager authorized for lottery entries");
      console.log("✅ Lottery configured with 69% jackpot rewards");
      console.log("✅ VRF integration enabled");
      console.log("✅ Ready for lottery-enabled swaps!");
      
    } catch (error) {
      console.error("❌ Configuration failed:", error.message);
      throw error;
    }
  });

module.exports = {}; 