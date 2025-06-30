const { task } = require("hardhat/config");

task("predict-universal-omnidragon-address", "Predict the universal omniDRAGON address")
  .addOptionalParam("delegate", "Delegate address", "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    
    console.log(`\n🔮 Predicting Universal omniDRAGON Address`);
    
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
    console.log(`🌐 Current Network: ${network.name} (for reference only)`);
    
    try {
      // Get the universal deployer address first
      const DeployerFactory = await ethers.getContractFactory("OmniDragonDeployer");
      const CREATE2Factory = await ethers.getContractFactory("CREATE2FactoryWithOwnership");
      const create2Factory = CREATE2Factory.attach(create2FactoryAddress);
      
      // Universal deployer salt and prediction
      const DEPLOYER_SALT = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("OMNIDRAGON_DEPLOYER_UNIVERSAL_V1")
      );
      
      const deployerConstructorArgs = [create2FactoryAddress];
      const deployerDeploymentData = DeployerFactory.getDeployTransaction(...deployerConstructorArgs).data;
      const deployerBytecodeHash = ethers.utils.keccak256(deployerDeploymentData);
      const universalDeployerAddress = await create2Factory.computeAddress(DEPLOYER_SALT, deployerBytecodeHash);
      
      console.log(`🚀 Universal Deployer Address: ${universalDeployerAddress}`);
      
      // Now predict omniDRAGON address using the universal deployer
      const omniDRAGONFactory = await ethers.getContractFactory("omniDRAGON");
      
      // Generate omniDRAGON bytecode with constructor arguments
      const omniDRAGONBytecode = ethers.utils.solidityPack(
        ["bytes", "bytes"],
        [
          omniDRAGONFactory.bytecode,
          ethers.utils.defaultAbiCoder.encode(
            ["address", "address"],
            [chainRegistry, delegate]
          )
        ]
      );
      
      const omniDRAGONBytecodeHash = ethers.utils.keccak256(omniDRAGONBytecode);
      
      // Generate omniDRAGON salt (same as in deployer)
      const OMNIDRAGON_BASE_SALT = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("OMNIDRAGON_FRESH_V2_2025_DELEGATE")
      );
      const VERSION = "v1.0.0";
      const omniDRAGONSalt = ethers.utils.keccak256(
        ethers.utils.solidityPack(
          ["bytes32", "string", "string"],
          [OMNIDRAGON_BASE_SALT, "omniDRAGON", VERSION]
        )
      );
      
      // Predict omniDRAGON address
      const predictedOmniDRAGONAddress = await create2Factory.computeAddress(omniDRAGONSalt, omniDRAGONBytecodeHash);
      
      console.log(`\n🎯 UNIVERSAL omniDRAGON PREDICTION:`);
      console.log(`   Deployer: ${universalDeployerAddress}`);
      console.log(`   omniDRAGON: ${predictedOmniDRAGONAddress}`);
      console.log(`   Chain Registry: ${chainRegistry}`);
      console.log(`   Delegate: ${delegate}`);
      console.log(`   Salt: ${omniDRAGONSalt}`);
      console.log(`   Bytecode Hash: ${omniDRAGONBytecodeHash}`);
      
      console.log(`\n🌍 This omniDRAGON address will be the same on ALL chains:`);
      console.log(`   - Sonic (146): ${predictedOmniDRAGONAddress}`);
      console.log(`   - Arbitrum (42161): ${predictedOmniDRAGONAddress}`);
      console.log(`   - Avalanche (43114): ${predictedOmniDRAGONAddress}`);
      
      // Check if deployer exists on current network
      const deployerCode = await ethers.provider.getCode(universalDeployerAddress);
      if (deployerCode !== "0x") {
        console.log(`\n✅ Universal deployer already exists on ${network.name}`);
        
        // Test prediction using the deployed contract
        try {
          const deployerContract = DeployerFactory.attach(universalDeployerAddress);
          const contractPrediction = await deployerContract.predictOmniDRAGONAddressWithRegistry(delegate);
          console.log(`🧪 Deployer contract prediction: ${contractPrediction}`);
          
          if (contractPrediction.toLowerCase() === predictedOmniDRAGONAddress.toLowerCase()) {
            console.log(`✅ Manual calculation matches deployer contract!`);
          } else {
            console.log(`⚠️  Manual calculation differs from deployer contract`);
          }
        } catch (error) {
          console.log(`⚠️  Could not test with deployed contract: ${error.message}`);
        }
      } else {
        console.log(`\n⏳ Universal deployer not yet deployed on ${network.name}`);
        console.log(`   Deploy with: npx hardhat deploy-omnidragon-deployer-universal --network ${network.name}`);
      }
      
      return {
        deployer: universalDeployerAddress,
        omniDRAGON: predictedOmniDRAGONAddress,
        chainRegistry,
        delegate
      };
      
    } catch (error) {
      console.error(`❌ Prediction failed:`, error.message);
      throw error;
    }
  });

module.exports = {}; 