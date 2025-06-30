const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Simple omniDRAGON Deployment with LayerZero Proxy\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.utils.formatEther(balance), "ETH");
  
  // LayerZero Proxy Addresses (our configurable endpoints)
  const LAYERZERO_PROXY_ADDRESSES = {
    sonic: "0x6Fa6abF394d4f827988FBAD17CadFb506b83c3e8",
    arbitrum: "0x90017f1f8F76877f465EC621ff8c1516534F481C",
    avalanche: "0x8426c64944e3eaF9B56AA20F5f72752EF5A51C88"
  };
  
  const network = hre.network.name;
  const lzEndpoint = LAYERZERO_PROXY_ADDRESSES[network];
  const delegate = "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F";
  
  if (!lzEndpoint) {
    throw new Error(`Network ${network} not supported. Supported: sonic, arbitrum, avalanche`);
  }
  
  console.log("🔗 LayerZero Endpoint (Proxy):", lzEndpoint);
  console.log("👤 Delegate:", delegate);
  console.log("🌐 Network:", network);
  
  try {
    // Get contract factory
    const omniDRAGONFactory = await ethers.getContractFactory("omniDRAGON");
    
    console.log("\n📦 Deploying omniDRAGON...");
    
    // Deploy with reasonable gas settings
    const omniDRAGON = await omniDRAGONFactory.deploy(
      lzEndpoint,  // LayerZero endpoint (our proxy)
      delegate,    // Delegate/owner
      {
        gasLimit: 5000000,  // 5M gas limit
        gasPrice: ethers.utils.parseUnits("55", "gwei")  // 55 gwei for Sonic
      }
    );
    
    console.log("⏳ Deployment transaction:", omniDRAGON.deployTransaction.hash);
    console.log("⏳ Waiting for confirmation...");
    
    await omniDRAGON.deployed();
    
    console.log("✅ omniDRAGON deployed to:", omniDRAGON.address);
    
    // Verify the deployment
    try {
      const name = await omniDRAGON.name();
      const symbol = await omniDRAGON.symbol();
      const owner = await omniDRAGON.owner();
      const endpoint = await omniDRAGON.getLayerZeroEndpoint();
      const isEndpointSet = await omniDRAGON.isLayerZeroEndpointSet();
      
      console.log("\n🧪 Deployment Verification:");
      console.log("   Name:", name);
      console.log("   Symbol:", symbol);
      console.log("   Owner:", owner);
      console.log("   Delegate:", delegate);
      console.log("   LayerZero Endpoint:", endpoint);
      console.log("   Endpoint Set:", isEndpointSet);
      
      if (owner.toLowerCase() === delegate.toLowerCase()) {
        console.log("   ✅ Owner matches delegate!");
      } else {
        console.log("   ⚠️  Owner doesn't match delegate");
      }
      
      if (endpoint.toLowerCase() === lzEndpoint.toLowerCase()) {
        console.log("   ✅ LayerZero endpoint matches proxy address!");
      } else {
        console.log("   ⚠️  LayerZero endpoint doesn't match proxy address");
      }
      
    } catch (error) {
      console.log("⚠️  Could not verify deployment:", error.message);
    }
    
    console.log("\n📊 Deployment Summary:");
    console.log("   Contract: omniDRAGON");
    console.log("   Address:", omniDRAGON.address);
    console.log("   Network:", network);
    console.log("   LayerZero Proxy:", lzEndpoint);
    console.log("   Delegate:", delegate);
    console.log("   Transaction:", omniDRAGON.deployTransaction.hash);
    
    console.log("\n🎯 LayerZero Proxy Benefits:");
    console.log("   ✅ Configurable endpoints (48-hour timelock)");
    console.log("   ✅ Emergency pause capability");
    console.log("   ✅ No contract redeployment needed for endpoint changes");
    console.log("   ✅ Full LayerZero V2 compatibility");
    
    console.log("\n🔧 Proxy Management:");
    console.log(`   Status: npx hardhat manage-layerzero-proxy --action status --network ${network}`);
    console.log(`   Change: npx hardhat manage-layerzero-proxy --action propose --new-endpoint "0xNEW_ENDPOINT" --network ${network}`);
    
    console.log("\n🎉 omniDRAGON deployment completed successfully!");
    
    // Save deployment info
    const deploymentInfo = {
      contractName: "omniDRAGON",
      address: omniDRAGON.address,
      network: network,
      deployer: deployer.address,
      layerZeroProxy: lzEndpoint,
      delegate: delegate,
      deployedAt: new Date().toISOString(),
      transactionHash: omniDRAGON.deployTransaction.hash,
      gasUsed: omniDRAGON.deployTransaction.gasLimit.toString()
    };
    
    console.log("\n💾 Deployment Info:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    
    return omniDRAGON.address;
    
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Insufficient funds. Please add more ETH to your deployer wallet.");
    } else if (error.message.includes("gas")) {
      console.log("\n💡 Gas-related error. Try adjusting gas limit or gas price.");
    }
    
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 