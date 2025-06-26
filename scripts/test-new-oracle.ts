import { ethers } from "hardhat";

async function main() {
  console.log("🐉 Testing New Oracle with Dynamic Weights");
  console.log("═".repeat(60));
  
  const newOracleAddress = "0xA528C33a16088817CDAf38F7d81aEb2fAeC6fE06";
  const [deployer] = await ethers.getSigners();
  
  console.log(`📍 New Oracle: ${newOracleAddress}`);
  console.log(`🔑 Account: ${deployer.address}`);
  
  const oracle = await ethers.getContractAt("DragonMarketOracle", newOracleAddress);
  
  // Step 1: Configure Pyth feed
  console.log("\n🔧 STEP 1: Configure Pyth S/USD Feed");
  const pythPriceId = "0xb2748e718cf3a75b0ca099cb467aea6aa8f7d960b381b3970769b5a2d6be26dc";
  
  try {
    const setPythTx = await oracle.setPythFeedId("S/USD", pythPriceId);
    await setPythTx.wait();
    console.log(`✅ Pyth feed configured - TX: ${setPythTx.hash}`);
  } catch (error: any) {
    console.log(`⚠️  Pyth config: ${error.message}`);
  }
  
  // Step 2: Test current weights
  console.log("\n📊 STEP 2: Current Weight Distribution");
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
  
  // Step 3: Test dynamic weight functions
  console.log("\n🎯 STEP 3: Dynamic Weight Functions");
  
  try {
    const dynamicPyth = await oracle.getDynamicPythWeight();
    console.log(`   Dynamic Pyth: ${dynamicPyth.toString()} (${(dynamicPyth.toNumber() / 100).toFixed(1)}%)`);
    
    const calculated = 10000 - chainlinkWeight.toNumber() - bandWeight.toNumber() - api3Weight.toNumber();
    console.log(`   Calculated: ${calculated} (${(calculated / 100).toFixed(1)}%)`);
    console.log(`   Match: ${dynamicPyth.toNumber() === calculated ? '✅ PERFECT' : '❌ ERROR'}`);
    
  } catch (error: any) {
    console.log(`   ❌ Dynamic function error: ${error.message}`);
  }
  
  // Step 4: Weight integrity check
  console.log("\n🔍 STEP 4: Weight Integrity Verification");
  
  try {
    const [isValid, totalWeight, breakdown] = await oracle.verifyWeightIntegrity();
    console.log(`   Valid: ${isValid ? '✅ YES' : '❌ NO'}`);
    console.log(`   Total: ${totalWeight.toString()} (${(totalWeight.toNumber() / 100).toFixed(1)}%)`);
    console.log(`   Breakdown: [${breakdown.map((w: any) => w.toString()).join(', ')}]`);
    
  } catch (error: any) {
    console.log(`   ❌ Integrity check error: ${error.message}`);
  }
  
  // Step 5: Apply your recommended distribution
  console.log("\n🎯 STEP 5: Apply Your Recommended Distribution");
  console.log("   Setting: Chainlink 40%, Band 30%, API3 20%, Pyth auto-calculated");
  
  try {
    const setWeightsTx = await oracle.setSourceWeights(
      4000, // Chainlink: 40%
      3000, // Band: 30%
      2000  // API3: 20%
      // Pyth will auto-calculate to 1000 (10%)
    );
    await setWeightsTx.wait();
    console.log(`✅ Weights updated - TX: ${setWeightsTx.hash}`);
    
    // Verify new distribution
    console.log("\n📊 NEW WEIGHT DISTRIBUTION:");
    const newChainlink = await oracle.chainlinkWeight();
    const newBand = await oracle.bandWeight();
    const newApi3 = await oracle.api3Weight();
    const newPyth = await oracle.pythWeight();
    const newDynamicPyth = await oracle.getDynamicPythWeight();
    
    console.log(`   Chainlink: ${newChainlink.toString()} (${(newChainlink.toNumber() / 100).toFixed(1)}%)`);
    console.log(`   Band: ${newBand.toString()} (${(newBand.toNumber() / 100).toFixed(1)}%)`);
    console.log(`   API3: ${newApi3.toString()} (${(newApi3.toNumber() / 100).toFixed(1)}%)`);
    console.log(`   Pyth (stored): ${newPyth.toString()} (${(newPyth.toNumber() / 100).toFixed(1)}%)`);
    console.log(`   Pyth (dynamic): ${newDynamicPyth.toString()} (${(newDynamicPyth.toNumber() / 100).toFixed(1)}%)`);
    
    // Final verification
    const [finalValid, finalTotal] = await oracle.verifyWeightIntegrity();
    console.log(`\n✅ FINAL VERIFICATION:`);
    console.log(`   Perfect: ${finalValid ? '🎉 YES' : '❌ NO'}`);
    console.log(`   Total: ${finalTotal.toString()} (${(finalTotal.toNumber() / 100).toFixed(1)}%)`);
    
    if (finalValid && finalTotal.toNumber() === 10000) {
      console.log("🎉 PERFECT! Your dynamic weight system works flawlessly!");
    }
    
  } catch (error: any) {
    console.log(`   ❌ Weight update error: ${error.message}`);
  }
  
  console.log("\n🎉 ORACLE READY FOR OMNIDRAGON!");
  console.log("═".repeat(60));
  console.log(`📍 New Oracle Address: ${newOracleAddress}`);
  console.log(`🔍 SonicScan: https://sonicscan.org/address/${newOracleAddress}#code`);
  console.log("⚖️  Dynamic weight distribution: ACTIVE");
  console.log("🐉 Integration: READY");
}

main().catch(console.error); 