const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Fixed omniDRAGON with Chain Registry");
  
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deployer:", deployer.address);
  
  // Use OmniDragonChainRegistry as LZ endpoint for universal addresses
  const chainRegistry = "0x567eB27f7EA8c69988e30B045987Ad58A597685C";
  const delegate = "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F";
  
  console.log("🔗 LayerZero Endpoint (Chain Registry):", chainRegistry);
  console.log("👤 Delegate:", delegate);
  console.log("📊 Benefits: Universal address across all chains");
  
  // Deploy contract
  const omniDRAGONFactory = await ethers.getContractFactory("omniDRAGON");
  console.log("📦 Deploying omniDRAGON...");
  
  const omniDRAGON = await omniDRAGONFactory.deploy(chainRegistry, delegate, {
    gasLimit: 5000000,
    gasPrice: ethers.utils.parseUnits("55", "gwei")
  });
  
  console.log("⏳ Transaction:", omniDRAGON.deployTransaction.hash);
  await omniDRAGON.deployed();
  
  console.log("✅ Fixed omniDRAGON deployed to:", omniDRAGON.address);
  console.log("🔧 Fixes included:");
  console.log("   ✅ Lottery entries attributed to tx.origin (actual user)");
  console.log("   ✅ Fees distributed in native $S tokens");
  console.log("   ✅ Buy fees handled properly in native tokens");
  
  // Verify deployment
  const owner = await omniDRAGON.owner();
  const endpoint = await omniDRAGON.getLayerZeroEndpoint();
  
  console.log("\n📋 Verification:");
  console.log("   Owner:", owner);
  console.log("   LZ Endpoint:", endpoint);
  console.log("   Expected Registry:", chainRegistry);
  console.log("   Match:", endpoint.toLowerCase() === chainRegistry.toLowerCase() ? "✅" : "❌");
  
  return omniDRAGON.address;
}

main()
  .then((address) => {
    console.log(`\n🎉 Deployment completed! New omniDRAGON: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 