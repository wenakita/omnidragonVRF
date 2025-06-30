const { task } = require("hardhat/config");
const fs = require('fs');
const path = require('path');

// Oracle configurations for each network
const ORACLE_CONFIGS = {
  sonic: {
    chainId: 146,
    nativeSymbol: "S",
    quoteSymbol: "USD",
    layerzeroEndpoint: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B",
    oracles: {
      // Using placeholder address until official Sonic Chainlink feeds are available
      chainlinkSUSD: "0x0000000000000000000000000000000000000000", // Placeholder - no official S/USD feed yet
      bandProtocol: "0x0000000000000000000000000000000000000000", // Not available on Sonic yet
      api3Proxy: "0x0000000000000000000000000000000000000000", // Not available on Sonic yet
      pythNetwork: "0x0000000000000000000000000000000000000000" // Not available on Sonic yet
    }
  },
  arbitrum: {
    chainId: 42161,
    nativeSymbol: "ETH",
    quoteSymbol: "USD",
    layerzeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
    oracles: {
      chainlinkSUSD: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612", // ETH/USD on Arbitrum
      bandProtocol: "0x0000000000000000000000000000000000000000", // Band Protocol not widely used on Arbitrum
      api3Proxy: "0x0000000000000000000000000000000000000000", // API3 proxy address (if available)
      pythNetwork: "0x0000000000000000000000000000000000000000" // Pyth network address (if available)
    }
  },
  avalanche: {
    chainId: 43114,
    nativeSymbol: "AVAX",
    quoteSymbol: "USD",
    layerzeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
    oracles: {
      chainlinkSUSD: "0x0A77230d17318075983913bC2145DB16C7366156", // AVAX/USD on Avalanche
      bandProtocol: "0x0000000000000000000000000000000000000000", // Band Protocol address (if available)
      api3Proxy: "0x0000000000000000000000000000000000000000", // API3 proxy address (if available)
      pythNetwork: "0x0000000000000000000000000000000000000000" // Pyth network address (if available)
    }
  }
};

