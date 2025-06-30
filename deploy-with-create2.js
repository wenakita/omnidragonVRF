const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Fixed omniDRAGON with CREATE2 (Universal Address)");
  
  const [signer] = await ethers.getSigners();
  console.log("📍 Deployer:", signer.address);
  
  // Contract addresses
  const deployerAddress = "0xDb24adBeCF6aAD00C8bb34b7828EC1dd095c2e2C";
  const chainRegistry = "0x567eB27f7EA8c69988e30B045987Ad58A597685C";
  const delegate = "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F";
  
  console.log("🏭 OmniDragonDeployer:", deployerAddress);
  console.log("🔗 LayerZero Endpoint (Chain Registry):", chainRegistry);
  console.log("👤 Delegate:", delegate);
  
  // Get deployer contract
  const deployer = await ethers.getContractAt("OmniDragonDeployerV2", deployerAddress);
  
  // Check current deployment
  try {
    const currentInfo = await deployer.getDeploymentInfo("omniDRAGON");
    console.log("📊 Current omniDRAGON deployment:");
    console.log("   Address:", currentInfo.deployed);
    console.log("   Universal:", currentInfo.universal);
    console.log("   Salt:", currentInfo.salt);
  } catch (error) {
    console.log("ℹ️  No current omniDRAGON deployment found");
  }
  
  // Check if we can predict the address
  try {
    const universalSalt = await deployer.generateUniversalSalt("omniDRAGON");
    console.log("🧂 Universal Salt:", universalSalt);
    
    // Get the omniDRAGON bytecode with constructor args
    const omniDRAGONFactory = await ethers.getContractFactory("omniDRAGON");
    const deploymentBytecode = omniDRAGONFactory.getDeployTransaction(chainRegistry, delegate).data;
    
    // Predict address using CREATE2
    const create2Factory = "0xAA28020DDA6b954D16208eccF873D79AC6533833";
    const predictedAddress = ethers.utils.getCreate2Address(
      create2Factory,
      universalSalt,
      ethers.utils.keccak256(deploymentBytecode)
    );
    
    console.log("🔮 Predicted Address:", predictedAddress);
    console.log("📋 Expected Address:", "0x0E5d746F01f4CDc76320c3349386176a873eAa40");
    console.log("✅ Match:", predictedAddress === "0x0E5d746F01f4CDc76320c3349386176a873eAa40");
    
  } catch (error) {
    console.log("⚠️  Could not predict address:", error.message);
  }
  
  // Deploy using the deployer's batch deploy function
  console.log("\n📦 Deploying omniDRAGON with CREATE2...");
  
  try {
    // Get factory again for deployment
    const omniDRAGONFactory = await ethers.getContractFactory("omniDRAGON");
    
    // Check if deployer has specific omniDRAGON function
    const deployTx = await deployer.batchDeploy(
      ["omniDRAGON"],
      [omniDRAGONFactory.getDeployTransaction(chainRegistry, delegate).data],
      {
        gasLimit: 6000000,
        gasPrice: ethers.utils.parseUnits("55", "gwei")
      }
    );
    
    console.log("⏳ Transaction:", deployTx.hash);
    await deployTx.wait();
    
    // Get the deployed address
    const finalInfo = await deployer.getDeploymentInfo("omniDRAGON");
    console.log("✅ omniDRAGON deployed via CREATE2 to:", finalInfo.deployed);
    console.log("🌍 Universal Address:", finalInfo.universal);
    
  } catch (error) {
    console.log("❌ CREATE2 deployment failed:", error.message);
    
    // Fallback: check if we need different approach
    console.log("\n💡 Checking deployer functions...");
    
    // List available functions
    const deployerInterface = deployer.interface;
    const functions = Object.keys(deployerInterface.functions);
    console.log("Available functions:", functions.filter(f => f.includes("deploy")));
  }
}

main()
  .then(() => {
    console.log("\n🎉 CREATE2 deployment process completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 