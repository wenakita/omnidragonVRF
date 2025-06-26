import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Dragon Market System");
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
  
  // LayerZero V2 endpoint for Sonic
  const layerZeroEndpoint = "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B";
  
  console.log("\n📋 DEPLOYMENT PARAMETERS:");
  console.log(`   Chainlink S/USD: ${chainlinkSUSDFeed}`);
  console.log(`   Band Protocol: ${bandProtocolFeed}`);
  console.log(`   API3 Proxy: ${api3ProxyFeed}`);
  console.log(`   Pyth Network: ${pythNetworkFeed}`);
  console.log(`   LayerZero V2: ${layerZeroEndpoint}`);
  
  console.log("\n🔧 STEP 1: Deploy Enhanced DragonMarketAnalyzer");
  console.log("─".repeat(50));
  
  const EnhancedAnalyzer = await ethers.getContractFactory("EnhancedDragonMarketAnalyzer");
  console.log("📦 Deploying Enhanced Analyzer library...");
  
  // Deploy as library
  const analyzer = await EnhancedAnalyzer.deploy();
  await analyzer.deployed();
  
  console.log(`✅ Enhanced Analyzer deployed: ${analyzer.address}`);
  
  console.log("\n🔧 STEP 2: Deploy DragonMarketOracle");
  console.log("─".repeat(50));
  
  const DragonMarketOracle = await ethers.getContractFactory("DragonMarketOracle");
  console.log("📦 Deploying Dragon Market Oracle...");
  
  const dragonMarketOracle = await DragonMarketOracle.deploy(
    "S",                    // nativeSymbol
    "USD",                  // quoteSymbol
    chainlinkSUSDFeed,      // chainlink feed
    bandProtocolFeed,       // band protocol feed
    api3ProxyFeed,          // api3 proxy feed
    pythNetworkFeed,        // pyth network feed
    layerZeroEndpoint,      // LayerZero V2 endpoint
    1                       // CROSS_CHAIN_ENABLED mode
  );
  await dragonMarketOracle.deployed();
  
  console.log(`✅ Dragon Market Oracle deployed: ${dragonMarketOracle.address}`);
  
  console.log("\n🔧 STEP 3: Deploy DragonMarketManager");
  console.log("─".repeat(50));
  
  const DragonMarketManager = await ethers.getContractFactory("DragonMarketManager");
  console.log("📦 Deploying Dragon Market Manager...");
  
  const dragonMarketManager = await DragonMarketManager.deploy(
    1000,                   // 10% total fee
    690,                    // 6.9% jackpot fee
    "S",                    // nativeSymbol
    "USD",                  // quoteSymbol
    chainlinkSUSDFeed,      // chainlink feed
    bandProtocolFeed,       // band protocol feed
    api3ProxyFeed,          // api3 proxy feed
    pythNetworkFeed,        // pyth network feed
    layerZeroEndpoint,      // LayerZero V2 endpoint
    1                       // CROSS_CHAIN_ENABLED mode
  );
  await dragonMarketManager.deployed();
  
  console.log(`✅ Dragon Market Manager deployed: ${dragonMarketManager.address}`);
  
  console.log("\n🔧 STEP 4: Deploy DragonDataMigrator");
  console.log("─".repeat(50));
  
  const DragonDataMigrator = await ethers.getContractFactory("DragonDataMigrator");
  console.log("📦 Deploying Dragon Data Migrator...");
  
  // Legacy contract addresses (current deployments)
  const legacyContracts = {
    controller: ethers.constants.AddressZero,  // No legacy controller
    oracle: "0xA528C33a16088817CDAf38F7d81aEb2fAeC6fE06", // Current oracle
    omniOracle: ethers.constants.AddressZero, // No omni oracle
    feeManager: ethers.constants.AddressZero, // No fee manager
    analyzer: ethers.constants.AddressZero    // No legacy analyzer
  };
  
  const consolidatedContracts = {
    consolidatedOracle: dragonMarketOracle.address,
    integratedManager: dragonMarketManager.address,
    enhancedAnalyzer: analyzer.address
  };
  
  const dragonDataMigrator = await DragonDataMigrator.deploy(
    legacyContracts,
    consolidatedContracts
  );
  await dragonDataMigrator.deployed();
  
  console.log(`✅ Dragon Data Migrator deployed: ${dragonDataMigrator.address}`);
  
  console.log("\n🔧 STEP 5: Configure Cross-Chain Networks");
  console.log("─".repeat(50));
  
  // Add supported networks for cross-chain functionality
  console.log("📡 Adding supported networks...");
  
  try {
    // Add Arbitrum network
    await dragonMarketOracle.addSupportedNetwork(110, "Arbitrum");
    console.log("✅ Added Arbitrum network (EID: 110)");
    
    await dragonMarketManager.addSupportedNetwork(110, "Arbitrum");
    console.log("✅ Added Arbitrum to Dragon Market Manager");
    
    // Add Ethereum network
    await dragonMarketOracle.addSupportedNetwork(101, "Ethereum");
    console.log("✅ Added Ethereum network (EID: 101)");
    
    await dragonMarketManager.addSupportedNetwork(101, "Ethereum");
    console.log("✅ Added Ethereum to Dragon Market Manager");
    
  } catch (error: any) {
    console.log(`⚠️  Network configuration warning: ${error.message}`);
  }
  
  console.log("\n🔧 STEP 6: Initialize Oracle Data");
  console.log("─".repeat(50));
  
  try {
    console.log("📊 Updating oracle price...");
    const [success, price, oracleCount] = await dragonMarketOracle.updateMultiOraclePrice();
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
  
  console.log("\n🔧 STEP 7: Test System Integration");
  console.log("─".repeat(50));
  
  try {
    // Test dragon market oracle
    const [price, timestamp] = await dragonMarketOracle.getLatestPrice();
    console.log(`📊 Oracle Price: $${ethers.utils.formatEther(price)}`);
    
    // Test dragon market manager
    const [jackpotFee, liquidityFee, burnFee, totalFee] = await dragonMarketManager.getFees();
    console.log(`💰 Fee Structure: ${totalFee/100}% total (${jackpotFee/100}% jackpot, ${liquidityFee/100}% liquidity, ${burnFee/100}% burn)`);
    
    // Test market conditions
    const marketConditions = await dragonMarketOracle.getMarketConditions();
    console.log(`📈 Market Score: ${marketConditions/100}%`);
    
  } catch (error: any) {
    console.log(`⚠️  System test warning: ${error.message}`);
  }
  
  console.log("\n🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("═".repeat(60));
  console.log("📋 DEPLOYED CONTRACTS:");
  console.log(`   🧮 Enhanced Analyzer: ${analyzer.address}`);
  console.log(`   🔮 Dragon Market Oracle: ${dragonMarketOracle.address}`);
  console.log(`   🎛️  Dragon Market Manager: ${dragonMarketManager.address}`);
  console.log(`   📊 Dragon Data Migrator: ${dragonDataMigrator.address}`);
  
  console.log("\n📝 NEXT STEPS:");
  console.log("   1. Update frontend to use new contract addresses");
  console.log("   2. Migrate data from legacy oracle if needed");
  console.log("   3. Configure cross-chain peers if using LayerZero");
  console.log("   4. Test all functionality before switching production traffic");
  
  console.log("\n💡 MIGRATION COMMANDS:");
  console.log(`   npx hardhat run scripts/migrate-to-dragon-system.ts --network sonic`);
  console.log(`   npx hardhat run scripts/test-dragon-system.ts --network sonic`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 