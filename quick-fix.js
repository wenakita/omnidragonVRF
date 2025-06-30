const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Quick Fix - Deploy Fixed omniDRAGON");
  
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deployer:", deployer.address);
  
  // Use LayerZero proxy for new address  
  const layerZeroProxy = "0x6Fa6abF394d4f827988FBAD17CadFb506b83c3e8";
  const delegate = "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F";
  
  console.log("🔗 LayerZero Proxy:", layerZeroProxy);
  
  // Deploy fixed omniDRAGON
  const omniDRAGONFactory = await ethers.getContractFactory("omniDRAGON");
  
  const fixedOmniDRAGON = await omniDRAGONFactory.deploy(layerZeroProxy, delegate, {
    gasLimit: 5000000,
    gasPrice: ethers.utils.parseUnits("55", "gwei")
  });
  
  console.log("⏳ TX:", fixedOmniDRAGON.deployTransaction.hash);
  await fixedOmniDRAGON.deployed();
  
  const newAddress = fixedOmniDRAGON.address;
  console.log("✅ Fixed omniDRAGON:", newAddress);
  
  // Quick configuration
  console.log("🔧 Setting core addresses...");
  
  await fixedOmniDRAGON.setCoreAddresses(
    "0x1b1523b3254e076fcbcc992cbe2dc8f08458e538", // jackpotVault
    "0x53bA33D2392E37384159A45258Ec70Ca4bAD4817", // revenueDistributor  
    "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38", // wrappedNativeToken (WS)
    "0x6E4141d33021b52C91c28608403db4A0FFB50Ec6", // uniswapRouter
    "0x56eAb9e1f775d0f43cf831d719439e0bF6748234", // lotteryManager
    delegate, // emergencyTreasury
    delegate  // emergencyPauser
  );
  
  console.log("✅ Configured!");
  
  console.log("\n🎯 SUMMARY:");
  console.log("Old (buggy):", "0x0E5d746F01f4CDc76320c3349386176a873eAa40");
  console.log("New (fixed):", newAddress);
  console.log("✅ Lottery entries use tx.origin");
  console.log("✅ Fees distributed in $S");
  
  return newAddress;
}

main().then(console.log).catch(console.error); 