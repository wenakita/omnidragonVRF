const { task } = require("hardhat/config");

task("deployment-status", "Show deployment status across all chains")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    
    console.log(`\n🌍 OmniDragon Universal Deployment Status`);
    console.log(`=========================================`);
    
    // Load deployment configuration
    const deployConfig = require("../deploy-config.json");
    
    console.log(`\n📋 Universal Addresses:`);
    console.log(`   OmniDragonDeployer: ${deployConfig.deployment.universalAddresses.omniDragonDeployer}`);
    console.log(`   omniDRAGON: ${deployConfig.deployment.universalAddresses.omniDRAGON}`);
    console.log(`   Strategy: ${deployConfig.deployment.universalAddresses.strategy}`);
    
    console.log(`\n🔍 Per-Chain Verification:`);
    
    const networks = ["sonic", "arbitrum", "avalanche"];
    const results = [];
    
    for (const networkName of networks) {
      const networkConfig = deployConfig.networks[networkName];
      if (!networkConfig) continue;
      
      console.log(`\n📡 ${networkConfig.name} (Chain ${networkConfig.chainId}):`);
      
      try {
        // Configure provider for this network
        const provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
        
        // Check OmniDragonDeployer
        const deployerAddress = networkConfig.contracts.omniDragonDeployer;
        const deployerCode = await provider.getCode(deployerAddress);
        const deployerExists = deployerCode !== "0x";
        
        console.log(`   🚀 OmniDragonDeployer: ${deployerExists ? "✅ Deployed" : "❌ Missing"} at ${deployerAddress}`);
        
        // Check omniDRAGON
        const omniDRAGONAddress = networkConfig.contracts.omniDRAGON;
        const omniDRAGONCode = await provider.getCode(omniDRAGONAddress);
        const omniDRAGONExists = omniDRAGONCode !== "0x";
        
        console.log(`   🐉 omniDRAGON: ${omniDRAGONExists ? "✅ Deployed" : "❌ Missing"} at ${omniDRAGONAddress}`);
        
        // If omniDRAGON exists, get details
        if (omniDRAGONExists) {
          try {
            const omniDRAGONAbi = [
              "function name() view returns (string)",
              "function symbol() view returns (string)",
              "function owner() view returns (address)",
              "function totalSupply() view returns (uint256)"
            ];
            const omniDRAGONContract = new ethers.Contract(omniDRAGONAddress, omniDRAGONAbi, provider);
            
            const name = await omniDRAGONContract.name();
            const symbol = await omniDRAGONContract.symbol();
            const owner = await omniDRAGONContract.owner();
            const totalSupply = await omniDRAGONContract.totalSupply();
            
            console.log(`      Name: ${name}`);
            console.log(`      Symbol: ${symbol}`);
            console.log(`      Owner: ${owner}`);
            console.log(`      Total Supply: ${ethers.utils.formatEther(totalSupply)} DRAGON`);
          } catch (error) {
            console.log(`      ⚠️  Could not fetch contract details: ${error.message}`);
          }
        }
        
        results.push({
          network: networkName,
          chainId: networkConfig.chainId,
          deployerExists,
          omniDRAGONExists,
          deployerAddress,
          omniDRAGONAddress
        });
        
      } catch (error) {
        console.log(`   ❌ Error checking ${networkName}: ${error.message}`);
        results.push({
          network: networkName,
          chainId: networkConfig.chainId,
          deployerExists: false,
          omniDRAGONExists: false,
          error: error.message
        });
      }
    }
    
    // Summary
    console.log(`\n📊 Deployment Summary:`);
    console.log(`=====================`);
    
    const deployerCount = results.filter(r => r.deployerExists).length;
    const omniDRAGONCount = results.filter(r => r.omniDRAGONExists).length;
    const totalNetworks = results.length;
    
    console.log(`🚀 OmniDragonDeployer: ${deployerCount}/${totalNetworks} chains`);
    console.log(`🐉 omniDRAGON: ${omniDRAGONCount}/${totalNetworks} chains`);
    
    if (deployerCount === totalNetworks && omniDRAGONCount === totalNetworks) {
      console.log(`\n🎉 SUCCESS: Universal deployment completed on all chains!`);
      console.log(`✅ Same addresses across all chains achieved!`);
    } else {
      console.log(`\n⚠️  Deployment incomplete. Missing contracts on some chains.`);
    }
    
    // Address verification
    console.log(`\n🔍 Address Consistency Check:`);
    const uniqueDeployerAddresses = [...new Set(results.map(r => r.deployerAddress))];
    const uniqueOmniDRAGONAddresses = [...new Set(results.map(r => r.omniDRAGONAddress))];
    
    if (uniqueDeployerAddresses.length === 1) {
      console.log(`✅ OmniDragonDeployer has same address on all chains`);
    } else {
      console.log(`❌ OmniDragonDeployer has different addresses: ${uniqueDeployerAddresses.join(", ")}`);
    }
    
    if (uniqueOmniDRAGONAddresses.length === 1) {
      console.log(`✅ omniDRAGON has same address on all chains`);
    } else {
      console.log(`❌ omniDRAGON has different addresses: ${uniqueOmniDRAGONAddresses.join(", ")}`);
    }
    
    console.log(`\n🌐 Explorer Links:`);
    for (const result of results) {
      if (result.omniDRAGONExists) {
        const networkConfig = deployConfig.networks[result.network];
        console.log(`   ${networkConfig.name}: ${networkConfig.blockExplorer}/address/${result.omniDRAGONAddress}`);
      }
    }
    
    return results;
  });

module.exports = {}; 