const { task, types } = require("hardhat/config");

task("configure-uniswap-pair", "Configure Uniswap V2 pair for lottery integration")
  .addParam("pair", "Address of the Uniswap V2 pair")
  .addOptionalParam("omnidragon", "Address of omniDRAGON token", "0x0E5d746F01f4CDc76320c3349386176a873eAa40")
  .addOptionalParam("lotteryManager", "Address of lottery manager", "0x8b38c5B1ba18c51a4483121f8250e2D165ed1e8f")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("🔄✨ Configuring Uniswap V2 Pair for Lottery");
    console.log("=============================================");
    console.log("Network:", hre.network.name);
    console.log("Deployer:", deployer.address);
    console.log("Pair Address:", taskArgs.pair);
    console.log("omniDRAGON Token:", taskArgs.omnidragon);
    console.log("Lottery Manager:", taskArgs.lotteryManager);
    console.log();
    
    try {
      // Step 1: Configure the pair in omniDRAGON token
      console.log("1️⃣ Adding pair to omniDRAGON token...");
      const omniDRAGON = await ethers.getContractAt("omniDRAGON", taskArgs.omnidragon);
      
      // Add as Uniswap V2 pair (DexType.UNISWAP_V2 = 1)
      const addPairTx = await omniDRAGON.addPair(taskArgs.pair, 1); // 1 = UNISWAP_V2
      await addPairTx.wait();
      console.log("✅ Pair added to omniDRAGON token!");
      
      // Step 2: Authorize the pair for lottery entries in lottery manager
      console.log("\n2️⃣ Authorizing pair for lottery entries...");
      const lotteryManager = await ethers.getContractAt("OmniDragonLotteryManager", taskArgs.lotteryManager);
      
      const authorizePairTx = await lotteryManager.setAuthorizedSwapContract(taskArgs.pair, true);
      await authorizePairTx.wait();
      console.log("✅ Pair authorized for lottery entries!");
      
      // Step 3: Verify configuration
      console.log("\n3️⃣ Verifying configuration...");
      
      // Check if pair is recognized by omniDRAGON
      const isPair = await omniDRAGON.isPair(taskArgs.pair);
      const dexType = await omniDRAGON.pairToDexType(taskArgs.pair);
      console.log("omniDRAGON pair status:", isPair);
      console.log("Dex type:", dexType.toString(), "(1 = Uniswap V2)");
      
      // Check if pair is authorized in lottery manager
      const isAuthorized = await lotteryManager.authorizedSwapContracts(taskArgs.pair);
      console.log("Lottery manager authorization:", isAuthorized);
      
      // Get pair info from the pair contract
      console.log("\n4️⃣ Reading pair information...");
      try {
        const pairContract = await ethers.getContractAt("IUniswapV2Pair", taskArgs.pair);
        const token0 = await pairContract.token0();
        const token1 = await pairContract.token1();
        const reserves = await pairContract.getReserves();
        
        console.log("Pair details:");
        console.log("- Token0:", token0);
        console.log("- Token1:", token1);
        console.log("- Reserve0:", ethers.utils.formatEther(reserves[0]));
        console.log("- Reserve1:", ethers.utils.formatEther(reserves[1]));
        
        // Check which token is omniDRAGON
        if (token0.toLowerCase() === taskArgs.omnidragon.toLowerCase()) {
          console.log("✅ omniDRAGON is Token0");
        } else if (token1.toLowerCase() === taskArgs.omnidragon.toLowerCase()) {
          console.log("✅ omniDRAGON is Token1");
        } else {
          console.log("⚠️ omniDRAGON not found in pair tokens");
        }
        
      } catch (error) {
        console.log("⚠️ Could not read pair details:", error.message);
      }
      
      console.log("\n🎉 Pair Configuration Complete!");
      console.log("==========================================");
      console.log("✅ Pair added to omniDRAGON token");
      console.log("✅ Pair authorized for lottery entries");
      console.log("✅ Swaps through this pair will now trigger lottery entries!");
      console.log("✅ Users buying omniDRAGON have a chance to win 69% of jackpot!");
      
    } catch (error) {
      console.error("❌ Pair configuration failed:", error.message);
      throw error;
    }
  });

module.exports = {}; 