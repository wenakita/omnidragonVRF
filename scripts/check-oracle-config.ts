import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking Oracle Configuration Status");
  console.log("═".repeat(50));
  
  const oracleAddress = "0xA528C33a16088817CDAf38F7d81aEb2fAeC6fE06";
  console.log(`📍 Oracle: ${oracleAddress}`);
  
  try {
    const oracle = await ethers.getContractAt("DragonMarketOracle", oracleAddress);
    
    // 1. Check basic info
    console.log("\n📊 BASIC INFO:");
    const nativeSymbol = await oracle.nativeSymbol();
    const quoteSymbol = await oracle.quoteSymbol();
    console.log(`   Pair: ${nativeSymbol}/${quoteSymbol}`);
    
    // 2. Check oracle addresses
    console.log("\n🔗 ORACLE ADDRESSES:");
    const chainlinkFeed = await oracle.chainlinkSUSDFeed();
    const bandFeed = await oracle.bandProtocolFeed();
    const api3Feed = await oracle.api3ProxyFeed();
    const pythFeed = await oracle.pythNetworkFeed();
    
    console.log(`   Chainlink: ${chainlinkFeed}`);
    console.log(`   Band: ${bandFeed}`);
    console.log(`   API3: ${api3Feed}`);
    console.log(`   Pyth: ${pythFeed}`);
    
    // 3. Check weights
    console.log("\n⚖️  WEIGHT DISTRIBUTION:");
    const chainlinkWeight = await oracle.chainlinkWeight();
    const bandWeight = await oracle.bandWeight();
    const api3Weight = await oracle.api3Weight();
    const pythWeight = await oracle.pythWeight();
    
    console.log(`   Chainlink: ${chainlinkWeight.toString()} (${(chainlinkWeight.toNumber() / 100).toFixed(1)}%)`);
    console.log(`   Band: ${bandWeight.toString()} (${(bandWeight.toNumber() / 100).toFixed(1)}%)`);
    console.log(`   API3: ${api3Weight.toString()} (${(api3Weight.toNumber() / 100).toFixed(1)}%)`);
    console.log(`   Pyth: ${pythWeight.toString()} (${(pythWeight.toNumber() / 100).toFixed(1)}%)`);
    
    const total = chainlinkWeight.add(bandWeight).add(api3Weight).add(pythWeight);
    console.log(`   Total: ${total.toString()} (${(total.toNumber() / 100).toFixed(1)}%)`);
    
    // 4. Check Pyth feed configuration
    console.log("\n🐍 PYTH CONFIGURATION:");
    const pythSUsdId = await oracle.pythSUSDFeedId();
    console.log(`   S/USD Feed ID: ${pythSUsdId}`);
    console.log(`   Configured: ${pythSUsdId !== "0x0000000000000000000000000000000000000000000000000000000000000000" ? "✅ YES" : "❌ NO"}`);
    
    // 5. Test dynamic weight functions
    console.log("\n🎯 DYNAMIC WEIGHT FUNCTIONS:");
    try {
      const dynamicPyth = await oracle.getDynamicPythWeight();
      console.log(`   getDynamicPythWeight(): ✅ Available`);
      console.log(`   Dynamic Pyth Weight: ${dynamicPyth.toString()} (${(dynamicPyth.toNumber() / 100).toFixed(1)}%)`);
      
      const [isValid, totalWeight] = await oracle.verifyWeightIntegrity();
      console.log(`   verifyWeightIntegrity(): ✅ Available`);
      console.log(`   Integrity Valid: ${isValid ? "✅ YES" : "❌ NO"}`);
      console.log(`   Total Weight: ${totalWeight.toString()}`);
      
    } catch (error: any) {
      console.log(`   ❌ Dynamic functions not available: ${error.message}`);
    }
    
    // 6. Check current price
    console.log("\n💰 PRICE DATA:");
    try {
      const [price, timestamp] = await oracle.getLatestPrice();
      console.log(`   Latest Price: ${ethers.utils.formatEther(price)} S/USD`);
      console.log(`   Last Updated: ${new Date(Number(timestamp) * 1000).toLocaleString()}`);
      
      const isFresh = await oracle.isFresh();
      console.log(`   Data Fresh: ${isFresh ? "✅ YES" : "❌ NO"}`);
      
    } catch (error: any) {
      console.log(`   ⚠️  Price data: ${error.message}`);
    }
    
    // 7. Configuration status summary
    console.log("\n📋 CONFIGURATION STATUS:");
    
    const isAddressesSet = chainlinkFeed !== ethers.constants.AddressZero && 
                          bandFeed !== ethers.constants.AddressZero &&
                          api3Feed !== ethers.constants.AddressZero &&
                          pythFeed !== ethers.constants.AddressZero;
    
    const isPythConfigured = pythSUsdId !== "0x0000000000000000000000000000000000000000000000000000000000000000";
    
    const isWeightsValid = total.toNumber() === 10000;
    
    console.log(`   Oracle Addresses: ${isAddressesSet ? "✅ CONFIGURED" : "❌ MISSING"}`);
    console.log(`   Pyth Feed ID: ${isPythConfigured ? "✅ CONFIGURED" : "❌ MISSING"}`);
    console.log(`   Weight Distribution: ${isWeightsValid ? "✅ VALID (100%)" : "❌ INVALID"}`);
    
    const fullyConfigured = isAddressesSet && isPythConfigured && isWeightsValid;
    
    console.log("\n🎯 OVERALL STATUS:");
    console.log(`   ${fullyConfigured ? "✅ FULLY CONFIGURED" : "⚠️  NEEDS CONFIGURATION"}`);
    
    if (!fullyConfigured) {
      console.log("\n🔧 NEXT STEPS:");
      if (!isPythConfigured) {
        console.log("   • Configure Pyth S/USD feed ID");
      }
      if (!isWeightsValid) {
        console.log("   • Apply your recommended weight distribution");
      }
    }
    
  } catch (error: any) {
    console.log(`❌ Error checking oracle: ${error.message}`);
  }
}

main().catch(console.error); 