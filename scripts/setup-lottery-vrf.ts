import { ethers } from "hardhat";

/**
 * Setup Lottery VRF Integration
 * =============================
 * 
 * Complete the setup of the deployed lottery manager:
 * 1. Authorize with VRF integrator
 * 2. Create test lottery
 * 3. Test basic functionality
 */

const LOTTERY_MANAGER = "0xb6999c369c8f7256902526e7A97c9ea7CE39293e";
const VRF_INTEGRATOR = "0x6e11334470df61d62383892bd8e57a3a655718c8";

async function main() {
    console.log("🔧 Setting up Lottery VRF Integration");
    console.log("=====================================");

    const [deployer] = await ethers.getSigners();
    console.log("👤 Account:", deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(await deployer.getBalance()), "S");

    try {
        // 1. Authorize lottery manager with VRF integrator
        console.log("\n🔐 Authorizing lottery manager with VRF integrator...");
        
        const vrfIntegrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            VRF_INTEGRATOR
        );

        const authTx = await vrfIntegrator.setAuthorizedCaller(LOTTERY_MANAGER, true, {
            gasLimit: 100000
        });
        await authTx.wait();
        console.log("✅ Lottery manager authorized!");

        // 2. Connect to lottery manager
        console.log("\n🎲 Connecting to lottery manager...");
        const lotteryManager = await ethers.getContractAt(
            "OmniDragonLotteryManager",
            LOTTERY_MANAGER
        );

        // Check current status
        const vrfIntegratorAddress = await lotteryManager.vrfIntegrator();
        const balance = await ethers.provider.getBalance(LOTTERY_MANAGER);
        const owner = await lotteryManager.owner();
        
        console.log("📊 Lottery Manager Status:");
        console.log("  Address:", LOTTERY_MANAGER);
        console.log("  VRF Integrator:", vrfIntegratorAddress);
        console.log("  Balance:", ethers.utils.formatEther(balance), "S");
        console.log("  Owner:", owner);

        // 3. Create test lottery
        console.log("\n🎲 Creating test lottery...");
        
        const createTx = await lotteryManager.createLottery(
            ethers.utils.parseEther("0.1"), // 0.1 S entry fee
            5, // Max 5 participants (smaller for testing)
            { gasLimit: 500000 }
        );
        await createTx.wait();
        console.log("✅ Test lottery created (ID: 1)");

        // 4. Get lottery details
        const lotteryDetails = await lotteryManager.getLotteryDetails(1);
        console.log("\n📋 Test Lottery Details:");
        console.log("  Entry Fee:", ethers.utils.formatEther(lotteryDetails.entryFee), "S");
        console.log("  Max Participants:", lotteryDetails.maxParticipants.toString());
        console.log("  Current Participants:", lotteryDetails.currentParticipants.toString());
        console.log("  Is Active:", lotteryDetails.isActive);
        console.log("  Randomness Source:", lotteryDetails.randomnessSource);

        console.log("\n🎉 SETUP COMPLETE!");
        console.log("==================");
        console.log("📍 Lottery Manager:", LOTTERY_MANAGER);
        console.log("🔗 VRF Integrator:", VRF_INTEGRATOR);
        console.log("🎲 Test Lottery ID: 1");
        console.log("");
        console.log("🧪 Ready for Testing!");
        console.log("You can now:");
        console.log("1. Enter the lottery with 0.1 S");
        console.log("2. Draw the lottery when ready");
        console.log("3. Watch for VRF fulfillment");

        return {
            lotteryManager: LOTTERY_MANAGER,
            vrfIntegrator: VRF_INTEGRATOR,
            testLotteryId: 1
        };

    } catch (error: any) {
        console.error("❌ Setup failed:", error.message);
        throw error;
    }
}

// Test function to enter and draw lottery
async function testLotteryFlow() {
    console.log("\n🧪 Testing Lottery Flow");
    console.log("=======================");

    const [deployer] = await ethers.getSigners();
    const lotteryManager = await ethers.getContractAt("OmniDragonLotteryManager", LOTTERY_MANAGER);

    try {
        // Enter lottery
        console.log("👤 Entering lottery...");
        const entryTx = await lotteryManager.enterLottery(1, {
            value: ethers.utils.parseEther("0.1"),
            gasLimit: 300000
        });
        await entryTx.wait();
        console.log("✅ Entered lottery successfully!");

        // Check updated status
        const details = await lotteryManager.getLotteryDetails(1);
        console.log("📊 Updated Status:");
        console.log("  Participants:", details.currentParticipants.toString());
        console.log("  Prize Pool:", ethers.utils.formatEther(details.prizePool), "S");

        // Draw lottery if we have participants
        if (details.currentParticipants.gt(0)) {
            console.log("\n🎲 Drawing lottery...");
            const drawTx = await lotteryManager.drawLottery(1, {
                gasLimit: 800000 // Higher gas limit for VRF request
            });
            await drawTx.wait();
            console.log("✅ Lottery draw initiated!");

            // Check VRF request status
            const updatedDetails = await lotteryManager.getLotteryDetails(1);
            console.log("📋 VRF Request Status:");
            console.log("  Request ID:", updatedDetails.vrfRequestId.toString());
            console.log("  VRF Sequence:", updatedDetails.vrfSequence.toString());
            console.log("  Randomness Source:", updatedDetails.randomnessSource);

            console.log("\n⏳ VRF request sent! Waiting for fulfillment...");
            console.log("Expected time: 2-5 minutes");
            console.log("Monitor for RandomWordsReceived event");
        }

    } catch (error: any) {
        console.error("❌ Test failed:", error.message);
    }
}

// Export functions
export { main as setupLotteryVRF, testLotteryFlow };

// Run if called directly
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
} 