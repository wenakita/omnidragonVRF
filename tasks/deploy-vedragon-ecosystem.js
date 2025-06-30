const { task } = require("hardhat/config");

/**
 * Deploy veDRAGON Ecosystem Components
 * 
 * This task deploys the complete veDRAGON ecosystem including:
 * 1. veDRAGON Token (vote-escrowed DRAGON)
 * 2. veDRAGONRevenueDistributor (fee distribution to veDRAGON holders)
 * 3. DragonPartnerRegistry (partner management)
 * 4. veDRAGONBoostManager (boost calculations and partner voting)
 */
task("deploy-vedragon-ecosystem", "Deploy the complete veDRAGON ecosystem")
  .addFlag("verify", "Verify contracts on Etherscan")
  .addFlag("save", "Save deployment addresses to file")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("\n🐲 Deploying veDRAGON Ecosystem Components...");
    console.log("==========================================");
    console.log(`Network: ${network.name}`);
    console.log(`Deployer: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH\n`);

    // Known addresses from the ecosystem
    const addresses = {
      omniDRAGON: "0x0E5d746F01f4CDc76320c3349386176a873eAa40",
      jackpotVault: "0xABa4df84B208ecedac2EcEcc988648d2847Ec310",
      revenueDistributor: "0x968763BebE98e956dA5826780e36E2f21edb79a3", // This is the old one, we'll deploy new veDRAGON specific one
      wrappedNativeToken: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38", // Wrapped S
      treasury: deployer.address
    };

    const deployedContracts = {};
    const deploymentResults = [];

    try {
      // ===========================================
      // 1. Deploy veDRAGON Token
      // ===========================================
      console.log("📋 Step 1: Deploying veDRAGON Token...");
      
      const veDRAGONFactory = await ethers.getContractFactory("veDRAGON");
      const veDRAGON = await veDRAGONFactory.deploy(
        addresses.omniDRAGON,           // _token: DRAGON token to lock
        0,                              // _tokenType: DRAGON (0)
        "Vote-Escrowed DRAGON",         // _name
        "veDRAGON"                      // _symbol
      );
      
      await veDRAGON.waitForDeployment();
      const veDRAGONAddress = await veDRAGON.getAddress();
      deployedContracts.veDRAGON = veDRAGONAddress;
      
      console.log(`✅ veDRAGON deployed at: ${veDRAGONAddress}`);
      
      deploymentResults.push({
        name: "veDRAGON",
        address: veDRAGONAddress,
        constructorArgs: [addresses.omniDRAGON, 0, "Vote-Escrowed DRAGON", "veDRAGON"]
      });

      // ===========================================
      // 2. Deploy veDRAGONRevenueDistributor
      // ===========================================
      console.log("\n📋 Step 2: Deploying veDRAGONRevenueDistributor...");
      
      const revenueDistributorFactory = await ethers.getContractFactory("veDRAGONRevenueDistributor");
      const veDRAGONRevenueDistributor = await revenueDistributorFactory.deploy(
        veDRAGONAddress              // _veDRAGON: veDRAGON token address
      );
      
      await veDRAGONRevenueDistributor.waitForDeployment();
      const revenueDistributorAddress = await veDRAGONRevenueDistributor.getAddress();
      deployedContracts.veDRAGONRevenueDistributor = revenueDistributorAddress;
      
      console.log(`✅ veDRAGONRevenueDistributor deployed at: ${revenueDistributorAddress}`);
      
      deploymentResults.push({
        name: "veDRAGONRevenueDistributor",
        address: revenueDistributorAddress,
        constructorArgs: [veDRAGONAddress]
      });

      // ===========================================
      // 3. Deploy DragonPartnerRegistry
      // ===========================================
      console.log("\n📋 Step 3: Deploying DragonPartnerRegistry...");
      
      const partnerRegistryFactory = await ethers.getContractFactory("DragonPartnerRegistry");
      const partnerRegistry = await partnerRegistryFactory.deploy();
      
      await partnerRegistry.waitForDeployment();
      const partnerRegistryAddress = await partnerRegistry.getAddress();
      deployedContracts.dragonPartnerRegistry = partnerRegistryAddress;
      
      console.log(`✅ DragonPartnerRegistry deployed at: ${partnerRegistryAddress}`);
      
      deploymentResults.push({
        name: "DragonPartnerRegistry",
        address: partnerRegistryAddress,
        constructorArgs: []
      });

      // ===========================================
      // 4. Deploy veDRAGONBoostManager
      // ===========================================
      console.log("\n📋 Step 4: Deploying veDRAGONBoostManager...");
      
      const boostManagerFactory = await ethers.getContractFactory("veDRAGONBoostManager");
      const veDRAGONBoostManager = await boostManagerFactory.deploy(
        veDRAGONAddress,              // _veDRAGON: veDRAGON token address
        addresses.jackpotVault,       // _jackpot: jackpot vault address
        partnerRegistryAddress        // _partnerRegistry: partner registry address
      );
      
      await veDRAGONBoostManager.waitForDeployment();
      const boostManagerAddress = await veDRAGONBoostManager.getAddress();
      deployedContracts.veDRAGONBoostManager = boostManagerAddress;
      
      console.log(`✅ veDRAGONBoostManager deployed at: ${boostManagerAddress}`);
      
      deploymentResults.push({
        name: "veDRAGONBoostManager",
        address: boostManagerAddress,
        constructorArgs: [veDRAGONAddress, addresses.jackpotVault, partnerRegistryAddress]
      });

      // ===========================================
      // 5. Initial Configuration
      // ===========================================
      console.log("\n📋 Step 5: Initial Configuration...");
      
      // Configure veDRAGONRevenueDistributor
      console.log("Setting wrapped native token in revenue distributor...");
      const setWrappedTokenTx = await veDRAGONRevenueDistributor.setWrappedToken(addresses.wrappedNativeToken);
      await setWrappedTokenTx.wait();
      console.log("✅ Wrapped native token configured");

      // ===========================================
      // 6. Verification
      // ===========================================
      if (taskArgs.verify && hre.network.name !== "hardhat") {
        console.log("\n📋 Step 6: Verifying contracts...");
        
        for (const contract of deploymentResults) {
          try {
            console.log(`Verifying ${contract.name}...`);
            await hre.run("verify:verify", {
              address: contract.address,
              constructorArguments: contract.constructorArgs,
            });
            console.log(`✅ ${contract.name} verified`);
          } catch (error) {
            console.log(`❌ ${contract.name} verification failed:`, error.message);
          }
        }
      }

      // ===========================================
      // 7. Save Deployment Data
      // ===========================================
      if (taskArgs.save) {
        console.log("\n📋 Step 7: Saving deployment data...");
        
        const fs = require('fs');
        const deploymentData = {
          network: network.name,
          chainId: network.config.chainId,
          deployer: deployer.address,
          timestamp: new Date().toISOString(),
          contracts: deployedContracts,
          addresses: {
            ...addresses,
            ...deployedContracts
          }
        };
        
        const filename = `vedragon-ecosystem-${network.name}.json`;
        fs.writeFileSync(filename, JSON.stringify(deploymentData, null, 2));
        console.log(`✅ Deployment data saved to ${filename}`);
      }

      // ===========================================
      // 8. Summary
      // ===========================================
      console.log("\n🎉 veDRAGON Ecosystem Deployment Complete!");
      console.log("===========================================");
      console.log(`Network: ${network.name}`);
      console.log(`Deployer: ${deployer.address}\n`);
      
      console.log("📋 Deployed Contracts:");
      console.log(`├── veDRAGON: ${deployedContracts.veDRAGON}`);
      console.log(`├── veDRAGONRevenueDistributor: ${deployedContracts.veDRAGONRevenueDistributor}`);
      console.log(`├── DragonPartnerRegistry: ${deployedContracts.dragonPartnerRegistry}`);
      console.log(`└── veDRAGONBoostManager: ${deployedContracts.veDRAGONBoostManager}`);
      
      console.log("\n🔧 Configuration Status:");
      console.log("├── ✅ veDRAGON token initialized for DRAGON");
      console.log("├── ✅ Revenue distributor configured with veDRAGON");
      console.log("├── ✅ Partner registry deployed and ready");
      console.log("├── ✅ Boost manager connected to all components");
      console.log("└── ✅ Wrapped native token configured");
      
      console.log("\n🚀 Next Steps:");
      console.log("1. Configure omniDRAGON to use new veDRAGONRevenueDistributor");
      console.log("2. Add partners to DragonPartnerRegistry");
      console.log("3. Set up boost parameters in veDRAGONBoostManager");
      console.log("4. Test veDRAGON locking and voting functionality");
      console.log("5. Configure fee distribution to veDRAGON holders");
      
      return deployedContracts;

    } catch (error) {
      console.error("\n❌ Deployment failed:", error);
      throw error;
    }
  });

module.exports = {}; 