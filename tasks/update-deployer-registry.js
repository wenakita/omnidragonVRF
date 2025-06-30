const { task } = require("hardhat/config");

task("update-deployer-registry", "Update OmniDragonDeployer to use the new chain registry")
  .addOptionalParam("registry", "New chain registry address")
  .addOptionalParam("gaslimit", "Gas limit for transactions", "2000000")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log(`\n🔄 Updating OmniDragonDeployer chain registry on ${network.name}`);
    console.log(`📍 Deployer: ${deployer.address}`);
    
    // Load deployment configuration
    const deployConfig = require("../deploy-config.json");
    const networkConfig = deployConfig.networks[network.name];
    
    if (!networkConfig) {
      throw new Error(`Network ${network.name} not found in deploy-config.json`);
    }
    
    // Get addresses
    const omniDragonDeployerAddress = networkConfig.contracts.omniDragonDeployer;
    const newRegistryAddress = taskArgs.registry || networkConfig.contracts.omniDragonChainRegistryNew;
    
    if (!newRegistryAddress) {
      throw new Error("New registry address not provided and not found in config");
    }
    
    console.log(`🏭 OmniDragonDeployer: ${omniDragonDeployerAddress}`);
    console.log(`📋 New Chain Registry: ${newRegistryAddress}`);
    
    // Get the contracts
    const OmniDragonDeployer = await ethers.getContractFactory("OmniDragonDeployerV2");
    const omniDragonDeployer = OmniDragonDeployer.attach(omniDragonDeployerAddress);
    
    try {
      // Check current owner
      const owner = await omniDragonDeployer.owner();
      console.log(`👤 Deployer Owner: ${owner}`);
      
      if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log(`⚠️  Warning: You are not the owner of the OmniDragonDeployer`);
        console.log(`   Owner: ${owner}`);
        console.log(`   Your address: ${deployer.address}`);
        return;
      }
      
      // Check current chain registry
      const currentRegistry = await omniDragonDeployer.chainRegistry();
      console.log(`🔗 Current Registry: ${currentRegistry}`);
      
      if (currentRegistry.toLowerCase() === newRegistryAddress.toLowerCase()) {
        console.log(`✅ Chain registry is already set to the new address`);
        return;
      }
      
      // Update chain registry
      console.log(`\n🔄 Updating chain registry...`);
      const tx = await omniDragonDeployer.setChainRegistry(newRegistryAddress, {
        gasLimit: parseInt(taskArgs.gaslimit)
      });
      
      console.log(`📤 Transaction sent: ${tx.hash}`);
      console.log(`⏳ Waiting for confirmation...`);
      
      const receipt = await tx.wait();
      console.log(`✅ Chain registry updated in block ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
      
      // Verify the update
      const updatedRegistry = await omniDragonDeployer.chainRegistry();
      console.log(`\n🔍 Verification:`);
      console.log(`   Previous Registry: ${currentRegistry}`);
      console.log(`   New Registry: ${updatedRegistry}`);
      console.log(`   Update Successful: ${updatedRegistry.toLowerCase() === newRegistryAddress.toLowerCase()}`);
      
      // Update config file
      const fs = require('fs');
      const path = require('path');
      
      // Update deploy-config.json to make the new registry the default
      deployConfig.networks[network.name].contracts.omniDragonChainRegistryOld = deployConfig.networks[network.name].contracts.omniDragonChainRegistry;
      deployConfig.networks[network.name].contracts.omniDragonChainRegistry = newRegistryAddress;
      
      fs.writeFileSync(
        path.join(__dirname, '../deploy-config.json'),
        JSON.stringify(deployConfig, null, 2)
      );
      
      console.log(`\n📄 Configuration updated:`);
      console.log(`   - Old registry moved to 'omniDragonChainRegistryOld'`);
      console.log(`   - New registry is now the default 'omniDragonChainRegistry'`);
      
      console.log(`\n✅ OmniDragonDeployer successfully updated!`);
      console.log(`\n🔧 Next Steps:`);
      console.log(`1. Deploy a new omniDRAGON using the new registry:`);
      console.log(`   npx hardhat deploy-new-omnidragon --network ${network.name}`);
      console.log(`\n2. Or update existing omniDRAGON to use new registry (if supported):`);
      console.log(`   npx hardhat update-omnidragon-endpoint --network ${network.name}`);
      
    } catch (error) {
      console.error(`❌ Update failed: ${error.message}`);
      if (error.data) {
        console.error(`   Error data: ${error.data}`);
      }
      throw error;
    }
  });

module.exports = {}; 