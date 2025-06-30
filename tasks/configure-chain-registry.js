const { task } = require("hardhat/config");

task("configure-chain-registry", "Configure the new OmniDragonChainRegistry with chain settings")
  .addOptionalParam("registry", "Chain registry address")
  .addOptionalParam("gaslimit", "Gas limit for transactions", "2000000")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log(`\n🔧 Configuring OmniDragonChainRegistry on ${network.name}`);
    console.log(`📍 Deployer: ${deployer.address}`);
    
    // Load deployment configuration
    const deployConfig = require("../deploy-config.json");
    const networkConfig = deployConfig.networks[network.name];
    
    if (!networkConfig) {
      throw new Error(`Network ${network.name} not found in deploy-config.json`);
    }
    
    // Get registry address
    const registryAddress = taskArgs.registry || networkConfig.contracts.omniDragonChainRegistryNew;
    if (!registryAddress) {
      throw new Error("Registry address not provided and not found in config");
    }
    
    console.log(`📋 Chain Registry: ${registryAddress}`);
    console.log(`🌐 Network: ${network.name} (Chain ID: ${networkConfig.chainId})`);
    console.log(`🔗 LayerZero Endpoint: ${networkConfig.lzEndpoint}`);
    console.log(`🆔 LayerZero EID: ${networkConfig.lzEid}`);
    
    // Get the contract
    const OmniDragonChainRegistry = await ethers.getContractFactory("OmniDragonChainRegistry");
    const chainRegistry = OmniDragonChainRegistry.attach(registryAddress);
    
    try {
      // Check current owner
      const owner = await chainRegistry.owner();
      console.log(`👤 Current Owner: ${owner}`);
      
      if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log(`⚠️  Warning: You are not the owner of this contract`);
        console.log(`   Owner: ${owner}`);
        console.log(`   Your address: ${deployer.address}`);
        return;
      }
      
      // Check current endpoint
      const currentEndpoint = await chainRegistry.lzEndpointAddress();
      console.log(`🔗 Current Endpoint: ${currentEndpoint}`);
      
      // Update endpoint if needed
      if (currentEndpoint.toLowerCase() !== networkConfig.lzEndpoint.toLowerCase()) {
        console.log(`\n🔄 Updating LayerZero endpoint...`);
        
        // Check if we can update immediately
        const isUpdated = await chainRegistry.isEndpointUpdated();
        const deadline = await chainRegistry.updateDeadline();
        const now = Math.floor(Date.now() / 1000);
        
        console.log(`   Endpoint updated: ${isUpdated}`);
        console.log(`   Update deadline: ${new Date(deadline * 1000).toISOString()}`);
        console.log(`   Current time: ${new Date(now * 1000).toISOString()}`);
        
        if (!isUpdated && now <= deadline) {
          // Can update immediately during setup period
          console.log(`✅ Updating endpoint immediately (within setup period)`);
          const tx = await chainRegistry.updateEndpoint(networkConfig.lzEndpoint, {
            gasLimit: parseInt(taskArgs.gaslimit)
          });
          console.log(`📤 Transaction sent: ${tx.hash}`);
          const receipt = await tx.wait();
          console.log(`✅ Endpoint updated in block ${receipt.blockNumber}`);
        } else {
          console.log(`⚠️  Cannot update endpoint immediately`);
          console.log(`   Setup period expired or endpoint already updated`);
          console.log(`   Use proposeEndpointUpdate for future changes`);
        }
      } else {
        console.log(`✅ Endpoint is already correct`);
      }
      
      // Set current chain ID
      console.log(`\n🆔 Setting current chain ID to ${networkConfig.lzEid}...`);
      const tx = await chainRegistry.setCurrentChainId(networkConfig.lzEid, {
        gasLimit: parseInt(taskArgs.gaslimit)
      });
      console.log(`📤 Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Chain ID set in block ${receipt.blockNumber}`);
      
      // Register chain configuration
      console.log(`\n📋 Registering chain configuration...`);
      const chainConfig = {
        chainId: networkConfig.lzEid,
        chainName: networkConfig.name,
        lzEndpoint: networkConfig.lzEndpoint,
        isActive: true,
        blockExplorer: networkConfig.blockExplorer,
        rpcUrl: networkConfig.rpcUrl,
        nativeSymbol: networkConfig.nativeCurrency.symbol
      };
      
      try {
        const registerTx = await chainRegistry.registerChain(
          networkConfig.lzEid,
          networkConfig.name,
          networkConfig.lzEndpoint,
          true, // isActive
          networkConfig.blockExplorer,
          networkConfig.rpcUrl,
          networkConfig.nativeCurrency.symbol,
          {
            gasLimit: parseInt(taskArgs.gaslimit)
          }
        );
        console.log(`📤 Chain registration sent: ${registerTx.hash}`);
        const registerReceipt = await registerTx.wait();
        console.log(`✅ Chain registered in block ${registerReceipt.blockNumber}`);
      } catch (error) {
        if (error.message.includes("ChainAlreadyRegistered")) {
          console.log(`ℹ️  Chain already registered`);
        } else {
          console.error(`❌ Chain registration failed: ${error.message}`);
        }
      }
      
      // Verify final configuration
      console.log(`\n🔍 Final Configuration:`);
      const finalEndpoint = await chainRegistry.lzEndpointAddress();
      const feeMAddress = await chainRegistry.feeMAddress();
      console.log(`   Contract: ${registryAddress}`);
      console.log(`   Owner: ${await chainRegistry.owner()}`);
      console.log(`   LZ Endpoint: ${finalEndpoint}`);
      console.log(`   FeeM Address: ${feeMAddress}`);
      
      console.log(`\n✅ Chain registry configuration complete!`);
      console.log(`\n🔧 Next Step - Update OmniDragonDeployer:`);
      console.log(`   npx hardhat update-deployer-registry --network ${network.name} --registry ${registryAddress}`);
      
    } catch (error) {
      console.error(`❌ Configuration failed: ${error.message}`);
      if (error.data) {
        console.error(`   Error data: ${error.data}`);
      }
      throw error;
    }
  });

module.exports = {}; 