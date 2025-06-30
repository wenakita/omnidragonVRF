const { task, types } = require("hardhat/config");
const fs = require('fs');
const path = require('path');

task("deploy-jackpot-simple", "Deploy jackpot contracts simply")
  .addOptionalParam("verify", "Verify contracts", false, types.boolean)
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("🚀 Simple Jackpot Deployment");
    console.log("Network:", hre.network.name);
    console.log("Deployer:", deployer.address);

    // Network configurations
    const configs = {
      arbitrum: {
        wrappedNativeToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
        omniDRAGON: "0x0E5d746F01f4CDc76320c3349386176a873eAa40",
        feeManager: "0xb5F29296a670F09C5380abf0840920CEE65AeDA0",
        treasury: "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F",
        explorerUrl: "https://arbiscan.io",
        chainId: 42161
      },
      avalanche: {
        wrappedNativeToken: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
        omniDRAGON: "0x0E5d746F01f4CDc76320c3349386176a873eAa40",
        feeManager: "0xb5F29296a670F09C5380abf0840920CEE65AeDA0",
        treasury: "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F",
        explorerUrl: "https://snowtrace.io",
        chainId: 43114
      }
    };

    const config = configs[hre.network.name];
    if (!config) {
      throw new Error(`Network ${hre.network.name} not supported`);
    }

    console.log("📋 Configuration:");
    console.log("- Wrapped Native Token:", config.wrappedNativeToken);
    console.log("- omniDRAGON:", config.omniDRAGON);
    console.log("- Fee Manager:", config.feeManager);
    console.log("- Treasury:", config.treasury);

    // Deploy DragonJackpotVault
    console.log("\n1️⃣ Deploying DragonJackpotVault...");
    const DragonJackpotVault = await ethers.getContractFactory("DragonJackpotVault");
    const vault = await DragonJackpotVault.deploy(
      config.wrappedNativeToken,
      config.feeManager
    );
    await vault.deployed();
    console.log("✅ DragonJackpotVault deployed to:", vault.address);

    // Deploy DragonJackpotDistributor
    console.log("\n2️⃣ Deploying DragonJackpotDistributor...");
    const DragonJackpotDistributor = await ethers.getContractFactory("DragonJackpotDistributor");
    const distributor = await DragonJackpotDistributor.deploy(
      config.omniDRAGON,
      config.feeManager,
      config.treasury
    );
    await distributor.deployed();
    console.log("✅ DragonJackpotDistributor deployed to:", distributor.address);

    // Save deployment files
    const deploymentsDir = path.join(__dirname, '..', 'deployments', hre.network.name);
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save DragonJackpotVault
    const vaultDeployment = {
      address: vault.address,
      args: [config.wrappedNativeToken, config.feeManager],
      numDeployments: 1,
      deploymentInfo: {
        network: hre.network.name,
        chainId: config.chainId,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        verified: taskArgs.verify,
        verificationUrl: `${config.explorerUrl}/address/${vault.address}#code`,
        wrappedNativeToken: config.wrappedNativeToken,
        feeManager: config.feeManager,
        deploymentMethod: "regular"
      }
    };

    // Save DragonJackpotDistributor
    const distributorDeployment = {
      address: distributor.address,
      args: [config.omniDRAGON, config.feeManager, config.treasury],
      numDeployments: 1,
      deploymentInfo: {
        network: hre.network.name,
        chainId: config.chainId,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        verified: taskArgs.verify,
        verificationUrl: `${config.explorerUrl}/address/${distributor.address}#code`,
        token: config.omniDRAGON,
        swapTrigger: config.feeManager,
        treasury: config.treasury,
        deploymentMethod: "regular"
      }
    };

    // Write files
    fs.writeFileSync(
      path.join(deploymentsDir, 'DragonJackpotVault.json'),
      JSON.stringify(vaultDeployment, null, 2)
    );
    
    fs.writeFileSync(
      path.join(deploymentsDir, 'DragonJackpotDistributor.json'),
      JSON.stringify(distributorDeployment, null, 2)
    );

    console.log("\n💾 Deployment files saved!");
    console.log("🌐 Explorer URLs:");
    console.log(`   Vault: ${config.explorerUrl}/address/${vault.address}`);
    console.log(`   Distributor: ${config.explorerUrl}/address/${distributor.address}`);

    // Verify if requested
    if (taskArgs.verify) {
      console.log("\n🔍 Verifying contracts...");
      
      try {
        await hre.run("verify:verify", {
          address: vault.address,
          constructorArguments: [config.wrappedNativeToken, config.feeManager],
        });
        console.log("✅ DragonJackpotVault verified!");
      } catch (error) {
        console.log("❌ Vault verification failed:", error.message);
      }

      try {
        await hre.run("verify:verify", {
          address: distributor.address,
          constructorArguments: [config.omniDRAGON, config.feeManager, config.treasury],
        });
        console.log("✅ DragonJackpotDistributor verified!");
      } catch (error) {
        console.log("❌ Distributor verification failed:", error.message);
      }
    }

    return {
      vault: { address: vault.address, contract: vault },
      distributor: { address: distributor.address, contract: distributor }
    };
  }); 