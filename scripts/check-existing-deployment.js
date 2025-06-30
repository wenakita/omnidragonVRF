const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking existing omniDRAGON deployment...");

    const [deployer] = await ethers.getSigners();
    console.log("Checking as:", deployer.address);

    // Existing omniDRAGON address
    const EXISTING_OMNIDRAGON = "0x0E5d746F01f4CDc76320c3349386176a873eAa40";
    const LOTTERY_MANAGER = "0x56eAb9e1f775d0f43cf831d719439e0bF6748234";
    
    console.log("Existing omniDRAGON:", EXISTING_OMNIDRAGON);
    console.log("Lottery Manager:", LOTTERY_MANAGER);

    try {
        // Get the contract instance
        const omniDRAGON = await ethers.getContractAt("omniDRAGON", EXISTING_OMNIDRAGON);
        
        console.log("\n📊 Contract Information:");
        console.log("========================");
        
        // Basic info
        const name = await omniDRAGON.name();
        const symbol = await omniDRAGON.symbol();
        const decimals = await omniDRAGON.decimals();
        const totalSupply = await omniDRAGON.totalSupply();
        
        console.log("Name:", name);
        console.log("Symbol:", symbol);
        console.log("Decimals:", decimals);
        console.log("Total Supply:", ethers.utils.formatEther(totalSupply));
        
        // Ownership and configuration
        const owner = await omniDRAGON.owner();
        const balance = await omniDRAGON.balanceOf(deployer.address);
        
        console.log("Owner:", owner);
        console.log("Your Balance:", ethers.utils.formatEther(balance));
        console.log("You are owner:", owner.toLowerCase() === deployer.address.toLowerCase());
        
        // Core addresses
        console.log("\n🏗️  Core Addresses:");
        console.log("===================");
        
        try {
            const jackpotVault = await omniDRAGON.jackpotVault();
            console.log("Jackpot Vault:", jackpotVault);
        } catch (e) {
            console.log("Jackpot Vault: Not accessible or not set");
        }
        
        try {
            const revenueDistributor = await omniDRAGON.revenueDistributor();
            console.log("Revenue Distributor:", revenueDistributor);
        } catch (e) {
            console.log("Revenue Distributor: Not accessible or not set");
        }
        
        try {
            const lotteryManager = await omniDRAGON.lotteryManager();
            console.log("Lottery Manager:", lotteryManager);
        } catch (e) {
            console.log("Lottery Manager: Not accessible or not set");
        }
        
        try {
            const wrappedNativeToken = await omniDRAGON.wrappedNativeTokenAddress();
            console.log("Wrapped Native Token:", wrappedNativeToken);
        } catch (e) {
            console.log("Wrapped Native Token: Not accessible or not set");
        }
        
        // Check authorization in lottery manager
        console.log("\n🎰 Lottery Manager Authorization:");
        console.log("=================================");
        
        try {
            const lotteryManagerContract = await ethers.getContractAt("OmniDragonLotteryManager", LOTTERY_MANAGER);
            const isAuthorized = await lotteryManagerContract.authorizedSwapContracts(EXISTING_OMNIDRAGON);
            console.log("omniDRAGON authorized in lottery:", isAuthorized);
            
            // Check lottery manager owner
            const lotteryOwner = await lotteryManagerContract.owner();
            console.log("Lottery Manager owner:", lotteryOwner);
            console.log("You are lottery owner:", lotteryOwner.toLowerCase() === deployer.address.toLowerCase());
        } catch (e) {
            console.log("Could not check lottery manager authorization:", e.message);
        }
        
        // Check fee configuration
        console.log("\n💰 Fee Configuration:");
        console.log("=====================");
        
        try {
            const feeInfo = await omniDRAGON.getFeeInfo();
            console.log("Buy Fees:", {
                jackpot: feeInfo.currentBuyFees.jackpot.toString(),
                veDRAGON: feeInfo.currentBuyFees.veDRAGON.toString(),
                burn: feeInfo.currentBuyFees.burn.toString(),
                total: feeInfo.currentBuyFees.total.toString()
            });
        } catch (e) {
            console.log("Could not get fee info - method may not exist");
        }
        
        // Check flags and configuration
        console.log("\n⚙️  Contract State:");
        console.log("===================");
        
        try {
            const config = await omniDRAGON.getConfiguration();
            console.log("Transfers Paused:", config.currentFlags.transfersPaused);
            console.log("Fees Enabled:", config.currentFlags.feesEnabled);
            console.log("Emergency Paused:", config.currentFlags.emergencyPaused);
            console.log("Initial Minting Done:", config.currentFlags.initialMintingDone);
        } catch (e) {
            console.log("Could not get configuration - method may not exist");
        }
        
        // Check if we can call owner functions
        console.log("\n🔧 Functionality Check:");
        console.log("========================");
        
        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
            console.log("✅ You can modify contract settings");
            console.log("✅ You can set core addresses");
            console.log("✅ You can configure fees");
            console.log("✅ You can authorize/unauthorize in lottery manager");
        } else {
            console.log("❌ You cannot modify contract settings (not owner)");
            console.log("⚠️  Need to transfer ownership or use owner account");
        }
        
        // Summary and recommendations
        console.log("\n📋 Analysis Summary:");
        console.log("====================");
        
        const canUseExisting = owner.toLowerCase() === deployer.address.toLowerCase();
        
        if (canUseExisting) {
            console.log("✅ RECOMMENDATION: You can use the existing deployment");
            console.log("📝 Action items:");
            console.log("   1. Apply the lottery entry bug fix (deploy new version)");
            console.log("   2. Apply the fee distribution bug fix (deploy new version)");
            console.log("   3. Or continue with current version if bugs aren't critical");
        } else {
            console.log("⚠️  RECOMMENDATION: Consider deploying a new version");
            console.log("❌ Reason: You don't own the existing contract");
        }
        
        // Check the specific bugs we identified
        console.log("\n🐛 Known Issues in Current Contract:");
        console.log("====================================");
        console.log("1. Lottery entries attributed to router instead of actual user");
        console.log("2. Fees distributed as minted DRAGON tokens instead of native $S");
        console.log("3. These bugs affect lottery fairness and tokenomics");
        
        return {
            canUse: canUseExisting,
            address: EXISTING_OMNIDRAGON,
            owner: owner,
            totalSupply: totalSupply,
            balance: balance
        };
        
    } catch (error) {
        console.error("❌ Error checking deployment:", error.message);
        throw error;
    }
}

main()
    .then((result) => {
        console.log("\n🎯 FINAL RECOMMENDATION:");
        console.log("========================");
        
        if (result.canUse) {
            console.log("🟢 USE EXISTING: You can continue with the existing contract");
            console.log("   Address:", result.address);
            console.log("   BUT consider the known bugs and their impact on your system");
            console.log("   If lottery and fee distribution bugs are critical, deploy new version");
        } else {
            console.log("🔴 DEPLOY NEW: Deploy a new fixed version");
            console.log("   Use the simplified omniDRAGON_CREATE2 we created");
            console.log("   This gives you a clean start with bug fixes");
        }
        
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Check failed:", error);
        process.exit(1);
    }); 