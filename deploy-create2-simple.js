const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Fixed omniDRAGON with CREATE2 (Universal Address)");
  
  const [signer] = await ethers.getSigners();
  console.log("📍 Deployer:", signer.address);
  
  // Contract addresses
  const deployerAddress = "0xDb24adBeCF6aAD00C8bb34b7828EC1dd095c2e2C";
  const chainRegistry = "0x567eB27f7EA8c69988e30B045987Ad58A597685C";
  
  console.log("🏭 OmniDragonDeployerV2:", deployerAddress);
  console.log("🔗 Chain Registry:", chainRegistry);
  
  // Get deployer contract
  const deployer = await ethers.getContractAt("OmniDragonDeployerV2", deployerAddress);
  
  // Check current deployment
  const currentInfo = await deployer.getDeploymentInfo("omniDRAGON");
  console.log("📊 Current omniDRAGON:");
  console.log("   Address:", currentInfo.deployed);
  console.log("   Universal:", currentInfo.universal);
  
  // Deploy the fixed omniDRAGON using the registry function
  console.log("\n📦 Deploying Fixed omniDRAGON with CREATE2...");
  
  try {
    const deployTx = await deployer.deployOmniDRAGONWithRegistry(chainRegistry, {
      gasLimit: 6000000,
      gasPrice: ethers.utils.parseUnits("55", "gwei")  
    });
    
    console.log("⏳ Transaction:", deployTx.hash);
    const receipt = await deployTx.wait();
    
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    
    // Get the new deployment info
    const newInfo = await deployer.getDeploymentInfo("omniDRAGON");
    console.log("\n🎯 New omniDRAGON Deployment:");
    console.log("   Address:", newInfo.deployed);
    console.log("   Universal:", newInfo.universal);
    console.log("   Salt:", newInfo.salt);
    
    // Verify it's our fixed version by checking the endpoint
    const omniDRAGON = await ethers.getContractAt("omniDRAGON", newInfo.deployed);
    const endpoint = await omniDRAGON.getLayerZeroEndpoint();
    const owner = await omniDRAGON.owner();
    
    console.log("\n🔍 Verification:");
    console.log("   Owner:", owner);
    console.log("   LZ Endpoint:", endpoint);
    console.log("   Expected Registry:", chainRegistry);
    console.log("   ✅ Endpoint Match:", endpoint.toLowerCase() === chainRegistry.toLowerCase());
    
    console.log("\n🔧 Fixed Features:");
    console.log("   ✅ Lottery entries use tx.origin (actual user)");
    console.log("   ✅ Fees distributed in native $S tokens");
    console.log("   ✅ Universal address via CREATE2");
    
    return newInfo.deployed;
    
  } catch (error) {
    console.log("❌ Deployment failed:", error.message);
    
    if (error.message.includes("already deployed")) {
      console.log("💡 Contract already deployed - checking if it needs update");
      const currentAddress = currentInfo.deployed;
      
      // Check if current deployment uses chain registry
      const omniDRAGON = await ethers.getContractAt("omniDRAGON", currentAddress);
      const endpoint = await omniDRAGON.getLayerZeroEndpoint();
      
      console.log("Current endpoint:", endpoint);
      console.log("Target registry:", chainRegistry);
      
      if (endpoint.toLowerCase() === chainRegistry.toLowerCase()) {
        console.log("✅ Current deployment already uses chain registry!");
        return currentAddress;
      } else {
        console.log("⚠️  Current deployment uses different endpoint - manual intervention needed");
      }
    }
    
    throw error;
  }
}

main()
  .then((address) => {
    console.log(`\n🎉 Fixed omniDRAGON ready at: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Process failed:", error);
    process.exit(1);
  }); 