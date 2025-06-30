const { task } = require("hardhat/config");

task("verify-universal-contracts", "Verify OmniDragonDeployer and omniDRAGON contracts on all explorers")
  .addOptionalParam("contract", "Specific contract to verify (deployer or omnidragon)", "all")
  .setAction(async (taskArgs, hre) => {
    const { run, network } = hre;
    
    console.log(`\n🔍 Verifying Universal Contracts on ${network.name}`);
    console.log(`==========================================`);
    
    // Load deployment configuration
    const deployConfig = require("../deploy-config.json");
    const networkConfig = deployConfig.networks[network.name];
    
    if (!networkConfig) {
      throw new Error(`Network ${network.name} not found in deploy-config.json`);
    }
    
    const create2FactoryAddress = networkConfig.contracts.create2Factory;
    const chainRegistry = networkConfig.contracts.omniDragonChainRegistry;
    const deployerAddress = networkConfig.contracts.omniDragonDeployer;
    const omniDRAGONAddress = networkConfig.contracts.omniDRAGON;
    const delegate = "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F";
    
    console.log(`🌐 Network: ${networkConfig.name} (Chain ID: ${networkConfig.chainId})`);
    console.log(`🔗 Block Explorer: ${networkConfig.blockExplorer}`);
    console.log(`🏭 CREATE2 Factory: ${create2FactoryAddress}`);
    console.log(`📋 Chain Registry: ${chainRegistry}`);
    console.log(`🚀 OmniDragonDeployer: ${deployerAddress}`);
    console.log(`🐉 omniDRAGON: ${omniDRAGONAddress}`);
    
    const results = [];
    
    // Verify OmniDragonDeployer
    if (taskArgs.contract === "all" || taskArgs.contract === "deployer") {
      console.log(`\n📡 Verifying OmniDragonDeployer...`);
      
      try {
        await run("verify:verify", {
          address: deployerAddress,
          constructorArguments: [create2FactoryAddress],
          contract: "contracts/core/factory/OmniDragonDeployer.sol:OmniDragonDeployer"
        });
        
        console.log(`✅ OmniDragonDeployer verified successfully!`);
        console.log(`🔗 ${networkConfig.blockExplorer}/address/${deployerAddress}#code`);
        
        results.push({
          contract: "OmniDragonDeployer",
          address: deployerAddress,
          status: "verified",
          explorerUrl: `${networkConfig.blockExplorer}/address/${deployerAddress}#code`
        });
        
      } catch (error) {
        if (error.message.includes("already verified")) {
          console.log(`✅ OmniDragonDeployer already verified!`);
          console.log(`🔗 ${networkConfig.blockExplorer}/address/${deployerAddress}#code`);
          
          results.push({
            contract: "OmniDragonDeployer",
            address: deployerAddress,
            status: "already_verified",
            explorerUrl: `${networkConfig.blockExplorer}/address/${deployerAddress}#code`
          });
        } else {
          console.error(`❌ OmniDragonDeployer verification failed:`, error.message);
          
          results.push({
            contract: "OmniDragonDeployer",
            address: deployerAddress,
            status: "failed",
            error: error.message
          });
        }
      }
    }
    
    // Verify omniDRAGON
    if (taskArgs.contract === "all" || taskArgs.contract === "omnidragon") {
      console.log(`\n🐉 Verifying omniDRAGON...`);
      
      try {
        await run("verify:verify", {
          address: omniDRAGONAddress,
          constructorArguments: [chainRegistry, delegate],
          contract: "contracts/core/tokens/omniDRAGON.sol:omniDRAGON"
        });
        
        console.log(`✅ omniDRAGON verified successfully!`);
        console.log(`🔗 ${networkConfig.blockExplorer}/address/${omniDRAGONAddress}#code`);
        
        results.push({
          contract: "omniDRAGON",
          address: omniDRAGONAddress,
          status: "verified",
          explorerUrl: `${networkConfig.blockExplorer}/address/${omniDRAGONAddress}#code`
        });
        
      } catch (error) {
        if (error.message.includes("already verified")) {
          console.log(`✅ omniDRAGON already verified!`);
          console.log(`🔗 ${networkConfig.blockExplorer}/address/${omniDRAGONAddress}#code`);
          
          results.push({
            contract: "omniDRAGON",
            address: omniDRAGONAddress,
            status: "already_verified",
            explorerUrl: `${networkConfig.blockExplorer}/address/${omniDRAGONAddress}#code`
          });
        } else {
          console.error(`❌ omniDRAGON verification failed:`, error.message);
          
          results.push({
            contract: "omniDRAGON",
            address: omniDRAGONAddress,
            status: "failed",
            error: error.message
          });
        }
      }
    }
    
    // Summary
    console.log(`\n📊 Verification Summary for ${network.name}:`);
    console.log(`=========================================`);
    
    for (const result of results) {
      const statusIcon = result.status === "verified" || result.status === "already_verified" ? "✅" : "❌";
      console.log(`${statusIcon} ${result.contract}: ${result.status}`);
      if (result.explorerUrl) {
        console.log(`   🔗 ${result.explorerUrl}`);
      }
      if (result.error) {
        console.log(`   ❌ Error: ${result.error}`);
      }
    }
    
    const successCount = results.filter(r => r.status === "verified" || r.status === "already_verified").length;
    const totalCount = results.length;
    
    if (successCount === totalCount) {
      console.log(`\n🎉 All contracts verified successfully on ${network.name}!`);
    } else {
      console.log(`\n⚠️  ${successCount}/${totalCount} contracts verified on ${network.name}`);
    }
    
    return results;
  });

module.exports = {}; 