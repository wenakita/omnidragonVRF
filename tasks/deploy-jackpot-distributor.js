const { task, types } = require("hardhat/config");
const fs = require('fs');
const path = require('path');

task("deploy-jackpot-distributor", "Deploy DragonJackpotDistributor contract")
  .addOptionalParam("verify", "Verify contract on block explorer", true, types.boolean)
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("🚀 Deploying DragonJackpotDistributor...");
    console.log("Network:", hre.network.name);
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.utils.formatEther(await ethers.provider.getBalance(deployer.address)));

    // Network-specific configuration
    const networkConfig = {
      sonic: {
        chainId: 146,
        omniDRAGON: "0x0E5d746F01f4CDc76320c3349386176a873eAa40",
        swapTrigger: "0xb5F29296a670F09C5380abf0840920CEE65AeDA0", // Fee Manager
        treasury: "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F",
        explorerUrl: "https://sonicscan.org"
      },
      arbitrum: {
        chainId: 42161,
        omniDRAGON: "0x0E5d746F01f4CDc76320c3349386176a873eAa40", // Universal address
        swapTrigger: "0xb5F29296a670F09C5380abf0840920CEE65AeDA0", // Assuming same address
        treasury: "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F",
        explorerUrl: "https://arbiscan.io"
      },
      avalanche: {
        chainId: 43114,
        omniDRAGON: "0x0E5d746F01f4CDc76320c3349386176a873eAa40", // Universal address
        swapTrigger: "0xb5F29296a670F09C5380abf0840920CEE65AeDA0", // Assuming same address
        treasury: "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F",
        explorerUrl: "https://snowtrace.io"
      }
    };

    const config = networkConfig[hre.network.name];
    if (!config) {
      throw new Error(`Network ${hre.network.name} not supported`);
    }

    console.log("📋 Configuration:");
    console.log("- omniDRAGON Token:", config.omniDRAGON);
    console.log("- Swap Trigger:", config.swapTrigger);
    console.log("- Treasury:", config.treasury);

    // Deploy using CREATE2 for deterministic addresses
    const DragonJackpotDistributor = await ethers.getContractFactory("DragonJackpotDistributor");
    
    // Use a consistent salt for same address across networks
    const salt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DragonJackpotDistributor_v1"));
    
    // Calculate deterministic address
    const bytecode = DragonJackpotDistributor.bytecode;
    const constructorArgs = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "address"],
      [config.omniDRAGON, config.swapTrigger, config.treasury]
    );
    const initCodeHash = ethers.utils.keccak256(bytecode + constructorArgs.slice(2));
    
    // Try to get CREATE2 factory address
    const create2Factory = "0xAA28020DDA6b954D16208eccF873D79AC6533833";
    
    console.log("🔧 Deploying with CREATE2...");
    console.log("- Salt:", salt);
    console.log("- Factory:", create2Factory);

    let jackpotDistributor;
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
        jackpotDistributor = await ethers.getContractAt("DragonJackpotDistributor", predictedAddress);
      } else {
        const deployData = bytecode + constructorArgs.slice(2);
        const tx = await factory.deploy(salt, deployData);
        await tx.wait();
        
        jackpotDistributor = await ethers.getContractAt("DragonJackpotDistributor", predictedAddress);
        deploymentMethod = "CREATE2";
        console.log("✅ Deployed via CREATE2!");
      }
    } catch (error) {
      console.log("⚠️ CREATE2 deployment failed, using regular deployment:", error.message);
      
      // Fallback to regular deployment
      jackpotDistributor = await DragonJackpotDistributor.deploy(
        config.omniDRAGON,
        config.swapTrigger,
        config.treasury
      );
      await jackpotDistributor.deployed();
      deploymentMethod = "regular";
    }

    const address = jackpotDistributor.address;
    console.log("🎯 DragonJackpotDistributor deployed to:", address);
    console.log("📊 Deployment method:", deploymentMethod);

    // Verify contract
    if (taskArgs.verify && hre.network.name !== "hardhat") {
      console.log("🔍 Verifying contract...");
      try {
        await hre.run("verify:verify", {
          address: address,
          constructorArguments: [config.omniDRAGON, config.swapTrigger, config.treasury],
        });
        console.log("✅ Contract verified!");
      } catch (error) {
        console.log("❌ Verification failed:", error.message);
      }
    }

    // Save deployment info
    const deploymentInfo = {
      address: address,
      args: [config.omniDRAGON, config.swapTrigger, config.treasury],
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
        token: config.omniDRAGON,
        swapTrigger: config.swapTrigger,
        treasury: config.treasury,
        deploymentMethod: deploymentMethod
      }
    };

    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, '..', 'deployments', hre.network.name);
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save deployment file
    const deploymentFile = path.join(deploymentsDir, 'DragonJackpotDistributor.json');
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("💾 Deployment info saved to:", deploymentFile);
    console.log("🌐 View on explorer:", `${config.explorerUrl}/address/${address}`);

    return {
      address: address,
      contract: jackpotDistributor,
      deploymentMethod: deploymentMethod
    };
  }); 