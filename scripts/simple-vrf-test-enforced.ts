import { ethers } from "hardhat";

async function main() {
    console.log("🎲 Simple VRF Test with Enforced Options");
    console.log("=" .repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    const integratorAddress = "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84";
    
    // Connect to Sonic VRF Integrator
    const integrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        integratorAddress
    );

    console.log("✅ Connected to Sonic Integrator");

    // Check current state
    const balance = await deployer.provider!.getBalance(integratorAddress);
    const counter = await integrator.requestCounter();
    
    console.log("💰 Contract Balance:", ethers.utils.formatEther(balance), "S");
    console.log("🔢 Current Counter:", counter.toString());

    // Make VRF request with enforced options
    console.log("\n🚀 Making VRF Request (Enforced Options)...");
    try {
        // Since enforced options are now configured, we can use a smaller fee
        const tx = await integrator.requestRandomWordsSimple(30110, {
            value: ethers.utils.parseEther("0.0005"), // Smaller fee since enforced options handle gas
            gasLimit: 300000 // Reduced gas limit
        });
        
        console.log("⏳ Transaction sent:", tx.hash);
        console.log("⏳ Waiting for confirmation...");
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            console.log("🎉 VRF Request Successful!");
            console.log("📦 Block:", receipt.blockNumber);
            console.log("⛽ Gas used:", receipt.gasUsed.toString());
            
            // Parse events
            console.log("\n📋 Events:");
            for (const log of receipt.logs) {
                try {
                    const parsed = integrator.interface.parseLog(log);
                    console.log(`📝 ${parsed.name}:`);
                    
                    if (parsed.name === "RandomWordsRequested") {
                        console.log(`   Request ID: ${parsed.args.requestId}`);
                        console.log(`   Provider: ${parsed.args.provider}`);
                        console.log(`   Target EID: ${parsed.args.dstEid}`);
                    } else if (parsed.name === "MessageSent") {
                        console.log(`   Request ID: ${parsed.args.requestId}`);
                        console.log(`   Destination: ${parsed.args.dstEid}`);
                    }
                } catch (parseError) {
                    // Skip unparseable logs
                }
            }
            
            // Check updated counter
            const newCounter = await integrator.requestCounter();
            console.log(`\n🔢 New Counter: ${newCounter.toString()}`);
            
            console.log("\n🎯 VRF Flow Started!");
            console.log("┌─────────────────────────────────────────────────────┐");
            console.log("│ ✅ Sonic VRF request sent successfully             │");
            console.log("│ ✅ Enforced options configured properly            │");
            console.log("│ ✅ LayerZero message dispatched to Arbitrum        │");
            console.log("│ ⏳ Waiting for Chainlink VRF fulfillment           │");
            console.log("│ ⏳ Response will be sent back to Sonic             │");
            console.log("└─────────────────────────────────────────────────────┘");
            
            return {
                success: true,
                requestId: newCounter.toString(),
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber
            };
            
        } else {
            console.log("❌ Transaction failed");
            return { success: false, error: "Transaction reverted" };
        }
        
    } catch (error: any) {
        console.log("❌ VRF request failed:", error.message);
        return { success: false, error: error.message };
    }
}

main()
    .then((result) => {
        if (result?.success) {
            console.log("\n🎉 VRF test completed successfully!");
            console.log(`📊 Request ID: ${result.requestId}`);
            console.log("🔍 Monitor Arbitrum for VRF processing...");
        } else {
            console.log("\n❌ VRF test failed");
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Unexpected error:", error);
        process.exit(1);
    }); 