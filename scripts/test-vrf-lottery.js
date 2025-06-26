const { ethers } = require("hardhat");

const LOTTERY_MANAGER = "0xb6999c369c8f7256902526e7A97c9ea7CE39293e";
const VRF_INTEGRATOR = "0x6e11334470df61d62383892bd8e57a3a655718c8";

async function main() {
    console.log("🎲 Testing VRF Lottery Integration");
    console.log("==================================");

    const [deployer] = await ethers.getSigners();
    console.log("👤 Account:", deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(await deployer.getBalance()), "S");

    try {
        // Step 1: Connect to contracts
        console.log("\n📡 Connecting to contracts...");
        
        const vrfIntegrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            VRF_INTEGRATOR
        );
        
        const lotteryManager = await ethers.getContractAt(
            "OmniDragonLotteryManager", 
            LOTTERY_MANAGER
        );
        
        console.log("✅ Connected to both contracts");

        // Step 2: Check current status
        console.log("\n📊 Current Status:");
        const vrfCounter = await vrfIntegrator.requestCounter();
        const lotteryBalance = await ethers.provider.getBalance(LOTTERY_MANAGER);
        const lotteryOwner = await lotteryManager.owner();
        
        console.log("  VRF Counter:", vrfCounter.toString());
        console.log("  Lottery Balance:", ethers.utils.formatEther(lotteryBalance), "S");
        console.log("  Lottery Owner:", lotteryOwner);

        // Step 3: Authorize lottery manager
        console.log("\n🔐 Authorizing lottery manager...");
        
        try {
            const authTx = await vrfIntegrator.setAuthorizedCaller(LOTTERY_MANAGER, true, {
                gasLimit: 100000
            });
            await authTx.wait();
            console.log("✅ Authorization successful!");
        } catch (authError) {
            console.log("⚠️ Authorization may already be set or failed:", authError.message.substring(0, 50) + "...");
        }

        // Step 4: Create test lottery
        console.log("\n🎲 Creating test lottery...");
        
        try {
            const createTx = await lotteryManager.createLottery(
                ethers.utils.parseEther("0.05"), // 0.05 S entry fee (lower for testing)
                3, // Max 3 participants (smaller for testing)
                { gasLimit: 300000 }
            );
            await createTx.wait();
            console.log("✅ Test lottery created!");
        } catch (createError) {
            console.log("⚠️ Lottery creation failed or already exists:", createError.message.substring(0, 50) + "...");
        }

        // Step 5: Check lottery details
        console.log("\n📋 Checking lottery 1...");
        
        try {
            const details = await lotteryManager.getLotteryDetails(1);
            console.log("  Entry Fee:", ethers.utils.formatEther(details.entryFee), "S");
            console.log("  Max Participants:", details.maxParticipants.toString());
            console.log("  Current Participants:", details.currentParticipants.toString());
            console.log("  Is Active:", details.isActive);
            console.log("  Is Drawn:", details.isDrawn);
            console.log("  VRF Request ID:", details.vrfRequestId.toString());
            console.log("  Randomness Source:", details.randomnessSource.toString());
            console.log("  Randomness Fulfilled:", details.randomnessFulfilled);

            // Step 6: Enter lottery if active and not full
            if (details.isActive && !details.isDrawn && details.currentParticipants.lt(details.maxParticipants)) {
                console.log("\n👤 Entering lottery...");
                
                const entryTx = await lotteryManager.enterLottery(1, {
                    value: details.entryFee,
                    gasLimit: 200000
                });
                await entryTx.wait();
                console.log("✅ Successfully entered lottery!");

                // Check updated status
                const updatedDetails = await lotteryManager.getLotteryDetails(1);
                console.log("📊 Updated participants:", updatedDetails.currentParticipants.toString());
                console.log("📊 Prize pool:", ethers.utils.formatEther(updatedDetails.prizePool), "S");

                // Step 7: Draw lottery if we have participants
                if (updatedDetails.currentParticipants.gt(0)) {
                    console.log("\n🎲 Drawing lottery (triggering VRF request)...");
                    
                    const drawTx = await lotteryManager.drawLottery(1, {
                        gasLimit: 1000000 // High gas limit for VRF request
                    });
                    const receipt = await drawTx.wait();
                    
                    console.log("✅ Lottery draw transaction successful!");
                    console.log("📋 TX Hash:", receipt.transactionHash);
                    console.log("⛽ Gas Used:", receipt.gasUsed.toString());

                    // Check final status
                    const finalDetails = await lotteryManager.getLotteryDetails(1);
                    console.log("\n📋 Final Lottery Status:");
                    console.log("  VRF Request ID:", finalDetails.vrfRequestId.toString());
                    console.log("  VRF Sequence:", finalDetails.vrfSequence.toString());
                    console.log("  Randomness Source:", finalDetails.randomnessSource.toString());
                    console.log("  Is Drawn:", finalDetails.isDrawn);

                    if (finalDetails.vrfRequestId.gt(0)) {
                        console.log("\n🎉 VRF REQUEST SENT SUCCESSFULLY!");
                        console.log("⏳ Waiting for cross-chain VRF fulfillment...");
                        console.log("🔗 Monitor TX:", `https://sonicscan.org/tx/${receipt.transactionHash}`);
                        console.log("⏱️ Expected fulfillment: 2-5 minutes");
                        console.log("🔍 Watch for RandomWordsReceived event");
                        
                        if (finalDetails.randomnessSource.toString() === "0") {
                            console.log("🌟 Using CHAINLINK VRF (most secure!)");
                        } else {
                            console.log("🔄 Using fallback randomness provider");
                        }
                    } else {
                        console.log("❌ VRF request was not created");
                    }
                }
            } else {
                console.log("ℹ️ Lottery not ready for entry (inactive, drawn, or full)");
            }

        } catch (detailsError) {
            console.log("❌ Could not get lottery details:", detailsError.message);
        }

        console.log("\n✅ Test completed!");

    } catch (error) {
        console.error("❌ Test failed:", error.message);
        console.error("Stack:", error.stack);
    }
}

main()
    .then(() => {
        console.log("\n🎯 Test finished. Check the transaction on SonicScan for VRF events!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    }); 