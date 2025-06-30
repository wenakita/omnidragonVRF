const { task, types } = require("hardhat/config");

task("authorize-omnidragon", "Authorize omniDRAGON token as swap contract")
  .addOptionalParam("lotteryManager", "Address of lottery manager", "0xaa826A9cBeDE5707585e1883d014C689180cc418")
  .addOptionalParam("omnidragon", "Address of omniDRAGON token", "0x0E5d746F01f4CDc76320c3349386176a873eAa40")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("🔑✨ Authorizing omniDRAGON Token");
    console.log("================================");
    console.log("Network:", hre.network.name);
    console.log("Deployer:", deployer.address);
    console.log("Lottery Manager:", taskArgs.lotteryManager);
    console.log("omniDRAGON Token:", taskArgs.omnidragon);
    console.log();
    
    try {
      // Get lottery manager contract
      const lotteryManager = await ethers.getContractAt("OmniDragonLotteryManager", taskArgs.lotteryManager);
      
      // Check current authorization status
      const isCurrentlyAuthorized = await lotteryManager.authorizedSwapContracts(taskArgs.omnidragon);
      console.log("Current authorization status:", isCurrentlyAuthorized);
      
      if (isCurrentlyAuthorized) {
        console.log("✅ omniDRAGON token is already authorized!");
      } else {
        // Authorize omniDRAGON token as a swap contract
        console.log("🔑 Authorizing omniDRAGON token as swap contract...");
        const authorizeTx = await lotteryManager.setAuthorizedSwapContract(taskArgs.omnidragon, true);
        await authorizeTx.wait();
        console.log("✅ omniDRAGON token authorized!");
      }
      
      // Verify authorization
      const isNowAuthorized = await lotteryManager.authorizedSwapContracts(taskArgs.omnidragon);
      console.log("Final authorization status:", isNowAuthorized);
      
      console.log("\n🎉 Authorization Complete!");
      console.log("==========================================");
      console.log("✅ omniDRAGON token can now call lottery manager");
      console.log("✅ processEntry function calls will work");
      console.log("✅ Ready for lottery-enabled swaps!");
      
    } catch (error) {
      console.error("❌ Authorization failed:", error.message);
      throw error;
    }
  });

module.exports = {}; 