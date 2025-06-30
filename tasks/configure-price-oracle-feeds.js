const { task } = require("hardhat/config");

// Sonic network contract addresses
const SONIC_ADDRESSES = {
  priceOracle: "0x54D0DC2DcF1A1994aF3391A68FCF80A9C46FC2fd",
  feeManager: "0x071E337B46a56eca548D5c545b8F723296B36408"
};

// Correct Sonic price feed addresses from .env
const SONIC_PRICE_FEEDS = {
  chainlinkSUSD: "0xc76dFb89fF298145b417d221B2c747d84952e01d",  // CHAINLINK_SONIC_USD_FEED
  api3Proxy: "0x709944a48cAf83535e43471680fDA4905FB3920a",     // API3_SONIC_USD_PROXY
  pythNetwork: "0x2880aB155794e7179c9eE2e38200202908C17B43",   // PYTH_SONIC_USD_PRICE_ADDRESS
  bandProtocol: "0x506085050Ea5494Fe4b89Dd5BEa659F506F470Cc"   // BAND_SONIC_USD_PRICE_ADDRESS
};

task("configure-price-oracle-feeds", "Configure price oracle with correct Sonic price feeds")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("\n🔮 === Configuring Price Oracle Feeds ===");
    console.log(`Network: ${hre.network.name}`);
    console.log(`Deployer: ${deployer.address}`);
    
    if (hre.network.name !== "sonic") {
      console.log("❌ This task is only for Sonic network");
      return;
    }
    
    try {
      // Get price oracle contract
      const priceOracle = await ethers.getContractAt("OmniDragonPriceOracle", SONIC_ADDRESSES.priceOracle);
      
      console.log("\n📊 Current Oracle Configuration:");
      
      // Check current oracle addresses (if available)
      try {
        const currentChainlink = await priceOracle.chainlinkSUSDFeed();
        const currentBand = await priceOracle.bandProtocolFeed();
        const currentApi3 = await priceOracle.api3ProxyFeed();
        const currentPyth = await priceOracle.pythNetworkFeed();
        
        console.log(`   Chainlink S/USD: ${currentChainlink}`);
        console.log(`   Band Protocol: ${currentBand}`);
        console.log(`   API3 Proxy: ${currentApi3}`);
        console.log(`   Pyth Network: ${currentPyth}`);
      } catch (error) {
        console.log("   Unable to read current oracle addresses");
      }
      
      console.log("\n🎯 Target Oracle Configuration:");
      console.log(`   Chainlink S/USD: ${SONIC_PRICE_FEEDS.chainlinkSUSD}`);
      console.log(`   Band Protocol: ${SONIC_PRICE_FEEDS.bandProtocol}`);
      console.log(`   API3 Proxy: ${SONIC_PRICE_FEEDS.api3Proxy}`);
      console.log(`   Pyth Network: ${SONIC_PRICE_FEEDS.pythNetwork}`);
      
      // Update oracle addresses
      console.log("\n🔄 Updating oracle addresses...");
      const tx = await priceOracle.setOracleAddresses(
        SONIC_PRICE_FEEDS.chainlinkSUSD,
        SONIC_PRICE_FEEDS.bandProtocol,
        SONIC_PRICE_FEEDS.api3Proxy,
        SONIC_PRICE_FEEDS.pythNetwork
      );
      await tx.wait();
      console.log(`✅ Oracle addresses updated: ${tx.hash}`);
      
      // Verify the update
      console.log("\n✅ Verifying updated oracle configuration:");
      try {
        const newChainlink = await priceOracle.chainlinkSUSDFeed();
        const newBand = await priceOracle.bandProtocolFeed();
        const newApi3 = await priceOracle.api3ProxyFeed();
        const newPyth = await priceOracle.pythNetworkFeed();
        
        console.log(`   Chainlink S/USD: ${newChainlink} ${newChainlink === SONIC_PRICE_FEEDS.chainlinkSUSD ? '✅' : '❌'}`);
        console.log(`   Band Protocol: ${newBand} ${newBand === SONIC_PRICE_FEEDS.bandProtocol ? '✅' : '❌'}`);
        console.log(`   API3 Proxy: ${newApi3} ${newApi3 === SONIC_PRICE_FEEDS.api3Proxy ? '✅' : '❌'}`);
        console.log(`   Pyth Network: ${newPyth} ${newPyth === SONIC_PRICE_FEEDS.pythNetwork ? '✅' : '❌'}`);
        
        // Test price aggregation
        console.log("\n🧪 Testing price aggregation...");
        try {
          const [aggregatedPrice, success] = await priceOracle.getAggregatedPrice();
          console.log(`   Aggregated Price: ${ethers.utils.formatUnits(aggregatedPrice, 8)} USD`);
          console.log(`   Aggregation Success: ${success ? '✅' : '❌'}`);
          
          if (success) {
            console.log("\n🎉 Price oracle configuration successful!");
            console.log("✅ All oracle feeds configured");
            console.log("✅ Price aggregation working");
            console.log("✅ Multi-oracle redundancy active");
          } else {
            console.log("\n⚠️  Price aggregation not working - feeds may need time to sync");
          }
          
        } catch (error) {
          console.log(`   Price aggregation test failed: ${error.message}`);
        }
        
      } catch (error) {
        console.log(`❌ Failed to verify oracle configuration: ${error.message}`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to configure price oracle feeds:`, error.message);
      throw error;
    }
  }); 