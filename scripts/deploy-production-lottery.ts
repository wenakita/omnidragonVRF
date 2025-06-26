import { ethers } from "hardhat";

/**
 * Deploy Production OmniDragon Lottery Manager
 * ==========================================
 * 
 * This script deploys the updated lottery manager with integrated
 * cross-chain VRF functionality based on our successful testing.
 * 
 * Features:
 * - Chainlink VRF 2.5 via LayerZero V2 (primary)
 * - Fallback to randomness provider
 * - Automatic VRF callbacks
 * - Sonic FeeM integration
 */

async function main() {
    console.log("🚀 Deploying Production OmniDragon Lottery Manager");
    console.log("==================================================");

    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying with account:", deployer.address);
    console.log("💰 Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "S");

    // Contract addresses (update these for your deployment)
    const VRF_INTEGRATOR = "0x6e11334470df61d62383892bd8e57a3a655718c8"; // Working integrator
    const RANDOMNESS_PROVIDER = "0x0000000000000000000000000000000000000000"; // Optional fallback
    const JACKPOT_VAULT = "0x0000000000000000000000000000000000000000"; // To be deployed separately
    const JACKPOT_DISTRIBUTOR = "0x0000000000000000000000000000000000000000"; // To be deployed separately

    console.log("\n📋 Deployment Configuration:");
    console.log("VRF Integrator:", VRF_INTEGRATOR);
    console.log("Randomness Provider:", RANDOMNESS_PROVIDER || "None");
    console.log("Jackpot Vault:", JACKPOT_VAULT || "None");
    console.log("Jackpot Distributor:", JACKPOT_DISTRIBUTOR || "None");

    try {
        // Deploy the lottery manager
        console.log("\n🏗️ Deploying OmniDragonLotteryManager...");
        
        const LotteryManagerFactory = await ethers.getContractFactory("OmniDragonLotteryManager");
        const lotteryManager = await LotteryManagerFactory.deploy(
            VRF_INTEGRATOR,
            RANDOMNESS_PROVIDER,
            JACKPOT_VAULT,
            JACKPOT_DISTRIBUTOR
        );

        await lotteryManager.deployed();
        console.log("✅ OmniDragonLotteryManager deployed to:", lotteryManager.address);

        // Authorize the lottery manager with the VRF integrator
        if (VRF_INTEGRATOR !== "0x0000000000000000000000000000000000000000") {
            console.log("\n🔐 Authorizing lottery manager with VRF integrator...");
            
            const vrfIntegrator = await ethers.getContractAt(
                "ChainlinkVRFIntegratorV2_5",
                VRF_INTEGRATOR
            );

            try {
                const authTx = await vrfIntegrator.setAuthorizedCaller(lotteryManager.address, true);
                await authTx.wait();
                console.log("✅ Lottery manager authorized with VRF integrator");
            } catch (error: any) {
                console.log("⚠️ Manual authorization needed:", error.message);
                console.log("📝 Run: vrfIntegrator.setAuthorizedCaller('" + lotteryManager.address + "', true)");
            }
        }

        // Fund the lottery manager for VRF operations
        console.log("\n💰 Funding lottery manager for VRF operations...");
        const fundAmount = ethers.utils.parseEther("1.0"); // 1 S for multiple VRF requests
        
        const fundTx = await deployer.sendTransaction({
            to: lotteryManager.address,
            value: fundAmount
        });
        await fundTx.wait();
        console.log("✅ Funded lottery manager with", ethers.utils.formatEther(fundAmount), "S");

        // Verify deployment
        console.log("\n🔍 Verifying deployment...");
        
        const vrfIntegratorAddress = await lotteryManager.vrfIntegrator();
        const balance = await ethers.provider.getBalance(lotteryManager.address);
        const owner = await lotteryManager.owner();
        
        console.log("VRF Integrator:", vrfIntegratorAddress);
        console.log("Contract Balance:", ethers.utils.formatEther(balance), "S");
        console.log("Owner:", owner);

        // Create a test lottery
        console.log("\n🎲 Creating test lottery...");
        
        const createTx = await lotteryManager.createLottery(
            ethers.utils.parseEther("0.1"), // 0.1 S entry fee
            10 // Max 10 participants
        );
        await createTx.wait();
        console.log("✅ Test lottery created (ID: 1)");

        // Get lottery info
        const lotteryInfo = await lotteryManager.getLotteryDetails(1);
        console.log("📊 Test Lottery Details:");
        console.log("  Entry Fee:", ethers.utils.formatEther(lotteryInfo.entryFee), "S");
        console.log("  Max Participants:", lotteryInfo.maxParticipants.toString());
        console.log("  Is Active:", lotteryInfo.isActive);

        console.log("\n🎉 DEPLOYMENT SUCCESSFUL!");
        console.log("=============================");
        console.log("📍 OmniDragonLotteryManager:", lotteryManager.address);
        console.log("🔗 VRF Integrator:", VRF_INTEGRATOR);
        console.log("💰 Contract Balance:", ethers.utils.formatEther(balance), "S");
        console.log("");
        console.log("🎯 Next Steps:");
        console.log("1. Verify contracts on SonicScan");
        console.log("2. Test lottery entry and drawing");
        console.log("3. Monitor VRF fulfillment");
        console.log("4. Deploy jackpot vault and distributor if needed");
        console.log("");
        console.log("🧪 Test Commands:");
        console.log("// Enter lottery");
        console.log(`lotteryManager.enterLottery(1, { value: ethers.utils.parseEther("0.1") })`);
        console.log("// Check lottery status");
        console.log(`lotteryManager.getLotteryDetails(1)`);

        return {
            lotteryManager: lotteryManager.address,
            vrfIntegrator: VRF_INTEGRATOR,
            testLotteryId: 1
        };

    } catch (error: any) {
        console.error("❌ Deployment failed:", error.message);
        throw error;
    }
}

// Test function to demonstrate VRF lottery flow
async function testVRFLottery(lotteryManagerAddress: string) {
    console.log("\n🧪 Testing VRF Lottery Flow");
    console.log("===========================");

    const [deployer, user1, user2] = await ethers.getSigners();
    const lotteryManager = await ethers.getContractAt("OmniDragonLotteryManager", lotteryManagerAddress);

    try {
        // Enter lottery with multiple users
        console.log("👥 Users entering lottery...");
        
        const entryFee = ethers.utils.parseEther("0.1");
        
        const entry1 = await lotteryManager.connect(user1).enterLottery(1, { value: entryFee });
        await entry1.wait();
        console.log("✅ User 1 entered");

        const entry2 = await lotteryManager.connect(user2).enterLottery(1, { value: entryFee });
        await entry2.wait();
        console.log("✅ User 2 entered");

        // Check lottery status
        const details = await lotteryManager.getLotteryDetails(1);
        console.log("📊 Lottery Status:");
        console.log("  Participants:", details.currentParticipants.toString());
        console.log("  Prize Pool:", ethers.utils.formatEther(details.prizePool), "S");
        console.log("  Randomness Source:", details.randomnessSource);

        // Draw lottery (this will trigger VRF request)
        console.log("\n🎲 Drawing lottery...");
        const drawTx = await lotteryManager.drawLottery(1);
        await drawTx.wait();
        console.log("✅ Lottery draw initiated");

        // Check if VRF request was made
        const updatedDetails = await lotteryManager.getLotteryDetails(1);
        console.log("📋 VRF Request Details:");
        console.log("  Request ID:", updatedDetails.vrfRequestId.toString());
        console.log("  VRF Sequence:", updatedDetails.vrfSequence.toString());
        console.log("  Randomness Source:", updatedDetails.randomnessSource);
        console.log("  Fulfilled:", updatedDetails.randomnessFulfilled);

        console.log("\n⏳ Waiting for VRF fulfillment...");
        console.log("Expected time: 2-5 minutes");
        console.log("Monitor the transaction for RandomWordsReceived event");

    } catch (error: any) {
        console.error("❌ Test failed:", error.message);
    }
}

// Export for use in other scripts
export { main as deployLotteryManager, testVRFLottery };

// Run if called directly
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
} 