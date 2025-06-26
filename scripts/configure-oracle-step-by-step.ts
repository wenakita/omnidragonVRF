import { ethers } from "hardhat";

async function main() {
  console.log("🐉 Step-by-Step Oracle Configuration...");
  
  const oracleAddress = "0x46abe8E5176857DA0187E59ddB990A631D7b323C";
  const [deployer] = await ethers.getSigners();
  
  console.log(`🔑 Account: ${deployer.address}`);
  console.log(`📍 Oracle: ${oracleAddress}`);
  
  const oracle = await ethers.getContractAt("DragonMarketOracle", oracleAddress);
  
  // Step 1: Configure Pyth Feed ID with higher gas limit
  console.log("\n🔧 STEP 1: Configure Pyth S/USD Feed ID...");
  const pythSUsdPriceId = "0xb2748e718cf3a75b0ca099cb467aea6aa8f7d960b381b3970769b5a2d6be26dc";
  
  try {
    const tx = await oracle.setPythFeedId("S/USD", pythSUsdPriceId, {
      gasLimit: 500000
    });
    await tx.wait();
    console.log(`✅ S/USD feed configured - TX: ${tx.hash}`);
  } catch (error: any) {
    console.log(`⚠️  Error: ${error.message}`);
  }
  
  // Step 2: Get current oracle configuration
  console.log("\n📊 STEP 2: Current Oracle Configuration...");
  
  try {
    const chainlinkWeight = await oracle.chainlinkWeight();
    const api3Weight = await oracle.api3Weight();
    const pythWeight = await oracle.pythWeight();
    const bandWeight = await oracle.bandWeight();
    
    console.log("⚖️  Oracle Weights:");
    console.log(`   Chainlink: ${chainlinkWeight.toString()} (${chainlinkWeight.toNumber() / 100}%)`);
    console.log(`   API3: ${api3Weight.toString()} (${api3Weight.toNumber() / 100}%)`);
    console.log(`   Pyth: ${pythWeight.toString()} (${pythWeight.toNumber() / 100}%)`);
    console.log(`   Band: ${bandWeight.toString()} (${bandWeight.toNumber() / 100}%)`);
  } catch (error: any) {
    console.log(`⚠️  Error fetching weights: ${error.message}`);
  }
  
  // Step 3: Get market scores
  console.log("\n📈 STEP 3: Market Scores...");
  
  try {
    const marketScore = await oracle.marketScore();
    const liquidityScore = await oracle.liquidityScore();
    const volatilityScore = await oracle.volatilityScore();
    const volumeScore = await oracle.volumeScore();
    
    console.log(`   Market Score: ${marketScore.toString()} / 10000 (${marketScore.toNumber() / 100}%)`);
    console.log(`   Liquidity: ${liquidityScore.toString()} / 10000 (${liquidityScore.toNumber() / 100}%)`);
    console.log(`   Volatility: ${volatilityScore.toString()} / 10000 (${volatilityScore.toNumber() / 100}%)`);
    console.log(`   Volume: ${volumeScore.toString()} / 10000 (${volumeScore.toNumber() / 100}%)`);
  } catch (error: any) {
    console.log(`⚠️  Error fetching scores: ${error.message}`);
  }
  
  // Step 4: Check circuit breaker
  console.log("\n🔒 STEP 4: Circuit Breaker Status...");
  
  try {
    const circuitBreakerActive = await oracle.circuitBreakerActive();
    const maxPriceDeviation = await oracle.maxPriceDeviation();
    const maxUpdateInterval = await oracle.maxUpdateInterval();
    
    console.log(`   Status: ${circuitBreakerActive ? '🔴 ACTIVE' : '🟢 INACTIVE'}`);
    console.log(`   Max Deviation: ${maxPriceDeviation.toString()} bp (${maxPriceDeviation.toNumber() / 100}%)`);
    console.log(`   Max Interval: ${maxUpdateInterval.toString()} seconds`);
  } catch (error: any) {
    console.log(`⚠️  Error fetching circuit breaker: ${error.message}`);
  }
  
  // Step 5: Check data freshness
  console.log("\n⏰ STEP 5: Data Freshness...");
  
  try {
    const isFresh = await oracle.isFresh();
    const [price, timestamp] = await oracle.getLatestPrice();
    
    console.log(`   Fresh: ${isFresh ? '🟢 YES' : '🔴 NO'}`);
    console.log(`   Price: ${ethers.utils.formatEther(price)} S/USD`);
    console.log(`   Updated: ${new Date(Number(timestamp) * 1000).toISOString()}`);
  } catch (error: any) {
    console.log(`⚠️  Error checking freshness: ${error.message}`);
  }
  
  console.log("\n🎯 INTEGRATION READY!");
  console.log("═".repeat(60));
  console.log(`📍 Oracle Address: ${oracleAddress}`);
  console.log(`🔍 SonicScan: https://sonicscan.org/address/${oracleAddress}`);
  console.log("📊 Available for OmniDragon integration!");
}

main().catch(console.error); 