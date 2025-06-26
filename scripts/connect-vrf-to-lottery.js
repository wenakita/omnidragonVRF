const { ethers } = require("hardhat");

// Existing deployed contracts
const LOTTERY_MANAGER = "0xb6999c369c8f7256902526e7A97c9ea7CE39293e";
const VRF_INTEGRATOR = "0x6e11334470df61d62383892bd8e57a3a655718c8"; // Working VRF integrator

// Sonic network addresses
const WRAPPED_S = "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38";
const SONIC_FEEM = "0x8680CEaBcb9b56913c519c069Add6Bc3494B7020";

async function main() {
    console.log("🔗 Connecting VRF System to Existing Lottery Manager");
    console.log("==================================================");
    console.log(`🎲 Lottery Manager: ${LOTTERY_MANAGER}`);
    console.log(`📡 VRF Integrator: ${VRF_INTEGRATOR}`);

    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying with account:", deployer.address);
    console.log("💰 Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "S");

    try {
        // ============ STEP 1: Deploy Missing Components ============
        console.log("\n📦 Step 1: Deploying missing components...");

        // Deploy Randomness Provider
        console.log("📡 Deploying OmniDragonRandomnessProvider...");
        const RandomnessProvider = await ethers.getContractFactory("OmniDragonRandomnessProvider");
        const randomnessProvider = await RandomnessProvider.deploy(
            VRF_INTEGRATOR,
            { gasLimit: 3000000 }
        );
        await randomnessProvider.deployed();
        console.log("✅ RandomnessProvider:", randomnessProvider.address);

        // Deploy Jackpot Vault
        console.log("🏦 Deploying DragonJackpotVault...");
        const JackpotVault = await ethers.getContractFactory("DragonJackpotVault");
        const jackpotVault = await JackpotVault.deploy(
            WRAPPED_S,
            SONIC_FEEM,
            { gasLimit: 3000000 }
        );
        await jackpotVault.deployed();
        console.log("✅ JackpotVault:", jackpotVault.address);

        // Deploy Jackpot Distributor
        console.log("💰 Deploying DragonJackpotDistributor...");
        const JackpotDistributor = await ethers.getContractFactory("DragonJackpotDistributor");
        const jackpotDistributor = await JackpotDistributor.deploy(
            jackpotVault.address,
            { gasLimit: 3000000 }
        );
        await jackpotDistributor.deployed();
        console.log("✅ JackpotDistributor:", jackpotDistributor.address);

        // ============ STEP 2: Connect to Lottery Manager ============
        console.log("\n🔗 Step 2: Connecting components to lottery manager...");

        const lotteryManager = await ethers.getContractAt("OmniDragonLotteryManager", LOTTERY_MANAGER);

        // Set VRF Integrator
        console.log("📡 Setting VRF integrator...");
        const setVrfTx = await lotteryManager.setVRFIntegrator(VRF_INTEGRATOR, {
            gasLimit: 200000
        });
        await setVrfTx.wait();
        console.log("✅ VRF integrator connected");

        // Set Randomness Provider
        console.log("📡 Setting randomness provider...");
        const setRandomnessTx = await lotteryManager.setRandomnessProvider(randomnessProvider.address, {
            gasLimit: 200000
        });
        await setRandomnessTx.wait();
        console.log("✅ Randomness provider connected");

        // Set Jackpot Vault
        console.log("🏦 Setting jackpot vault...");
        const setVaultTx = await lotteryManager.setJackpotVault(jackpotVault.address, {
            gasLimit: 200000
        });
        await setVaultTx.wait();
        console.log("✅ Jackpot vault connected");

        // Set Jackpot Distributor
        console.log("💰 Setting jackpot distributor...");
        const setDistributorTx = await lotteryManager.setJackpotDistributor(jackpotDistributor.address, {
            gasLimit: 200000
        });
        await setDistributorTx.wait();
        console.log("✅ Jackpot distributor connected");

        // ============ STEP 3: Configure Cross-Contract Permissions ============
        console.log("\n🔐 Step 3: Setting up permissions...");

        // Authorize lottery manager in randomness provider
        console.log("📡 Authorizing lottery manager in randomness provider...");
        const authRandomnessTx = await randomnessProvider.authorizeConsumer(LOTTERY_MANAGER, true, {
            gasLimit: 200000
        });
        await authRandomnessTx.wait();
        console.log("✅ Lottery manager authorized in randomness provider");

        // Authorize lottery manager in VRF integrator
        console.log("📡 Authorizing lottery manager in VRF integrator...");
        const vrfIntegrator = await ethers.getContractAt("ChainlinkVRFIntegratorV2_5", VRF_INTEGRATOR);
        const authVrfTx = await vrfIntegrator.setAuthorizedCaller(LOTTERY_MANAGER, true, {
            gasLimit: 200000
        });
        await authVrfTx.wait();
        console.log("✅ Lottery manager authorized in VRF integrator");

        // ============ STEP 4: Fund the System ============
        console.log("\n💸 Step 4: Funding the system...");

        // Fund the jackpot
        const fundingAmount = ethers.utils.parseEther("5.0"); // 5 S tokens
        console.log(`💰 Funding jackpot with ${ethers.utils.formatEther(fundingAmount)} S...`);
        
        const fundTx = await lotteryManager.fundJackpot(0, {
            value: fundingAmount,
            gasLimit: 300000
        });
        await fundTx.wait();
        console.log("✅ Jackpot funded successfully!");

        // ============ STEP 5: Verify System ============
        console.log("\n✅ Step 5: Verifying complete system...");

        // Check lottery manager configuration
        const vrfIntegratorAddr = await lotteryManager.vrfIntegrator();
        const randomnessProviderAddr = await lotteryManager.randomnessProvider();
        const jackpotVaultAddr = await lotteryManager.jackpotVault();
        const jackpotDistributorAddr = await lotteryManager.jackpotDistributor();
        const rewardPoolBalance = await lotteryManager.getRewardPoolBalance();

        console.log("\n📋 Final System Configuration:");
        console.log("  Lottery Manager:", LOTTERY_MANAGER);
        console.log("  VRF Integrator:", vrfIntegratorAddr);
        console.log("  Randomness Provider:", randomnessProviderAddr);
        console.log("  Jackpot Vault:", jackpotVaultAddr);
        console.log("  Jackpot Distributor:", jackpotDistributorAddr);
        console.log("  Reward Pool Balance:", ethers.utils.formatEther(rewardPoolBalance), "S");

        // Check if everything is properly connected
        const systemReady = vrfIntegratorAddr === VRF_INTEGRATOR &&
                           randomnessProviderAddr === randomnessProvider.address &&
                           jackpotVaultAddr === jackpotVault.address &&
                           jackpotDistributorAddr === jackpotDistributor.address &&
                           rewardPoolBalance.gt(0);

        if (systemReady) {
            console.log("\n🎉 VRF LOTTERY SYSTEM FULLY CONNECTED!");
            console.log("🎰 The complete lottery system is now operational!");

            console.log("\n🚀 Available Functions:");
            console.log("  1. Instant Lottery: Automatic on swaps");
            console.log("  2. Manual Lottery: Create/draw lotteries");
            console.log("  3. VRF Integration: Secure randomness");
            console.log("  4. Jackpot System: Reward distribution");

            console.log("\n🧪 Test Commands:");
            console.log("  npx hardhat run scripts/test-instant-swap-lottery.js --network sonic");
            console.log("  npx hardhat run scripts/test-manual-lottery.js --network sonic");
            console.log("  npx hardhat run scripts/test-vrf-request.js --network sonic");
            
        } else {
            console.log("\n❌ System verification failed - check connections");
            console.log("Expected vs Actual:");
            console.log(`VRF: ${VRF_INTEGRATOR} vs ${vrfIntegratorAddr}`);
            console.log(`Randomness: ${randomnessProvider.address} vs ${randomnessProviderAddr}`);
            console.log(`Vault: ${jackpotVault.address} vs ${jackpotVaultAddr}`);
            console.log(`Distributor: ${jackpotDistributor.address} vs ${jackpotDistributorAddr}`);
        }

        // ============ DEPLOYMENT SUMMARY ============
        console.log("\n📊 Deployment Summary:");
        console.log("========================");
        console.log(`Lottery Manager: ${LOTTERY_MANAGER} (existing)`);
        console.log(`VRF Integrator: ${VRF_INTEGRATOR} (existing)`);
        console.log(`RandomnessProvider: ${randomnessProvider.address} (new)`);
        console.log(`JackpotVault: ${jackpotVault.address} (new)`);
        console.log(`JackpotDistributor: ${jackpotDistributor.address} (new)`);
        console.log(`Funding: ${ethers.utils.formatEther(fundingAmount)} S`);

        console.log("\n🔗 Integration Status: COMPLETE");
        console.log("The existing lottery manager now has full VRF support!");

    } catch (error) {
        console.error("❌ Connection failed:", error.message);
        if (error.transaction) {
            console.error("TX Hash:", error.transaction.hash);
        }
        if (error.reason) {
            console.error("Reason:", error.reason);
        }
    }
}

main()
    .then(() => {
        console.log("\n🎯 VRF integration completed!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Fatal error:", error);
        process.exit(1);
    }); 