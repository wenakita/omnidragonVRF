const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Manual Deploy Fixed omniDRAGON");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.utils.formatEther(balance), "ETH");
  
  // Deploy parameters
  const layerZeroProxy = "0x6Fa6abF394d4f827988FBAD17CadFb506b83c3e8";
  const delegate = "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F";
  
  console.log("LZ Proxy:", layerZeroProxy);
  console.log("Delegate:", delegate);
  
  try {
    const omniDRAGONFactory = await ethers.getContractFactory("omniDRAGON");
    console.log("Factory loaded");
    
    console.log("Deploying...");
    const omniDRAGON = await omniDRAGONFactory.deploy(layerZeroProxy, delegate);
    console.log("Deploy transaction sent:", omniDRAGON.deployTransaction.hash);
    
    console.log("Waiting for confirmation...");
    await omniDRAGON.deployed();
    
    console.log("SUCCESS!");
    console.log("New omniDRAGON address:", omniDRAGON.address);
    
    return omniDRAGON.address;
  } catch (error) {
    console.error("ERROR:", error.message);
    throw error;
  }
}

main().catch(console.error); 