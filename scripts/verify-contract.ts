import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Verifying Sonic VRF Integrator Contract");
    console.log("=" .repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    const integratorAddress = "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84";
    console.log("📍 Contract Address:", integratorAddress);

    // Check if there's code at the address
    const code = await deployer.provider!.getCode(integratorAddress);
    console.log("📜 Contract Code Length:", code.length);
    console.log("📜 Has Code:", code !== "0x");

    if (code === "0x") {
        console.log("❌ No contract found at this address!");
        return;
    }

    // Try to connect to the contract
    try {
        const integrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            integratorAddress
        );

        console.log("✅ Contract interface loaded");

        // Test basic read functions
        console.log("\n🧪 Testing Contract Functions:");

        // Test 1: Owner
        try {
            const owner = await integrator.owner();
            console.log("✅ Owner:", owner);
        } catch (e: any) {
            console.log("❌ Owner() failed:", e.message);
        }

        // Test 2: Request Counter
        try {
            const counter = await integrator.requestCounter();
            console.log("✅ Request Counter:", counter.toString());
        } catch (e: any) {
            console.log("❌ requestCounter() failed:", e.message);
        }

        // Test 3: LayerZero Endpoint
        try {
            const endpoint = await integrator.endpoint();
            console.log("✅ LayerZero Endpoint:", endpoint);
        } catch (e: any) {
            console.log("❌ endpoint() failed:", e.message);
        }

        // Test 4: Peer for Arbitrum
        try {
            const peer = await integrator.peers(30110);
            console.log("✅ Arbitrum Peer:", peer);
        } catch (e: any) {
            console.log("❌ peers(30110) failed:", e.message);
        }

        // Test 5: Default Gas Limit
        try {
            const gasLimit = await integrator.defaultGasLimit();
            console.log("✅ Default Gas Limit:", gasLimit.toString());
        } catch (e: any) {
            console.log("❌ defaultGasLimit() failed:", e.message);
        }

        // Test 6: Contract Status
        try {
            const [balance, canOperate] = await integrator.getContractStatus();
            console.log("✅ Contract Balance:", ethers.utils.formatEther(balance), "S");
            console.log("✅ Can Operate:", canOperate);
        } catch (e: any) {
            console.log("❌ getContractStatus() failed:", e.message);
        }

        console.log("\n🎯 Contract Verification Complete!");

        // If all basic functions work, try a gas estimation for funding
        console.log("\n⛽ Testing Gas Estimation for Funding:");
        try {
            const gasEstimate = await integrator.estimateGas.fundContract({
                value: ethers.utils.parseEther("0.01")
            });
            console.log("✅ Gas Estimate for funding:", gasEstimate.toString());
        } catch (e: any) {
            console.log("❌ Gas estimation failed:", e.message);
            console.log("🔍 This might explain why funding fails");
        }

    } catch (error: any) {
        console.log("❌ Failed to connect to contract:", error.message);
    }
}

main()
    .then(() => {
        console.log("\n🏁 Verification complete!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Unexpected error:", error);
        process.exit(1);
    }); 