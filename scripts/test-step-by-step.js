const { ethers } = require("hardhat");

const LOTTERY_MANAGER = "0xb6999c369c8f7256902526e7A97c9ea7CE39293e";
const VRF_INTEGRATOR = "0x6e11334470df61d62383892bd8e57a3a655718c8";

async function main() {
    console.log("Step-by-Step VRF Lottery Test");
    console.log("=============================");

    const [signer] = await ethers.getSigners();
    console.log("Account:", signer.address);
    console.log("Balance:", ethers.utils.formatEther(await signer.getBalance()), "S");

    // Step 1: Connect to contracts
    const vrfIntegrator = await ethers.getContractAt("ChainlinkVRFIntegratorV2_5", VRF_INTEGRATOR);
    const lotteryManager = await ethers.getContractAt("OmniDragonLotteryManager", LOTTERY_MANAGER);
    console.log("✅ Connected to contracts");

    // Step 2: Authorize lottery manager
    console.log("\n🔐 Step 2: Authorizing lottery manager...");
    try {
        const authTx = await vrfIntegrator.setAuthorizedCaller(LOTTERY_MANAGER, true);
        await authTx.wait();
        console.log("✅ Authorization successful");
    } catch (error) {
        console.log("⚠️ Authorization may already exist:", error.message.substring(0, 50));
    }

    // Step 3: Create lottery
    console.log("\n🎲 Step 3: Creating lottery...");
    try {
        const createTx = await lotteryManager.createLottery(
            ethers.utils.parseEther("0.05"), // 0.05 S entry
            2, // Max 2 participants
            { gasLimit: 300000 }
        );
        await createTx.wait();
        console.log("✅ Lottery created");
    } catch (error) {
        console.log("⚠️ Lottery may already exist:", error.message.substring(0, 50));
    }

    // Step 4: Check lottery details
    console.log("\n📋 Step 4: Checking lottery details...");
    const details = await lotteryManager.getLotteryDetails(1);
    console.log("Entry Fee:", ethers.utils.formatEther(details.entryFee), "S");
    console.log("Max Participants:", details.maxParticipants.toString());
    console.log("Current Participants:", details.currentParticipants.toString());
    console.log("Is Active:", details.isActive);
    console.log("Randomness Source:", details.randomnessSource.toString());

    // Step 5: Enter lottery
    console.log("\n👤 Step 5: Entering lottery...");
    const entryTx = await lotteryManager.enterLottery(1, {
        value: details.entryFee,
        gasLimit: 200000
    });
    await entryTx.wait();
    console.log("✅ Entered lottery");

    // Step 6: Check updated details
    const updatedDetails = await lotteryManager.getLotteryDetails(1);
    console.log("Updated Participants:", updatedDetails.currentParticipants.toString());
    console.log("Prize Pool:", ethers.utils.formatEther(updatedDetails.prizePool), "S");

    // Step 7: Draw lottery (trigger VRF)
    console.log("\n🎲 Step 7: Drawing lottery (triggering VRF)...");
    const drawTx = await lotteryManager.drawLottery(1, {
        gasLimit: 1000000
    });
    const receipt = await drawTx.wait();
    
    console.log("✅ Draw transaction successful!");
    console.log("TX Hash:", receipt.transactionHash);
    console.log("Gas Used:", receipt.gasUsed.toString());
    console.log("SonicScan:", `https://sonicscan.org/tx/${receipt.transactionHash}`);

    // Step 8: Check final status
    console.log("\n📊 Step 8: Final status...");
    const finalDetails = await lotteryManager.getLotteryDetails(1);
    console.log("VRF Request ID:", finalDetails.vrfRequestId.toString());
    console.log("VRF Sequence:", finalDetails.vrfSequence.toString());
    console.log("Randomness Source:", finalDetails.randomnessSource.toString());
    console.log("Is Drawn:", finalDetails.isDrawn);

    if (finalDetails.vrfRequestId.gt(0)) {
        console.log("\n🎉 SUCCESS! VRF REQUEST SENT!");
        console.log("⏳ Waiting for cross-chain fulfillment...");
        console.log("🔍 Monitor the transaction for RandomWordsReceived event");
        
        if (finalDetails.randomnessSource.toString() === "0") {
            console.log("🌟 Using CHAINLINK VRF (most secure)");
        }
    } else {
        console.log("❌ VRF request failed");
    }

    console.log("\n✅ Test completed!");
}

main().catch(console.error); 