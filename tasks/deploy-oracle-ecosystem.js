const { task } = require("hardhat/config");
const { spawn } = require('child_process');

task("deploy-oracle-ecosystem", "Deploy complete oracle ecosystem (Price Oracles + Fee Managers)")
  .setAction(async (taskArgs, hre) => {
    const { network, ethers } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("\n🚀 === OmniDragon Oracle Ecosystem Deployment ===");
    console.log(`Network: ${network.name}`);
    console.log(`Deployer: ${deployer.address}`);
    
    const supportedNetworks = ['sonic', 'arbitrum', 'avalanche'];
    
    // Validate current network
    if (!supportedNetworks.includes(network.name)) {
      console.log(`❌ Unsupported network: ${network.name}`);
      console.log(`Supported networks: ${supportedNetworks.join(', ')}`);
      console.log(`Please run this command with --network <network_name>`);
      return;
    }
    
    const deploymentResults = {
      priceOracle: null,
      feeManager: null,
      errors: []
    };
    
    try {
      // Phase 1: Deploy Price Oracle
      console.log("\n📊 Phase 1: Deploying Price Oracle...");
      console.log("======================================");
      
      console.log(`🔄 Deploying Price Oracle on ${network.name}...`);
      await hre.run('deploy-price-oracles');
      deploymentResults.priceOracle = 'success';
      console.log(`✅ Price Oracle deployed successfully on ${network.name}`);
      
      // Phase 2: Deploy Fee Manager
      console.log("\n💰 Phase 2: Deploying Fee Manager...");
      console.log("====================================");
      
      console.log(`🔄 Deploying Fee Manager on ${network.name}...`);
      await hre.run('deploy-fee-managers');
      deploymentResults.feeManager = 'success';
      console.log(`✅ Fee Manager deployed successfully on ${network.name}`);
      
      // Phase 3: Link Fee Manager to Price Oracle
      console.log("\n🔗 Phase 3: Linking Fee Manager to Price Oracle...");
      console.log("==================================================");
      
      console.log(`🔄 Linking contracts on ${network.name}...`);
      await hre.run('link-fee-manager-oracle');
      console.log(`✅ Contracts linked successfully on ${network.name}`);
      
      // Phase 4: Initial Configuration
      console.log("\n⚙️  Phase 4: Initial Configuration...");
      console.log("====================================");
      
      console.log(`🔄 Configuring oracle on ${network.name}...`);
      
      // Update oracle addresses
      await hre.run('configure-price-oracles', { action: 'update-oracles' });
      console.log("✅ Oracle addresses updated");
      
      // Set oracle weights
      await hre.run('configure-price-oracles', { action: 'set-weights' });
      console.log("✅ Oracle weights configured");
      
      console.log(`✅ Oracle configured successfully on ${network.name}`);
      
    } catch (error) {
      console.error(`❌ Deployment error:`, error.message);
      deploymentResults.errors.push(error.message);
    }
    
    // Display Final Summary
    console.log("\n📋 === Deployment Summary ===");
    console.log("==============================");
    console.log(`Network: ${network.name}`);
    
    const priceOracleStatus = deploymentResults.priceOracle === 'success' ? '✅' : '❌';
    const feeManagerStatus = deploymentResults.feeManager === 'success' ? '✅' : '❌';
    
    console.log(`${priceOracleStatus} Price Oracle: ${deploymentResults.priceOracle || 'Failed'}`);
    console.log(`${feeManagerStatus} Fee Manager: ${deploymentResults.feeManager || 'Failed'}`);
    
    if (deploymentResults.errors.length > 0) {
      console.log("\n❌ Errors Encountered:");
      deploymentResults.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    // Next Steps
    console.log("\n�� Next Steps:");
    console.log("===============");
    console.log("1. Verify contracts on block explorers (commands provided during deployment)");
    console.log("2. Test oracle functionality:");
    console.log(`   npx hardhat configure-price-oracles --network ${network.name} --action test-oracle`);
    console.log("3. Enable cross-chain mode:");
    console.log(`   npx hardhat configure-price-oracles --network ${network.name} --action enable-crosschain`);
    console.log("4. Integrate with existing omniDRAGON and jackpot contracts");
    console.log("5. Deploy on other networks:");
    console.log("   npx hardhat deploy-oracle-ecosystem --network arbitrum");
    console.log("   npx hardhat deploy-oracle-ecosystem --network avalanche");
    
    console.log("\n📚 Documentation:");
    console.log("==================");
    console.log("- Deployment Guide: PRICE_ORACLE_DEPLOYMENT_GUIDE.md");
    console.log(`- Deployment files: deployments/${network.name}/`);
    console.log("- Configuration examples in the guide");
    
    if (deploymentResults.priceOracle === 'success' && deploymentResults.feeManager === 'success' && deploymentResults.errors.length === 0) {
      console.log(`\n🎉 Deployment completed successfully on ${network.name}!`);
    } else if (deploymentResults.priceOracle === 'success' || deploymentResults.feeManager === 'success') {
      console.log(`\n⚠️  Partial success on ${network.name}. Check errors above.`);
    } else {
      console.log(`\n💥 Deployment failed on ${network.name}. Check error messages above.`);
    }
  });

task("status-oracle-ecosystem", "Check status of oracle ecosystem on current network")
  .setAction(async (taskArgs, hre) => {
    const { network } = hre;
    
    console.log("\n📊 === Oracle Ecosystem Status ===");
    console.log("===================================");
    console.log(`Network: ${network.name}`);
    
    const supportedNetworks = ['sonic', 'arbitrum', 'avalanche'];
    
    if (!supportedNetworks.includes(network.name)) {
      console.log(`❌ Unsupported network: ${network.name}`);
      console.log(`Supported networks: ${supportedNetworks.join(', ')}`);
      return;
    }
    
    try {
      await hre.run('configure-price-oracles', { action: 'status' });
    } catch (error) {
      console.log(`❌ Error checking ${network.name}: ${error.message}`);
    }
  });

module.exports = {}; 