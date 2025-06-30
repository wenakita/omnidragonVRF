const { task } = require("hardhat/config");
const fs = require('fs');
const path = require('path');

// Integration configuration for each network
const INTEGRATION_CONFIG = {
  sonic: {
    chainId: 146,
    // Existing contracts
    omniDRAGON: "0x0E5d746F01f4CDc76320c3349386176a873eAa40",
    dragonJackpotVault: "0xABa4df84B208ecedac2EcEcc988648d2847Ec310",
    dragonJackpotDistributor: "0x968763BebE98e956dA5826780e36E2f21edb79a3",
    // New oracle contracts
    priceOracle: "0x54D0DC2DcF1A1994aF3391A68FCF80A9C46FC2fd",
    feeManager: "0x071E337B46a56eca548D5c545b8F723296B36408"
  },
  arbitrum: {
    chainId: 42161,
    // Existing contracts
    omniDRAGON: "0x0E5d746F01f4CDc76320c3349386176a873eAa40",
    dragonJackpotVault: "", // To be deployed
    dragonJackpotDistributor: "", // To be deployed
    // New oracle contracts
    priceOracle: "0x705052Bd1f1f516cCA0e1d29Af684e10198eF3af",
    feeManager: "0x75caaB380d968CB18b907Ec3336cAE2400F4C431"
  },
  avalanche: {
    chainId: 43114,
    // Existing contracts
    omniDRAGON: "0x0E5d746F01f4CDc76320c3349386176a873eAa40",
    dragonJackpotVault: "", // To be deployed
    dragonJackpotDistributor: "", // To be deployed
    // New oracle contracts
    priceOracle: "0x1aD1778F47c44260CE9207E15C44D40C45991c6A",
    feeManager: "0xB3C189bF3aef85Aa07B178c16e35BaA5461705b9"
  }
};

task("integrate-oracle-ecosystem", "Integrate price oracle system with existing Dragon ecosystem")
  .addOptionalParam("action", "Action to perform: status, connect-jackpot, connect-omnidragon, connect-all, deploy-missing")
  .addOptionalParam("jackpotvault", "Address of jackpot vault to connect")
  .addOptionalParam("jackpotdistributor", "Address of jackpot distributor to connect")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("\n🔗 === OmniDragon Oracle Integration ===");
    console.log(`Network: ${network.name}`);
    console.log(`Deployer: ${deployer.address}`);
    
    const config = INTEGRATION_CONFIG[network.name];
    if (!config) {
      console.log(`❌ Network ${network.name} not supported`);
      return;
    }
    
    const action = taskArgs.action || "status";
    
    try {
      switch (action) {
        case "status":
          await checkIntegrationStatus(hre, config);
          break;
        case "connect-jackpot":
          await connectJackpotContracts(hre, config, taskArgs);
          break;
        case "connect-omnidragon":
          await connectOmniDragonContract(hre, config);
          break;
        case "connect-all":
          await connectAllContracts(hre, config, taskArgs);
          break;
        case "deploy-missing":
          await deployMissingContracts(hre, config);
          break;
        default:
          console.log("❌ Invalid action. Use: status, connect-jackpot, connect-omnidragon, connect-all, deploy-missing");
      }
    } catch (error) {
      console.error(`❌ Integration failed:`, error.message);
      throw error;
    }
  });

