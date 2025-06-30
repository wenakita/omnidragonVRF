const { task } = require("hardhat/config");

task("predict-universal-deployer-address", "Predict the universal OmniDragonDeployer address")
  .addOptionalParam("lite", "Predict address for the lite version", "false")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    
    console.log(`\n🔮 Predicting Universal OmniDragonDeployer Address`);
    
    // Load deployment configuration
    const deployConfig = require("../deploy-config.json");
    const networkConfig = deployConfig.networks[network.name];
    
    if (!networkConfig) {
      throw new Error(`Network ${network.name} not found in deploy-config.json`);
    }
    
    const create2FactoryAddress = networkConfig.contracts.create2Factory;
    
    console.log(`🏭 CREATE2 Factory: ${create2FactoryAddress}`);
    console.log(`🌐 Current Network: ${network.name} (for reference only)`);
    
    // Determine which version
    const useLite = taskArgs.lite === "true";
    const contractName = useLite ? "OmniDragonDeployerLite" : "OmniDragonDeployer";
    
    console.log(`📦 Contract: ${contractName}`);
    
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
      
      console.log(`\n🎯 UNIVERSAL ADDRESS PREDICTION:`);
      console.log(`   Contract: ${contractName}`);
      console.log(`   Address: ${predictedAddress}`);
      console.log(`   Salt: ${DEPLOYER_SALT}`);
      console.log(`   Bytecode Hash: ${bytecodeHash}`);
      
      console.log(`\n🌍 This address will be the same on ALL chains:`);
      console.log(`   - Sonic (146): ${predictedAddress}`);
      console.log(`   - Arbitrum (42161): ${predictedAddress}`);
      console.log(`   - Avalanche (43114): ${predictedAddress}`);
      
      // Check if already deployed on current network
      const existingCode = await ethers.provider.getCode(predictedAddress);
      if (existingCode !== "0x") {
        console.log(`\n✅ Already deployed on ${network.name}`);
        
        // Test if it works
        try {
          const existingContract = DeployerFactory.attach(predictedAddress);
          const testDelegate = "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F"; // Your deployer address
          
          if (useLite) {
            const predictedOmniDragon = await existingContract.predictOmniDRAGONAddress(testDelegate);
            console.log(`🧪 Test: Predicted omniDRAGON address: ${predictedOmniDragon}`);
          } else {
            const predictedOmniDragon = await existingContract.predictOmniDRAGONAddressWithRegistry(testDelegate);
            console.log(`🧪 Test: Predicted omniDRAGON address: ${predictedOmniDragon}`);
          }
        } catch (error) {
          console.log(`⚠️  Contract exists but might not be properly configured: ${error.message}`);
        }
      } else {
        console.log(`\n⏳ Not yet deployed on ${network.name}`);
        console.log(`   Deploy with: npx hardhat deploy-omnidragon-deployer-universal --network ${network.name}`);
      }
      
      return predictedAddress;
      
    } catch (error) {
      console.error(`❌ Prediction failed:`, error.message);
      throw error;
    }
  });

module.exports = {}; 