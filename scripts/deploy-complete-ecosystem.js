const { ethers } = require("hardhat");

async function main() {
    console.log("🌟 Deploying Complete OmniDragon Ecosystem");
    console.log("===========================================");
    console.log("This will deploy the full lottery system with VRF and oracles");

    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying with account:", deployer.address);
    const initialBalance = await deployer.getBalance();
    console.log("💰 Account balance:", ethers.utils.formatEther(initialBalance), "S");

    if (initialBalance.lt(ethers.utils.parseEther("10"))) {
        console.log("⚠️ Warning: Low balance. Recommended minimum: 10 S");
    }

    console.log("\n📋 Deployment Plan:");
    console.log("1. 📊 Price Oracle System");
    console.log("2. 🎲 Lottery Ecosystem (Randomness + Jackpot)");
    console.log("3. 🔗 Integration & Configuration");
    console.log("4. 💰 Funding & Testing");

    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askQuestion = (question) => {
        return new Promise((resolve) => {
            readline.question(question, resolve);
        });
    };

    const proceed = await askQuestion("\n🚀 Proceed with full deployment? (y/N): ");
    if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
        console.log("❌ Deployment cancelled");
        readline.close();
        return;
    }
    readline.close();

    try {
        // ============ PHASE 1: ORACLE SYSTEM ============
        console.log("\n" + "=".repeat(50));
        console.log("📊 PHASE 1: Deploying Oracle System");
        console.log("=".repeat(50));

        // Deploy Chain Registry
        console.log("\n🌐 Deploying ChainRegistry...");
        const ChainRegistry = await ethers.getContractFactory("ChainRegistry");
        const chainRegistry = await ChainRegistry.deploy(
            "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B", // LayerZero endpoint (placeholder)
            "0x8680CEaBcb9b56913c519c069Add6Bc3494B7020", // Sonic FeeM address
            deployer.address, // Initial owner
            { gasLimit: 2000000 }
        );
        await chainRegistry.deployed();
        console.log("✅ ChainRegistry:", chainRegistry.address);

        // Deploy Dragon Market Oracle
        console.log("\n📈 Deploying DragonMarketOracle...");
        const MarketOracle = await ethers.getContractFactory("DragonMarketOracle");
        const marketOracle = await MarketOracle.deploy("DRAGON", "USD", { gasLimit: 3000000 });
        await marketOracle.deployed();
        console.log("✅ DragonMarketOracle:", marketOracle.address);

        // Set initial DRAGON price
        console.log("💰 Setting initial DRAGON price to $0.10...");
        const initialPrice = ethers.utils.parseEther("0.1");
        await marketOracle.updatePrice(initialPrice, { gasLimit: 150000 });
        console.log("✅ Initial price set");

        // ============ PHASE 2: LOTTERY ECOSYSTEM ============
        console.log("\n" + "=".repeat(50));
        console.log("🎲 PHASE 2: Deploying Lottery Ecosystem");
        console.log("=".repeat(50));

        // Deploy Randomness Provider
        console.log("\n📡 Deploying OmniDragonRandomnessProvider...");
        const RandomnessProvider = await ethers.getContractFactory("OmniDragonRandomnessProvider");
        const randomnessProvider = await RandomnessProvider.deploy(
            "0x6e11334470df61d62383892bd8e57a3a655718c8", // VRF integrator address
            { gasLimit: 3000000 }
        );
        await randomnessProvider.deployed();
        console.log("✅ OmniDragonRandomnessProvider:", randomnessProvider.address);

        // Deploy Jackpot Vault
        console.log("\n🏦 Deploying DragonJackpotVault...");
        const JackpotVault = await ethers.getContractFactory("DragonJackpotVault");
        const jackpotVault = await JackpotVault.deploy(
            "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38", // Wrapped S token address
            "0x8680CEaBcb9b56913c519c069Add6Bc3494B7020", // Fee manager address (Sonic FeeM)
            { gasLimit: 3000000 }
        );
        await jackpotVault.deployed();
        console.log("✅ DragonJackpotVault:", jackpotVault.address);

        // Deploy Jackpot Distributor
        console.log("\n💰 Deploying DragonJackpotDistributor...");
        const JackpotDistributor = await ethers.getContractFactory("DragonJackpotDistributor");
        const jackpotDistributor = await JackpotDistributor.deploy(jackpotVault.address, { gasLimit: 3000000 });
        await jackpotDistributor.deployed();
        console.log("✅ DragonJackpotDistributor:", jackpotDistributor.address);

        // ============ PHASE 3: INTEGRATION ============
        console.log("\n" + "=".repeat(50));
        console.log("🔗 PHASE 3: Integration & Configuration");
        console.log("=".repeat(50));

        // Update existing lottery manager
        const LOTTERY_MANAGER = "0xb6999c369c8f7256902526e7A97c9ea7CE39293e";
        const lotteryManager = await ethers.getContractAt("OmniDragonLotteryManager", LOTTERY_MANAGER);

        console.log("\n🎲 Updating lottery manager configuration...");
        
        // Set randomness provider
        console.log("📡 Setting randomness provider...");
        await lotteryManager.setRandomnessProvider(randomnessProvider.address, { gasLimit: 100000 });
        
        // Set jackpot vault
        console.log("🏦 Setting jackpot vault...");
        await lotteryManager.setJackpotVault(jackpotVault.address, { gasLimit: 100000 });
        
        // Set jackpot distributor
        console.log("💰 Setting jackpot distributor...");
        await lotteryManager.setJackpotDistributor(jackpotDistributor.address, { gasLimit: 100000 });

        // Authorize lottery manager in randomness provider
        console.log("🔐 Authorizing lottery manager...");
        await randomnessProvider.authorizeConsumer(LOTTERY_MANAGER, true, { gasLimit: 100000 });

        console.log("✅ All integrations complete");

        // ============ PHASE 4: FUNDING & TESTING ============
        console.log("\n" + "=".repeat(50));
        console.log("💰 PHASE 4: Funding & Testing");
        console.log("=".repeat(50));

        // Fund the jackpot
        const fundingAmount = ethers.utils.parseEther("5.0");
        console.log(`\n💸 Funding jackpot with ${ethers.utils.formatEther(fundingAmount)} S...`);
        await lotteryManager.fundJackpot(0, { value: fundingAmount, gasLimit: 200000 });
        console.log("✅ Jackpot funded successfully");

        // Verify everything is working
        console.log("\n🔍 Verifying deployment...");
        
        const currentRandomnessProvider = await lotteryManager.randomnessProvider();
        const currentJackpotDistributor = await lotteryManager.jackpotDistributor();
        const rewardPoolBalance = await lotteryManager.getRewardPoolBalance();
        const [dragonPrice, priceTimestamp] = await marketOracle.getLatestPrice();

        console.log("\n📋 Final System Status:");
        console.log("========================");
        console.log("🎲 Lottery Manager:", LOTTERY_MANAGER);
        console.log("📡 Randomness Provider:", currentRandomnessProvider);
        console.log("💰 Jackpot Distributor:", currentJackpotDistributor);
        console.log("🏦 Reward Pool Balance:", ethers.utils.formatEther(rewardPoolBalance), "S");
        console.log("📊 DRAGON Price:", ethers.utils.formatEther(dragonPrice.toString()), "USD");
        console.log("⏰ Price Updated:", new Date(priceTimestamp.toNumber() * 1000).toLocaleString());

        // Check if everything is properly configured
        const systemReady = currentRandomnessProvider !== ethers.constants.AddressZero &&
                           currentJackpotDistributor !== ethers.constants.AddressZero &&
                           rewardPoolBalance.gt(0) &&
                           dragonPrice.gt(0);

        if (systemReady) {
            console.log("\n🎉 COMPLETE ECOSYSTEM DEPLOYMENT SUCCESSFUL!");
            console.log("🌟 All systems are operational and ready for use!");
            
            console.log("\n🚀 Ready to Test:");
            console.log("1. npx hardhat run scripts/test-instant-swap-lottery.js --network sonic");
            console.log("2. Test VRF lottery system");
            console.log("3. Monitor cross-chain VRF events");
            
            console.log("\n🔧 Production Checklist:");
            console.log("□ Set up automated price feeds");
            console.log("□ Configure swap contract integrations");
            console.log("□ Set up monitoring and alerts");
            console.log("□ Implement automated jackpot refilling");
            console.log("□ Security audit before mainnet");
            
        } else {
            console.log("\n⚠️ DEPLOYMENT COMPLETED WITH ISSUES");
            console.log("Some components may need manual configuration");
        }

        // Calculate deployment costs
        const finalBalance = await deployer.getBalance();
        const totalCost = initialBalance.sub(finalBalance);
        
        console.log("\n💸 Deployment Cost Analysis:");
        console.log("==============================");
        console.log("Initial Balance:", ethers.utils.formatEther(initialBalance), "S");
        console.log("Final Balance:", ethers.utils.formatEther(finalBalance), "S");
        console.log("Total Cost:", ethers.utils.formatEther(totalCost), "S");
        console.log("Jackpot Funding:", ethers.utils.formatEther(fundingAmount), "S");
        console.log("Gas Costs:", ethers.utils.formatEther(totalCost.sub(fundingAmount)), "S");

        // ============ DEPLOYMENT SUMMARY ============
        const deploymentSummary = {
            timestamp: new Date().toISOString(),
            network: "sonic",
            status: systemReady ? "SUCCESS" : "PARTIAL",
            contracts: {
                // Existing
                lotteryManager: LOTTERY_MANAGER,
                vrfIntegrator: "0x6e11334470df61d62383892bd8e57a3a655718c8",
                // New Oracle System
                chainRegistry: chainRegistry.address,
                dragonMarketOracle: marketOracle.address,
                // New Lottery System
                randomnessProvider: randomnessProvider.address,
                jackpotVault: jackpotVault.address,
                jackpotDistributor: jackpotDistributor.address
            },
            configuration: {
                dragonPriceUSD: ethers.utils.formatEther(dragonPrice.toString()),
                jackpotBalance: ethers.utils.formatEther(rewardPoolBalance),
                fundingAmount: ethers.utils.formatEther(fundingAmount)
            },
            costs: {
                totalCostS: ethers.utils.formatEther(totalCost),
                gasCostS: ethers.utils.formatEther(totalCost.sub(fundingAmount)),
                jackpotFundingS: ethers.utils.formatEther(fundingAmount)
            }
        };

        console.log("\n💾 Complete Deployment Record:");
        console.log(JSON.stringify(deploymentSummary, null, 2));

    } catch (error) {
        console.error("\n❌ Deployment failed:", error.message);
        console.error("Stack:", error.stack);
        throw error;
    }
}

main()
    .then(() => {
        console.log("\n🎯 Complete ecosystem deployment finished!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Fatal deployment error:", error);
        process.exit(1);
    }); 