async function checkIntegrationStatus(hre, config) {
  const { ethers } = hre;
  
  console.log("\n📊 === Integration Status ===");
  
  // Check price oracle
  if (config.priceOracle) {
    try {
      const priceOracle = await ethers.getContractAt("OmniDragonPriceOracle", config.priceOracle);
      const [price, success] = await priceOracle.getAggregatedPrice();
      console.log(`✅ Price Oracle: ${config.priceOracle}`);
      console.log(`   Current Price: ${ethers.utils.formatUnits(price, 8)} USD`);
      console.log(`   Success: ${success}`);
    } catch (error) {
      console.log(`❌ Price Oracle: ${config.priceOracle} - ${error.message}`);
    }
  }
  
  // Check fee manager
  if (config.feeManager) {
    try {
      const feeManager = await ethers.getContractAt("DragonFeeManager", config.feeManager);
      const [totalFee, burnFee, jackpotFee, liquidityFee] = await feeManager.getFeeConfiguration();
      console.log(`✅ Fee Manager: ${config.feeManager}`);
      console.log(`   Total Fee: ${totalFee / 100}%`);
      console.log(`   Jackpot Fee: ${jackpotFee / 100}%`);
      console.log(`   Liquidity Fee: ${liquidityFee / 100}%`);
    } catch (error) {
      console.log(`❌ Fee Manager: ${config.feeManager} - ${error.message}`);
    }
  }
  
  // Check omniDRAGON
  if (config.omniDRAGON) {
    try {
      const omniDRAGON = await ethers.getContractAt("omniDRAGON", config.omniDRAGON);
      const totalSupply = await omniDRAGON.totalSupply();
      console.log(`✅ omniDRAGON: ${config.omniDRAGON}`);
      console.log(`   Total Supply: ${ethers.utils.formatEther(totalSupply)} DRAGON`);
      
      // Check if fee manager is connected
      try {
        const feeManagerAddr = await omniDRAGON.feeManager();
        if (feeManagerAddr === config.feeManager) {
          console.log(`   ✅ Fee Manager Connected: ${feeManagerAddr}`);
        } else {
          console.log(`   ⚠️  Fee Manager Not Connected: ${feeManagerAddr}`);
        }
      } catch {
        console.log(`   ⚠️  Fee Manager Not Connected`);
      }
    } catch (error) {
      console.log(`❌ omniDRAGON: ${config.omniDRAGON} - ${error.message}`);
    }
  }
  
  // Check jackpot vault
  if (config.dragonJackpotVault) {
    try {
      const jackpotVault = await ethers.getContractAt("DragonJackpotVault", config.dragonJackpotVault);
      
      // Get wrapped native token address
      const wrappedNativeToken = await jackpotVault.wrappedNativeToken();
      
      // Use raw contract call for getJackpotBalance since the ABI seems to have issues
      let currentBalance;
      try {
        const provider = ethers.provider;
        const iface = new ethers.utils.Interface([
          "function getJackpotBalance() external view returns (uint256)"
        ]);
        const data = iface.encodeFunctionData("getJackpotBalance", []);
        const result = await provider.call({ to: config.dragonJackpotVault, data });
        const decoded = iface.decodeFunctionResult("getJackpotBalance", result);
        currentBalance = decoded[0];
      } catch (error) {
        // Fallback to jackpotBalances mapping
        currentBalance = await jackpotVault.jackpotBalances(wrappedNativeToken);
      }
      
      console.log(`✅ Jackpot Vault: ${config.dragonJackpotVault}`);
      console.log(`   Balance: ${ethers.utils.formatEther(currentBalance)} tokens`);
      console.log(`   Wrapped Token: ${wrappedNativeToken}`);
    } catch (error) {
      console.log(`❌ Jackpot Vault: ${config.dragonJackpotVault} - ${error.message}`);
    }
  } else {
    console.log(`⚠️  Jackpot Vault: Not deployed`);
  }
  
  // Check jackpot distributor
  if (config.dragonJackpotDistributor) {
    try {
      const jackpotDistributor = await ethers.getContractAt("contracts/interfaces/lottery/IDragonJackpotDistributor.sol:IDragonJackpotDistributor", config.dragonJackpotDistributor);
      const balance = await jackpotDistributor.getCurrentJackpot();
      console.log(`✅ Jackpot Distributor: ${config.dragonJackpotDistributor}`);
      console.log(`   Balance: ${ethers.utils.formatEther(balance)} DRAGON`);
    } catch (error) {
      console.log(`❌ Jackpot Distributor: ${config.dragonJackpotDistributor} - ${error.message}`);
    }
  } else {
    console.log(`⚠️  Jackpot Distributor: Not deployed`);
  }
}

