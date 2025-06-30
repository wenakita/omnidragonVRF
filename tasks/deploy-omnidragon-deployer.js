const { task } = require("hardhat/config");

task("deploy-omnidragon-deployer", "Deploy OmniDragonDeployer contract")
  .addOptionalParam("lite", "Deploy the lite version for low gas limit chains", "false")
  .addOptionalParam("gaslimit", "Gas limit for deployment", "8000000")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log(`\n🚀 Deploying OmniDragonDeployer on ${network.name}`);
    console.log(`📍 Deployer: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} ETH`);
    
    // Load deployment configuration
    const deployConfig = require("../deploy-config.json");
    const networkConfig = deployConfig.networks[network.name];
    
    if (!networkConfig) {
      throw new Error(`Network ${network.name} not found in deploy-config.json`);
    }
    
    const create2Factory = networkConfig.contracts.create2Factory;
    const chainRegistry = networkConfig.contracts.omniDragonChainRegistry;
    
    console.log(`🏭 CREATE2 Factory: ${create2Factory}`);
    console.log(`📋 Chain Registry: ${chainRegistry}`);
    
    // Determine which version to deploy
    const useLite = taskArgs.lite === "true";
    const contractName = useLite ? "OmniDragonDeployerLite" : "OmniDragonDeployer";
    
    console.log(`📦 Deploying: ${contractName}`);
    
    try {
      // Get contract factory
      const DeployerFactory = await ethers.getContractFactory(contractName);
      
      // Deploy with specified gas limit
      const gasLimit = parseInt(taskArgs.gaslimit);
      console.log(`⛽ Gas Limit: ${gasLimit.toLocaleString()}`);
      
      const deployer_contract = await DeployerFactory.deploy(create2Factory, {
        gasLimit: gasLimit
      });
      
      console.log(`⏳ Deployment transaction: ${deployer_contract.deployTransaction.hash}`);
      
      // Wait for deployment
      await deployer_contract.deployed();
      const deployedAddress = deployer_contract.address;
      
      console.log(`✅ ${contractName} deployed to: ${deployedAddress}`);
      
      // Set chain registry
      console.log(`🔗 Setting chain registry...`);
      const setRegistryTx = await deployer_contract.setChainRegistry(chainRegistry, {
        gasLimit: 500000
      });
      await setRegistryTx.wait();
      console.log(`✅ Chain registry set: ${setRegistryTx.hash}`);
      
      // Verify the deployment
      console.log(`\n📊 Deployment Summary:`);
      console.log(`   Contract: ${contractName}`);
      console.log(`   Address: ${deployedAddress}`);
      console.log(`   Network: ${network.name} (Chain ID: ${networkConfig.chainId})`);
      console.log(`   CREATE2 Factory: ${create2Factory}`);
      console.log(`   Chain Registry: ${chainRegistry}`);
      const receipt = await deployer_contract.deployTransaction.wait();
      console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
      
      // Test basic functionality
      console.log(`\n🧪 Testing basic functionality...`);
      
      const testDelegate = deployer.address;
      
      if (useLite) {
        // Test lite version
        const predictedAddress = await deployer_contract.predictOmniDRAGONAddress(testDelegate);
        console.log(`✅ Predicted omniDRAGON address: ${predictedAddress}`);
      } else {
        // Test full version
        const predictedAddress = await deployer_contract.predictOmniDRAGONAddressWithRegistry(testDelegate);
        console.log(`✅ Predicted omniDRAGON address: ${predictedAddress}`);
        
        // Test deployment info
        const deploymentInfo = await deployer_contract.getDeploymentInfo("omniDRAGON");
        console.log(`✅ Deployment info retrieved: ${deploymentInfo[0]}`);
      }
      
      console.log(`\n🎉 ${contractName} deployment completed successfully!`);
      
      // Save deployment info
      const deploymentInfo = {
        contractName: contractName,
        address: deployedAddress,
        network: network.name,
        chainId: networkConfig.chainId,
        deployer: deployer.address,
        create2Factory: create2Factory,
        chainRegistry: chainRegistry,
        deployedAt: new Date().toISOString(),
        transactionHash: deployer_contract.deployTransaction.hash
      };
      
      console.log(`\n📝 Deployment Info:`);
      console.log(JSON.stringify(deploymentInfo, null, 2));
      
      return deployedAddress;
      
    } catch (error) {
      console.error(`❌ Deployment failed:`, error.message);
      
      if (error.message.includes("contract creation code storage out of gas") || 
          error.message.includes("exceeds block gas limit")) {
        console.log(`\n💡 Suggestion: Try deploying the lite version with --lite true`);
        console.log(`   Command: npx hardhat deploy-omnidragon-deployer --lite true --network ${network.name}`);
      }
      
      throw error;
    }
  });

module.exports = {}; 