const { task } = require("hardhat/config");

task("deploy-omnidragon-deployer-universal", "Deploy OmniDragonDeployer with same address across all chains using CREATE2")
  .addOptionalParam("lite", "Deploy the lite version for low gas limit chains", "false")
  .addOptionalParam("gaslimit", "Gas limit for deployment", "8000000")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log(`\n🚀 Deploying Universal OmniDragonDeployer on ${network.name}`);
    console.log(`📍 Deployer: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} ETH`);
    
    // Load deployment configuration
    const deployConfig = require("../deploy-config.json");
    const networkConfig = deployConfig.networks[network.name];
    
    if (!networkConfig) {
      throw new Error(`Network ${network.name} not found in deploy-config.json`);
    }
    
    const create2FactoryAddress = networkConfig.contracts.create2Factory;
    const chainRegistry = networkConfig.contracts.omniDragonChainRegistry;
    
    console.log(`🏭 CREATE2 Factory: ${create2FactoryAddress}`);
    console.log(`📋 Chain Registry: ${chainRegistry}`);
    
    // Determine which version to deploy
    const useLite = taskArgs.lite === "true";
    const contractName = useLite ? "OmniDragonDeployerLite" : "OmniDragonDeployer";
    
    console.log(`📦 Deploying: ${contractName}`);
    
    try {
      // Get contract factory and CREATE2 factory
      const DeployerFactory = await ethers.getContractFactory(contractName);
      const CREATE2Factory = await ethers.getContractFactory("CREATE2FactoryWithOwnership");
      const create2Factory = CREATE2Factory.attach(create2FactoryAddress);
      
      // Create deterministic salt for OmniDragonDeployer
      const DEPLOYER_SALT = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("OMNIDRAGON_DEPLOYER_UNIVERSAL_V1")
      );
      
      console.log(`🧂 Salt: ${DEPLOYER_SALT}`);
      
      // Get deployment bytecode with constructor args
      const constructorArgs = [create2FactoryAddress];
      const deploymentData = DeployerFactory.getDeployTransaction(...constructorArgs).data;
      const bytecodeHash = ethers.utils.keccak256(deploymentData);
      
      console.log(`📦 Bytecode Hash: ${bytecodeHash}`);
      
      // Predict the address
      const predictedAddress = await create2Factory.computeAddress(DEPLOYER_SALT, bytecodeHash);
      console.log(`🔮 Predicted Address: ${predictedAddress}`);
      
      // Check if already deployed
      const existingCode = await ethers.provider.getCode(predictedAddress);
      if (existingCode !== "0x") {
        console.log(`✅ ${contractName} already deployed at: ${predictedAddress}`);
        
        // Attach to existing contract and verify it works
        const existingContract = DeployerFactory.attach(predictedAddress);
        
        try {
          // Test basic functionality
          const testDelegate = deployer.address;
          if (useLite) {
            const predictedOmniDragon = await existingContract.predictOmniDRAGONAddress(testDelegate);
            console.log(`✅ Existing contract works. Predicted omniDRAGON: ${predictedOmniDragon}`);
          } else {
            const predictedOmniDragon = await existingContract.predictOmniDRAGONAddressWithRegistry(testDelegate);
            console.log(`✅ Existing contract works. Predicted omniDRAGON: ${predictedOmniDragon}`);
          }
          
          return predictedAddress;
        } catch (error) {
          console.log(`⚠️  Existing contract might not be configured properly: ${error.message}`);
          console.log(`🔧 Continuing with configuration...`);
        }
      } else {
        // Deploy using CREATE2
        console.log(`📡 Deploying via CREATE2...`);
        
        const gasLimit = parseInt(taskArgs.gaslimit);
        console.log(`⛽ Gas Limit: ${gasLimit.toLocaleString()}`);
        
        const deployTx = await create2Factory.deploy(
          deploymentData,
          DEPLOYER_SALT,
          contractName,
          { gasLimit: gasLimit }
        );
        
        console.log(`⏳ Deployment transaction: ${deployTx.hash}`);
        const receipt = await deployTx.wait();
        console.log(`✅ ${contractName} deployed to: ${predictedAddress}`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
      }
      
      // Attach to the deployed contract
      const deployedContract = DeployerFactory.attach(predictedAddress);
      
      // Set chain registry if not already set
      try {
        console.log(`🔗 Setting chain registry...`);
        const setRegistryTx = await deployedContract.setChainRegistry(chainRegistry, {
          gasLimit: 500000
        });
        await setRegistryTx.wait();
        console.log(`✅ Chain registry set: ${setRegistryTx.hash}`);
      } catch (error) {
        if (error.message.includes("already set") || error.message.includes("same value")) {
          console.log(`ℹ️  Chain registry already configured`);
        } else {
          console.log(`⚠️  Could not set chain registry: ${error.message}`);
        }
      }
      
      // Verify the deployment
      console.log(`\n📊 Deployment Summary:`);
      console.log(`   Contract: ${contractName}`);
      console.log(`   Address: ${predictedAddress}`);
      console.log(`   Network: ${network.name} (Chain ID: ${networkConfig.chainId})`);
      console.log(`   CREATE2 Factory: ${create2FactoryAddress}`);
      console.log(`   Chain Registry: ${chainRegistry}`);
      console.log(`   Salt: ${DEPLOYER_SALT}`);
      
      // Test basic functionality
      console.log(`\n🧪 Testing basic functionality...`);
      
      const testDelegate = deployer.address;
      
      try {
        if (useLite) {
          // Test lite version
          const predictedAddress = await deployedContract.predictOmniDRAGONAddress(testDelegate);
          console.log(`✅ Predicted omniDRAGON address: ${predictedAddress}`);
        } else {
          // Test full version
          const predictedAddress = await deployedContract.predictOmniDRAGONAddressWithRegistry(testDelegate);
          console.log(`✅ Predicted omniDRAGON address: ${predictedAddress}`);
          
          // Test deployment info
          const deploymentInfo = await deployedContract.getDeploymentInfo("omniDRAGON");
          console.log(`✅ Deployment info retrieved: ${deploymentInfo[0]}`);
        }
      } catch (error) {
        console.log(`⚠️  Testing failed: ${error.message}`);
      }
      
      console.log(`\n🎉 Universal ${contractName} deployment completed successfully!`);
      console.log(`🌍 This address should be the same across all chains: ${predictedAddress}`);
      
      // Save deployment info
      const deploymentInfo = {
        contractName: contractName,
        address: predictedAddress,
        network: network.name,
        chainId: networkConfig.chainId,
        deployer: deployer.address,
        create2Factory: create2FactoryAddress,
        chainRegistry: chainRegistry,
        salt: DEPLOYER_SALT,
        isUniversal: true,
        deployedAt: new Date().toISOString()
      };
      
      console.log(`\n📝 Deployment Info:`);
      console.log(JSON.stringify(deploymentInfo, null, 2));
      
      return predictedAddress;
      
    } catch (error) {
      console.error(`❌ Deployment failed:`, error.message);
      
      if (error.message.includes("Salt already used")) {
        console.log(`\n💡 Contract already deployed with this salt. Use different salt or check existing deployment.`);
      } else if (error.message.includes("contract creation code storage out of gas") || 
          error.message.includes("exceeds block gas limit")) {
        console.log(`\n💡 Suggestion: Try deploying the lite version with --lite true`);
        console.log(`   Command: npx hardhat deploy-omnidragon-deployer-universal --lite true --network ${network.name}`);
      } else if (error.message.includes("insufficient funds")) {
        console.log(`\n💡 Insufficient funds. Please add more ETH to your deployer wallet.`);
      }
      
      throw error;
    }
  });

module.exports = {}; 