import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Enhanced Dragon Market Oracle");
  console.log("═".repeat(60));
  
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  
  // Get current balance
  const balance = await deployer.getBalance();
  console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} S`);
  
  // Oracle feed addresses for Sonic
  const chainlinkSUSDFeed = "0xc76dFb89fF298145b417d221B2c747d84952e01d";
  const bandProtocolFeed = "0x506085050Ea5494Fe4b89Dd5BEa659F506F470Cc";
  const api3ProxyFeed = "0x709944a48cAf83535e43471680fDA4905FB3920a";
  const pythNetworkFeed = "0x2880aB155794e7b745eada5B88125adbc54a2185";
  
  console.log("\n📋 DEPLOYMENT PARAMETERS:");
  console.log(`   Chainlink S/USD: ${chainlinkSUSDFeed}`);
  console.log(`   Band Protocol: ${bandProtocolFeed}`);
  console.log(`   API3 Proxy: ${api3ProxyFeed}`);
  console.log(`   Pyth Network: ${pythNetworkFeed}`);
  
  console.log("\n🔧 Deploying Enhanced DragonMarketOracle");
  console.log("─".repeat(50));
  
  const DragonMarketOracle = await ethers.getContractFactory("DragonMarketOracle");
  console.log("📦 Deploying Enhanced Oracle...");
  
  const oracle = await DragonMarketOracle.deploy(
    "S",                    // nativeSymbol
    "USD",                  // quoteSymbol
    chainlinkSUSDFeed,      // chainlink feed
    bandProtocolFeed,       // band protocol feed
    api3ProxyFeed,          // api3 proxy feed
    pythNetworkFeed         // pyth network feed
  );
  await oracle.deployed();
  
  console.log(`✅ Enhanced Oracle deployed: ${oracle.address}`);
  
  console.log("\n🔧 Initializing Oracle");
  console.log("─".repeat(50));
  
  try {
    // Set Pyth feed ID
    console.log("🐍 Setting Pyth feed ID...");
    await oracle.setPythFeedId("0x50c67b3fd225db8912a424dd4baed60ffdde625ed2feaaf283724f9608fea266");
    console.log("✅ Pyth feed ID set");
    
    // Update oracle price
    console.log("📊 Updating oracle price...");
    const [success, price, oracleCount] = await oracle.updateMultiOraclePrice();
    if (success) {
      console.log(`✅ Oracle updated successfully`);
      console.log(`   💰 Price: $${ethers.utils.formatEther(price)}`);
      console.log(`   📊 Oracle Count: ${oracleCount}`);
    } else {
      console.log("⚠️  Oracle update failed - using default values");
    }
  } catch (error: any) {
    console.log(`⚠️  Oracle initialization warning: ${error.message}`);
  }
  
  console.log("\n🔧 Testing Enhanced Functions");
  console.log("─".repeat(50));
  
  try {
    // Test enhanced oracle status
    const status = await oracle.getOracleStatus();
    console.log(`📊 Oracle Status:`);
    console.log(`   ✅ Fresh: ${status.localFresh}`);
    console.log(`   📊 Count: ${status.oracleCount}`);
    console.log(`   🎯 Confidence: ${(status.confidence.toNumber() / 100).toFixed(1)}%`);
    console.log(`   📈 Deviation: ${(status.deviation.toNumber() / 100).toFixed(2)}%`);
    
    // Test gas optimization
    const gasScore = await oracle.calculateGasOptimizationScore(4, 5000);
    console.log(`⚙️  Gas Optimization Score: ${(gasScore.toNumber() / 100).toFixed(1)}%`);
    
    // Test enhanced market analysis
    const marketScore = await oracle.calculateEnhancedMarketScore(
      ethers.utils.parseEther("50000"), // 50K liquidity
      ethers.utils.parseEther("5000"),  // 5K daily volume
      300,  // 3% price change
      150,  // 150 active stakers
      ethers.utils.parseEther("8000")   // 8K jackpot
    );
    console.log(`📈 Enhanced Market Score: ${(marketScore.toNumber() / 100).toFixed(1)}%`);
    
    // Test weight integrity
    const integrity = await oracle.verifyWeightIntegrity();
    console.log(`🔧 Weight Integrity: ${integrity.isValid ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`   Total Weight: ${integrity.totalWeight}`);
    
  } catch (error: any) {
    console.log(`⚠️  Enhanced function test warning: ${error.message}`);
  }
  
  console.log("\n🎉 ENHANCED ORACLE DEPLOYMENT COMPLETED!");
  console.log("═".repeat(60));
  console.log("📋 DEPLOYED CONTRACT:");
  console.log(`   🔮 Enhanced Oracle: ${oracle.address}`);
  
  console.log("\n📝 REPLACEMENT STEPS:");
  console.log("   1. Update your applications to use the new oracle address");
  console.log("   2. The new oracle has all the enhanced features from the consolidated architecture");
  console.log("   3. Test all functionality before switching production traffic");
  
  console.log("\n💡 NEXT COMMANDS:");
  console.log(`   npx hardhat run scripts/test-enhanced-oracle.ts --network sonic`);
  console.log(`   npx hardhat verify --network sonic ${oracle.address} "S" "USD" "${chainlinkSUSDFeed}" "${bandProtocolFeed}" "${api3ProxyFeed}" "${pythNetworkFeed}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 