const { task, types } = require("hardhat/config");
const fs = require('fs');
const path = require('path');

task("deploy-jackpot-vault", "Deploy DragonJackpotVault contract")
  .addOptionalParam("verify", "Verify contract on block explorer", true, types.boolean)
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("🚀 Deploying DragonJackpotVault...");
    console.log("Network:", hre.network.name);
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.utils.formatEther(await ethers.provider.getBalance(deployer.address)));

    // Network-specific configuration
    const networkConfig = {
      sonic: {
        chainId: 146,
        wrappedNativeToken: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38", // Wrapped S
        feeManager: "0xb5F29296a670F09C5380abf0840920CEE65AeDA0",
        explorerUrl: "https://sonicscan.org"
      },
      arbitrum: {
        chainId: 42161,
        wrappedNativeToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
        feeManager: "0xb5F29296a670F09C5380abf0840920CEE65AeDA0", // Assuming same address
        explorerUrl: "https://arbiscan.io"
      },
      avalanche: {
        chainId: 43114,
        wrappedNativeToken: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
        feeManager: "0xb5F29296a670F09C5380abf0840920CEE65AeDA0", // Assuming same address
        explorerUrl: "https://snowtrace.io"
      }
    };

    const config = networkConfig[hre.network.name];
    if (!config) {
      throw new Error(`Network ${hre.network.name} not supported`);
    }

    console.log("📋 Configuration:");
    console.log("- Wrapped Native Token:", config.wrappedNativeToken);
    console.log("- Fee Manager:", config.feeManager);

    // Deploy using CREATE2 for deterministic addresses
    const DragonJackpotVault = await ethers.getContractFactory("DragonJackpotVault");
    
    // Use a consistent salt for same address across networks
    const salt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DragonJackpotVault_v1"));
    
    // Calculate deterministic address
    const bytecode = DragonJackpotVault.bytecode;
    const constructorArgs = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [config.wrappedNativeToken, config.feeManager]
    );
    const initCodeHash = ethers.utils.keccak256(bytecode + constructorArgs.slice(2));
    
    // Try to get CREATE2 factory address
    const create2Factory = "0xAA28020DDA6b954D16208eccF873D79AC6533833";
    
    console.log("🔧 Deploying with CREATE2...");
    console.log("- Salt:", salt);
    console.log("- Factory:", create2Factory);

    let jackpotVault;
    let deploymentMethod = "regular";
    
    try {
      // Try CREATE2 deployment first
      const factory = await ethers.getContractAt("ICREATE2Factory", create2Factory);
      
      const predictedAddress = await factory.computeAddress(salt, initCodeHash);
      console.log("- Predicted Address:", predictedAddress);
      
      // Check if already deployed
      const code = await ethers.provider.getCode(predictedAddress);
      if (code !== "0x") {
        console.log("✅ Contract already deployed at predicted address!");
        jackpotVault = await ethers.getContractAt("DragonJackpotVault", predictedAddress);
      } else {
        const deployData = bytecode + constructorArgs.slice(2);
        const tx = await factory.deploy(salt, deployData);
        await tx.wait();
        
        jackpotVault = await ethers.getContractAt("DragonJackpotVault", predictedAddress);
        deploymentMethod = "CREATE2";
        console.log("✅ Deployed via CREATE2!");
      }
    } catch (error) {
      console.log("⚠️ CREATE2 deployment failed, using regular deployment:", error.message);
      
      // Fallback to regular deployment
      jackpotVault = await DragonJackpotVault.deploy(
        config.wrappedNativeToken,
        config.feeManager
      );
      await jackpotVault.deployed();
      deploymentMethod = "regular";
    }

    const address = jackpotVault.address;
    console.log("🎯 DragonJackpotVault deployed to:", address);
    console.log("📊 Deployment method:", deploymentMethod);

    // Verify contract
    if (taskArgs.verify && hre.network.name !== "hardhat") {
      console.log("🔍 Verifying contract...");
      try {
        await hre.run("verify:verify", {
          address: address,
          constructorArguments: [config.wrappedNativeToken, config.feeManager],
        });
        console.log("✅ Contract verified!");
      } catch (error) {
        console.log("❌ Verification failed:", error.message);
      }
    }

    // Save deployment info
    const deploymentInfo = {
      address: address,
      args: [config.wrappedNativeToken, config.feeManager],
      numDeployments: 1,
      deploymentInfo: {
        network: hre.network.name,
        chainId: config.chainId,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        gasPrice: "auto",
        gasLimit: "auto",
        verified: taskArgs.verify,
        verificationUrl: `${config.explorerUrl}/address/${address}#code`,
        wrappedNativeToken: config.wrappedNativeToken,
        feeManager: config.feeManager,
        deploymentMethod: deploymentMethod
      }
    };

    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, '..', 'deployments', hre.network.name);
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save deployment file
    const deploymentFile = path.join(deploymentsDir, 'DragonJackpotVault.json');
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("💾 Deployment info saved to:", deploymentFile);
    console.log("🌐 View on explorer:", `${config.explorerUrl}/address/${address}`);

    return {
      address: address,
      contract: jackpotVault,
      deploymentMethod: deploymentMethod
    };
  }); 