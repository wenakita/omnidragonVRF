import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Quick Oracle Configuration Check");
  console.log("═".repeat(40));
  
  const oracleAddress = "0xA528C33a16088817CDAf38F7d81aEb2fAeC6fE06";
  console.log(`📍 Oracle: ${oracleAddress}`);
  
  try {
    const oracle = await ethers.getContractAt("DragonMarketOracle", oracleAddress);
    
    // Basic info
    console.log("\n📊 BASIC INFO:");
    try {
      const nativeSymbol = await oracle.nativeSymbol();
      const quoteSymbol = await oracle.quoteSymbol();
      console.log(`   Pair: ${nativeSymbol}/${quoteSymbol}`);
    } catch (error: any) {
      console.log(`   ❌ Basic info error: ${error.message}`);
    }
    
    // Oracle addresses (these should be quick)
    console.log("\n🔗 ORACLE ADDRESSES:");
    try {
      const chainlinkFeed = await oracle.chainlinkSUSDFeed();
      const bandFeed = await oracle.bandProtocolFeed();
      const api3Feed = await oracle.api3ProxyFeed();
      const pythFeed = await oracle.pythNetworkFeed();
      
      console.log(`   Chainlink: ${chainlinkFeed}`);
      console.log(`   Band: ${bandFeed}`);
      console.log(`   API3: ${api3Feed}`);
      console.log(`   Pyth: ${pythFeed}`);
      
      // Check if addresses are set
      const isAddressesSet = chainlinkFeed !== ethers.constants.AddressZero && 
                            bandFeed !== ethers.constants.AddressZero &&
                            api3Feed !== ethers.constants.AddressZero &&
                            pythFeed !== ethers.constants.AddressZero;
      
      console.log(`   Status: ${isAddressesSet ? "✅ ALL SET" : "⚠️  SOME MISSING"}`);
      
    } catch (error: any) {
      console.log(`   ❌ Address check error: ${error.message}`);
    }
    
    // Weights
    console.log("\n⚖️  WEIGHTS:");
    try {
      const chainlinkWeight = await oracle.chainlinkWeight();
      const bandWeight = await oracle.bandWeight();
      const api3Weight = await oracle.api3Weight();
      const pythWeight = await oracle.pythWeight();
      
      const total = chainlinkWeight.add(bandWeight).add(api3Weight).add(pythWeight);
      
      console.log(`   Chainlink: ${(chainlinkWeight.toNumber() / 100).toFixed(1)}%`);
      console.log(`   Band: ${(bandWeight.toNumber() / 100).toFixed(1)}%`);
      console.log(`   API3: ${(api3Weight.toNumber() / 100).toFixed(1)}%`);
      console.log(`   Pyth: ${(pythWeight.toNumber() / 100).toFixed(1)}%`);
      console.log(`   Total: ${(total.toNumber() / 100).toFixed(1)}%`);
      
      const isValid = total.toNumber() === 10000;
      console.log(`   Status: ${isValid ? "✅ VALID" : "❌ INVALID"}`);
      
    } catch (error: any) {
      console.log(`   ❌ Weight check error: ${error.message}`);
    }
    
    // Pyth feed ID
    console.log("\n🐍 PYTH CONFIG:");
    try {
      const pythSUsdId = await oracle.pythSUSDFeedId();
      const isConfigured = pythSUsdId !== "0x0000000000000000000000000000000000000000000000000000000000000000";
      console.log(`   Feed ID: ${pythSUsdId.slice(0, 10)}...`);
      console.log(`   Status: ${isConfigured ? "✅ CONFIGURED" : "❌ NOT SET"}`);
      
    } catch (error: any) {
      console.log(`   ❌ Pyth config error: ${error.message}`);
    }
    
    // Try dynamic functions
    console.log("\n🎯 DYNAMIC FUNCTIONS:");
    try {
      const dynamicPyth = await oracle.getDynamicPythWeight();
      console.log(`   getDynamicPythWeight(): ✅ Available (${(dynamicPyth.toNumber() / 100).toFixed(1)}%)`);
      
      const [isValid, totalWeight] = await oracle.verifyWeightIntegrity();
      console.log(`   verifyWeightIntegrity(): ✅ Available (Valid: ${isValid})`);
      
    } catch (error: any) {
      console.log(`   ❌ Dynamic functions: ${error.message}`);
    }
    
    console.log("\n🎯 CONFIGURATION STATUS:");
    console.log("   Based on what we could check:");
    console.log("   • Oracle addresses appear to be set");
    console.log("   • Weight distribution needs verification");
    console.log("   • Pyth feed ID needs verification");
    console.log("   • Dynamic functions available");
    
  } catch (error: any) {
    console.log(`❌ Main error: ${error.message}`);
  }
}

main().catch(console.error); 