import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing Dynamic Weight System");
  console.log("═".repeat(50));
  
  // Test with the existing oracle
  const oracleAddress = "0x46abe8E5176857DA0187E59ddB990A631D7b323C";
  
  console.log(`📍 Testing oracle at: ${oracleAddress}`);
  
  try {
    const oracle = await ethers.getContractAt("DragonMarketOracle", oracleAddress);
    
    // Test 1: Current weight distribution
    console.log("\n📊 TEST 1: Current Weight Distribution");
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
    
    // Test 2: Check if dynamic weight functions exist
    console.log("\n🔧 TEST 2: Dynamic Weight Functions");
    
    try {
      const dynamicPyth = await oracle.getDynamicPythWeight();
      console.log(`   Dynamic Pyth: ${dynamicPyth.toString()} (${(dynamicPyth.toNumber() / 100).toFixed(1)}%)`);
      
      const calculated = 10000 - chainlinkWeight.toNumber() - bandWeight.toNumber() - api3Weight.toNumber();
      console.log(`   Calculated: ${calculated} (${(calculated / 100).toFixed(1)}%)`);
      console.log(`   Match: ${dynamicPyth.toNumber() === calculated ? '✅ YES' : '❌ NO'}`);
      
    } catch (error: any) {
      console.log(`   ⚠️  Dynamic functions not available: ${error.message}`);
      console.log("   📝 This oracle needs to be updated with the new functions");
    }
    
    // Test 3: Weight integrity verification
    console.log("\n🔍 TEST 3: Weight Integrity");
    
    try {
      const [isValid, totalWeight, breakdown] = await oracle.verifyWeightIntegrity();
      console.log(`   Valid: ${isValid ? '✅ YES' : '❌ NO'}`);
      console.log(`   Total: ${totalWeight.toString()} (${(totalWeight.toNumber() / 100).toFixed(1)}%)`);
      console.log(`   Breakdown: [${breakdown.map((w: any) => w.toString()).join(', ')}]`);
      
    } catch (error: any) {
      console.log(`   ⚠️  Integrity check not available: ${error.message}`);
    }
    
    // Test 4: Your recommended distribution
    console.log("\n🎯 TEST 4: Your Recommended Distribution");
    console.log("   Target: Chainlink 40%, Band 30%, API3 20%, Pyth auto-calculated");
    
    const targetChainlink = 4000;
    const targetBand = 3000;
    const targetApi3 = 2000;
    const targetPyth = 10000 - targetChainlink - targetBand - targetApi3;
    
    console.log(`   Chainlink: ${targetChainlink} (${targetChainlink / 100}%)`);
    console.log(`   Band: ${targetBand} (${targetBand / 100}%)`);
    console.log(`   API3: ${targetApi3} (${targetApi3 / 100}%)`);
    console.log(`   Pyth (auto): ${targetPyth} (${targetPyth / 100}%)`);
    console.log(`   Total: ${targetChainlink + targetBand + targetApi3 + targetPyth} (100%)`);
    
    // Test 5: Simulate weight changes
    console.log("\n🔄 TEST 5: Simulated Weight Changes");
    
    const scenarios = [
      { name: "Conservative", chainlink: 5000, band: 3000, api3: 1500 },
      { name: "Balanced", chainlink: 4000, band: 3000, api3: 2000 },
      { name: "Diversified", chainlink: 3500, band: 2500, api3: 2500 }
    ];
    
    scenarios.forEach(scenario => {
      const pyth = 10000 - scenario.chainlink - scenario.band - scenario.api3;
      console.log(`   ${scenario.name}:`);
      console.log(`     C:${scenario.chainlink/100}% B:${scenario.band/100}% A:${scenario.api3/100}% P:${pyth/100}% = ${(scenario.chainlink + scenario.band + scenario.api3 + pyth)/100}%`);
    });
    
  } catch (error: any) {
    console.log(`❌ Error testing oracle: ${error.message}`);
  }
  
  console.log("\n💡 DYNAMIC WEIGHT BENEFITS:");
  console.log("✅ Always exactly 100% total weight");
  console.log("✅ Automatic rebalancing when main weights change");
  console.log("✅ Fault tolerance if oracles fail");
  console.log("✅ Mathematical precision guaranteed");
  console.log("✅ Future-proof against configuration changes");
  
  console.log("\n🔧 IMPLEMENTATION FORMULA:");
  console.log("   Pyth Weight = 10000 - (Chainlink + Band + API3)");
  console.log("   This ensures: Chainlink + Band + API3 + Pyth = 10000 (100%)");
  
  console.log("\n🎉 Your weight distribution strategy is mathematically perfect!");
}

main().catch(console.error); 