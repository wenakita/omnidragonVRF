const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Current omniDRAGON Contract...\n");
  
  // Current omniDRAGON address
  const OMNIDRAGON_ADDRESS = "0x0E5d746F01f4CDc76320c3349386176a873eAa40";
  
  // LayerZero Proxy Addresses
  const LAYERZERO_PROXY_ADDRESSES = {
    sonic: "0x6Fa6abF394d4f827988FBAD17CadFb506b83c3e8",
    arbitrum: "0x90017f1f8F76877f465EC621ff8c1516534F481C",
    avalanche: "0x8426c64944e3eaF9B56AA20F5f72752EF5A51C88"
  };
  
  try {
    // Get contract instance
    const omniDRAGON = await ethers.getContractAt("omniDRAGON", OMNIDRAGON_ADDRESS);
    
    // Get current LayerZero endpoint
    const currentEndpoint = await omniDRAGON.getLayerZeroEndpoint();
    const isEndpointSet = await omniDRAGON.isLayerZeroEndpointSet();
    
    // Get basic info
    const name = await omniDRAGON.name();
    const symbol = await omniDRAGON.symbol();
    const owner = await omniDRAGON.owner();
    
    console.log("📊 Current omniDRAGON Status:");
    console.log(`   Address: ${OMNIDRAGON_ADDRESS}`);
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Owner: ${owner}`);
    console.log(`   LayerZero Endpoint: ${currentEndpoint}`);
    console.log(`   Endpoint Set: ${isEndpointSet}`);
    
    // Check which network we're on
    const network = hre.network.name;
    const expectedProxy = LAYERZERO_PROXY_ADDRESSES[network];
    
    console.log(`\n🔗 LayerZero Endpoint Analysis:`);
    console.log(`   Current Endpoint: ${currentEndpoint}`);
    console.log(`   Expected Proxy (${network}): ${expectedProxy}`);
    
    if (currentEndpoint.toLowerCase() === expectedProxy?.toLowerCase()) {
      console.log(`   ✅ Already using LayerZero proxy!`);
    } else {
      console.log(`   ⚠️  Using different endpoint (likely old chain registry)`);
      
      // Check if it's the old chain registry
      const OLD_CHAIN_REGISTRY = "0x567eB27f7EA8c69988e30B045987Ad58A597685C";
      if (currentEndpoint.toLowerCase() === OLD_CHAIN_REGISTRY.toLowerCase()) {
        console.log(`   📋 Confirmed: Using old chain registry`);
      }
    }
    
    console.log(`\n🎯 Recommendation:`);
    if (currentEndpoint.toLowerCase() === expectedProxy?.toLowerCase()) {
      console.log(`   ✅ No action needed - already using configurable LayerZero proxy!`);
    } else {
      console.log(`   🚀 Deploy new omniDRAGON with LayerZero proxy endpoints for:`);
      console.log(`      - Configurable endpoints (48-hour timelock)`);
      console.log(`      - Emergency pause capability`);
      console.log(`      - No redeployment needed for future endpoint changes`);
    }
    
  } catch (error) {
    console.error("❌ Error checking omniDRAGON:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 