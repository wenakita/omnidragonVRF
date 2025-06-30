const { task } = require("hardhat/config");

task("deploy-omnidragon-universal", "Deploy omniDRAGON using universal deployer for same address across chains")
  .addOptionalParam("delegate", "Delegate address", "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F")
  .addOptionalParam("gaslimit", "Gas limit for deployment", "8000000")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log(`\n🚀 Deploying Universal omniDRAGON on ${network.name}`);
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
    const delegate = taskArgs.delegate;
    
    console.log(`🏭 CREATE2 Factory: ${create2FactoryAddress}`);
    console.log(`📋 Chain Registry: ${chainRegistry}`);
    console.log(`👤 Delegate: ${delegate}`);
    
    try {
      // Get the universal deployer address
      const DeployerFactory = await ethers.getContractFactory("OmniDragonDeployer");
      const CREATE2Factory = await ethers.getContractFactory("CREATE2FactoryWithOwnership");
      const create2Factory = CREATE2Factory.attach(create2FactoryAddress);
      
      // Calculate universal deployer address
      const DEPLOYER_SALT = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("OMNIDRAGON_DEPLOYER_UNIVERSAL_V1")
      );
      
      const deployerConstructorArgs = [create2FactoryAddress];
      const deployerDeploymentData = DeployerFactory.getDeployTransaction(...deployerConstructorArgs).data;
      const deployerBytecodeHash = ethers.utils.keccak256(deployerDeploymentData);
      const universalDeployerAddress = await create2Factory.computeAddress(DEPLOYER_SALT, deployerBytecodeHash);
      
      console.log(`🚀 Universal Deployer: ${universalDeployerAddress}`);
      
      // Check if deployer exists
      const deployerCode = await ethers.provider.getCode(universalDeployerAddress);
      if (deployerCode === "0x") {
        throw new Error(`Universal deployer not deployed on ${network.name}. Deploy it first with: npx hardhat deploy-omnidragon-deployer-universal --network ${network.name}`);
      }
      
      // Attach to the universal deployer
      const universalDeployer = DeployerFactory.attach(universalDeployerAddress);
      
      // Predict omniDRAGON address
      const predictedAddress = await universalDeployer.predictOmniDRAGONAddressWithRegistry(delegate);
      console.log(`🔮 Predicted omniDRAGON Address: ${predictedAddress}`);
      
      // Check if already deployed
      const existingCode = await ethers.provider.getCode(predictedAddress);
      if (existingCode !== "0x") {
        console.log(`✅ omniDRAGON already deployed at: ${predictedAddress}`);
        
        // Verify it works
        const omniDRAGONFactory = await ethers.getContractFactory("omniDRAGON");
        const existingOmniDRAGON = omniDRAGONFactory.attach(predictedAddress);
        
        try {
          const name = await existingOmniDRAGON.name();
          const symbol = await existingOmniDRAGON.symbol();
          const owner = await existingOmniDRAGON.owner();
          
          console.log(`✅ Existing omniDRAGON verified:`);
          console.log(`   Name: ${name}`);
          console.log(`   Symbol: ${symbol}`);
          console.log(`   Owner: ${owner}`);
          
          return predictedAddress;
        } catch (error) {
          console.log(`⚠️  Could not verify existing contract: ${error.message}`);
        }
      }
      
      // Deploy omniDRAGON via universal deployer
      console.log(`📡 Deploying omniDRAGON via universal deployer...`);
      
      const gasLimit = parseInt(taskArgs.gaslimit);
      console.log(`⛽ Gas Limit: ${gasLimit.toLocaleString()}`);
      
      const deployTx = await universalDeployer.deployOmniDRAGONWithRegistry(delegate, {
        gasLimit: gasLimit
      });
      
      console.log(`⏳ Deployment transaction: ${deployTx.hash}`);
      const receipt = await deployTx.wait();
      
      // Get the deployed address from the event
      const deployedEvent = receipt.events?.find(e => e.event === "UniversalContractDeployed");
      const deployedAddress = deployedEvent?.args?.contractAddress || predictedAddress;
      
      console.log(`✅ omniDRAGON deployed to: ${deployedAddress}`);
      console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
      
      // Verify the deployment
      const omniDRAGONFactory = await ethers.getContractFactory("omniDRAGON");
      const deployedOmniDRAGON = omniDRAGONFactory.attach(deployedAddress);
      
      try {
        const name = await deployedOmniDRAGON.name();
        const symbol = await deployedOmniDRAGON.symbol();
        const owner = await deployedOmniDRAGON.owner();
        
        console.log(`\n🧪 Deployment Verification:`);
        console.log(`   Name: ${name}`);
        console.log(`   Symbol: ${symbol}`);
        console.log(`   Owner: ${owner}`);
        console.log(`   Delegate: ${delegate}`);
        
        if (owner.toLowerCase() === delegate.toLowerCase()) {
          console.log(`✅ Owner matches delegate!`);
        } else {
          console.log(`⚠️  Owner doesn't match delegate`);
        }
      } catch (error) {
        console.log(`⚠️  Could not verify deployment: ${error.message}`);
      }
      
      console.log(`\n📊 Deployment Summary:`);
      console.log(`   Contract: omniDRAGON`);
      console.log(`   Address: ${deployedAddress}`);
      console.log(`   Network: ${network.name} (Chain ID: ${networkConfig.chainId})`);
      console.log(`   Universal Deployer: ${universalDeployerAddress}`);
      console.log(`   Chain Registry: ${chainRegistry}`);
      console.log(`   Delegate: ${delegate}`);
      
      console.log(`\n🌍 This address should be the same on ALL chains:`);
      console.log(`   - Sonic (146): ${deployedAddress}`);
      console.log(`   - Arbitrum (42161): ${deployedAddress}`);
      console.log(`   - Avalanche (43114): ${deployedAddress}`);
      
      console.log(`\n🎉 Universal omniDRAGON deployment completed successfully!`);
      
      // Save deployment info
      const deploymentInfo = {
        contractName: "omniDRAGON",
        address: deployedAddress,
        network: network.name,
        chainId: networkConfig.chainId,
        deployer: deployer.address,
        universalDeployer: universalDeployerAddress,
        chainRegistry: chainRegistry,
        delegate: delegate,
        isUniversal: true,
        deployedAt: new Date().toISOString(),
        transactionHash: deployTx.hash,
        gasUsed: receipt.gasUsed.toString()
      };
      
      console.log(`\n📝 Deployment Info:`);
      console.log(JSON.stringify(deploymentInfo, null, 2));
      
      return deployedAddress;
      
    } catch (error) {
      console.error(`❌ Deployment failed:`, error.message);
      
      if (error.message.includes("omniDRAGON already deployed")) {
        console.log(`\n💡 omniDRAGON is already deployed on this chain.`);
      } else if (error.message.includes("insufficient funds")) {
        console.log(`\n💡 Insufficient funds. Please add more ETH to your deployer wallet.`);
      } else if (error.message.includes("Universal deployer not deployed")) {
        console.log(`\n💡 Deploy the universal deployer first with:`);
        console.log(`   npx hardhat deploy-omnidragon-deployer-universal --network ${network.name}`);
      }
      
      throw error;
    }
  });

module.exports = {}; 