async function connectJackpotContracts(hre, config, taskArgs) {
  const { ethers } = hre;
  
  console.log("\n🔗 === Connecting Jackpot Contracts ===");
  
  const jackpotVaultAddr = taskArgs.jackpotvault || config.dragonJackpotVault;
  const jackpotDistributorAddr = taskArgs.jackpotdistributor || config.dragonJackpotDistributor;
  
  if (!jackpotVaultAddr || !jackpotDistributorAddr) {
    console.log("❌ Missing jackpot contract addresses");
    return;
  }
  
  try {
    // Connect fee manager to jackpot vault
    if (config.feeManager) {
      const feeManager = await ethers.getContractAt("DragonFeeManager", config.feeManager);
      
      // Update jackpot size in fee manager
      const jackpotVault = await ethers.getContractAt("DragonJackpotVault", jackpotVaultAddr);
      
      // Get wrapped native token address
      const wrappedNativeToken = await jackpotVault.wrappedNativeToken();
      
      // Use raw contract call for getJackpotBalance since the ABI seems to have issues
      let currentBalance;
      try {
        const provider = ethers.provider;
        const iface = new ethers.utils.Interface([
          "function getJackpotBalance() external view returns (uint256)"
        ]);
        const data = iface.encodeFunctionData("getJackpotBalance", []);
        const result = await provider.call({ to: jackpotVaultAddr, data });
        const decoded = iface.decodeFunctionResult("getJackpotBalance", result);
        currentBalance = decoded[0];
      } catch (error) {
        // Fallback to jackpotBalances mapping
        currentBalance = await jackpotVault.jackpotBalances(wrappedNativeToken);
      }
      
      console.log(`📊 Updating jackpot size in fee manager: ${ethers.utils.formatEther(currentBalance)} tokens`);
      const tx1 = await feeManager.updateJackpotSize(currentBalance);
      await tx1.wait();
      console.log(`✅ Jackpot size updated: ${tx1.hash}`);
    }
    
    // Connect price oracle to fee manager if not already connected
    if (config.priceOracle && config.feeManager) {
      const feeManager = await ethers.getContractAt("DragonFeeManager", config.feeManager);
      
      try {
        const currentOracle = await feeManager.priceOracle();
        if (currentOracle.toLowerCase() !== config.priceOracle.toLowerCase()) {
          console.log(`🔗 Connecting price oracle to fee manager...`);
          const tx2 = await feeManager.setPriceOracle(config.priceOracle);
          await tx2.wait();
          console.log(`✅ Price oracle connected: ${tx2.hash}`);
        } else {
          console.log(`✅ Price oracle already connected`);
        }
      } catch (error) {
        console.log(`⚠️  Could not check/set price oracle: ${error.message}`);
      }
    }
    
    console.log("\n✅ Jackpot contracts integration completed!");
    
  } catch (error) {
    console.error(`❌ Failed to connect jackpot contracts:`, error.message);
    throw error;
  }
}

async function connectOmniDragonContract(hre, config) {
  const { ethers } = hre;
  
  console.log("\n🔗 === Connecting omniDRAGON Contract ===");
  
  if (!config.omniDRAGON || !config.feeManager) {
    console.log("❌ Missing contract addresses");
    return;
  }
  
  try {
    const omniDRAGON = await ethers.getContractAt("omniDRAGON", config.omniDRAGON);
    
    // Check if we can connect the fee manager (this might require specific admin functions)
    console.log(`🔗 Attempting to connect fee manager to omniDRAGON...`);
    
    // Note: The exact method depends on the omniDRAGON contract implementation
    // This is a placeholder - you may need to adjust based on actual contract interface
    try {
      // Try to set fee manager if the function exists
      const tx = await omniDRAGON.setFeeManager(config.feeManager);
      await tx.wait();
      console.log(`✅ Fee manager connected to omniDRAGON: ${tx.hash}`);
    } catch (error) {
      console.log(`⚠️  Could not connect fee manager directly: ${error.message}`);
      console.log(`   This may require manual configuration or different approach`);
    }
    
    // Update fee manager with current omniDRAGON data
    const feeManager = await ethers.getContractAt("DragonFeeManager", config.feeManager);
    const totalSupply = await omniDRAGON.totalSupply();
    
    console.log(`📊 Current omniDRAGON supply: ${ethers.utils.formatEther(totalSupply)} DRAGON`);
    
    console.log("\n✅ omniDRAGON integration completed!");
    
  } catch (error) {
    console.error(`❌ Failed to connect omniDRAGON:`, error.message);
    throw error;
  }
}

