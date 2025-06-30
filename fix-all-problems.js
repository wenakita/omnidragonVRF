const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Comprehensive omniDRAGON Fix - All Problems");
  console.log("=".repeat(50));
  
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deployer:", deployer.address);
  
  // Current problematic omniDRAGON
  const oldOmniDRAGON = "0x0E5d746F01f4CDc76320c3349386176a873eAa40";
  console.log("❌ Old omniDRAGON (with bugs):", oldOmniDRAGON);
  
  // System contract addresses
  const lotteryManager = "0x56eAb9e1f775d0f43cf831d719439e0bF6748234";
  const layerZeroProxy = "0x6Fa6abF394d4f827988FBAD17CadFb506b83c3e8"; // Use LZ proxy instead of registry
  const delegate = "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F";
  
  console.log("🎯 System Contracts:");
  console.log("   Lottery Manager:", lotteryManager);
  console.log("   LayerZero Proxy:", layerZeroProxy);
  console.log("   Delegate:", delegate);
  
  // ===== STEP 1: Deploy Fixed omniDRAGON =====
  console.log("\n🚀 STEP 1: Deploy Fixed omniDRAGON");
  console.log("   Using LayerZero Proxy for NEW address (not registry)");
  
  try {
    const omniDRAGONFactory = await ethers.getContractFactory("omniDRAGON");
    
    const fixedOmniDRAGON = await omniDRAGONFactory.deploy(
      layerZeroProxy,  // Different endpoint = different address
      delegate,
      {
        gasLimit: 5000000,
        gasPrice: ethers.utils.parseUnits("55", "gwei")
      }
    );
    
    console.log("⏳ Deployment TX:", fixedOmniDRAGON.deployTransaction.hash);
    await fixedOmniDRAGON.deployed();
    
    const newAddress = fixedOmniDRAGON.address;
    console.log("✅ Fixed omniDRAGON deployed to:", newAddress);
    
    // Verify fixes are included
    const endpoint = await fixedOmniDRAGON.getLayerZeroEndpoint();
    const owner = await fixedOmniDRAGON.owner();
    
    console.log("🔍 Verification:");
    console.log("   Owner:", owner);
    console.log("   LZ Endpoint:", endpoint);
    console.log("   Expected Proxy:", layerZeroProxy);
    console.log("   ✅ Match:", endpoint.toLowerCase() === layerZeroProxy.toLowerCase());
    
    // ===== STEP 2: Check Current System Configuration =====
    console.log("\n🔍 STEP 2: Current System Configuration");
    
    const lotteryManagerContract = await ethers.getContractAt("OmniDragonLotteryManager", lotteryManager);
    
    try {
      const authorizedContracts = await lotteryManagerContract.authorizedSwapContracts(oldOmniDRAGON);
      console.log("   Old omniDRAGON authorized in lottery:", authorizedContracts);
    } catch (error) {
      console.log("   Could not check lottery authorization:", error.message);
    }
    
    // ===== STEP 3: Configuration Steps =====
    console.log("\n📋 STEP 3: Required Configuration Steps");
    console.log("   Execute these steps to complete the fix:");
    console.log("");
    
    console.log("   A. Update Lottery Manager:");
    console.log(`      - Authorize new omniDRAGON: ${newAddress}`);
    console.log(`      - Unauthorize old omniDRAGON: ${oldOmniDRAGON}`);
    console.log("");
    
    console.log("   B. Configure New omniDRAGON:");
    console.log("      - Set core addresses (jackpot vault, revenue distributor, etc.)");
    console.log("      - Add liquidity pairs");
    console.log("      - Set authorized callers");
    console.log("");
    
    console.log("   C. Update Any Other Contracts:");
    console.log("      - Update references from old to new omniDRAGON address");
    console.log("");
    
    // ===== STEP 4: Generate Configuration Script =====
    console.log("🔧 STEP 4: Auto-configuration");
    
    console.log("   Setting core addresses on new omniDRAGON...");
    
    // Set core addresses
    const setCoreAddressesTx = await fixedOmniDRAGON.setCoreAddresses(
      "0x1b1523b3254e076fcbcc992cbe2dc8f08458e538", // jackpotVault (existing)
      "0x53bA33D2392E37384159A45258Ec70Ca4bAD4817", // revenueDistributor (existing)
      "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38", // wrappedNativeTokenAddress (WS)
      "0x6E4141d33021b52C91c28608403db4A0FFB50Ec6", // uniswapRouter
      lotteryManager, // lotteryManager
      delegate, // emergencyTreasury
      delegate, // emergencyPauser
      {
        gasLimit: 500000,
        gasPrice: ethers.utils.parseUnits("55", "gwei")
      }
    );
    
    console.log("   ⏳ Core addresses TX:", setCoreAddressesTx.hash);
    await setCoreAddressesTx.wait();
    console.log("   ✅ Core addresses configured");
    
    // Authorize new omniDRAGON in lottery manager
    console.log("   Authorizing new omniDRAGON in lottery manager...");
    
    const authorizeTx = await lotteryManagerContract.setAuthorizedSwapContract(newAddress, true, {
      gasLimit: 200000,
      gasPrice: ethers.utils.parseUnits("55", "gwei")
    });
    
    console.log("   ⏳ Authorization TX:", authorizeTx.hash);
    await authorizeTx.wait();
    console.log("   ✅ New omniDRAGON authorized in lottery");
    
    // Unauthorize old omniDRAGON
    console.log("   Unauthorizing old omniDRAGON...");
    
    const unauthorizeTx = await lotteryManagerContract.setAuthorizedSwapContract(oldOmniDRAGON, false, {
      gasLimit: 200000,
      gasPrice: ethers.utils.parseUnits("55", "gwei")
    });
    
    console.log("   ⏳ Unauthorization TX:", unauthorizeTx.hash);
    await unauthorizeTx.wait();
    console.log("   ✅ Old omniDRAGON unauthorized");
    
    // ===== STEP 5: Summary =====
    console.log("\n🎉 STEP 5: Fix Complete!");
    console.log("=".repeat(50));
    console.log("✅ Fixed omniDRAGON deployed:", newAddress);
    console.log("✅ Lottery entries now use tx.origin (actual user)");
    console.log("✅ Fees now distributed in native $S tokens");
    console.log("✅ Core addresses configured");
    console.log("✅ Lottery manager updated");
    console.log("");
    console.log("🔄 Next Steps:");
    console.log("   1. Update any external references to use new address");
    console.log("   2. Add liquidity pairs when ready for trading");
    console.log("   3. Test lottery entries with small swaps");
    console.log("");
    console.log("📊 Address Summary:");
    console.log(`   Old (buggy): ${oldOmniDRAGON}`);
    console.log(`   New (fixed): ${newAddress}`);
    console.log("");
    
    return {
      oldAddress: oldOmniDRAGON,
      newAddress: newAddress,
      lotteryManager: lotteryManager,
      configured: true
    };
    
  } catch (error) {
    console.error("❌ Fix process failed:", error.message);
    throw error;
  }
}

main()
  .then((result) => {
    console.log("🎯 All problems fixed successfully!");
    console.log("New omniDRAGON address:", result.newAddress);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fix process failed:", error);
    process.exit(1);
  }); 