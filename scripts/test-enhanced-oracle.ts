import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing Enhanced Oracle Functions");
  console.log("═".repeat(60));
  
  const oracleAddress = "0xA528C33a16088817CDAf38F7d81aEb2fAeC6fE06";
  console.log(`📍 Oracle: ${oracleAddress}`);
  
  try {
    const oracle = await ethers.getContractAt("DragonMarketOracle", oracleAddress);
    
    console.log("\n🔍 ENHANCED ORACLE STATUS:");
    console.log("─".repeat(40));
    
    // Test enhanced oracle status function
    try {
      const status = await oracle.getOracleStatus();
      console.log(`✅ Local Fresh: ${status.localFresh}`);
      console.log(`📊 Oracle Count: ${status.oracleCount}`);
      console.log(`⏰ Last Update: ${new Date(status.lastUpdate.toNumber() * 1000).toLocaleString()}`);
      console.log(`🎯 Confidence: ${(status.confidence.toNumber() / 100).toFixed(1)}%`);
      console.log(`📈 Deviation: ${(status.deviation.toNumber() / 100).toFixed(2)}%`);
    } catch (error) {
      console.log(`❌ Enhanced status error: ${error.message}`);
    }
    
    console.log("\n⚙️ GAS OPTIMIZATION ANALYSIS:");
    console.log("─".repeat(40));
    
    // Test gas optimization scoring
    try {
      const gasScore1 = await oracle.calculateGasOptimizationScore(1, 5000);
      const gasScore4 = await oracle.calculateGasOptimizationScore(4, 5000);
      
      console.log(`📊 Single Operation: ${(gasScore1.toNumber() / 100).toFixed(1)}%`);
      console.log(`📊 4 Operations: ${(gasScore4.toNumber() / 100).toFixed(1)}%`);
    } catch (error) {
      console.log(`❌ Gas optimization error: ${error.message}`);
    }
    
    console.log("\n✅ ENHANCED ORACLE TEST COMPLETED");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
