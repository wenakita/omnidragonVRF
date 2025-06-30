const { task } = require("hardhat/config");

task("deploy-chain-registry-via-deployer", "Deploy OmniDragonChainRegistry using OmniDragonDeployer's built-in functions")
  .addOptionalParam("owner", "Initial owner address", "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F")
  .addOptionalParam("gaslimit", "Gas limit for deployment", "10000000")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log(`\n🚀 Deploying OmniDragonChainRegistry via OmniDragonDeployer on ${network.name}`);
    console.log(`📍 Deployer: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} ETH`);
    
    // Load deployment configuration
    const deployConfig = require("../deploy-config.json");
    const networkConfig = deployConfig.networks[network.name];
    
    if (!networkConfig) {
      throw new Error(`Network ${network.name} not found in deploy-config.json`);
    }
    
    const omniDragonDeployerAddress = networkConfig.contracts.omniDragonDeployer;
    const initialOwner = taskArgs.owner;
    
    console.log(`🏭 OmniDragonDeployer: ${omniDragonDeployerAddress}`);
    console.log(`👤 Initial Owner: ${initialOwner}`);
    
    // Get the OmniDragonDeployerV2 contract
    const OmniDragonDeployer = await ethers.getContractFactory("OmniDragonDeployerV2");
    const omniDragonDeployer = OmniDragonDeployer.attach(omniDragonDeployerAddress);
    console.log(`📦 Using OmniDragonDeployer V2`);
    
    // Check if OmniDragonChainRegistry is already deployed
    try {
      const existingAddress = await omniDragonDeployer.deployedContracts("OmniDragonChainRegistry");
      if (existingAddress !== ethers.constants.AddressZero) {
        console.log(`⚠️  OmniDragonChainRegistry already deployed at: ${existingAddress}`);
        console.log(`   This deployment will update the deployer's tracking`);
      }
    } catch (error) {
      console.log(`📝 No existing deployment found, proceeding...`);
    }
    
    // First, create a deployment template if it doesn't exist
    const OmniDragonChainRegistry = await ethers.getContractFactory("OmniDragonChainRegistry");
    
    // Define constructor arguments for universal deployment (identical across all chains)
    const placeholderEndpoint = "0x0000000000000000000000000000000000000000"; // Zero address placeholder
    const feeMAddress = "0x0000000000000000000000000000000000000000"; // Zero address for all chains
    const constructorArgs = [placeholderEndpoint, feeMAddress, initialOwner];
    
    console.log(`\n📋 Constructor Arguments (Universal):`);
    console.log(`   _placeholderEndpoint: ${placeholderEndpoint}`);
    console.log(`   _feeMAddress: ${feeMAddress}`);
    console.log(`   _initialOwner: ${initialOwner}`);
    
    // Generate bytecode with constructor arguments
    const bytecode = ethers.utils.concat([
      OmniDragonChainRegistry.bytecode,
      ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "address"],
        constructorArgs
      )
    ]);
    
    console.log(`\n📦 Bytecode generated (${bytecode.length} bytes)`);
    
    try {
      // Get the salt from OmniDragonDeployer - use a unique contract name to avoid collisions
      const uniqueContractName = "OmniDragonChainRegistryV3";
      const salt = await omniDragonDeployer.generateUniversalSalt(uniqueContractName);
      console.log(`🧂 Generated Salt: ${salt}`);
      
      // Get the CREATE2 factory from the deployer
      const create2FactoryAddress = await omniDragonDeployer.factory();
      const CREATE2Factory = await ethers.getContractFactory("CREATE2FactoryWithOwnership");
      const create2Factory = CREATE2Factory.attach(create2FactoryAddress);
      console.log(`🏭 CREATE2 Factory: ${create2FactoryAddress}`);
      
      // Predict the deployment address
      const predictedAddress = await create2Factory.computeAddress(salt, ethers.utils.keccak256(bytecode));
      console.log(`🔮 Predicted Address: ${predictedAddress}`);
      
      // Check if address is already deployed
      const existingCode = await ethers.provider.getCode(predictedAddress);
      if (existingCode !== "0x") {
        console.log(`⚠️  Address ${predictedAddress} already has code deployed`);
        console.log(`   Using timestamp-based salt instead...`);
        
        // Generate unique salt with timestamp
        const timestamp = Date.now();
        const customSalt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`OmniDragonChainRegistry-${timestamp}`));
        const newPredictedAddress = await create2Factory.computeAddress(customSalt, ethers.utils.keccak256(bytecode));
        console.log(`🧂 Custom Salt: ${customSalt}`);
        console.log(`🔮 New Predicted Address: ${newPredictedAddress}`);
        
        // Deploy with custom salt
        const deployTx = await create2Factory.deploy(
          bytecode,
          customSalt,
          uniqueContractName,
          {
            gasLimit: parseInt(taskArgs.gaslimit)
          }
        );
        
        console.log(`📤 Deployment transaction sent: ${deployTx.hash}`);
        console.log(`⏳ Waiting for confirmation...`);
        
        const receipt = await deployTx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
        
        const deployedAddress = newPredictedAddress;
        console.log(`🎉 OmniDragonChainRegistry deployed at: ${deployedAddress}`);
        
        // Verify the deployment
        const chainRegistry = OmniDragonChainRegistry.attach(deployedAddress);
        const owner = await chainRegistry.owner();
        const endpoint = await chainRegistry.lzEndpointAddress();
        const feeM = await chainRegistry.feeMAddress();
        
        console.log(`\n🔍 Contract Verification:`);
        console.log(`   Owner: ${owner}`);
        console.log(`   LZ Endpoint: ${endpoint}`);
        console.log(`   FeeM Address: ${feeM}`);
        
        // Update the deployment config
        const fs = require('fs');
        const path = require('path');
        
        // Update deploy-config.json - backup old and set new as primary
        if (deployConfig.networks[network.name].contracts.omniDragonChainRegistry) {
          deployConfig.networks[network.name].contracts.omniDragonChainRegistryOld = deployConfig.networks[network.name].contracts.omniDragonChainRegistry;
        }
        deployConfig.networks[network.name].contracts.omniDragonChainRegistry = deployedAddress;
        fs.writeFileSync(
          path.join(__dirname, '../deploy-config.json'),
          JSON.stringify(deployConfig, null, 2)
        );
        
        // Create deployment JSON file
        const deploymentData = {
          address: deployedAddress,
          abi: OmniDragonChainRegistry.interface.format('json'),
          transactionHash: deployTx.hash,
          receipt: {
            contractAddress: deployedAddress,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber
          },
          args: constructorArgs,
          numDeployments: 1,
          metadata: {
            name: "OmniDragonChainRegistry",
            description: "Universal LayerZero Proxy and Chain Registry for OmniDragon ecosystem",
            version: "2.0.0",
            network: network.name,
            chainId: networkConfig.chainId,
            deployer: deployer.address,
            deployedAt: new Date().toISOString().split('T')[0],
            verificationUrl: `${networkConfig.blockExplorer}/address/${deployedAddress}#code`,
            blockExplorer: networkConfig.blockExplorer,
            universal: false, // Not truly universal since using custom salt
            salt: customSalt,
            deployedViaOmniDragonFactory: true
          }
        };
        
        const deploymentDir = path.join(__dirname, '../deployments', network.name);
        if (!fs.existsSync(deploymentDir)) {
          fs.mkdirSync(deploymentDir, { recursive: true });
        }
        
        fs.writeFileSync(
          path.join(deploymentDir, 'OmniDragonChainRegistry.json'),
          JSON.stringify(deploymentData, null, 2)
        );
        
        console.log(`\n📄 Deployment files updated:`);
        console.log(`   - deploy-config.json (old registry backed up to 'omniDragonChainRegistryOld')`);
        console.log(`   - deployments/${network.name}/OmniDragonChainRegistry.json`);
        
        console.log(`\n🔧 Next Steps:`);
        console.log(`1. Verify the contract:`);
        console.log(`   npx hardhat verify --network ${network.name} ${deployedAddress} "${placeholderEndpoint}" "${feeMAddress}" "${initialOwner}"`);
        console.log(`\n2. Configure the chain registry (REQUIRED - sets LayerZero endpoint):`);
        console.log(`   npx hardhat configure-chain-registry --network ${network.name} --registry ${deployedAddress}`);
        console.log(`\n3. Update your OmniDragonDeployer's chain registry:`);
        console.log(`   npx hardhat update-deployer-registry --network ${network.name} --registry ${deployedAddress}`);
        
        return;
      }
      
      // If address is free, deploy with the OmniDragonDeployer salt
      console.log(`✅ Address is available, deploying with OmniDragonDeployer salt...`);
      
      const deployTx = await create2Factory.deploy(
        bytecode,
        salt,
        uniqueContractName,
        {
          gasLimit: parseInt(taskArgs.gaslimit)
        }
      );
      
      console.log(`📤 Deployment transaction sent: ${deployTx.hash}`);
      console.log(`⏳ Waiting for confirmation...`);
      
      const receipt = await deployTx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
      
      const deployedAddress = predictedAddress;
      console.log(`🎉 OmniDragonChainRegistry deployed at: ${deployedAddress}`);
      
      // Verify the deployment
      const chainRegistry = OmniDragonChainRegistry.attach(deployedAddress);
      const owner = await chainRegistry.owner();
      const endpoint = await chainRegistry.lzEndpointAddress();
      const feeM = await chainRegistry.feeMAddress();
      
      console.log(`\n🔍 Contract Verification:`);
      console.log(`   Owner: ${owner}`);
      console.log(`   LZ Endpoint: ${endpoint}`);
      console.log(`   FeeM Address: ${feeM}`);
      
      // Update the deployment config
      const fs = require('fs');
      const path = require('path');
      
      // Update deploy-config.json - backup old and set new as primary
      if (deployConfig.networks[network.name].contracts.omniDragonChainRegistry) {
        deployConfig.networks[network.name].contracts.omniDragonChainRegistryOld = deployConfig.networks[network.name].contracts.omniDragonChainRegistry;
      }
      deployConfig.networks[network.name].contracts.omniDragonChainRegistry = deployedAddress;
      fs.writeFileSync(
        path.join(__dirname, '../deploy-config.json'),
        JSON.stringify(deployConfig, null, 2)
      );
      
      // Create deployment JSON file
      const deploymentData = {
        address: deployedAddress,
        abi: OmniDragonChainRegistry.interface.format('json'),
        transactionHash: deployTx.hash,
        receipt: {
          contractAddress: deployedAddress,
          gasUsed: receipt.gasUsed.toString(),
          blockNumber: receipt.blockNumber
        },
        args: constructorArgs,
        numDeployments: 1,
        metadata: {
          name: "OmniDragonChainRegistry",
          description: "Universal LayerZero Proxy and Chain Registry for OmniDragon ecosystem",
          version: "2.0.0",
          network: network.name,
          chainId: networkConfig.chainId,
          deployer: deployer.address,
          deployedAt: new Date().toISOString().split('T')[0],
          verificationUrl: `${networkConfig.blockExplorer}/address/${deployedAddress}#code`,
          blockExplorer: networkConfig.blockExplorer,
          universal: true, // Truly universal with OmniDragonDeployer salt
          salt: salt,
          deployedViaOmniDragonFactory: true
        }
      };
      
      const deploymentDir = path.join(__dirname, '../deployments', network.name);
      if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
      }
      
      fs.writeFileSync(
        path.join(deploymentDir, 'OmniDragonChainRegistry.json'),
        JSON.stringify(deploymentData, null, 2)
      );
      
      console.log(`\n📄 Deployment files updated:`);
      console.log(`   - deploy-config.json (old registry backed up to 'omniDragonChainRegistryOld')`);
      console.log(`   - deployments/${network.name}/OmniDragonChainRegistry.json`);
      
      console.log(`\n🔧 Next Steps:`);
      console.log(`1. Verify the contract:`);
      console.log(`   npx hardhat verify --network ${network.name} ${deployedAddress} "${placeholderEndpoint}" "${feeMAddress}" "${initialOwner}"`);
      console.log(`\n2. Configure the chain registry (REQUIRED - sets LayerZero endpoint):`);
      console.log(`   npx hardhat configure-chain-registry --network ${network.name} --registry ${deployedAddress}`);
      console.log(`\n3. Update your OmniDragonDeployer's chain registry:`);
      console.log(`   npx hardhat update-deployer-registry --network ${network.name} --registry ${deployedAddress}`);
      
    } catch (error) {
      console.error(`❌ Deployment failed: ${error.message}`);
      if (error.data) {
        console.error(`   Error data: ${error.data}`);
      }
      throw error;
    }
  });

module.exports = {}; 