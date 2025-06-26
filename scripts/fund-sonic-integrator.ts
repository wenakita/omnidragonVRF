import { ethers } from "hardhat";

async function main() {
    console.log("💰 Funding Sonic VRF Integrator");
    console.log("=" .repeat(40));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    const integratorAddress = "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84";
    
    // Check current balance
    const currentBalance = await deployer.provider!.getBalance(integratorAddress);
    console.log("💰 Current Balance:", ethers.utils.formatEther(currentBalance), "S");

    // Fund with direct transfer
    console.log("💡 Sending 0.01 S to integrator...");
    const fundTx = await deployer.sendTransaction({
        to: integratorAddress,
        value: ethers.utils.parseEther("0.01"),
        gasLimit: 21000
    });
    
    console.log("⏳ Transaction:", fundTx.hash);
    await fundTx.wait();
    console.log("✅ Transfer confirmed!");

    // Check new balance
    const newBalance = await deployer.provider!.getBalance(integratorAddress);
    console.log("💰 New Balance:", ethers.utils.formatEther(newBalance), "S");

    // Connect to contract and test basic functions
    const integrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        integratorAddress
    );

    console.log("\n🔍 Testing contract functions:");
    
    // Test owner
    try {
        const owner = await integrator.owner();
        console.log("✅ Owner:", owner);
    } catch (e: any) {
        console.log("❌ Owner check failed:", e.message);
    }

    // Test peer
    try {
        const peer = await integrator.peers(30110);
        console.log("✅ Arbitrum Peer:", peer);
    } catch (e: any) {
        console.log("❌ Peer check failed:", e.message);
    }

    // Test counter
    try {
        const counter = await integrator.requestCounter();
        console.log("✅ Request Counter:", counter.toString());
    } catch (e: any) {
        console.log("❌ Counter check failed:", e.message);
    }

    // Test LayerZero endpoint
    try {
        const endpoint = await integrator.endpoint();
        console.log("✅ LayerZero Endpoint:", endpoint);
    } catch (e: any) {
        console.log("❌ Endpoint check failed:", e.message);
    }

    console.log("\n🎯 Funding complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    }); 