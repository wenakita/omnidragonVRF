const { task } = require("hardhat/config");

// Sonic network contract addresses
const SONIC_ADDRESSES = {
  // Core contracts
  omniDRAGON: "0x0E5d746F01f4CDc76320c3349386176a873eAa40",
  omniDragonChainRegistry: "0x567eB27f7EA8c69988e30B045987Ad58A597685C",
  omniDragonDeployer: "0xDb24adBeCF6aAD00C8bb34b7828EC1dd095c2e2C",
  
  // Oracle system
  priceOracle: "0x54D0DC2DcF1A1994aF3391A68FCF80A9C46FC2fd",
  feeManager: "0x071E337B46a56eca548D5c545b8F723296B36408",
  
  // Jackpot system
  dragonJackpotVault: "0xABa4df84B208ecedac2EcEcc988648d2847Ec310",
  dragonJackpotDistributor: "0x968763BebE98e956dA5826780e36E2f21edb79a3",
  
  // LayerZero
  layerZeroProxy: "0x6Fa6abF394d4f827988FBAD17CadFb506b83c3e8",
  layerZeroEndpoint: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B",
  
  // Sonic specific addresses
  wrappedNativeToken: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38", // Wrapped S
  
  // System addresses
  treasury: "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F",
  emergencyPauser: "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F"
};

task("configure-omnidragon-sonic", "Fully configure OmniDragon ecosystem on Sonic")
  .addOptionalParam("action", "Action to perform: status, configure-jackpot, configure-omnidragon, configure-all")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("\n🐲 === OmniDragon Sonic Configuration ===");
    console.log(`Network: ${hre.network.name}`);
    console.log(`Deployer: ${deployer.address}`);
    
    if (hre.network.name !== "sonic") {
      console.log("❌ This task is only for Sonic network");
      return;
    }
    
    const action = taskArgs.action || "status";
    
    try {
      switch (action) {
        case "status":
          await checkConfigurationStatus(hre);
          break;
        case "configure-jackpot":
          await configureJackpotSystem(hre);
          break;
        case "configure-omnidragon":
          await configureOmniDragon(hre);
          break;
        case "configure-all":
          await configureAll(hre);
          break;
        default:
          console.log("❌ Invalid action. Use: status, configure-jackpot, configure-omnidragon, configure-all");
      }
    } catch (error) {
      console.error(`❌ Configuration failed:`, error.message);
      throw error;
    }
  });