task("deploy-price-oracles", "Deploy OmniDragonPriceOracle contracts")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("\n=== OmniDragon Price Oracle Deployment ===");
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Current network: ${network.name}`);
    
    if (!Object.keys(ORACLE_CONFIGS).includes(network.name)) {
      console.log(`❌ Network ${network.name} not supported for oracle deployment`);
      console.log(`Supported networks: ${Object.keys(ORACLE_CONFIGS).join(', ')}`);
      return;
    }
    
    const config = ORACLE_CONFIGS[network.name];
    
    console.log(`\n📊 Deploying Price Oracle for ${network.name}...`);
    console.log(`Native Symbol: ${config.nativeSymbol}/${config.quoteSymbol}`);
    console.log(`LayerZero Endpoint: ${config.layerzeroEndpoint}`);
    
    try {
      // Step 1: Deploy the EnhancedDragonMarketAnalyzer library
      console.log("\n📚 Step 1: Deploying EnhancedDragonMarketAnalyzer library...");
      
      const EnhancedDragonMarketAnalyzer = await ethers.getContractFactory("EnhancedDragonMarketAnalyzer");
      const marketAnalyzerLib = await EnhancedDragonMarketAnalyzer.deploy();
      await marketAnalyzerLib.deployed();
      
      console.log(`✅ EnhancedDragonMarketAnalyzer library deployed to: ${marketAnalyzerLib.address}`);
      
      // Step 2: Deploy OmniDragonPriceOracle with library linking
      console.log("\n🚀 Step 2: Deploying OmniDragonPriceOracle with library linking...");
      
      const OmniDragonPriceOracle = await ethers.getContractFactory("OmniDragonPriceOracle", {
        libraries: {
          EnhancedDragonMarketAnalyzer: marketAnalyzerLib.address
        }
      });
      
      const priceOracle = await OmniDragonPriceOracle.deploy(
        config.nativeSymbol,
        config.quoteSymbol,
        config.oracles.chainlinkSUSD,
        config.oracles.bandProtocol,
        config.oracles.api3Proxy,
        config.oracles.pythNetwork,
        config.layerzeroEndpoint,
        0 // OperationMode.LOCAL_ONLY initially
      );
      
      await priceOracle.deployed();
      
      console.log(`✅ OmniDragonPriceOracle deployed to: ${priceOracle.address}`);
      
      // Step 3: Initialize the oracle with default values
      console.log("\n🔧 Step 3: Initializing Price Oracle...");
      
      const totalFee = 1000; // 10% total fee
      const initialJackpotFee = 300; // 3% jackpot fee
      
      const initTx = await priceOracle.initialize(
        totalFee,
        initialJackpotFee,
        config.oracles.chainlinkSUSD,
        config.oracles.bandProtocol,
        config.oracles.api3Proxy,
        config.oracles.pythNetwork
      );
      
      await initTx.wait();
      console.log("✅ Price Oracle initialized successfully");
      
      // Step 4: Save deployment info
      const deploymentInfo = {
        network: network.name,
        chainId: config.chainId,
        address: priceOracle.address,
        libraryAddress: marketAnalyzerLib.address,
        deployer: deployer.address,
        blockNumber: priceOracle.deployTransaction.blockNumber,
        transactionHash: priceOracle.deployTransaction.hash,
        gasUsed: priceOracle.deployTransaction.gasLimit.toString(),
        timestamp: new Date().toISOString(),
        configuration: {
          nativeSymbol: config.nativeSymbol,
          quoteSymbol: config.quoteSymbol,
          layerzeroEndpoint: config.layerzeroEndpoint,
          oracles: config.oracles,
          totalFee: totalFee,
          initialJackpotFee: initialJackpotFee
        },
        libraries: {
          EnhancedDragonMarketAnalyzer: marketAnalyzerLib.address
        },
        contractName: "OmniDragonPriceOracle",
        compiler: {
          version: "0.8.20",
          optimization: true,
          runs: 200
        }
      };
      
      // Ensure deployments directory exists
      const deploymentsDir = path.join(__dirname, '..', 'deployments', network.name);
      if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
      }
      
      // Save deployment file
      const deploymentFile = path.join(deploymentsDir, 'OmniDragonPriceOracle.json');
      fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
      
      console.log(`\n📁 Deployment info saved to: ${deploymentFile}`);
      
      // Display summary
      console.log("\n📋 Deployment Summary:");
      console.log("====================================");
      console.log(`Network: ${network.name} (Chain ID: ${config.chainId})`);
      console.log(`Contract: OmniDragonPriceOracle`);
      console.log(`Address: ${priceOracle.address}`);
      console.log(`Library: ${marketAnalyzerLib.address}`);
      console.log(`Native Pair: ${config.nativeSymbol}/${config.quoteSymbol}`);
      console.log(`Total Fee: ${totalFee / 100}%`);
      console.log(`Jackpot Fee: ${initialJackpotFee / 100}%`);
      console.log(`Chainlink Oracle: ${config.oracles.chainlinkSUSD}`);
      console.log(`LayerZero Endpoint: ${config.layerzeroEndpoint}`);
      console.log("====================================");
      
      // Contract verification reminder
      console.log("\n🔍 Contract Verification:");
      console.log(`To verify the library, run:`);
      console.log(`npx hardhat verify --network ${network.name} ${marketAnalyzerLib.address}`);
      console.log(`\nTo verify the main contract, run:`);
      console.log(`npx hardhat verify --network ${network.name} ${priceOracle.address} "${config.nativeSymbol}" "${config.quoteSymbol}" "${config.oracles.chainlinkSUSD}" "${config.oracles.bandProtocol}" "${config.oracles.api3Proxy}" "${config.oracles.pythNetwork}" "${config.layerzeroEndpoint}" 0 --libraries contracts/libraries/core/EnhancedDragonMarketAnalyzer.sol:EnhancedDragonMarketAnalyzer:${marketAnalyzerLib.address}`);
      
    } catch (error) {
      console.error(`❌ Error deploying Price Oracle on ${network.name}:`, error.message);
      throw error;
    }
  });

task("deploy-fee-managers", "Deploy DragonFeeManager contracts")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("\n=== Dragon Fee Manager Deployment ===");
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Current network: ${network.name}`);
    
    if (!Object.keys(ORACLE_CONFIGS).includes(network.name)) {
      console.log(`❌ Network ${network.name} not supported for fee manager deployment`);
      console.log(`Supported networks: ${Object.keys(ORACLE_CONFIGS).join(', ')}`);
      return;
    }
    
    try {
      // Check if price oracle exists
      const priceOracleFile = path.join(__dirname, '..', 'deployments', network.name, 'OmniDragonPriceOracle.json');
      let priceOracleAddress = "0x0000000000000000000000000000000000000000";
      let libraryAddress = null;
      
      if (fs.existsSync(priceOracleFile)) {
        const priceOracleData = JSON.parse(fs.readFileSync(priceOracleFile, 'utf8'));
        priceOracleAddress = priceOracleData.address;
        libraryAddress = priceOracleData.libraryAddress || priceOracleData.libraries?.EnhancedDragonMarketAnalyzer;
        console.log(`📊 Found Price Oracle at: ${priceOracleAddress}`);
        if (libraryAddress) {
          console.log(`📚 Using library at: ${libraryAddress}`);
        }
      } else {
        console.log("⚠️  Price Oracle not found, deploying Fee Manager with placeholder address");
      }
      
      // Deploy library if not found from price oracle deployment
      if (!libraryAddress) {
        console.log("\n📚 Deploying EnhancedDragonMarketAnalyzer library...");
        const EnhancedDragonMarketAnalyzer = await ethers.getContractFactory("EnhancedDragonMarketAnalyzer");
        const marketAnalyzerLib = await EnhancedDragonMarketAnalyzer.deploy();
        await marketAnalyzerLib.deployed();
        libraryAddress = marketAnalyzerLib.address;
        console.log(`✅ EnhancedDragonMarketAnalyzer library deployed to: ${libraryAddress}`);
      }
      
      // Deploy DragonFeeManager without library linking
      console.log("\n🚀 Deploying DragonFeeManager...");
      
      const DragonFeeManager = await ethers.getContractFactory("DragonFeeManager");
      
      const totalFee = 1000; // 10% total fee
      const initialJackpotFee = 300; // 3% jackpot fee
      
      const feeManager = await DragonFeeManager.deploy(
        priceOracleAddress,
        totalFee,
        initialJackpotFee
      );
      
      await feeManager.deployed();
      
      console.log(`✅ DragonFeeManager deployed to: ${feeManager.address}`);
      
      // Save deployment info
      const deploymentInfo = {
        network: network.name,
        chainId: ORACLE_CONFIGS[network.name].chainId,
        address: feeManager.address,
        libraryAddress: libraryAddress,
        deployer: deployer.address,
        blockNumber: feeManager.deployTransaction.blockNumber,
        transactionHash: feeManager.deployTransaction.hash,
        gasUsed: feeManager.deployTransaction.gasLimit.toString(),
        timestamp: new Date().toISOString(),
        configuration: {
          priceOracle: priceOracleAddress,
          totalFee: totalFee,
          initialJackpotFee: initialJackpotFee
        },
        libraries: {
          EnhancedDragonMarketAnalyzer: libraryAddress
        },
        contractName: "DragonFeeManager",
        compiler: {
          version: "0.8.20",
          optimization: true,
          runs: 200
        }
      };
      
      // Ensure deployments directory exists
      const deploymentsDir = path.join(__dirname, '..', 'deployments', network.name);
      if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
      }
      
      // Save deployment file
      const deploymentFile = path.join(deploymentsDir, 'DragonFeeManager.json');
      fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
      
      console.log(`\n📁 Deployment info saved to: ${deploymentFile}`);
      
      // Display summary
      console.log("\n📋 Deployment Summary:");
      console.log("====================================");
      console.log(`Network: ${network.name}`);
      console.log(`Contract: DragonFeeManager`);
      console.log(`Address: ${feeManager.address}`);
      console.log(`Library: ${libraryAddress}`);
      console.log(`Price Oracle: ${priceOracleAddress}`);
      console.log(`Total Fee: ${totalFee / 100}%`);
      console.log(`Jackpot Fee: ${initialJackpotFee / 100}%`);
      console.log("====================================");
      
      // Contract verification reminder
      console.log("\n🔍 Contract Verification:");
      console.log(`To verify on block explorer, run:`);
      console.log(`npx hardhat verify --network ${network.name} ${feeManager.address} "${priceOracleAddress}" ${totalFee} ${initialJackpotFee}`);
      
    } catch (error) {
      console.error(`❌ Error deploying Fee Manager on ${network.name}:`, error.message);
      throw error;
    }
  });

module.exports = {}; 