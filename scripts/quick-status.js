const { ethers } = require("hardhat");

async function main() {
    console.log("Quick Status Check");
    console.log("==================");

    const [signer] = await ethers.getSigners();
    console.log("Account:", signer.address);

    // Check lottery manager
    const lotteryManager = await ethers.getContractAt(
        "OmniDragonLotteryManager",
        "0xb6999c369c8f7256902526e7A97c9ea7CE39293e"
    );

    const owner = await lotteryManager.owner();
    const balance = await ethers.provider.getBalance("0xb6999c369c8f7256902526e7A97c9ea7CE39293e");
    
    console.log("Lottery Manager Owner:", owner);
    console.log("Lottery Manager Balance:", ethers.utils.formatEther(balance), "S");

    // Try to get lottery 1 details
    try {
        const details = await lotteryManager.getLotteryDetails(1);
        console.log("Lottery 1 exists:", details.isActive);
    } catch (error) {
        console.log("Lottery 1 does not exist yet");
    }

    console.log("Status check complete!");
}

main().catch(console.error); 