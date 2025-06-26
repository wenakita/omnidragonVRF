require('dotenv').config();
const { ethers } = require('ethers');

const SONIC_RPC = "https://rpc.soniclabs.com";
const LOTTERY_MANAGER = "0xb6999c369c8f7256902526e7A97c9ea7CE39293e";
const VRF_INTEGRATOR = "0x6e11334470df61d62383892bd8e57a3a655718c8";

// ABI snippets for the functions we need
const LOTTERY_ABI = [
    "function getLotteryDetails(uint256) view returns (uint256 entryFee, uint256 maxParticipants, uint256 currentParticipants, uint256 prizePool, bool isActive, bool isDrawn, uint256 vrfRequestId, uint64 vrfSequence, uint8 randomnessSource, bool randomnessFulfilled)",
    "function createLottery(uint256 entryFee, uint256 maxParticipants) external returns (uint256)",
    "function enterLottery(uint256 lotteryId) external payable",
    "function drawLottery(uint256 lotteryId) external",
    "function owner() view returns (address)",
    "function nextLotteryId() view returns (uint256)",
    "event LotteryCreated(uint256 indexed lotteryId, uint256 entryFee, uint256 maxParticipants)",
    "event LotteryEntered(uint256 indexed lotteryId, address indexed participant, uint256 entryFee)",
    "event LotteryDrawn(uint256 indexed lotteryId, address indexed winner, uint256 prizeAmount, uint256 randomWord)"
];

const VRF_ABI = [
    "function requestCounter() view returns (uint256)",
    "function setAuthorizedCaller(address caller, bool authorized) external",
    "function isAuthorizedCaller(address caller) view returns (bool)"
];

