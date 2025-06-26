import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Simple Oracle Test");
  console.log("═".repeat(30));
  
  const oracleAddress = "0xA528C33a16088817CDAf38F7d81aEb2fAeC6fE06";
  console.log(`📍 Testing: ${oracleAddress}`);
  
  try {
    const provider = ethers.provider;
    const code = await provider.getCode(oracleAddress);
    
    if (code === "0x") {
      console.log("❌ No contract at this address");
      return;
    }
    
    console.log("✅ Contract exists");
    
    // Try to call basic functions
    const oracle = await ethers.getContractAt("DragonMarketOracle", oracleAddress);
    
    console.log("\n📊 BASIC CHECKS:");
    
    // Test 1: Basic symbol calls
    try {
      const native = await oracle.nativeSymbol();
      const quote = await oracle.quoteSymbol();
      console.log(`   ✅ Symbols: ${native}/${quote}`);
    } catch (e) {
      console.log(`   ❌ Symbols failed`);
    }
    
    // Test 2: Check if it has dynamic functions
    try {
      const dynamicWeight = await oracle.getDynamicPythWeight();
      console.log(`   ✅ Dynamic functions available`);
      console.log(`   Dynamic Pyth Weight: ${(dynamicWeight.toNumber() / 100).toFixed(1)}%`);
    } catch (e) {
      console.log(`   ❌ Dynamic functions not available`);
    }
    
    // Test 3: Weight integrity
    try {
      const result = await oracle.verifyWeightIntegrity();
      console.log(`   ✅ Weight integrity check available`);
    } catch (e) {
      console.log(`   ❌ Weight integrity check failed`);
    }
    
    console.log("\n🎯 CONCLUSION:");
    console.log("   The oracle contract exists and may have some functionality.");
    console.log("   However, it might be an older version or misconfigured.");
    
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  }
}

main().catch(console.error); 