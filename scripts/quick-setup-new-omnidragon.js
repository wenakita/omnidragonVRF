const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Quick setup of new omniDRAGON...");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Contract addresses
    const NEW_OMNIDRAGON = "0x2521f093D012beCDC16336c301A895fbad4DDbC5";
    const OLD_OMNIDRAGON = "0x0E5d746F01f4CDc76320c3349386176a873eAa40";
    const LOTTERY_MANAGER = "0x56eAb9e1f775d0f43cf831d719439e0bF6748234";
    
    console.log("New omniDRAGON:", NEW_OMNIDRAGON);
    console.log("Lottery Manager:", LOTTERY_MANAGER);
    
    try {
        // 1. Get lottery manager contract
        console.log("\n1️⃣ Updating Lottery Manager...");
        const lotteryManager = await ethers.getContractAt("OmniDragonLotteryManager", LOTTERY_MANAGER);
        
        // Unauthorize old omniDRAGON
        console.log("Unauthorizing old omniDRAGON...");
        const unauthorizeTx = await lotteryManager.setAuthorizedSwapContract(
            OLD_OMNIDRAGON,
            false,
            { gasLimit: 200000 }
        );
        await unauthorizeTx.wait();
        console.log("✅ Old omniDRAGON unauthorized");
        
        // Authorize new omniDRAGON
        console.log("Authorizing new omniDRAGON...");
        const authorizeTx = await lotteryManager.setAuthorizedSwapContract(
            NEW_OMNIDRAGON,
            true,
            { gasLimit: 200000 }
        );
        await authorizeTx.wait();
        console.log("✅ New omniDRAGON authorized");
        
        // 2. Verify lottery manager config
        console.log("\n2️⃣ Verifying lottery manager...");
        const isAuthorized = await lotteryManager.authorizedSwapContracts(NEW_OMNIDRAGON);
        console.log("New omniDRAGON authorized:", isAuthorized);
        
        // 3. Get addresses from lottery manager
        console.log("\n3️⃣ Getting core addresses...");
        const jackpotVault = await lotteryManager.jackpotVault();
        const jackpotDistributor = await lotteryManager.jackpotDistributor();
        
        console.log("Jackpot Vault:", jackpotVault);
        console.log("Jackpot Distributor:", jackpotDistributor);
        
        // 4. Set core addresses in new omniDRAGON
        console.log("\n4️⃣ Setting core addresses in new omniDRAGON...");
        const omniDRAGON = await ethers.getContractFactory("omniDRAGON");
        const newContract = omniDRAGON.attach(NEW_OMNIDRAGON);
        
        const setCoreAddressesTx = await newContract.setCoreAddresses(
            jackpotVault,
            jackpotDistributor, // Using jackpot distributor as revenue distributor
            LOTTERY_MANAGER,
            { gasLimit: 200000 }
        );
        await setCoreAddressesTx.wait();
        console.log("✅ Core addresses updated");
        
        // 5. Final verification
        console.log("\n5️⃣ Final verification...");
        const owner = await newContract.owner();
        const totalSupply = await newContract.totalSupply();
        const balance = await newContract.balanceOf(owner);
        const initialized = await newContract.initialized();
        const currentJackpotVault = await newContract.jackpotVault();
        const currentRevenueDistributor = await newContract.revenueDistributor();
        const currentLotteryManager = await newContract.lotteryManager();
        
        console.log("\n🎯 NEW OMNIDRAGON STATUS:");
        console.log("Contract:", NEW_OMNIDRAGON);
        console.log("Owner:", owner);
        console.log("Initialized:", initialized);
        console.log("Total Supply:", ethers.utils.formatEther(totalSupply));
        console.log("Your Balance:", ethers.utils.formatEther(balance));
        console.log("Jackpot Vault:", currentJackpotVault);
        console.log("Revenue Distributor:", currentRevenueDistributor);
        console.log("Lottery Manager:", currentLotteryManager);
        console.log("Authorized in Lottery:", isAuthorized);
        
        console.log("\n🎉 SETUP COMPLETE!");
        console.log("✅ New omniDRAGON is ready to use");
        console.log("✅ Lottery manager updated");
        console.log("✅ All addresses configured");
        console.log("✅ Old contract unauthorized");
        console.log("✅ New contract authorized");
        
        console.log("\n📋 Summary:");
        console.log("===========");
        console.log("🔴 OLD omniDRAGON (BUGGY):", OLD_OMNIDRAGON, "❌ UNAUTHORIZED");
        console.log("🟢 NEW omniDRAGON (FIXED):", NEW_OMNIDRAGON, "✅ AUTHORIZED");
        console.log("🎰 Lottery Manager:", LOTTERY_MANAGER);
        console.log("💰 Jackpot Vault:", currentJackpotVault);
        console.log("💸 Revenue Distributor:", currentRevenueDistributor);
        
    } catch (error) {
        console.error("❌ Setup failed:", error);
        console.error("Error details:", error.message);
        
        if (error.reason) {
            console.error("Reason:", error.reason);
        }
        
        if (error.data) {
            console.error("Data:", error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 