const { task } = require("hardhat/config");

// Sonic network contract addresses
const SONIC_ADDRESSES = {
  feeManager: "0x071E337B46a56eca548D5c545b8F723296B36408",
  priceOracle: "0x54D0DC2DcF1A1994aF3391A68FCF80A9C46FC2fd"
};

// Correct fee structure (matching omniDRAGON contract)
const CORRECT_FEES = {
  totalFee: 1000,    // 10%
  jackpotFee: 690,   // 6.9%
  burnFee: 69,       // 0.69% (fixed)
  liquidityFee: 241  // 2.41% (veDRAGON revenue)
};

task("fix-fee-configuration", "Fix fee configuration to match omniDRAGON contract values")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("\n🔧 === Fixing Fee Configuration ===");
    console.log(`Network: ${hre.network.name}`);
    console.log(`Deployer: ${deployer.address}`);
    
    if (hre.network.name !== "sonic") {
      console.log("❌ This task is only for Sonic network");
      return;
    }
    
    try {
      // Check current fee configuration
      const feeManager = await ethers.getContractAt("DragonFeeManager", SONIC_ADDRESSES.feeManager);
      
      console.log("\n📊 Current Fee Configuration:");
      const [currentTotal, currentBurn, currentJackpot, currentLiquidity] = await feeManager.getFeeConfiguration();
      console.log(`   Total Fee: ${currentTotal / 100}%`);
      console.log(`   Jackpot Fee: ${currentJackpot / 100}%`);
      console.log(`   Liquidity Fee: ${currentLiquidity / 100}%`);
      console.log(`   Burn Fee: ${currentBurn / 100}%`);
      
      console.log("\n🎯 Target Fee Configuration:");
      console.log(`   Total Fee: ${CORRECT_FEES.totalFee / 100}%`);
      console.log(`   Jackpot Fee: ${CORRECT_FEES.jackpotFee / 100}%`);
      console.log(`   Liquidity Fee: ${CORRECT_FEES.liquidityFee / 100}%`);
      console.log(`   Burn Fee: ${CORRECT_FEES.burnFee / 100}%`);
      
      // Update fee configuration
      if (currentJackpot.toNumber() !== CORRECT_FEES.jackpotFee || 
          currentLiquidity.toNumber() !== CORRECT_FEES.liquidityFee) {
        
        console.log("\n🔄 Updating fee configuration...");
        const tx = await feeManager.updateFeeConfiguration(
          CORRECT_FEES.totalFee,
          CORRECT_FEES.jackpotFee
        );
        await tx.wait();
        console.log(`✅ Fee configuration updated: ${tx.hash}`);
        
        // Verify the update
        console.log("\n✅ Verifying updated configuration:");
        const [newTotal, newBurn, newJackpot, newLiquidity] = await feeManager.getFeeConfiguration();
        console.log(`   Total Fee: ${newTotal / 100}%`);
        console.log(`   Jackpot Fee: ${newJackpot / 100}%`);
        console.log(`   Liquidity Fee: ${newLiquidity / 100}%`);
        console.log(`   Burn Fee: ${newBurn / 100}%`);
        
        if (newJackpot.toNumber() === CORRECT_FEES.jackpotFee && 
            newLiquidity.toNumber() === CORRECT_FEES.liquidityFee) {
          console.log("\n🎉 Fee configuration successfully corrected!");
          console.log("✅ Jackpot fee: 6.9% (matches omniDRAGON contract)");
          console.log("✅ veDRAGON revenue fee: 2.41% (matches omniDRAGON contract)");
          console.log("✅ Burn fee: 0.69% (fixed)");
        } else {
          console.log("❌ Fee configuration update verification failed");
        }
        
      } else {
        console.log("\n✅ Fee configuration is already correct!");
      }
      
    } catch (error) {
      console.error(`❌ Failed to fix fee configuration:`, error.message);
      throw error;
    }
  }); 