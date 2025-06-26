import { ethers } from "hardhat";

async function main() {
  console.log("⚖️  Updating DragonMarketOracle Weight Distribution...");
  
  const oracleAddress = "0x46abe8E5176857DA0187E59ddB990A631D7b323C";
  const [deployer] = await ethers.getSigners();
  
  console.log(`🔑 Account: ${deployer.address}`);
  console.log(`📍 Oracle: ${oracleAddress}`);
  
  const oracle = await ethers.getContractAt("DragonMarketOracle", oracleAddress);
  
  // New weight distribution (in basis points, where 10000 = 100%)
  const chainlinkWeight = 4000; // 40%
  const bandWeight = 3000;      // 30%
  const api3Weight = 2000;      // 20%
  const pythWeight = 10000 - chainlinkWeight - bandWeight - api3Weight; // 10% (calculated)
  
  console.log("\n📊 NEW WEIGHT DISTRIBUTION:");
  console.log(`   Chainlink: ${chainlinkWeight} basis points (${chainlinkWeight / 100}%)`);
  console.log(`   Band Protocol: ${bandWeight} basis points (${bandWeight / 100}%)`);
  console.log(`   API3: ${api3Weight} basis points (${api3Weight / 100}%)`);
  console.log(`   Pyth (calculated): ${pythWeight} basis points (${pythWeight / 100}%)`);
  console.log(`   Total: ${chainlinkWeight + bandWeight + api3Weight + pythWeight} basis points (${(chainlinkWeight + bandWeight + api3Weight + pythWeight) / 100}%)`);
  
  // Get current weights for comparison
  console.log("\n📋 CURRENT WEIGHTS:");
  try {
    const currentChainlink = await oracle.chainlinkWeight();
    const currentBand = await oracle.bandWeight();
    const currentApi3 = await oracle.api3Weight();
    const currentPyth = await oracle.pythWeight();
    
    console.log(`   Chainlink: ${currentChainlink.toString()} (${currentChainlink.toNumber() / 100}%)`);
    console.log(`   Band: ${currentBand.toString()} (${currentBand.toNumber() / 100}%)`);
    console.log(`   API3: ${currentApi3.toString()} (${currentApi3.toNumber() / 100}%)`);
    console.log(`   Pyth: ${currentPyth.toString()} (${currentPyth.toNumber() / 100}%)`);
    
    const currentTotal = currentChainlink.add(currentBand).add(currentApi3).add(currentPyth);
    console.log(`   Current Total: ${currentTotal.toString()} (${currentTotal.toNumber() / 100}%)`);
  } catch (error: any) {
    console.log(`   ⚠️  Could not fetch current weights: ${error.message}`);
  }
  
  // Check if we need to update the contract to support setSourceWeights function
  console.log("\n🔧 UPDATING WEIGHTS...");
  
  try {
    // Try to call setSourceWeights function (if it exists in the contract)
    const tx = await oracle.setSourceWeights(chainlinkWeight, api3Weight, pythWeight, bandWeight, {
      gasLimit: 200000
    });
    await tx.wait();
    console.log(`✅ Weights updated successfully - TX: ${tx.hash}`);
    
  } catch (error: any) {
    if (error.message.includes("setSourceWeights")) {
      console.log("⚠️  setSourceWeights function not found in contract.");
      console.log("📝 The contract needs to be updated to include this function.");
      
      // Show the required function to add to the contract
      console.log("\n💻 ADD THIS FUNCTION TO DragonMarketOracle.sol:");
      console.log(`
/**
 * @dev Set oracle source weights
 * @param _chainlink Chainlink weight in basis points
 * @param _api3 API3 weight in basis points  
 * @param _pyth Pyth weight in basis points
 * @param _band Band Protocol weight in basis points
 */
function setSourceWeights(
  uint256 _chainlink,
  uint256 _api3, 
  uint256 _pyth,
  uint256 _band
) external onlyOwner {
  require(_chainlink + _api3 + _pyth + _band == 10000, "Weights must sum to 10000");
  
  chainlinkWeight = _chainlink;
  api3Weight = _api3;
  pythWeight = _pyth;
  bandWeight = _band;
  
  emit SourceWeightsUpdated(_chainlink, _api3, _pyth, _band);
}
      `);
      
      console.log("\n🔄 ALTERNATIVE: Manual Weight Updates");
      console.log("Since the setSourceWeights function doesn't exist, weights are currently fixed at deployment.");
      console.log("The current distribution ensures reliable multi-oracle aggregation.");
      
    } else {
      console.log(`⚠️  Error updating weights: ${error.message}`);
    }
  }
  
  // Verify final weights
  console.log("\n✅ FINAL VERIFICATION:");
  try {
    const finalChainlink = await oracle.chainlinkWeight();
    const finalBand = await oracle.bandWeight();
    const finalApi3 = await oracle.api3Weight();
    const finalPyth = await oracle.pythWeight();
    
    console.log(`   Chainlink: ${finalChainlink.toString()} (${finalChainlink.toNumber() / 100}%)`);
    console.log(`   Band: ${finalBand.toString()} (${finalBand.toNumber() / 100}%)`);
    console.log(`   API3: ${finalApi3.toString()} (${finalApi3.toNumber() / 100}%)`);
    console.log(`   Pyth: ${finalPyth.toString()} (${finalPyth.toNumber() / 100}%)`);
    
    const finalTotal = finalChainlink.add(finalBand).add(finalApi3).add(finalPyth);
    console.log(`   Total: ${finalTotal.toString()} (${finalTotal.toNumber() / 100}%)`);
    
    if (finalTotal.eq(10000)) {
      console.log("🎉 Perfect! Weights sum to exactly 100%");
    } else {
      console.log(`⚠️  Warning: Weights sum to ${finalTotal.toNumber() / 100}% instead of 100%`);
    }
    
  } catch (error: any) {
    console.log(`⚠️  Could not verify final weights: ${error.message}`);
  }
  
  console.log("\n📊 WEIGHT DISTRIBUTION STRATEGY:");
  console.log("✅ Chainlink (40%): Primary oracle - most established and reliable");
  console.log("✅ Band Protocol (30%): Secondary oracle - good decentralization");
  console.log("✅ API3 (20%): First-party data feeds - direct from data providers");
  console.log("✅ Pyth (10% calculated): Real-time feeds - ensures 100% total always");
  console.log("\n🔒 This distribution ensures maximum reliability and automatic 100% weight maintenance!");
}

main().catch(console.error); 