require('dotenv').config();
const { ethers } = require('ethers');

const SONIC_RPC = "https://rpc.soniclabs.com";
const LOTTERY_MANAGER = "0xb6999c369c8f7256902526e7A97c9ea7CE39293e";
const VRF_INTEGRATOR = "0x6e11334470df61d62383892bd8e57a3a655718c8";

// ABI snippets for the functions we need
const LOTTERY_ABI = [
    "function getLotteryDetails(uint256) view returns (uint256 entryFee, uint256 maxParticipants, uint256 currentParticipants, uint256 prizePool, bool isActive, bool isDrawn, uint256 vrfRequestId, uint256 vrfSequence, uint8 randomnessSource, bool randomnessFulfilled, address winner, uint256 randomWord)",
    "function createLottery(uint256 entryFee, uint256 maxParticipants) external",
    "function enterLottery(uint256 lotteryId) external payable",
    "function drawLottery(uint256 lotteryId) external",
    "function owner() view returns (address)"
];

const VRF_ABI = [
    "function requestCounter() view returns (uint256)",
    "function setAuthorizedCaller(address caller, bool authorized) external"
];

async function main() {
    console.log("🎲 Simple VRF Lottery Test");
    console.log("===========================");

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

        // Check lottery status
        console.log("\n🎲 Lottery Status:");
        try {
            const details = await lotteryManager.getLotteryDetails(1);
            console.log("  Entry Fee:", ethers.utils.formatEther(details.entryFee), "S");
            console.log("  Max Participants:", details.maxParticipants.toString());
            console.log("  Current Participants:", details.currentParticipants.toString());
            console.log("  Prize Pool:", ethers.utils.formatEther(details.prizePool), "S");
            console.log("  Is Active:", details.isActive);
            console.log("  Is Drawn:", details.isDrawn);
            console.log("  VRF Request ID:", details.vrfRequestId.toString());
            console.log("  Randomness Source:", details.randomnessSource.toString());
            console.log("  Randomness Fulfilled:", details.randomnessFulfilled);
            
            if (details.winner !== ethers.constants.AddressZero) {
                console.log("  Winner:", details.winner);
                console.log("  Random Word:", details.randomWord.toString());
            }

            // If lottery needs to be drawn and has participants
            if (details.isActive && !details.isDrawn && details.currentParticipants.gt(0)) {
                console.log("\n🎲 Drawing lottery...");
                const drawTx = await lotteryManager.drawLottery(1, {
                    gasLimit: 1000000
                });
                const receipt = await drawTx.wait();
                console.log("✅ Draw TX:", receipt.transactionHash);
                console.log("⛽ Gas Used:", receipt.gasUsed.toString());
                console.log("🔗 View on SonicScan:", `https://sonicscan.org/tx/${receipt.transactionHash}`);
            }

        } catch (lotteryError) {
            console.log("⚠️ Lottery 1 may not exist yet");
            
            // Try to create a lottery
            console.log("\n🎲 Creating new lottery...");
            const createTx = await lotteryManager.createLottery(
                ethers.utils.parseEther("0.05"), // 0.05 S entry fee
                3, // Max 3 participants
                { gasLimit: 300000 }
            );
            await createTx.wait();
            console.log("✅ Lottery created!");
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main()
    .then(() => console.log("✅ Test completed!"))
    .catch(console.error); 