async function connectAllContracts(hre, config, taskArgs) {
  console.log("\n🔗 === Connecting All Contracts ===");
  
  // Connect jackpot contracts first
  await connectJackpotContracts(hre, config, taskArgs);
  
  // Then connect omniDRAGON
  await connectOmniDragonContract(hre, config);
  
  // Final status check
  await checkIntegrationStatus(hre, config);
  
  console.log("\n🎉 All integrations completed!");
}

async function deployMissingContracts(hre, config) {
  const { ethers, network } = hre;
  const [deployer] = await ethers.getSigners();
  
  console.log("\n🚀 === Deploying Missing Contracts ===");
  
  const deployments = {};
  
  // Deploy jackpot vault if missing
  if (!config.dragonJackpotVault) {
    console.log("\n📦 Deploying DragonJackpotVault...");
    
    // Get wrapped native token address for each network
    const wrappedNativeTokens = {
      sonic: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38", // Wrapped S
      arbitrum: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
      avalanche: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7" // WAVAX
    };
    
    const wrappedNativeToken = wrappedNativeTokens[network.name];
    if (!wrappedNativeToken) {
      throw new Error(`No wrapped native token configured for ${network.name}`);
    }
    
    const DragonJackpotVault = await ethers.getContractFactory("DragonJackpotVault");
    const jackpotVault = await DragonJackpotVault.deploy(
      wrappedNativeToken,
      config.feeManager
    );
    await jackpotVault.deployed();
    
    const vaultAddress = jackpotVault.address;
    deployments.dragonJackpotVault = vaultAddress;
    
    console.log(`✅ DragonJackpotVault deployed: ${vaultAddress}`);
    
    // Save deployment
    await saveDeployment(network.name, "DragonJackpotVault", {
      address: vaultAddress,
      constructorArgs: [wrappedNativeToken, config.feeManager],
      deployer: deployer.address,
      blockNumber: await ethers.provider.getBlockNumber(),
      timestamp: new Date().toISOString()
    });
  }
  
  // Deploy jackpot distributor if missing
  if (!config.dragonJackpotDistributor) {
    console.log("\n📦 Deploying DragonJackpotDistributor...");
    
    const DragonJackpotDistributor = await ethers.getContractFactory("DragonJackpotDistributor");
    const jackpotDistributor = await DragonJackpotDistributor.deploy(
      config.omniDRAGON, // token
      config.feeManager, // swapTrigger
      deployer.address  // treasury
    );
    await jackpotDistributor.deployed();
    
    const distributorAddress = jackpotDistributor.address;
    deployments.dragonJackpotDistributor = distributorAddress;
    
    console.log(`✅ DragonJackpotDistributor deployed: ${distributorAddress}`);
    
    // Save deployment
    await saveDeployment(network.name, "DragonJackpotDistributor", {
      address: distributorAddress,
      constructorArgs: [config.omniDRAGON, config.feeManager, deployer.address],
      deployer: deployer.address,
      blockNumber: await ethers.provider.getBlockNumber(),
      timestamp: new Date().toISOString()
    });
  }
  
  if (Object.keys(deployments).length > 0) {
    console.log("\n📋 === Deployment Summary ===");
    for (const [contract, address] of Object.entries(deployments)) {
      console.log(`${contract}: ${address}`);
    }
  } else {
    console.log("\n✅ All contracts already deployed");
  }
  
  return deployments;
}

async function saveDeployment(networkName, contractName, deploymentData) {
  const deploymentDir = path.join(process.cwd(), 'deployments', networkName);
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentDir, `${contractName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
  
  console.log(`💾 Deployment saved: ${deploymentFile}`);
} 