const { task } = require("hardhat/config");

task("register-contract-type", "Register a new contract type in OmniDragonDeployer")
  .addParam("name", "Contract name to register")
  .addParam("universal", "Whether it's universal (true/false)", "true")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log(`\n📝 Registering contract type on ${network.name}`);
    console.log(`📍 Deployer: ${deployer.address}`);
    
    // Load deployment configuration
    const deployConfig = require("../deploy-config.json");
    const networkConfig = deployConfig.networks[network.name];
    
    if (!networkConfig) {
      throw new Error(`Network ${network.name} not found in deploy-config.json`);
    }
    
    const omniDragonDeployerAddress = networkConfig.contracts.omniDragonDeployer;
    const contractName = taskArgs.name;
    const isUniversal = taskArgs.universal === "true";
    
    console.log(`🏭 OmniDragonDeployer: ${omniDragonDeployerAddress}`);
    console.log(`📦 Contract Name: ${contractName}`);
    console.log(`🌐 Universal: ${isUniversal}`);
    
    // Get the OmniDragonDeployer contract
    const OmniDragonDeployer = await ethers.getContractFactory("OmniDragonDeployer");
    const omniDragonDeployer = OmniDragonDeployer.attach(omniDragonDeployerAddress);
    
    try {
      // Check current owner
      const owner = await omniDragonDeployer.owner();
      console.log(`👤 Current Owner: ${owner}`);
      
      if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log(`⚠️  Warning: You are not the owner of this contract`);
        console.log(`   Owner: ${owner}`);
        console.log(`   Your address: ${deployer.address}`);
        return;
      }
      
      // Register the contract type
      console.log(`\n🔄 Registering contract type...`);
      const tx = await omniDragonDeployer.registerContractTypes(
        [contractName],
        [isUniversal],
        {
          gasLimit: 1000000
        }
      );
      
      console.log(`📤 Transaction sent: ${tx.hash}`);
      console.log(`⏳ Waiting for confirmation...`);
      
      const receipt = await tx.wait();
      console.log(`✅ Contract type registered in block ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
      
      // Verify registration
      const isRegistered = await omniDragonDeployer.isUniversalContract(contractName);
      console.log(`\n🔍 Verification:`);
      console.log(`   Contract Name: ${contractName}`);
      console.log(`   Is Universal: ${isRegistered}`);
      console.log(`   Registration Successful: ${isRegistered === isUniversal}`);
      
      console.log(`\n✅ Contract type registration complete!`);
      
    } catch (error) {
      console.error(`❌ Registration failed: ${error.message}`);
      if (error.data) {
        console.error(`   Error data: ${error.data}`);
      }
      throw error;
    }
  });

module.exports = {}; 