import { ethers } from "hardhat";

async function main() {
    console.log("🎲 Simple Sonic VRF Test");
    console.log("=" .repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    // Connect to Sonic VRF Integrator
    const integrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84"
    );

    console.log("✅ Connected to Sonic Integrator");

    // Check contract balance
    const balance = await deployer.provider!.getBalance("0xD4023F563c2ea3Bd477786D99a14b5edA1252A84");
    console.log("💰 Contract Balance:", ethers.utils.formatEther(balance), "S");

    // Check peer connection
    const peer = await integrator.peers(30110); // Arbitrum EID
    const expectedPeer = ethers.utils.hexZeroPad("0xD192343D5E351C983F6613e6d7c5c33f62C0eea4", 32);
    console.log("🔗 Arbitrum Peer:", peer);
    console.log("✅ Peer Match:", peer.toLowerCase() === expectedPeer.toLowerCase());

    // Check request counter
    const counter = await integrator.requestCounter();
    console.log("🔢 Request Counter:", counter.toString());

    // Fund contract if needed
    if (balance.lt(ethers.utils.parseEther("0.001"))) {
        console.log("💡 Funding contract...");
        const fundTx = await integrator.fundContract({
            value: ethers.utils.parseEther("0.01")
        });
        await fundTx.wait();
        console.log("✅ Contract funded!");
    }

    // Make VRF request
    console.log("\n🚀 Making VRF Request...");
    try {
        const tx = await integrator.requestRandomWordsSimple(30110, {
            value: ethers.utils.parseEther("0.005"), // Send some ETH for LayerZero fees
            gasLimit: 500000
        });
        
        console.log("⏳ Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed!");
        console.log("⛽ Gas used:", receipt.gasUsed.toString());
        
        // Parse events
        for (const log of receipt.logs) {
            try {
                const parsed = integrator.interface.parseLog(log);
                console.log("📝 Event:", parsed.name);
                if (parsed.name === "RandomWordsRequested") {
                    console.log("   Request ID:", parsed.args.requestId.toString());
                    console.log("   Provider:", parsed.args.provider);
                }
            } catch (e) {
                // Skip unparseable logs
            }
        }
        
    } catch (error: any) {
        console.log("❌ Request failed:", error.message);
    }

    console.log("\n🎯 Test Complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    }); 