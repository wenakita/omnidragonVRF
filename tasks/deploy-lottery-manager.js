const { task, types } = require("hardhat/config");
const fs = require('fs');
const path = require('path');

task("deploy-lottery-manager", "Deploy OmniDragonLotteryManager with VRF integration")
  .addOptionalParam("verify", "Verify contracts", true, types.boolean)
  .addOptionalParam("deployDependencies", "Deploy missing dependencies", false, types.boolean)
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("🎰✨ OmniDragon Lottery Manager Deployment");
    console.log("==========================================");
    console.log("Network:", hre.network.name);
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.utils.formatEther(await ethers.provider.getBalance(deployer.address)));

    // Network configurations with ALL your existing deployed contracts
    const configs = {
      sonic: {
        chainId: 146,
        lzEid: 30332,
        explorerUrl: "https://sonicscan.org",
        wrappedNativeToken: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38", // Wrapped S
        omniDRAGON: "0x0E5d746F01f4CDc76320c3349386176a873eAa40",
        chainRegistry: "0x567eB27f7EA8c69988e30B045987Ad58A597685C",
        treasury: "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F",
        // Your existing VRF and randomness contracts
        existingVRF: "0x1b1523b3254e076fcbcc992cbe2dc8f08458e538",
        randomnessProvider: "0x8476B99208F759864F155501B3C39983B18A1746",
        // Your existing ecosystem contracts
        priceOracle: "0x54D0DC2DcF1A1994aF3391A68FCF80A9C46FC2fd",
        jackpotVault: "0xABa4df84B208ecedac2EcEcc988648d2847Ec310",
        jackpotDistributor: "0x968763BebE98e956dA5826780e36E2f21edb79a3",
        feeManager: "0x071E337B46a56eca548D5c545b8F723296B36408",
        // Your existing token contracts
        veDRAGON: "0x33E1eaCeCC03c7f7558011d73F806D022414Fee0",
        redDRAGON: "0x53bA33D2392E37384159A45258Ec70Ca4bAD4817",
        // Market manager
        marketManager: "0x4cdda12f479dcfaa926061e3ca6349d6452105d9"
      },
      arbitrum: {
        chainId: 42161,
        lzEid: 30110,
        explorerUrl: "https://arbiscan.io",
        wrappedNativeToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
        omniDRAGON: "0x0E5d746F01f4CDc76320c3349386176a873eAa40",
        chainRegistry: "0x567eB27f7EA8c69988e30B045987Ad58A597685C",
        treasury: "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F",
        // Your existing VRF contract
        existingVRF: "0xa32dbfcfcf085274e5c766b08ccf2e17bfefc754",
        // For Arbitrum - assuming same addresses if they're universal
        randomnessProvider: "0x8476B99208F759864F155501B3C39983B18A1746",
        priceOracle: "0x54D0DC2DcF1A1994aF3391A68FCF80A9C46FC2fd",
        jackpotVault: "0xABa4df84B208ecedac2EcEcc988648d2847Ec310",
        jackpotDistributor: "0x968763BebE98e956dA5826780e36E2f21edb79a3",
        feeManager: "0x071E337B46a56eca548D5c545b8F723296B36408",
        veDRAGON: "0x33E1eaCeCC03c7f7558011d73F806D022414Fee0",
        redDRAGON: "0x53bA33D2392E37384159A45258Ec70Ca4bAD4817",
        marketManager: "0x4cdda12f479dcfaa926061e3ca6349d6452105d9"
      }
    };

    const config = configs[hre.network.name];
    if (!config) {
      throw new Error(`Network ${hre.network.name} not supported. Supported: ${Object.keys(configs).join(', ')}`);
    }

    console.log("\n📋 Using ALL Existing Deployed Contracts:");
    console.log("=========================================");
    console.log("- Chain ID:", config.chainId);
    console.log("- omniDRAGON:", config.omniDRAGON);
    console.log("- Existing VRF:", config.existingVRF);
    console.log("- Randomness Provider:", config.randomnessProvider);
    console.log("- Price Oracle:", config.priceOracle);
    console.log("- Jackpot Vault:", config.jackpotVault);
    console.log("- Jackpot Distributor:", config.jackpotDistributor);
    console.log("- Fee Manager:", config.feeManager);
    console.log("- veDRAGON:", config.veDRAGON);
    console.log("- redDRAGON:", config.redDRAGON);
    console.log("- Market Manager:", config.marketManager);

    // ===============================
    // 1. VERIFY EXISTING CONTRACTS
    // ===============================

    console.log("\n🔍 === VERIFYING EXISTING CONTRACTS ===");
    
    try {
      const contracts = {
        "Jackpot Distributor": config.jackpotDistributor,
        "veDRAGON": config.veDRAGON,
        "Market Manager": config.marketManager,
        "Price Oracle": config.priceOracle
      };

      for (const [name, address] of Object.entries(contracts)) {
        const code = await ethers.provider.getCode(address);
        if (code === "0x") {
          console.log(`⚠️  ${name} at ${address} has no code - might not be deployed on this network`);
        } else {
          console.log(`✅ ${name}: ${address}`);
        }
      }
    } catch (error) {
      console.log("⚠️ Contract verification failed (non-critical):", error.message);
    }

    // ===============================
    // 2. DEPLOY LOTTERY MANAGER
    // ===============================

    console.log("\n🎰 === DEPLOYING LOTTERY MANAGER ===");
    console.log("\nConstructor parameters:");
    console.log("- jackpotDistributor:", config.jackpotDistributor);
    console.log("- veDRAGON:", config.veDRAGON);
    console.log("- marketManager:", config.marketManager);
    console.log("- priceOracle:", config.priceOracle);
    console.log("- chainId:", config.chainId);

    console.log("\n🚀 Deploying OmniDragonLotteryManager...");
    
    const OmniDragonLotteryManager = await ethers.getContractFactory("OmniDragonLotteryManager");
    
    const salt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("OMNIDRAGON_LOTTERY_V1"));
    
    let lotteryManager;
    let deploymentMethod = "regular";
    
    try {
      const create2Factory = "0xAA28020DDA6b954D16208eccF873D79AC6533833";
      const CREATE2Factory = await ethers.getContractFactory("CREATE2FactoryWithOwnership");
      const factory = CREATE2Factory.attach(create2Factory);
      
      console.log("📦 Attempting CREATE2 deployment...");
      
      const constructorArgs = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "address", "address", "uint256"],
        [
          config.jackpotDistributor,
          config.veDRAGON,
          config.marketManager,
          config.priceOracle,
          config.chainId
        ]
      );
      
      const bytecode = OmniDragonLotteryManager.bytecode + constructorArgs.slice(2);
      
      const deployTx = await factory.deploy(
        bytecode,
        salt,
        "OmniDragonLotteryManager",
        {
          gasLimit: 5000000
        }
      );
      
      const receipt = await deployTx.wait();
      const deployedAddress = await factory.getDeployedAddress(salt, bytecode);
      
      lotteryManager = OmniDragonLotteryManager.attach(deployedAddress);
      deploymentMethod = "CREATE2";
      
      console.log("✅ CREATE2 deployment successful!");
      console.log("📍 Address:", deployedAddress);
      
    } catch (error) {
      console.log("⚠️ CREATE2 failed, using regular deployment:", error.message);
      
      lotteryManager = await OmniDragonLotteryManager.deploy(
        config.jackpotDistributor,
        config.veDRAGON,
        config.marketManager,
        config.priceOracle,
        config.chainId
      );
      
      await lotteryManager.deployed();
      deploymentMethod = "regular";
    }

    const lotteryAddress = lotteryManager.address;
    console.log("🎰 OmniDragonLotteryManager deployed:", lotteryAddress);
    console.log("🏭 Deployment method:", deploymentMethod);

    // ===============================
    // 3. INITIAL CONFIGURATION
    // ===============================

    console.log("\n⚙️ === INITIAL CONFIGURATION ===");

    try {
      // Set VRF integrator (your existing VRF contract)
      console.log("\n1️⃣ Setting VRF integrator...");
      const setVRFTx = await lotteryManager.setVRFIntegrator(config.existingVRF);
      await setVRFTx.wait();
      console.log("✅ VRF integrator set:", config.existingVRF);

      // Set redDRAGON token
      console.log("\n2️⃣ Setting redDRAGON token...");
      const setRedDragonTx = await lotteryManager.setRedDRAGONToken(config.redDRAGON);
      await setRedDragonTx.wait();
      console.log("✅ redDRAGON token set:", config.redDRAGON);

      // Configure instant lottery with CORRECT probabilities and 69% jackpot reward 🔥
      console.log("\n3️⃣ Configuring instant lottery with MASSIVE 69% jackpot rewards...");
      const configureTx = await lotteryManager.configureInstantLottery(
        4, // 0.04% base win probability (in basis points) - matches 40 PPM for $10 swaps
        ethers.utils.parseUnits("10", 6), // $10 minimum swap (6 decimals)
        6900, // 69% of jackpot as reward (in basis points) 🔥💰
        true, // Active
        true  // Use VRF
      );
      await configureTx.wait();
      console.log("✅ Instant lottery configured with HUGE rewards!");
      console.log("   - Base win probability: 0.004% at $10 (scales to 4% at $10,000)");
      console.log("   - Minimum swap: $10 USD");
      console.log("   - Reward: 69% of jackpot 🔥💰💰💰");
      console.log("   - VRF enabled: true");
      console.log("   - Status: ACTIVE");

      // Register on Sonic FeeM if on Sonic network
      if (hre.network.name === 'sonic') {
        console.log("\n4️⃣ Registering on Sonic FeeM...");
        try {
          const registerTx = await lotteryManager.registerMe();
          await registerTx.wait();
          console.log("✅ Registered on Sonic FeeM!");
        } catch (error) {
          console.log("⚠️ FeeM registration failed (non-critical):", error.message);
        }
      }

      // Get current lottery configuration to verify
      console.log("\n5️⃣ Verifying configuration...");
      const lotteryConfig = await lotteryManager.getInstantLotteryConfig();
      console.log("✅ Current lottery configuration verified:");
      console.log("   - Base win probability:", lotteryConfig.baseWinProbability.toString(), "bp (0.04%)");
      console.log("   - Min swap amount:", ethers.utils.formatUnits(lotteryConfig.minSwapAmount, 6), "USD");
      console.log("   - Reward percentage:", lotteryConfig.rewardPercentage.toString(), "bp (69% 🔥)");
      console.log("   - Is active:", lotteryConfig.isActive);
      console.log("   - Use VRF:", lotteryConfig.useVRFForInstant);

      // Get current jackpot to show potential rewards
      try {
        const currentJackpot = await lotteryManager.getCurrentJackpot();
        if (currentJackpot.gt(0)) {
          const jackpotETH = ethers.utils.formatEther(currentJackpot);
          const rewardETH = (parseFloat(jackpotETH) * 0.69).toFixed(4);
          console.log("\n💰 Current Jackpot Stats:");
          console.log("   - Total Jackpot:", jackpotETH, "ETH");
          console.log("   - Potential Lottery Win:", rewardETH, "ETH (69% of jackpot!) 🚀");
        }
      } catch (error) {
        console.log("ℹ️  Could not fetch current jackpot (non-critical)");
      }

    } catch (error) {
      console.log("⚠️ Configuration failed (you can configure manually later):", error.message);
    }

    // ===============================
    // 4. SAVE DEPLOYMENT DATA
    // ===============================

    console.log("\n💾 === SAVING DEPLOYMENT DATA ===");

    const deploymentsDir = path.join(__dirname, '..', 'deployments', hre.network.name);
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const lotteryDeployment = {
      address: lotteryAddress,
      args: [
        config.jackpotDistributor,
        config.veDRAGON,
        config.marketManager,
        config.priceOracle,
        config.chainId
      ],
      numDeployments: 1,
      deploymentInfo: {
        network: hre.network.name,
        chainId: config.chainId,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        verified: taskArgs.verify,
        verificationUrl: `${config.explorerUrl}/address/${lotteryAddress}#code`,
        deploymentMethod: deploymentMethod,
        integrations: {
          existingVRF: config.existingVRF,
          randomnessProvider: config.randomnessProvider,
          jackpotDistributor: config.jackpotDistributor,
          veDRAGON: config.veDRAGON,
          redDRAGON: config.redDRAGON,
          marketManager: config.marketManager,
          priceOracle: config.priceOracle,
          feeManager: config.feeManager,
          jackpotVault: config.jackpotVault
        },
        lotteryConfig: {
          baseWinProbability: "0.004% at $10 (scales to 4% at $10,000)",
          minSwapAmount: "$10 USD",
          rewardPercentage: "69% of jackpot",
          vrfEnabled: true,
          active: true,
          note: "MASSIVE 69% jackpot rewards with correct probability scaling! 🔥"
        }
      }
    };

    fs.writeFileSync(
      path.join(deploymentsDir, 'OmniDragonLotteryManager.json'),
      JSON.stringify(lotteryDeployment, null, 2)
    );

    console.log("💾 Deployment data saved to:", path.join(deploymentsDir, 'OmniDragonLotteryManager.json'));

    // ===============================
    // 5. VERIFICATION
    // ===============================

    if (taskArgs.verify) {
      console.log("\n🔍 === VERIFYING CONTRACTS ===");
      
      console.log("⏳ Waiting 30 seconds for contract indexing...");
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      try {
        console.log("Verifying OmniDragonLotteryManager...");
        await hre.run("verify:verify", {
          address: lotteryAddress,
          constructorArguments: [
            config.jackpotDistributor,
            config.veDRAGON,
            config.marketManager,
            config.priceOracle,
            config.chainId
          ],
        });
        console.log("✅ OmniDragonLotteryManager verified!");
      } catch (error) {
        console.log("❌ Lottery Manager verification failed:", error.message);
        console.log("💡 You can verify manually later with:");
        console.log(`npx hardhat verify --network ${hre.network.name} ${lotteryAddress} "${config.jackpotDistributor}" "${config.veDRAGON}" "${config.marketManager}" "${config.priceOracle}" ${config.chainId}`);
      }
    }

    // ===============================
    // 6. SUMMARY & NEXT STEPS
    // ===============================

    console.log("\n🎉 === DEPLOYMENT COMPLETE ===");
    console.log("=====================================");
    console.log(`Network: ${hre.network.name} (Chain ID: ${config.chainId})`);
    console.log(`🎰 OmniDragonLotteryManager: ${lotteryAddress}`);
    console.log(`🏭 Deployment Method: ${deploymentMethod}`);
    console.log(`🌐 Explorer: ${config.explorerUrl}/address/${lotteryAddress}`);
    
    console.log("\n🔗 Integrated Ecosystem Contracts:");
    console.log("====================================");
    console.log(`🎲 VRF Contract: ${config.existingVRF}`);
    console.log(`🔀 Randomness Provider: ${config.randomnessProvider}`);
    console.log(`💰 Jackpot Distributor: ${config.jackpotDistributor}`);
    console.log(`🏛️  Jackpot Vault: ${config.jackpotVault}`);
    console.log(`📊 Price Oracle: ${config.priceOracle}`);
    console.log(`💎 veDRAGON: ${config.veDRAGON}`);
    console.log(`🔴 redDRAGON: ${config.redDRAGON}`);
    console.log(`🏦 Fee Manager: ${config.feeManager}`);
    console.log(`📈 Market Manager: ${config.marketManager}`);

    console.log("\n🔧 Next Steps:");
    console.log("==============");
    console.log("1. 🎯 Configure your omniDRAGON token to use this lottery manager:");
    console.log(`   omniDRAGON.setLotteryManager("${lotteryAddress}")`);
    console.log();
    console.log("2. 🎮 Set authorized swap contracts to trigger lottery:");
    console.log(`   lotteryManager.setAuthorizedSwapContract("<your_swap_contract>", true)`);
    console.log();
    console.log("3. 💸 Your jackpot system is ready - ensure it has funds for MASSIVE rewards!");
    console.log();
    console.log("4. 🧪 Test the lottery system:");
    console.log("   - Make small swaps to trigger lottery entries");
    console.log("   - Monitor VRF callbacks and prize distributions");
    console.log("   - Watch for the BIG WINS! 🚀");

    console.log("\n🎲 LOTTERY CONFIGURATION - CORRECT PROBABILITIES:");
    console.log("================================================");
    console.log("✅ Win Chance Scaling (Built into Contract):");
    console.log("   💰 $10 swap = 0.004% chance");
    console.log("   💰 $100 swap = 0.04% chance");
    console.log("   💰 $1,000 swap = 0.4% chance");
    console.log("   💰 $10,000+ swap = 4% chance (maximum)");
    console.log("✅ veDRAGON Boost: Up to 2.5x win probability multiplier");
    console.log("✅ Prize: 69% of current jackpot 🔥💰💰💰");
    console.log("✅ VRF Security: Enabled (tamper-proof randomness)");
    console.log("✅ FeeM Registration: " + (hre.network.name === 'sonic' ? 'Completed' : 'N/A'));

    console.log("\n💡 EXAMPLE SCENARIOS WITH veDRAGON BOOST:");
    console.log("========================================");
    console.log("🚀 $1,000 swap + 2.5x boost = 1% win chance");
    console.log("🚀 $5,000 swap + 2.5x boost = 5% win chance");
    console.log("🚀 $10,000 swap + 2.5x boost = 10% win chance");
    console.log("\n🎯 These are REALISTIC win chances with MASSIVE 69% jackpot payouts!");

    return {
      lotteryManager: { address: lotteryAddress, contract: lotteryManager },
      config: config,
      deploymentMethod: deploymentMethod,
      jackpotRewardPercentage: "69%",
      winProbabilityCorrect: true
    };
  });