import { ethers } from "hardhat";

async function main() {
  console.log("🐉 Deploying Updated DragonMarketOracle with Dynamic Weights...");
  
  // Oracle addresses from .env
  const chainlinkFeed = process.env.CHAINLINK_SONIC_USD_FEED || "0xc76dFb89fF298145b417d221B2c747d84952e01d";
  const bandFeed = process.env.BAND_SONIC_USD_PRICE_ADDRESS || "0x506085050Ea5494Fe4b89Dd5BEa659F506F470Cc";
  const api3Feed = process.env.API3_SONIC_USD_PROXY || "0x709944a48cAf83535e43471680fDA4905FB3920a";
  const pythFeed = process.env.PYTH_SONIC_USD_PRICE_ADDRESS || "0x2880aB155794e7179c9eE2e38200202908C17B43";
  const pythPriceId = process.env.PYTH_SONIC_USD_PRICE_ID || "0xb2748e718cf3a75b0ca099cb467aea6aa8f7d960b381b3970769b5a2d6be26dc";
  
  const [deployer] = await ethers.getSigners();
  console.log(`🔑 Deployer: ${deployer.address}`);
  
  const balance = await deployer.getBalance();
  console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} S`);
  
  console.log("\n📊 Oracle Configuration:");
  console.log(`   Chainlink: ${chainlinkFeed}`);
  console.log(`   Band: ${bandFeed}`);
  console.log(`   API3: ${api3Feed}`);
  console.log(`   Pyth: ${pythFeed}`);
  
  // Deploy the updated oracle
  console.log("\n🚀 Deploying Updated DragonMarketOracle...");
  
  const Oracle = await ethers.getContractFactory("DragonMarketOracle");
  const oracle = await Oracle.deploy(
    "S",           // nativeSymbol
    "USD",         // quoteSymbol
    chainlinkFeed, // Chainlink S/USD
    bandFeed,      // Band Protocol
    api3Feed,      // API3 Proxy
    pythFeed       // Pyth Network
  );
  
  await oracle.deployed();
  console.log(`✅ Oracle deployed to: ${oracle.address}`);
  console.log(`📋 Transaction: ${oracle.deployTransaction.hash}`);
  
  // Configure Pyth price feed
  console.log("\n🔧 Configuring Pyth S/USD feed...");
  try {
    const setPythTx = await oracle.setPythFeedId("S/USD", pythPriceId);
    await setPythTx.wait();
    console.log(`✅ Pyth feed configured - TX: ${setPythTx.hash}`);
  } catch (error: any) {
    console.log(`⚠️  Pyth config error: ${error.message}`);
  }
  
  // Test dynamic weight system
  console.log("\n⚖️  Testing Dynamic Weight System...");
  
  // Check current weights
  console.log("📊 Current Weight Distribution:");
  const chainlinkWeight = await oracle.chainlinkWeight();
  const bandWeight = await oracle.bandWeight();
  const api3Weight = await oracle.api3Weight();
  const pythWeight = await oracle.pythWeight();
  
  console.log(`   Chainlink: ${chainlinkWeight.toString()} (${chainlinkWeight.toNumber() / 100}%)`);
  console.log(`   Band: ${bandWeight.toString()} (${bandWeight.toNumber() / 100}%)`);
  console.log(`   API3: ${api3Weight.toString()} (${api3Weight.toNumber() / 100}%)`);
  console.log(`   Pyth: ${pythWeight.toString()} (${pythWeight.toNumber() / 100}%)`);
  
  // Test dynamic Pyth weight calculation
  const dynamicPyth = await oracle.getDynamicPythWeight();
  console.log(`   Dynamic Pyth: ${dynamicPyth.toString()} (${dynamicPyth.toNumber() / 100}%)`);
  
  // Verify weight integrity
  const [isValid, totalWeight, breakdown] = await oracle.verifyWeightIntegrity();
  console.log(`\n🔍 Weight Integrity Check:`);
  console.log(`   Valid: ${isValid ? '✅ YES' : '❌ NO'}`);
  console.log(`   Total: ${totalWeight.toString()} (${totalWeight.toNumber() / 100}%)`);
  console.log(`   Breakdown: [${breakdown.map((w: any) => w.toString()).join(', ')}]`);
  
  // Apply your recommended weight distribution
  console.log("\n🎯 Applying Your Recommended Distribution...");
  console.log("   Chainlink: 40%, Band: 30%, API3: 20%, Pyth: auto-calculated");
  
  try {
    const setWeightsTx = await oracle.setSourceWeights(
      4000, // Chainlink: 40%
      3000, // Band: 30%
      2000  // API3: 20%
      // Pyth will be auto-calculated as 10% (1000 basis points)
    );
    await setWeightsTx.wait();
    console.log(`✅ Weights updated - TX: ${setWeightsTx.hash}`);
    
    // Verify new weights
    console.log("\n📊 New Weight Distribution:");
    const newChainlink = await oracle.chainlinkWeight();
    const newBand = await oracle.bandWeight();
    const newApi3 = await oracle.api3Weight();
    const newPyth = await oracle.pythWeight();
    const newDynamicPyth = await oracle.getDynamicPythWeight();
    
    console.log(`   Chainlink: ${newChainlink.toString()} (${newChainlink.toNumber() / 100}%)`);
    console.log(`   Band: ${newBand.toString()} (${newBand.toNumber() / 100}%)`);
    console.log(`   API3: ${newApi3.toString()} (${newApi3.toNumber() / 100}%)`);
    console.log(`   Pyth (stored): ${newPyth.toString()} (${newPyth.toNumber() / 100}%)`);
    console.log(`   Pyth (dynamic): ${newDynamicPyth.toString()} (${newDynamicPyth.toNumber() / 100}%)`);
    
    // Final integrity check
    const [finalValid, finalTotal] = await oracle.verifyWeightIntegrity();
    console.log(`\n✅ Final Check: ${finalValid ? 'PERFECT' : 'ERROR'} - Total: ${finalTotal.toNumber() / 100}%`);
    
  } catch (error: any) {
    console.log(`⚠️  Weight update error: ${error.message}`);
  }
  
  console.log("\n🎉 DEPLOYMENT COMPLETE!");
  console.log("═".repeat(60));
  console.log(`📍 Oracle Address: ${oracle.address}`);
  console.log(`🔍 Verify: npx hardhat verify --network sonic ${oracle.address} "S" "USD" "${chainlinkFeed}" "${bandFeed}" "${api3Feed}" "${pythFeed}"`);
  console.log("⚖️  Dynamic weight system active!");
  console.log("🐉 Ready for OmniDragon integration!");
}

main().catch(console.error); 