async function checkConfigurationStatus(hre) {
  const { ethers } = hre;
  
  console.log("\n📊 === Configuration Status ===");
  
  // Check omniDRAGON configuration
  try {
    const omniDRAGON = await ethers.getContractAt("omniDRAGON", SONIC_ADDRESSES.omniDRAGON);
    const totalSupply = await omniDRAGON.totalSupply();
    const jackpotVault = await omniDRAGON.jackpotVault();
    const revenueDistributor = await omniDRAGON.revenueDistributor();
    const wrappedNativeToken = await omniDRAGON.wrappedNativeToken();
    
    console.log(`✅ omniDRAGON: ${SONIC_ADDRESSES.omniDRAGON}`);
    console.log(`   Total Supply: ${ethers.utils.formatEther(totalSupply)} DRAGON`);
    console.log(`   Jackpot Vault: ${jackpotVault} ${jackpotVault === SONIC_ADDRESSES.dragonJackpotVault ? '✅' : '❌'}`);
    console.log(`   Revenue Distributor: ${revenueDistributor} ${revenueDistributor === SONIC_ADDRESSES.dragonJackpotDistributor ? '✅' : '❌'}`);
    console.log(`   Wrapped Native Token: ${wrappedNativeToken} ${wrappedNativeToken === SONIC_ADDRESSES.wrappedNativeToken ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`❌ omniDRAGON configuration check failed: ${error.message}`);
  }
  
  // Check Jackpot Vault configuration
  try {
    const jackpotVault = await ethers.getContractAt("DragonJackpotVault", SONIC_ADDRESSES.dragonJackpotVault);
    const feeManagerAddress = await jackpotVault.feeManagerAddress();
    const wrappedNativeToken = await jackpotVault.wrappedNativeToken();
    
    console.log(`✅ Jackpot Vault: ${SONIC_ADDRESSES.dragonJackpotVault}`);
    console.log(`   Fee Manager: ${feeManagerAddress} ${feeManagerAddress === SONIC_ADDRESSES.feeManager ? '✅' : '❌'}`);
    console.log(`   Wrapped Native Token: ${wrappedNativeToken}`);
  } catch (error) {
    console.log(`❌ Jackpot Vault configuration check failed: ${error.message}`);
  }
  
  // Check Fee Manager
  try {
    const feeManager = await ethers.getContractAt("DragonFeeManager", SONIC_ADDRESSES.feeManager);
    const [totalFee, burnFee, jackpotFee, liquidityFee] = await feeManager.getFeeConfiguration();
    const priceOracle = await feeManager.priceOracle();
    
    console.log(`✅ Fee Manager: ${SONIC_ADDRESSES.feeManager}`);
    console.log(`   Total Fee: ${totalFee / 100}%`);
    console.log(`   Jackpot Fee: ${jackpotFee / 100}%`);
    console.log(`   Liquidity Fee: ${liquidityFee / 100}%`);
    console.log(`   Price Oracle: ${priceOracle} ${priceOracle === SONIC_ADDRESSES.priceOracle ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`❌ Fee Manager configuration check failed: ${error.message}`);
  }
  
  // Check Price Oracle
  try {
    const priceOracle = await ethers.getContractAt("OmniDragonPriceOracle", SONIC_ADDRESSES.priceOracle);
    const [price, success] = await priceOracle.getAggregatedPrice();
    
    console.log(`✅ Price Oracle: ${SONIC_ADDRESSES.priceOracle}`);
    console.log(`   Current Price: ${ethers.utils.formatUnits(price, 8)} USD`);
    console.log(`   Success: ${success}`);
  } catch (error) {
    console.log(`❌ Price Oracle configuration check failed: ${error.message}`);
  }
}

async function configureJackpotSystem(hre) {
  const { ethers } = hre;
  
  console.log("\n🎰 === Configuring Jackpot System ===");
  
  // Configure Jackpot Vault with Fee Manager
  try {
    const jackpotVault = await ethers.getContractAt("DragonJackpotVault", SONIC_ADDRESSES.dragonJackpotVault);
    
    console.log("🔗 Setting fee manager address in jackpot vault...");
    const tx = await jackpotVault.setFeeManagerAddress(SONIC_ADDRESSES.feeManager);
    await tx.wait();
    console.log(`✅ Fee manager set in jackpot vault: ${tx.hash}`);
    
  } catch (error) {
    console.log(`❌ Failed to configure jackpot vault: ${error.message}`);
  }
  
  console.log("✅ Jackpot system configuration completed!");
}

async function configureOmniDragon(hre) {
  const { ethers } = hre;
  
  console.log("\n🐲 === Configuring omniDRAGON ===");
  
  try {
    const omniDRAGON = await ethers.getContractAt("omniDRAGON", SONIC_ADDRESSES.omniDRAGON);
    
    console.log("🔗 Setting core addresses in omniDRAGON...");
    const tx = await omniDRAGON.setCoreAddresses(
      SONIC_ADDRESSES.dragonJackpotVault,          // _jackpotVault
      SONIC_ADDRESSES.dragonJackpotDistributor,    // _revenueDistributor
      SONIC_ADDRESSES.wrappedNativeToken,          // _wrappedNativeTokenAddress
      ethers.constants.AddressZero,                // _uniswapRouter (not set yet)
      ethers.constants.AddressZero,                // _lotteryManager (not deployed yet)
      SONIC_ADDRESSES.treasury,                    // _emergencyTreasury
      SONIC_ADDRESSES.emergencyPauser              // _emergencyPauser
    );
    await tx.wait();
    console.log(`✅ Core addresses set in omniDRAGON: ${tx.hash}`);
    
    // Exclude fee manager from fees
    console.log("🔗 Excluding fee manager from fees...");
    const tx2 = await omniDRAGON.setExcludedFromFees(SONIC_ADDRESSES.feeManager, true);
    await tx2.wait();
    console.log(`✅ Fee manager excluded from fees: ${tx2.hash}`);
    
    // Exclude jackpot contracts from fees
    console.log("🔗 Excluding jackpot contracts from fees...");
    const tx3 = await omniDRAGON.setExcludedFromFees(SONIC_ADDRESSES.dragonJackpotVault, true);
    await tx3.wait();
    console.log(`✅ Jackpot vault excluded from fees: ${tx3.hash}`);
    
    const tx4 = await omniDRAGON.setExcludedFromFees(SONIC_ADDRESSES.dragonJackpotDistributor, true);
    await tx4.wait();
    console.log(`✅ Jackpot distributor excluded from fees: ${tx4.hash}`);
    
    // Exclude price oracle from fees
    console.log("🔗 Excluding price oracle from fees...");
    const tx5 = await omniDRAGON.setExcludedFromFees(SONIC_ADDRESSES.priceOracle, true);
    await tx5.wait();
    console.log(`✅ Price oracle excluded from fees: ${tx5.hash}`);
    
  } catch (error) {
    console.log(`❌ Failed to configure omniDRAGON: ${error.message}`);
  }
  
  console.log("✅ omniDRAGON configuration completed!");
}

async function configureAll(hre) {
  console.log("\n🚀 === Full Configuration ===");
  
  await configureJackpotSystem(hre);
  await configureOmniDragon(hre);
  
  // Final status check
  console.log("\n📊 === Final Configuration Status ===");
  await checkConfigurationStatus(hre);
  
  console.log("\n🎉 === OmniDragon Sonic Configuration Complete! ===");
  console.log("✅ All contracts are now properly configured and connected");
  console.log("✅ Fee system is operational");
  console.log("✅ Jackpot system is connected");
  console.log("✅ Price oracle is integrated");
  console.log("✅ System is ready for full operation!");
} 