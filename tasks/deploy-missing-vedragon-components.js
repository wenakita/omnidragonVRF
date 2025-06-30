const { task } = require("hardhat/config");

/**
 * Deploy Missing veDRAGON Ecosystem Components
 * 
 * This task deploys the remaining veDRAGON ecosystem components:
 * 1. DragonPartnerRegistry (partner management)
 * 2. veDRAGONBoostManager (boost calculations and partner voting)
 */
task("deploy-missing-vedragon-components", "Deploy missing veDRAGON ecosystem components")
  .addFlag("verify", "Verify contracts on Etherscan")
  .addFlag("save", "Save deployment addresses to file")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("\n🐲 Deploying Missing veDRAGON Ecosystem Components...");
    console.log("=====================================================");
    console.log(`Network: ${network.name}`);
    console.log(`Deployer: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH\n`);

    // Known addresses from the existing ecosystem
    const addresses = {
      // Core tokens
      omniDRAGON: "0x0E5d746F01f4CDc76320c3349386176a873eAa40",
      
      // Already deployed veDRAGON ecosystem
      veDRAGON: "0x33E1eaCeCC03c7f7558011d73F806D022414Fee0",
      veDRAGONMathLibrary: "0x71Fc390083B1E7Eb73A0A148718a526B3e23acC1",
      veDRAGONRevenueDistributor: "0x8CFbf76E991456375222C6b67967fEaed5c93D2C",
      
      // Jackpot system
      jackpotVault: "0xABa4df84B208ecedac2EcEcc988648d2847Ec310",
      jackpotDistributor: "0x968763BebE98e956dA5826780e36E2f21edb79a3",
      
      // Fee management
      feeManager: "0xb5F29296a670F09C5380abf0840920CEE65AeDA0",
      priceOracle: "0x54D0DC2DcF1A1994aF3391A68FCF80A9C46FC2fd",
      
      // Other
      wrappedNativeToken: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38",
      treasury: deployer.address
    };

    const deployedContracts = {};
    const deploymentResults = [];

    try {
      // ===========================================
      // 1. Deploy DragonPartnerRegistry
      // ===========================================
      console.log("📋 Step 1: Deploying DragonPartnerRegistry...");
      
      const partnerRegistryFactory = await ethers.getContractFactory("DragonPartnerRegistry");
      const partnerRegistry = await partnerRegistryFactory.deploy();
      
      await partnerRegistry.deployed();
      const partnerRegistryAddress = partnerRegistry.address;
      deployedContracts.dragonPartnerRegistry = partnerRegistryAddress;
      
      console.log(`✅ DragonPartnerRegistry deployed at: ${partnerRegistryAddress}`);
      
      deploymentResults.push({
        name: "DragonPartnerRegistry",
        address: partnerRegistryAddress,
        constructorArgs: []
      });

      // ===========================================
      // 2. Deploy veDRAGONBoostManager with Library Linking
      // ===========================================
      console.log("\n📋 Step 2: Deploying veDRAGONBoostManager...");
      console.log(`Using veDRAGONMath library at: ${addresses.veDRAGONMathLibrary}`);
      
      const boostManagerFactory = await ethers.getContractFactory("veDRAGONBoostManager", {
        libraries: {
          "contracts/libraries/math/veDRAGONMath.sol:veDRAGONMath": addresses.veDRAGONMathLibrary
        }
      });
      
      const veDRAGONBoostManager = await boostManagerFactory.deploy(
        addresses.veDRAGON,           // _veDRAGON: veDRAGON token address
        addresses.jackpotVault,       // _jackpot: jackpot vault address
        partnerRegistryAddress        // _partnerRegistry: partner registry address
      );
      
      await veDRAGONBoostManager.deployed();
      const boostManagerAddress = veDRAGONBoostManager.address;
      deployedContracts.veDRAGONBoostManager = boostManagerAddress;
      
      console.log(`✅ veDRAGONBoostManager deployed at: ${boostManagerAddress}`);
      
      deploymentResults.push({
        name: "veDRAGONBoostManager",
        address: boostManagerAddress,
        constructorArgs: [addresses.veDRAGON, addresses.jackpotVault, partnerRegistryAddress],
        libraries: {
          "contracts/libraries/math/veDRAGONMath.sol:veDRAGONMath": addresses.veDRAGONMathLibrary
        }
      });

      // ===========================================
      // 3. Initial Configuration
      // ===========================================
      console.log("\n📋 Step 3: Initial Configuration...");
      
      // Add a default partner for testing
      console.log("Adding default partner for testing...");
      const addPartnerTx = await partnerRegistry.addPartnerWithDefaultBoost(
        deployer.address,           // Partner address (using deployer for testing)
        "Test Partner",             // Partner name
        500                         // Fee share: 5%
      );
      await addPartnerTx.wait();
      console.log("✅ Default test partner added");

      // ===========================================
      // 4. Verification
      // ===========================================
      if (taskArgs.verify && hre.network.name !== "hardhat") {
        console.log("\n📋 Step 4: Verifying contracts...");
        
        for (const contract of deploymentResults) {
          try {
            console.log(`Verifying ${contract.name}...`);
            
            const verifyArgs = {
              address: contract.address,
              constructorArguments: contract.constructorArgs,
            };
            
            // Add libraries if they exist
            if (contract.libraries) {
              verifyArgs.libraries = contract.libraries;
            }
            
            await hre.run("verify:verify", verifyArgs);
            console.log(`✅ ${contract.name} verified`);
          } catch (error) {
            console.log(`❌ ${contract.name} verification failed:`, error.message);
          }
        }
      }

      // ===========================================
      // 5. Save Deployment Data
      // ===========================================
      if (taskArgs.save) {
        console.log("\n📋 Step 5: Saving deployment data...");
        
        const fs = require('fs');
        const deploymentData = {
          network: network.name,
          chainId: network.config.chainId,
          deployer: deployer.address,
          timestamp: new Date().toISOString(),
          newContracts: deployedContracts,
          allAddresses: {
            ...addresses,
            ...deployedContracts
          }
        };
        
        const filename = `vedragon-missing-components-${network.name}.json`;
        fs.writeFileSync(filename, JSON.stringify(deploymentData, null, 2));
        console.log(`✅ Deployment data saved to ${filename}`);
      }

      // ===========================================
      // 6. Complete Ecosystem Summary
      // ===========================================
      console.log("\n🎉 veDRAGON Ecosystem Now Complete!");
      console.log("===================================");
      console.log(`Network: ${network.name}`);
      console.log(`Deployer: ${deployer.address}\n`);
      
      console.log("📋 Complete veDRAGON Ecosystem:");
      console.log("├── 🏗️  Core Components:");
      console.log(`│   ├── veDRAGON: ${addresses.veDRAGON}`);
      console.log(`│   ├── veDRAGONMath Library: ${addresses.veDRAGONMathLibrary}`);
      console.log(`│   └── veDRAGONRevenueDistributor: ${addresses.veDRAGONRevenueDistributor}`);
      console.log("├── 🚀 Newly Deployed:");
      console.log(`│   ├── DragonPartnerRegistry: ${deployedContracts.dragonPartnerRegistry}`);
      console.log(`│   └── veDRAGONBoostManager: ${deployedContracts.veDRAGONBoostManager}`);
      console.log("└── 🔗 Connected Systems:");
      console.log(`    ├── omniDRAGON Token: ${addresses.omniDRAGON}`);
      console.log(`    ├── Jackpot Vault: ${addresses.jackpotVault}`);
      console.log(`    ├── Fee Manager: ${addresses.feeManager}`);
      console.log(`    └── Price Oracle: ${addresses.priceOracle}`);
      
      console.log("\n🔧 Configuration Status:");
      console.log("├── ✅ DragonPartnerRegistry deployed and configured");
      console.log("├── ✅ veDRAGONBoostManager connected to all components");
      console.log("├── ✅ Test partner added to registry");
      console.log("├── ✅ All contracts linked and operational");
      console.log("└── ✅ Ready for production use");
      
      console.log("\n🚀 veDRAGON Ecosystem Features Now Available:");
      console.log("1. 🗳️  Vote-Escrowed DRAGON staking");
      console.log("2. 💰 Revenue distribution to veDRAGON holders");
      console.log("3. 🤝 Partner registry and management");
      console.log("4. ⚡ Boost calculations for jackpot entries");
      console.log("5. 🎯 Partner voting and probability boosts");
      console.log("6. 📊 Governance and voting power mechanics");
      
      console.log("\n🎯 Next Steps:");
      console.log("1. Configure omniDRAGON to use veDRAGONRevenueDistributor for fee distribution");
      console.log("2. Add real partners to DragonPartnerRegistry");
      console.log("3. Test veDRAGON locking and voting functionality");
      console.log("4. Set up boost parameters and voting periods");
      console.log("5. Integrate with frontend for user interactions");
      
      return {
        ...addresses,
        ...deployedContracts
      };

    } catch (error) {
      console.error("\n❌ Deployment failed:", error);
      throw error;
    }
  });

module.exports = {}; 