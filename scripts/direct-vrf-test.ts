import { ethers } from "hardhat";

async function main() {
    console.log("🎲 Direct Sonic VRF Test (Bypass Quote)");
    console.log("=" .repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);
    console.log("💰 Deployer Balance:", ethers.utils.formatEther(await deployer.getBalance()), "S");

    const integratorAddress = "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84";
    
    // Connect to Sonic VRF Integrator
    const integrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        integratorAddress
    );

    console.log("✅ Connected to Sonic Integrator");

    // Step 1: Fund the integrator directly
    console.log("\n💰 Step 1: Funding integrator...");
    try {
        const currentBalance = await deployer.provider!.getBalance(integratorAddress);
        console.log("   Current Balance:", ethers.utils.formatEther(currentBalance), "S");
        
        if (currentBalance.lt(ethers.utils.parseEther("0.001"))) {
            console.log("   💡 Sending 0.02 S to integrator...");
            const fundTx = await deployer.sendTransaction({
                to: integratorAddress,
                value: ethers.utils.parseEther("0.02"),
                gasLimit: 21000
            });
            
            console.log("   ⏳ Fund TX:", fundTx.hash);
            await fundTx.wait();
            
            const newBalance = await deployer.provider!.getBalance(integratorAddress);
            console.log("   ✅ New Balance:", ethers.utils.formatEther(newBalance), "S");
        } else {
            console.log("   ✅ Sufficient balance already");
        }
    } catch (error: any) {
        console.log("   ❌ Funding failed:", error.message);
        return;
    }

    // Step 2: Check peer configuration
    console.log("\n🔗 Step 2: Checking peer configuration...");
    try {
        const peer = await integrator.peers(30110); // Arbitrum EID
        const expectedPeer = ethers.utils.hexZeroPad("0xD192343D5E351C983F6613e6d7c5c33f62C0eea4", 32);
        console.log("   Arbitrum Peer:", peer);
        console.log("   Expected Peer:", expectedPeer);
        console.log("   ✅ Peer Match:", peer.toLowerCase() === expectedPeer.toLowerCase());
    } catch (error: any) {
        console.log("   ❌ Peer check failed:", error.message);
    }

    // Step 3: Check LayerZero endpoint
    console.log("\n🌐 Step 3: Checking LayerZero endpoint...");
    try {
        const endpoint = await integrator.endpoint();
        console.log("   LayerZero Endpoint:", endpoint);
        console.log("   ✅ Endpoint configured");
    } catch (error: any) {
        console.log("   ❌ Endpoint check failed:", error.message);
    }

    // Step 4: Check request counter
    console.log("\n🔢 Step 4: Checking request counter...");
    try {
        const counter = await integrator.requestCounter();
        console.log("   Current Counter:", counter.toString());
        console.log("   Next Request ID:", counter.add(1).toString());
    } catch (error: any) {
        console.log("   ❌ Counter check failed:", error.message);
    }

    // Step 5: Try VRF request with fixed fee (bypass quote)
    console.log("\n🚀 Step 5: Making VRF request (fixed fee)...");
    try {
        // Use a reasonable fixed fee for LayerZero (0.001 S should be enough)
        const fixedFee = ethers.utils.parseEther("0.001");
        
        console.log("   💸 Using fixed fee:", ethers.utils.formatEther(fixedFee), "S");
        console.log("   🎯 Target: Arbitrum (EID 30110)");
        
        const tx = await integrator.requestRandomWordsSimple(30110, {
            value: fixedFee,
            gasLimit: 500000
        });
        
        console.log("   ⏳ Transaction sent:", tx.hash);
        console.log("   ⏳ Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log("   ✅ Transaction confirmed!");
        console.log("   📦 Block:", receipt.blockNumber);
        console.log("   ⛽ Gas used:", receipt.gasUsed.toString());
        
        // Parse events
        console.log("\n📋 Transaction Events:");
        for (const log of receipt.logs) {
            try {
                const parsed = integrator.interface.parseLog(log);
                console.log(`   📝 ${parsed.name}:`);
                
                if (parsed.name === "RandomWordsRequested") {
                    console.log(`      Request ID: ${parsed.args.requestId}`);
                    console.log(`      Provider: ${parsed.args.provider}`);
                    console.log(`      Target Chain: ${parsed.args.dstEid}`);
                } else if (parsed.name === "MessageSent") {
                    console.log(`      Request ID: ${parsed.args.requestId}`);
                    console.log(`      Destination: ${parsed.args.dstEid}`);
                }
            } catch (parseError) {
                // Skip unparseable logs
            }
        }
        
        // Check updated counter
        const newCounter = await integrator.requestCounter();
        console.log(`\n🔢 Updated Counter: ${newCounter.toString()}`);
        
        console.log("\n🎉 VRF Request Success!");
        console.log("┌─────────────────────────────────────────────────────┐");
        console.log("│ ✅ Sonic VRF request sent successfully             │");
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
        
    } catch (error: any) {
        console.log("   ❌ VRF request failed:", error.message);
        
        // Try to get more details about the error
        if (error.data) {
            console.log("   🔍 Error data:", error.data);
        }
        if (error.reason) {
            console.log("   🔍 Error reason:", error.reason);
        }
        
        return { success: false, error: error.message };
    }
}

main()
    .then((result) => {
        if (result?.success) {
            console.log("\n🎯 Test completed successfully!");
            console.log("📊 Monitor Arbitrum for VRF processing...");
        } else {
            console.log("\n❌ Test failed");
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Unexpected error:", error);
        process.exit(1);
    }); 