import { ethers } from "hardhat";

async function main() {
  console.log("📊 DragonMarketOracle Monitor");
  console.log("═".repeat(50));
  
  const oracleAddress = "0x46abe8E5176857DA0187E59ddB990A631D7b323C";
  const oracle = await ethers.getContractAt("DragonMarketOracle", oracleAddress);
  
  try {
    // Basic price info
    const [price, timestamp] = await oracle.getLatestPrice();
    const isFresh = await oracle.isFresh();
    
    console.log("💰 PRICE DATA:");
    console.log(`   Current: ${ethers.utils.formatEther(price)} S/USD`);
    console.log(`   Updated: ${new Date(Number(timestamp) * 1000).toLocaleString()}`);
    console.log(`   Fresh: ${isFresh ? '🟢 YES' : '🔴 NO'}`);
    
    // Market scores
    const marketScore = await oracle.marketScore();
    const liquidityScore = await oracle.liquidityScore();
    const volatilityScore = await oracle.volatilityScore();
    const volumeScore = await oracle.volumeScore();
    
    console.log("\n📈 MARKET SCORES:");
    console.log(`   Market: ${marketScore.toString()} (${(marketScore.toNumber() / 100).toFixed(1)}%)`);
    console.log(`   Liquidity: ${liquidityScore.toString()} (${(liquidityScore.toNumber() / 100).toFixed(1)}%)`);
    console.log(`   Volatility: ${volatilityScore.toString()} (${(volatilityScore.toNumber() / 100).toFixed(1)}%)`);
    console.log(`   Volume: ${volumeScore.toString()} (${(volumeScore.toNumber() / 100).toFixed(1)}%)`);
    
    // Circuit breaker
    const circuitBreakerActive = await oracle.circuitBreakerActive();
    console.log(`\n🔒 Circuit Breaker: ${circuitBreakerActive ? '🔴 ACTIVE' : '🟢 INACTIVE'}`);
    
    // Oracle weights
    const chainlinkWeight = await oracle.chainlinkWeight();
    const api3Weight = await oracle.api3Weight();
    const pythWeight = await oracle.pythWeight();
    const bandWeight = await oracle.bandWeight();
    
    console.log("\n⚖️  ORACLE WEIGHTS:");
    console.log(`   Chainlink: ${(chainlinkWeight.toNumber() / 100).toFixed(1)}%`);
    console.log(`   API3: ${(api3Weight.toNumber() / 100).toFixed(1)}%`);
    console.log(`   Pyth: ${(pythWeight.toNumber() / 100).toFixed(1)}%`);
    console.log(`   Band: ${(bandWeight.toNumber() / 100).toFixed(1)}%`);
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
  
  console.log("\n═".repeat(50));
  console.log(`🔍 View on SonicScan: https://sonicscan.org/address/${oracleAddress}`);
}

main().catch(console.error); 