const { task } = require("hardhat/config");
const fs = require('fs');
const path = require('path');

task("configure-price-oracles", "Configure and manage price oracle settings")
  .addOptionalParam("action", "Action to perform: status, update-oracles, set-fees, set-weights, enable-crosschain, test-oracle")
  .addOptionalParam("totalfee", "Total fee in basis points (e.g., 1000 = 10%)")
  .addOptionalParam("jackpotfee", "Jackpot fee in basis points (e.g., 300 = 3%)")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("\n=== Price Oracle Configuration ===");
    console.log(`Network: ${network.name}`);
    console.log(`Deployer: ${deployer.address}`);
    
    // Load price oracle deployment
    const priceOracleFile = path.join(__dirname, '..', 'deployments', network.name, 'OmniDragonPriceOracle.json');
    if (!fs.existsSync(priceOracleFile)) {
      console.log("❌ Price Oracle deployment not found. Deploy first using 'deploy-price-oracles'");
      return;
    }
    
    const priceOracleData = JSON.parse(fs.readFileSync(priceOracleFile, 'utf8'));
    const priceOracleAddress = priceOracleData.address;
    
    console.log(`📊 Price Oracle: ${priceOracleAddress}`);
    
    // Get contract instance
    const priceOracle = await ethers.getContractAt("OmniDragonPriceOracle", priceOracleAddress);
    
    try {
      const action = taskArgs.action || "status";
      
      switch (action) {
        case "status":
          await displayOracleStatus(priceOracle);
          break;
          
        case "update-oracles":
          await updateOracleAddresses(priceOracle, network.name);
          break;
          
        case "set-fees":
          if (!taskArgs.totalfee) {
            console.log("❌ Please provide --totalfee parameter");
            return;
          }
          await updateFees(priceOracle, taskArgs.totalfee, taskArgs.jackpotfee);
          break;
          
        case "set-weights":
          await updateOracleWeights(priceOracle);
          break;
          
        case "enable-crosschain":
          await enableCrossChain(priceOracle);
          break;
          
        case "test-oracle":
          await testOracleFeeds(priceOracle);
          break;
          
        default:
          console.log("❌ Unknown action. Available actions: status, update-oracles, set-fees, set-weights, enable-crosschain, test-oracle");
      }
      
    } catch (error) {
      console.error("❌ Configuration error:", error.message);
      throw error;
    }
  });

async function displayOracleStatus(priceOracle) {
  console.log("\n📊 Oracle Status:");
  console.log("==================");
  
  try {
    // Get basic info
    const nativeSymbol = await priceOracle.nativeSymbol();
    const quoteSymbol = await priceOracle.quoteSymbol();
    const initialized = await priceOracle.initialized();
    const operationMode = await priceOracle.operationMode();
    
    console.log(`Symbol Pair: ${nativeSymbol}/${quoteSymbol}`);
    console.log(`Initialized: ${initialized}`);
    console.log(`Operation Mode: ${operationMode}`);
    
    if (initialized) {
      // Get price info
      try {
        const latestPrice = await priceOracle.latestPrice();
        const lastPriceUpdate = await priceOracle.lastPriceUpdate();
        const priceDeviation = await priceOracle.priceDeviation();
        
        console.log(`Latest Price: ${ethers.utils.formatUnits(latestPrice, 18)}`);
        console.log(`Last Update: ${new Date(lastPriceUpdate.toNumber() * 1000).toISOString()}`);
        console.log(`Price Deviation: ${priceDeviation.toString()} basis points`);
      } catch (e) {
        console.log("⚠️  Price data not available");
      }
      
      // Get fee configuration
      try {
        const feeConfig = await priceOracle.feeConfig();
        console.log(`\n💰 Fee Configuration:`);
        console.log(`Total Fee: ${feeConfig.totalFee.toString()} basis points (${feeConfig.totalFee.toNumber() / 100}%)`);
        console.log(`Jackpot Fee: ${feeConfig.jackpotFee.toString()} basis points (${feeConfig.jackpotFee.toNumber() / 100}%)`);
        console.log(`Liquidity Fee: ${feeConfig.liquidityFee.toString()} basis points (${feeConfig.liquidityFee.toNumber() / 100}%)`);
      } catch (e) {
        console.log("⚠️  Fee configuration not available");
      }
      
      // Get oracle addresses
      try {
        const chainlinkSUSD = await priceOracle.chainlinkSUSDFeed();
        const bandProtocol = await priceOracle.bandProtocolFeed();
        const api3Proxy = await priceOracle.api3ProxyFeed();
        const pythNetwork = await priceOracle.pythNetworkFeed();
        
        console.log(`\n🔗 Oracle Addresses:`);
        console.log(`Chainlink: ${chainlinkSUSD}`);
        console.log(`Band Protocol: ${bandProtocol}`);
        console.log(`API3: ${api3Proxy}`);
        console.log(`Pyth: ${pythNetwork}`);
      } catch (e) {
        console.log("⚠️  Oracle addresses not available");
      }
      
      // Get oracle weights
      try {
        const chainlinkWeight = await priceOracle.chainlinkWeight();
        const bandWeight = await priceOracle.bandWeight();
        const api3Weight = await priceOracle.api3Weight();
        const pythWeight = await priceOracle.pythWeight();
        
        console.log(`\n⚖️  Oracle Weights:`);
        console.log(`Chainlink: ${chainlinkWeight.toString()} basis points (${chainlinkWeight.toNumber() / 100}%)`);
        console.log(`Band Protocol: ${bandWeight.toString()} basis points (${bandWeight.toNumber() / 100}%)`);
        console.log(`API3: ${api3Weight.toString()} basis points (${api3Weight.toNumber() / 100}%)`);
        console.log(`Pyth: ${pythWeight.toString()} basis points (${pythWeight.toNumber() / 100}%)`);
      } catch (e) {
        console.log("⚠️  Oracle weights not available");
      }
    }
    
  } catch (error) {
    console.error("❌ Error getting oracle status:", error.message);
  }
}

