import { ethers } from "hardhat";
import { config } from "dotenv";

config();

async function main() {
  console.log("🐉 Deploying DragonMarketOracle...");
  
  // Get oracle addresses from environment variables
  const chainlinkSonicUsdFeed = process.env.CHAINLINK_SONIC_USD_FEED;
  const bandSonicUsdAddress = process.env.BAND_SONIC_USD_PRICE_ADDRESS;
  const api3SonicUsdProxy = process.env.API3_SONIC_USD_PROXY;
  const pythSonicUsdAddress = process.env.PYTH_SONIC_USD_PRICE_ADDRESS;
  const pythSonicUsdPriceId = process.env.PYTH_SONIC_USD_PRICE_ID;
  
  // Validate required environment variables
  if (!chainlinkSonicUsdFeed) {
    throw new Error("CHAINLINK_SONIC_USD_FEED not set in .env");
  }
  if (!bandSonicUsdAddress) {
    throw new Error("BAND_SONIC_USD_PRICE_ADDRESS not set in .env");
  }
  if (!api3SonicUsdProxy) {
    throw new Error("API3_SONIC_USD_PROXY not set in .env");
  }
  if (!pythSonicUsdAddress) {
    throw new Error("PYTH_SONIC_USD_PRICE_ADDRESS not set in .env");
  }
  if (!pythSonicUsdPriceId) {
    throw new Error("PYTH_SONIC_USD_PRICE_ID not set in .env");
  }
  
  console.log("📊 Oracle Configuration:");
  console.log(`  Chainlink S/USD Feed: ${chainlinkSonicUsdFeed}`);
  console.log(`  Band Protocol Feed: ${bandSonicUsdAddress}`);
  console.log(`  API3 Proxy Feed: ${api3SonicUsdProxy}`);
  console.log(`  Pyth Network Feed: ${pythSonicUsdAddress}`);
  console.log(`  Pyth S/USD Price ID: ${pythSonicUsdPriceId}`);
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`\n🔑 Deploying with account: ${deployer.address}`);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.utils.formatEther(balance)} S`);
  
  if (balance < ethers.utils.parseEther("0.1")) {
    console.warn("⚠️  Low balance - may not have enough gas for deployment");
  }
  
  // Deploy DragonMarketOracle
  console.log("\n🚀 Deploying DragonMarketOracle...");
  
  const DragonMarketOracle = await ethers.getContractFactory("DragonMarketOracle");
  
  const oracle = await DragonMarketOracle.deploy(
    "S",           // nativeSymbol (Sonic)
    "USD",         // quoteSymbol
    chainlinkSonicUsdFeed,  // Chainlink S/USD aggregator
    bandSonicUsdAddress,    // Band Protocol reference
    api3SonicUsdProxy,      // API3 dAPI proxy
    pythSonicUsdAddress     // Pyth Network contract
  );
  
  await oracle.deployed();
  const oracleAddress = oracle.address;
  
  console.log(`✅ DragonMarketOracle deployed to: ${oracleAddress}`);
  
  // Configure Pyth price feed IDs
  console.log("\n🔧 Configuring Pyth price feed IDs...");
  
  // Set the S/USD price feed ID
  const setPythTx = await oracle.setPythFeedId("S/USD", pythSonicUsdPriceId);
  await setPythTx.wait();
  console.log(`✅ Pyth S/USD feed ID configured: ${pythSonicUsdPriceId}`);
  
  // Optional: Set ETH/USD and BTC/USD feed IDs if available
  const ethUsdFeedId = process.env.PYTH_ETH_USD_PRICE_ID;
  const btcUsdFeedId = process.env.PYTH_BTC_USD_PRICE_ID;
  
  if (ethUsdFeedId) {
    const setEthTx = await oracle.setPythFeedId("ETH/USD", ethUsdFeedId);
    await setEthTx.wait();
    console.log(`✅ Pyth ETH/USD feed ID configured: ${ethUsdFeedId}`);
  }
  
  if (btcUsdFeedId) {
    const setBtcTx = await oracle.setPythFeedId("BTC/USD", btcUsdFeedId);
    await setBtcTx.wait();
    console.log(`✅ Pyth BTC/USD feed ID configured: ${btcUsdFeedId}`);
  }
  
  // Test the oracle by fetching initial price
  console.log("\n🧪 Testing oracle functionality...");
  
  try {
    const [price, timestamp] = await oracle.getLatestPrice();
    console.log(`📈 Initial price: ${ethers.utils.formatEther(price)} S/USD`);
    console.log(`⏰ Last updated: ${new Date(Number(timestamp) * 1000).toISOString()}`);
  } catch (error) {
    console.log("⚠️  Initial price fetch failed (normal for new deployment)");
  }
  
  // Display contract information
  console.log("\n📋 Contract Information:");
  console.log(`Contract Address: ${oracleAddress}`);
  console.log(`Network: Sonic`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Transaction Hash: ${oracle.deployTransaction?.hash}`);
  
  // Display verification command
  console.log("\n🔍 To verify on SonicScan:");
  console.log(`npx hardhat verify --network sonic ${oracleAddress} "S" "USD" "${chainlinkSonicUsdFeed}" "${bandSonicUsdAddress}" "${api3SonicUsdProxy}" "${pythSonicUsdAddress}"`);
  
  console.log("\n🎉 DragonMarketOracle deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 