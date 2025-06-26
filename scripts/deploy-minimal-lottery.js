const { ethers } = require("hardhat");

// Existing deployed contracts
const LOTTERY_MANAGER = "0xb6999c369c8f7256902526e7A97c9ea7CE39293e";
const VRF_INTEGRATOR = "0x6e11334470df61d62383892bd8e57a3a655718c8";

async function main() {
    console.log("🎲 Deploying Minimal Lottery Components");
    console.log("=======================================");
    console.log("Only deploying what's needed to make instant lottery work");

    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying with account:", deployer.address);
    console.log("💰 Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "S");

    try {
        // ============ STEP 1: Deploy Randomness Provider ============
        console.log("\n📡 Step 1: Deploying OmniDragonRandomnessProvider...");
        
        const RandomnessProvider = await ethers.getContractFactory("OmniDragonRandomnessProvider");
        const randomnessProvider = await RandomnessProvider.deploy(
            VRF_INTEGRATOR, // VRF integrator address
            { gasLimit: 5000000 }
        );
        await randomnessProvider.deployed();
        
        console.log("✅ OmniDragonRandomnessProvider deployed:", randomnessProvider.address);

        // ============ STEP 2: Deploy Simple Jackpot Distributor ============
        console.log("\n💰 Step 2: Deploying DragonJackpotDistributor...");
        
        // First deploy a simple vault
        console.log("🏦 Deploying DragonJackpotVault...");
        const JackpotVault = await ethers.getContractFactory("DragonJackpotVault");
        const jackpotVault = await JackpotVault.deploy(
            "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38", // Wrapped S token address
            "0x8680CEaBcb9b56913c519c069Add6Bc3494B7020", // Fee manager address (Sonic FeeM)
            { gasLimit: 5000000 }
        );
        await jackpotVault.deployed();
        console.log("✅ DragonJackpotVault deployed:", jackpotVault.address);
        
        // Now deploy distributor
        const JackpotDistributor = await ethers.getContractFactory("DragonJackpotDistributor");
        const jackpotDistributor = await JackpotDistributor.deploy(
            jackpotVault.address, // vault address
            { gasLimit: 5000000 }
        );
        await jackpotDistributor.deployed();
        
        console.log("✅ DragonJackpotDistributor deployed:", jackpotDistributor.address);

        // ============ STEP 3: Update Lottery Manager ============
        console.log("\n🎲 Step 3: Updating lottery manager...");
        
        const lotteryManager = await ethers.getContractAt("OmniDragonLotteryManager", LOTTERY_MANAGER);
        
        // Set randomness provider
        console.log("📡 Setting randomness provider...");
        const setRandomnessTx = await lotteryManager.setRandomnessProvider(randomnessProvider.address, {
            gasLimit: 150000
        });
        await setRandomnessTx.wait();
        console.log("✅ Randomness provider set");

        // Set jackpot vault
        console.log("🏦 Setting jackpot vault...");
        const setVaultTx = await lotteryManager.setJackpotVault(jackpotVault.address, {
            gasLimit: 150000
        });
        await setVaultTx.wait();
        console.log("✅ Jackpot vault set");

        // Set jackpot distributor
        console.log("💰 Setting jackpot distributor...");
        const setDistributorTx = await lotteryManager.setJackpotDistributor(jackpotDistributor.address, {
            gasLimit: 150000
        });
        await setDistributorTx.wait();
        console.log("✅ Jackpot distributor set");

        // ============ STEP 4: Configure Cross-Contract Auth ============
        console.log("\n🔐 Step 4: Setting up authorizations...");

        // Authorize lottery manager in randomness provider
        console.log("📡 Authorizing lottery manager in randomness provider...");
        const authTx = await randomnessProvider.authorizeConsumer(LOTTERY_MANAGER, true, {
            gasLimit: 150000
        });
        await authTx.wait();
        console.log("✅ Lottery manager authorized");

        // ============ STEP 5: Fund the Jackpot ============
        console.log("\n💸 Step 5: Funding the jackpot...");
        
        const fundingAmount = ethers.utils.parseEther("3.0"); // 3 S tokens for testing
        console.log(`💰 Funding jackpot with ${ethers.utils.formatEther(fundingAmount)} S...`);
        
        const fundTx = await lotteryManager.fundJackpot(0, {
            value: fundingAmount,
            gasLimit: 300000
        });
        await fundTx.wait();
        console.log("✅ Jackpot funded successfully!");

        // ============ STEP 6: Verify Everything Works ============
        console.log("\n✅ Step 6: Verifying setup...");
        
        const currentRandomnessProvider = await lotteryManager.randomnessProvider();
        const currentJackpotDistributor = await lotteryManager.jackpotDistributor();
        const rewardPoolBalance = await lotteryManager.getRewardPoolBalance();
        
        console.log("\n📋 Final Configuration:");
        console.log("  Lottery Manager:", LOTTERY_MANAGER);
        console.log("  Randomness Provider:", currentRandomnessProvider);
        console.log("  Jackpot Distributor:", currentJackpotDistributor);
        console.log("  Reward Pool Balance:", ethers.utils.formatEther(rewardPoolBalance), "S");

        // Check if everything is properly set
        const systemReady = currentRandomnessProvider !== ethers.constants.AddressZero &&
                           currentJackpotDistributor !== ethers.constants.AddressZero &&
                           rewardPoolBalance.gt(0);

        if (systemReady) {
            console.log("\n🎉 MINIMAL LOTTERY SYSTEM DEPLOYED SUCCESSFULLY!");
            console.log("🎰 The instant lottery is now ready for testing!");
            
            console.log("\n🚀 Test it now:");
            console.log("npx hardhat run scripts/test-instant-swap-lottery.js --network sonic");
            
        } else {
            console.log("\n❌ Something is still not configured correctly");
        }

        // ============ DEPLOYMENT SUMMARY ============
        console.log("\n📊 Deployment Summary:");
        console.log("========================");
        console.log(`OmniDragonRandomnessProvider: ${randomnessProvider.address}`);
        console.log(`DragonJackpotVault: ${jackpotVault.address}`);
        console.log(`DragonJackpotDistributor: ${jackpotDistributor.address}`);
        console.log(`Funding: ${ethers.utils.formatEther(fundingAmount)} S`);

    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        if (error.transaction) {
            console.error("TX Hash:", error.transaction.hash);
        }
    }
}

main()
    .then(() => {
        console.log("\n🎯 Minimal deployment completed!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Fatal error:", error);
        process.exit(1);
    }); 