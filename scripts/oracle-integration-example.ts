import { ethers } from "hardhat";

async function main() {
  console.log("🐉 OmniDragon Oracle Integration Example");
  console.log("═".repeat(60));
  
  const oracleAddress = "0x46abe8E5176857DA0187E59ddB990A631D7b323C";
  const oracle = await ethers.getContractAt("DragonMarketOracle", oracleAddress);
  
  // Example 1: Get current price for lottery calculations
  console.log("🎰 EXAMPLE 1: Lottery Price Integration");
  try {
    const [price, timestamp] = await oracle.getLatestPrice();
    const priceInWei = price;
    const priceInEther = ethers.utils.formatEther(price);
    
    console.log(`   S/USD Price: ${priceInEther}`);
    console.log(`   Price in Wei: ${priceInWei.toString()}`);
    console.log(`   Last Updated: ${new Date(Number(timestamp) * 1000).toLocaleString()}`);
    
    // Example lottery calculation
    const ticketPriceUSD = ethers.utils.parseEther("1.0"); // $1 USD
    const ticketPriceS = ticketPriceUSD.mul(ethers.utils.parseEther("1")).div(price);
    console.log(`   Lottery Ticket ($1 USD): ${ethers.utils.formatEther(ticketPriceS)} S`);
    
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Example 2: Market conditions for dynamic features
  console.log("\n📊 EXAMPLE 2: Market Conditions Integration");
  try {
    const marketScore = await oracle.getMarketConditions();
    const isFresh = await oracle.isFresh();
    
    console.log(`   Market Score: ${marketScore.toString()}/10000 (${(marketScore.toNumber() / 100).toFixed(1)}%)`);
    console.log(`   Data Fresh: ${isFresh ? '✅ YES' : '❌ NO'}`);
    
    // Example dynamic feature based on market conditions
    if (marketScore.gt(8000)) {
      console.log(`   🟢 Market Excellent: Enable premium features`);
    } else if (marketScore.gt(6000)) {
      console.log(`   🟡 Market Good: Standard features active`);
    } else {
      console.log(`   🔴 Market Poor: Conservative mode recommended`);
    }
    
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Example 3: Comprehensive market data
  console.log("\n📈 EXAMPLE 3: Comprehensive Market Data");
  try {
    const marketData = await oracle.getDragonMarketData();
    
    console.log(`   Price: ${ethers.utils.formatEther(marketData.price)} S/USD`);
    console.log(`   Market Conditions: ${marketData.marketConditions.toString()}/10000`);
    console.log(`   Liquidity Score: ${marketData.liquidity.toString()}/10000`);
    console.log(`   Volatility Score: ${marketData.volatility.toString()}/10000`);
    console.log(`   Volume Score: ${marketData.volume.toString()}/10000`);
    console.log(`   Last Update: ${new Date(Number(marketData.lastUpdate) * 1000).toLocaleString()}`);
    
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Example 4: Integration code snippets
  console.log("\n💻 EXAMPLE 4: Integration Code Snippets");
  console.log(`
// In your OmniDragon contracts:
interface IDragonMarketOracle {
    function getLatestPrice() external view returns (int256 price, uint256 timestamp);
    function getMarketConditions() external view returns (uint256 score);
    function isFresh() external view returns (bool fresh);
}

contract OmniDragonLottery {
    IDragonMarketOracle public oracle = IDragonMarketOracle(${oracleAddress});
    
    function calculateTicketPrice() public view returns (uint256) {
        (int256 susdPrice,) = oracle.getLatestPrice();
        require(oracle.isFresh(), "Oracle data stale");
        
        uint256 ticketPriceUSD = 1e18; // $1 USD
        return ticketPriceUSD * 1e18 / uint256(susdPrice);
    }
    
    function shouldEnablePremiumFeatures() public view returns (bool) {
        uint256 marketScore = oracle.getMarketConditions();
        return marketScore > 8000; // 80%+ market score
    }
}
  `);
  
  console.log("\n🔧 NEXT STEPS FOR INTEGRATION:");
  console.log("1. Import the oracle interface in your contracts");
  console.log("2. Set the oracle address in your contract constructor");
  console.log("3. Use getLatestPrice() for price-dependent calculations");
  console.log("4. Use getMarketConditions() for dynamic feature toggles");
  console.log("5. Always check isFresh() before using price data");
  
  console.log("\n═".repeat(60));
  console.log(`📍 Oracle Address: ${oracleAddress}`);
  console.log(`🔍 SonicScan: https://sonicscan.org/address/${oracleAddress}#code`);
  console.log("🎉 Ready for OmniDragon integration!");
}

main().catch(console.error); 