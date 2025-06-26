const { ethers } = require("hardhat");

// Existing deployed contracts
const LOTTERY_MANAGER = "0xb6999c369c8f7256902526e7A97c9ea7CE39293e";
const VRF_INTEGRATOR = "0x6e11334470df61d62383892bd8e57a3a655718c8";

async function main() {
    console.log("🚀 Deploying OmniDragon Lottery Ecosystem");
    console.log("==========================================");

    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying with account:", deployer.address);
    console.log("💰 Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "S");

    // ============ STEP 1: Deploy Randomness Provider ============
    console.log("\n📡 Step 1: Deploying OmniDragonRandomnessProvider...");
    
    const RandomnessProvider = await ethers.getContractFactory("OmniDragonRandomnessProvider");
    const randomnessProvider = await RandomnessProvider.deploy(
        VRF_INTEGRATOR, // VRF integrator address
        { gasLimit: 3000000 }
    );
    await randomnessProvider.deployed();
    
    console.log("✅ OmniDragonRandomnessProvider deployed:", randomnessProvider.address);

    // ============ STEP 2: Deploy Jackpot Vault ============
    console.log("\n🏦 Step 2: Deploying DragonJackpotVault...");
    
    const JackpotVault = await ethers.getContractFactory("DragonJackpotVault");
    const jackpotVault = await JackpotVault.deploy(
        "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38", // Wrapped S token address
        "0x8680CEaBcb9b56913c519c069Add6Bc3494B7020", // Fee manager address (Sonic FeeM)
        { gasLimit: 3000000 }
    );
    await jackpotVault.deployed();
    
    console.log("✅ DragonJackpotVault deployed:", jackpotVault.address);

    // ============ STEP 3: Deploy Jackpot Distributor ============
    console.log("\n💰 Step 3: Deploying DragonJackpotDistributor...");
    
    const JackpotDistributor = await ethers.getContractFactory("DragonJackpotDistributor");
    const jackpotDistributor = await JackpotDistributor.deploy(
        jackpotVault.address, // vault address
        {
            gasLimit: 3000000
        }
    );
    await jackpotDistributor.deployed();
    
    console.log("✅ DragonJackpotDistributor deployed:", jackpotDistributor.address);

    // ============ STEP 4: Configure Contracts ============
    console.log("\n⚙️ Step 4: Configuring contracts...");

    // Configure randomness provider to authorize lottery manager
    console.log("🔐 Authorizing lottery manager in randomness provider...");
    const authTx = await randomnessProvider.authorizeConsumer(LOTTERY_MANAGER, true, {
        gasLimit: 100000
    });
    await authTx.wait();
    console.log("✅ Lottery manager authorized in randomness provider");

    // Configure jackpot vault (if needed)
    console.log("🏦 Configuring jackpot vault...");
    try {
        // Set wrapped native token if the vault has this function
        const setWrappedTx = await jackpotVault.setWrappedNativeToken(
            "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38", // Wrapped S on Sonic
            { gasLimit: 100000 }
        );
        await setWrappedTx.wait();
        console.log("✅ Wrapped native token set in vault");
    } catch (error) {
        console.log("⚠️ Could not set wrapped native token (may not be needed)");
    }

    // ============ STEP 5: Update Lottery Manager ============
    console.log("\n🎲 Step 5: Updating lottery manager with new addresses...");
    
    const lotteryManager = await ethers.getContractAt("OmniDragonLotteryManager", LOTTERY_MANAGER);
    
    // Set randomness provider
    console.log("📡 Setting randomness provider...");
    const setRandomnessTx = await lotteryManager.setRandomnessProvider(randomnessProvider.address, {
        gasLimit: 100000
    });
    await setRandomnessTx.wait();
    console.log("✅ Randomness provider set");

    // Set jackpot vault
    console.log("🏦 Setting jackpot vault...");
    const setVaultTx = await lotteryManager.setJackpotVault(jackpotVault.address, {
        gasLimit: 100000
    });
    await setVaultTx.wait();
    console.log("✅ Jackpot vault set");

    // Set jackpot distributor
    console.log("💰 Setting jackpot distributor...");
    const setDistributorTx = await lotteryManager.setJackpotDistributor(jackpotDistributor.address, {
        gasLimit: 100000
    });
    await setDistributorTx.wait();
    console.log("✅ Jackpot distributor set");

    // ============ STEP 6: Fund the Jackpot ============
    console.log("\n💸 Step 6: Funding the jackpot...");
    
    const fundingAmount = ethers.utils.parseEther("5.0"); // 5 S tokens
    console.log(`💰 Funding jackpot with ${ethers.utils.formatEther(fundingAmount)} S...`);
    
    const fundTx = await lotteryManager.fundJackpot(0, {
        value: fundingAmount,
        gasLimit: 200000
    });
    await fundTx.wait();
    console.log("✅ Jackpot funded successfully!");

    // ============ STEP 7: Verify Setup ============
    console.log("\n✅ Step 7: Verifying deployment...");
    
    // Check lottery manager configuration
    const currentRandomnessProvider = await lotteryManager.randomnessProvider();
    const currentJackpotVault = await lotteryManager.jackpotVault();
    const currentJackpotDistributor = await lotteryManager.jackpotDistributor();
    const rewardPoolBalance = await lotteryManager.getRewardPoolBalance();
    
    console.log("\n📋 Final Configuration:");
    console.log("  Lottery Manager:", LOTTERY_MANAGER);
    console.log("  VRF Integrator:", VRF_INTEGRATOR);
    console.log("  Randomness Provider:", currentRandomnessProvider);
    console.log("  Jackpot Vault:", currentJackpotVault);
    console.log("  Jackpot Distributor:", currentJackpotDistributor);
    console.log("  Reward Pool Balance:", ethers.utils.formatEther(rewardPoolBalance), "S");

    // Verify all addresses are set correctly
    const allSet = currentRandomnessProvider !== ethers.constants.AddressZero &&
                   currentJackpotVault !== ethers.constants.AddressZero &&
                   currentJackpotDistributor !== ethers.constants.AddressZero;

    if (allSet && rewardPoolBalance.gt(0)) {
        console.log("\n🎉 ECOSYSTEM DEPLOYMENT SUCCESSFUL!");
        console.log("🎰 The instant lottery system is now ready for testing!");
        
        console.log("\n📝 Next Steps:");
        console.log("1. Run: node scripts/test-instant-swap-lottery.js");
        console.log("2. Test with different swap amounts");
        console.log("3. Monitor lottery events and rewards");
        
        console.log("\n💡 For production:");
        console.log("1. Deploy price oracles for USD conversion");
        console.log("2. Integrate with actual swap contracts");
        console.log("3. Set up automated jackpot funding");
        
    } else {
        console.log("\n❌ DEPLOYMENT INCOMPLETE!");
        console.log("Some addresses are still zero or jackpot is not funded");
    }

    // ============ DEPLOYMENT SUMMARY ============
    console.log("\n📊 Deployment Summary:");
    console.log("========================");
    console.log(`OmniDragonRandomnessProvider: ${randomnessProvider.address}`);
    console.log(`DragonJackpotVault: ${jackpotVault.address}`);
    console.log(`DragonJackpotDistributor: ${jackpotDistributor.address}`);
    console.log(`Funding Amount: ${ethers.utils.formatEther(fundingAmount)} S`);
    
    // Save addresses for future reference
    const deploymentInfo = {
        timestamp: new Date().toISOString(),
        network: "sonic",
        contracts: {
            lotteryManager: LOTTERY_MANAGER,
            vrfIntegrator: VRF_INTEGRATOR,
            randomnessProvider: randomnessProvider.address,
            jackpotVault: jackpotVault.address,
            jackpotDistributor: jackpotDistributor.address
        },
        funding: {
            amount: ethers.utils.formatEther(fundingAmount),
            token: "S"
        }
    };
    
    console.log("\n💾 Save this deployment info:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
    .then(() => {
        console.log("\n🎯 Deployment completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }); 