async function updateOracleAddresses(priceOracle, networkName) {
  console.log("\n🔧 Updating Oracle Addresses...");
  
  // Oracle configurations (same as deployment script)
  const ORACLE_CONFIGS = {
    sonic: {
      chainlinkSUSD: "0x26e45619119119e14b7663e4d3e4b85fa6c5e6119",
      bandProtocol: "0x0000000000000000000000000000000000000000",
      api3Proxy: "0x0000000000000000000000000000000000000000",
      pythNetwork: "0x0000000000000000000000000000000000000000"
    },
    arbitrum: {
      chainlinkSUSD: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
      bandProtocol: "0x0000000000000000000000000000000000000000",
      api3Proxy: "0x0000000000000000000000000000000000000000",
      pythNetwork: "0x0000000000000000000000000000000000000000"
    },
    avalanche: {
      chainlinkSUSD: "0x0A77230d17318075983913bC2145DB16C7366156",
      bandProtocol: "0x0000000000000000000000000000000000000000",
      api3Proxy: "0x0000000000000000000000000000000000000000",
      pythNetwork: "0x0000000000000000000000000000000000000000"
    }
  };
  
  const config = ORACLE_CONFIGS[networkName];
  if (!config) {
    console.log(`❌ No oracle configuration for network: ${networkName}`);
    return;
  }
  
  try {
    const tx = await priceOracle.setOracleAddresses(
      config.chainlinkSUSD,
      config.bandProtocol,
      config.api3Proxy,
      config.pythNetwork
    );
    
    await tx.wait();
    console.log("✅ Oracle addresses updated successfully");
    console.log(`Transaction: ${tx.hash}`);
    
  } catch (error) {
    console.error("❌ Error updating oracle addresses:", error.message);
  }
}

async function updateFees(priceOracle, totalFee, jackpotFee) {
  console.log("\n💰 Updating Fee Configuration...");
  
  try {
    if (jackpotFee) {
      console.log(`Setting jackpot fee to: ${jackpotFee} basis points (${jackpotFee / 100}%)`);
      const jackpotTx = await priceOracle.updateJackpotFee(jackpotFee);
      await jackpotTx.wait();
      console.log("✅ Jackpot fee updated");
    }
    
    console.log(`Setting total fee to: ${totalFee} basis points (${totalFee / 100}%)`);
    const totalTx = await priceOracle.updateTotalFee(totalFee);
    await totalTx.wait();
    console.log("✅ Total fee updated");
    
  } catch (error) {
    console.error("❌ Error updating fees:", error.message);
  }
}