async function main() {
    console.log("🎲 Comprehensive VRF Lottery Test");
    console.log("==================================");

    // Connect to Sonic network
    const provider = new ethers.providers.JsonRpcProvider(SONIC_RPC);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log("👤 Account:", wallet.address);
    const balance = await wallet.getBalance();
    console.log("💰 Balance:", ethers.utils.formatEther(balance), "S");

    // Connect to contracts
    const lotteryManager = new ethers.Contract(LOTTERY_MANAGER, LOTTERY_ABI, wallet);
    const vrfIntegrator = new ethers.Contract(VRF_INTEGRATOR, VRF_ABI, wallet);

    try {
        // Check VRF status
        console.log("\n📊 VRF Status:");
        const vrfCounter = await vrfIntegrator.requestCounter();
        console.log("  Request Counter:", vrfCounter.toString());

        // Check authorization
        try {
            const isAuthorized = await vrfIntegrator.isAuthorizedCaller(LOTTERY_MANAGER);
            console.log("  Lottery Manager Authorized:", isAuthorized);
            
            if (!isAuthorized) {
                console.log("🔐 Authorizing lottery manager...");
                const authTx = await vrfIntegrator.setAuthorizedCaller(LOTTERY_MANAGER, true, {
                    gasLimit: 100000
                });
                await authTx.wait();
                console.log("✅ Authorization successful!");
            }
        } catch (authError) {
            console.log("⚠️ Could not check/set authorization:", authError.message.substring(0, 50) + "...");
        }

        // Check lottery counter
        let lotteryCounter = 0;
        try {
            lotteryCounter = await lotteryManager.nextLotteryId();
            console.log("\n🎲 Lottery Counter:", lotteryCounter.toString());
        } catch (counterError) {
            console.log("⚠️ Could not get lottery counter, trying manual search...");
        }

        // Check recent lotteries (IDs 1-20)
        console.log("\n🔍 Checking recent lotteries:");
        let foundLottery = null;
        let foundLotteryId = 0;

        for (let i = 1; i <= 20; i++) {
            try {
                const details = await lotteryManager.getLotteryDetails(i);
                console.log(`\n  📋 Lottery ${i}:`);
                console.log("    Entry Fee:", ethers.utils.formatEther(details.entryFee), "S");
                console.log("    Max Participants:", details.maxParticipants.toString());
                console.log("    Current Participants:", details.currentParticipants.toString());
                console.log("    Prize Pool:", ethers.utils.formatEther(details.prizePool), "S");
                console.log("    Is Active:", details.isActive);
                console.log("    Is Drawn:", details.isDrawn);
                console.log("    VRF Request ID:", details.vrfRequestId.toString());
                console.log("    VRF Sequence:", details.vrfSequence.toString());
                console.log("    Randomness Source:", details.randomnessSource.toString());
                console.log("    Randomness Fulfilled:", details.randomnessFulfilled);
                
                if (details.winner !== ethers.constants.AddressZero) {
                    console.log("    Winner:", details.winner);
                    console.log("    Random Word:", details.randomWord.toString());
                }

                // Save the first active lottery we find
                if (details.isActive && !foundLottery) {
                    foundLottery = details;
                    foundLotteryId = i;
                }

            } catch (detailsError) {
                // Only log first few failures to avoid spam
                if (i <= 5) {
                    console.log(`  ❌ Lottery ${i}: Not found or error`);
                }
            }
        }

        // If no active lottery found, create one
        if (!foundLottery) {
            console.log("\n🎲 Creating new test lottery...");
            const createTx = await lotteryManager.createLottery(
                ethers.utils.parseEther("0.05"), // 0.05 S entry fee
                2, // Max 2 participants for quick testing
                { gasLimit: 300000 }
            );
            const receipt = await createTx.wait();
            console.log("✅ Lottery created! TX:", receipt.transactionHash);

            // Try to find the newly created lottery
            for (let i = 1; i <= 20; i++) {
                try {
                    const details = await lotteryManager.getLotteryDetails(i);
                    if (details.isActive && !details.isDrawn) {
                        foundLottery = details;
                        foundLotteryId = i;
                        console.log(`✅ Found new lottery at ID ${i}`);
                        break;
                    }
                } catch (error) {
                    // Continue searching
                }
            }
        }

        // If we found an active lottery, let's interact with it
        if (foundLottery && foundLotteryId > 0) {
            console.log(`\n🎯 Working with Lottery ${foundLotteryId}`);
            
            // Enter the lottery if we can
            if (foundLottery.currentParticipants < foundLottery.maxParticipants) {
                console.log("👤 Entering lottery...");
                const entryTx = await lotteryManager.enterLottery(foundLotteryId, {
                    value: foundLottery.entryFee,
                    gasLimit: 200000
                });
                await entryTx.wait();
                console.log("✅ Successfully entered!");

                // Check updated status
                const updatedDetails = await lotteryManager.getLotteryDetails(foundLotteryId);
                console.log("📊 Updated participants:", updatedDetails.currentParticipants.toString());
                console.log("📊 Prize pool:", ethers.utils.formatEther(updatedDetails.prizePool), "S");

                // If we have participants, draw the lottery
                if (updatedDetails.currentParticipants > 0) {
                    console.log("\n🎲 Drawing lottery (triggering VRF)...");
                    const drawTx = await lotteryManager.drawLottery(foundLotteryId, {
                        gasLimit: 1000000
                    });
                    const receipt = await drawTx.wait();
                    
                    console.log("🎉 LOTTERY DRAWN SUCCESSFULLY!");
                    console.log("📋 TX Hash:", receipt.transactionHash);
                    console.log("⛽ Gas Used:", receipt.gasUsed.toString());
                    console.log("🔗 SonicScan:", `https://sonicscan.org/tx/${receipt.transactionHash}`);

                    // Check final status
                    const finalDetails = await lotteryManager.getLotteryDetails(foundLotteryId);
                    console.log("\n📋 Final Status:");
                    console.log("  VRF Request ID:", finalDetails.vrfRequestId.toString());
                    console.log("  VRF Sequence:", finalDetails.vrfSequence.toString());
                    console.log("  Randomness Source:", finalDetails.randomnessSource.toString());
                    console.log("  Is Drawn:", finalDetails.isDrawn);

                    if (finalDetails.vrfRequestId.gt(0)) {
                        console.log("\n🎉 VRF REQUEST SUCCESSFUL!");
                        console.log("⏳ Cross-chain VRF request sent to Arbitrum");
                        console.log("🔗 Monitor fulfillment on SonicScan");
                        console.log("⏱️ Expected completion: 2-5 minutes");
                        
                        if (finalDetails.randomnessSource.toString() === "0") {
                            console.log("🌟 Using CHAINLINK VRF (most secure!)");
                        } else {
                            console.log("🔄 Using fallback randomness");
                        }
                    }
                }
            } else {
                console.log("ℹ️ Lottery is full, cannot enter");
            }
        } else {
            console.log("❌ No active lottery found to test with");
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error("Stack:", error.stack);
    }
}

main()
    .then(() => console.log("\n✅ Comprehensive test completed!"))
    .catch(console.error); 