const { ethers } = require("hardhat");

async function main() {
    console.log("Checking Lottery Status");
    console.log("======================");

    const lotteryManager = await ethers.getContractAt(
        "OmniDragonLotteryManager",
        "0xb6999c369c8f7256902526e7A97c9ea7CE39293e"
    );

    try {
        const details = await lotteryManager.getLotteryDetails(1);
        console.log("✅ Lottery 1 exists!");
        console.log("Entry Fee:", ethers.utils.formatEther(details.entryFee), "S");
        console.log("Participants:", details.currentParticipants.toString(), "/", details.maxParticipants.toString());
        console.log("Prize Pool:", ethers.utils.formatEther(details.prizePool), "S");
        console.log("Is Active:", details.isActive);
        console.log("Is Drawn:", details.isDrawn);
        console.log("VRF Request ID:", details.vrfRequestId.toString());
        console.log("Randomness Source:", details.randomnessSource.toString());
        console.log("Randomness Fulfilled:", details.randomnessFulfilled);

        if (details.vrfRequestId.gt(0)) {
            console.log("\n🎉 VRF REQUEST WAS MADE!");
            if (details.randomnessSource.toString() === "0") {
                console.log("🌟 Using Chainlink VRF");
            } else {
                console.log("🔄 Using fallback provider");
            }
        }

    } catch (error) {
        console.log("❌ Lottery 1 does not exist:", error.message);
    }
}

main().catch(console.error); 