async function updateOracleWeights(priceOracle) {
  console.log("\n⚖️  Updating Oracle Weights...");
  
  // Default weights: Chainlink 40%, Band 30%, API3 20%, Pyth 10%
  const chainlinkWeight = 4000; // 40%
  const bandWeight = 3000; // 30%
  const api3Weight = 2000; // 20%
  const pythWeight = 1000; // 10%
  
  try {
    const tx = await priceOracle.setOracleWeights(
      chainlinkWeight,
      api3Weight,
      pythWeight,
      bandWeight
    );
    
    await tx.wait();
    console.log("✅ Oracle weights updated successfully");
    console.log(`Chainlink: ${chainlinkWeight / 100}%`);
    console.log(`Band Protocol: ${bandWeight / 100}%`);
    console.log(`API3: ${api3Weight / 100}%`);
    console.log(`Pyth: ${pythWeight / 100}%`);
    
  } catch (error) {
    console.error("❌ Error updating oracle weights:", error.message);
  }
}

async function enableCrossChain(priceOracle) {
  console.log("\n🌐 Enabling Cross-Chain Mode...");
  
  try {
    // Set operation mode to CROSS_CHAIN_ENABLED (1)
    const tx = await priceOracle.setOperationMode(1);
    await tx.wait();
    console.log("✅ Cross-chain mode enabled");
    
  } catch (error) {
    console.error("❌ Error enabling cross-chain mode:", error.message);
  }
}

async function testOracleFeeds(priceOracle) {
  console.log("\n🧪 Testing Oracle Feeds...");
  
  try {
    // Test if oracle is fresh
    const isFresh = await priceOracle.isFresh();
    console.log(`Oracle Fresh: ${isFresh}`);
    
    // Get aggregated price
    const [price, success, timestamp] = await priceOracle.getAggregatedPrice();
    console.log(`Aggregated Price: ${ethers.utils.formatUnits(price, 18)}`);
    console.log(`Success: ${success}`);
    console.log(`Timestamp: ${new Date(timestamp.toNumber() * 1000).toISOString()}`);
    
    // Get market conditions
    const marketScore = await priceOracle.getMarketConditions();
    console.log(`Market Condition Score: ${marketScore.toString()}`);
    
    // Test update function
    console.log("\n🔄 Testing price update...");
    const updateTx = await priceOracle.updateAndGetPrice();
    const receipt = await updateTx.wait();
    console.log("✅ Price update successful");
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    
  } catch (error) {
    console.error("❌ Error testing oracle feeds:", error.message);
  }
}

task("link-fee-manager-oracle", "Link Fee Manager to Price Oracle")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    
    console.log("\n🔗 Linking Fee Manager to Price Oracle...");
    
    // Load deployments
    const priceOracleFile = path.join(__dirname, '..', 'deployments', network.name, 'OmniDragonPriceOracle.json');
    const feeManagerFile = path.join(__dirname, '..', 'deployments', network.name, 'DragonFeeManager.json');
    
    if (!fs.existsSync(priceOracleFile) || !fs.existsSync(feeManagerFile)) {
      console.log("❌ Price Oracle or Fee Manager deployment not found");
      return;
    }
    
    const priceOracleData = JSON.parse(fs.readFileSync(priceOracleFile, 'utf8'));
    const feeManagerData = JSON.parse(fs.readFileSync(feeManagerFile, 'utf8'));
    
    const priceOracle = await ethers.getContractAt("OmniDragonPriceOracle", priceOracleData.address);
    const feeManager = await ethers.getContractAt("DragonFeeManager", feeManagerData.address);
    
    try {
      // Set price oracle in fee manager
      console.log("Setting price oracle in fee manager...");
      const tx = await feeManager.setPriceOracle(priceOracleData.address);
      await tx.wait();
      
      console.log("✅ Fee Manager linked to Price Oracle successfully");
      console.log(`Price Oracle: ${priceOracleData.address}`);
      console.log(`Fee Manager: ${feeManagerData.address}`);
      
    } catch (error) {
      console.error("❌ Error linking contracts:", error.message);
    }
  });

module.exports = {}; 