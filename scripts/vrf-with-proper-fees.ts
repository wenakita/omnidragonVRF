import { ethers } from "hardhat";

async function main() {
    console.log("🎲 VRF Test with Proper Fee Estimation");
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
    const gasLimit = await integrator.defaultGasLimit();
    
    console.log("💰 Contract Balance:", ethers.utils.formatEther(balance), "S");
    console.log("🔢 Current Counter:", counter.toString());
    console.log("⛽ Default Gas Limit:", gasLimit.toString());

    // Try to estimate the LayerZero fee properly
    console.log("\n💸 Estimating LayerZero fees...");
    
    // For LayerZero V2 with enforced options, we need to estimate based on:
    // 1. The payload size
    // 2. The enforced options (690,420 gas)
    // 3. Cross-chain message overhead
    
    let estimatedFee;
    try {
        // Try the quote function with empty options (enforced options will be used)
        const fee = await integrator.quote(30110, "0x");
        estimatedFee = fee.nativeFee;
        console.log("✅ LayerZero fee estimate:", ethers.utils.formatEther(estimatedFee), "S");
    } catch (quoteError: any) {
        console.log("❌ Quote function failed:", quoteError.message);
        console.log("💡 Using manual fee estimation...");
        
        // Manual estimation based on typical LayerZero V2 costs
        // Base fee + gas cost for 690,420 gas on Arbitrum
        // Arbitrum gas is much cheaper than mainnet, but LayerZero adds overhead
        estimatedFee = ethers.utils.parseEther("0.005"); // 0.005 S should be sufficient
        console.log("📊 Manual fee estimate:", ethers.utils.formatEther(estimatedFee), "S");
    }

    // Add a 50% buffer to ensure success
    const feeWithBuffer = estimatedFee.mul(150).div(100);
    console.log("🛡️ Fee with 50% buffer:", ethers.utils.formatEther(feeWithBuffer), "S");

    // Make VRF request with proper fees
    console.log("\n🚀 Making VRF Request with Proper Fees...");
    try {
        const tx = await integrator.requestRandomWordsSimple(30110, {
            value: feeWithBuffer,
            gasLimit: 400000 // Increased gas limit for the transaction itself
        });
        
        console.log("⏳ Transaction sent:", tx.hash);
        console.log("💰 Fee sent:", ethers.utils.formatEther(feeWithBuffer), "S");
        console.log("⏳ Waiting for confirmation...");
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            console.log("🎉 VRF Request Successful!");
            console.log("📦 Block:", receipt.blockNumber);
            console.log("⛽ Gas used:", receipt.gasUsed.toString());
            console.log("💵 Transaction cost:", ethers.utils.formatEther(receipt.gasUsed.mul(receipt.effectiveGasPrice)), "S");
            
            // Parse events
            console.log("\n📋 Transaction Events:");
            let requestId = null;
            for (const log of receipt.logs) {
                try {
                    const parsed = integrator.interface.parseLog(log);
                    console.log(`📝 ${parsed.name}:`);
                    
                    if (parsed.name === "RandomWordsRequested") {
                        requestId = parsed.args.requestId.toString();
                        console.log(`   Request ID: ${requestId}`);
                        console.log(`   Provider: ${parsed.args.provider}`);
                        console.log(`   Target EID: ${parsed.args.dstEid}`);
                    } else if (parsed.name === "MessageSent") {
                        console.log(`   Request ID: ${parsed.args.requestId}`);
                        console.log(`   Destination: ${parsed.args.dstEid}`);
                        console.log(`   Message: ${parsed.args.message.slice(0, 20)}...`);
                    }
                } catch (parseError) {
                    // Skip unparseable logs
                }
            }
            
            // Check updated counter
            const newCounter = await integrator.requestCounter();
            console.log(`\n🔢 Updated Counter: ${newCounter.toString()}`);
            
            // Check remaining balance
            const newBalance = await deployer.provider!.getBalance(integratorAddress);
            console.log(`💰 Remaining Balance: ${ethers.utils.formatEther(newBalance)} S`);
            
            console.log("\n🎯 Cross-Chain VRF Flow Initiated!");
            console.log("┌─────────────────────────────────────────────────────┐");
            console.log("│ ✅ Sonic VRF request sent with adequate fees       │");
            console.log("│ ✅ LayerZero message dispatched to Arbitrum        │");
            console.log("│ ✅ Enforced options: 690,420 gas for VRF callback  │");
            console.log("│ ⏳ Waiting for Chainlink VRF fulfillment (~2 min)  │");
            console.log("│ ⏳ Response will be sent back to Sonic             │");
            console.log("└─────────────────────────────────────────────────────┘");
            
            if (requestId) {
                console.log(`\n🆔 Request ID: ${requestId}`);
                console.log("🔍 To check if fulfilled later, run:");
                console.log(`   integrator.getRandomWord(${requestId})`);
            }
            
            return {
                success: true,
                requestId: requestId || newCounter.toString(),
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                feePaid: ethers.utils.formatEther(feeWithBuffer)
            };
            
        } else {
            console.log("❌ Transaction failed (status: 0)");
            return { success: false, error: "Transaction reverted" };
        }
        
    } catch (error: any) {
        console.log("❌ VRF request failed:", error.message);
        
        if (error.message.includes("insufficient funds") || error.message.includes("fee")) {
            console.log("💡 Try increasing the fee amount");
            console.log("💡 Current fee:", ethers.utils.formatEther(feeWithBuffer), "S");
            console.log("💡 Suggested fee:", ethers.utils.formatEther(feeWithBuffer.mul(2)), "S");
        }
        
        return { success: false, error: error.message };
    }
}

main()
    .then((result) => {
        if (result?.success) {
            console.log("\n🎉 VRF request submitted successfully!");
            console.log(`📊 Request ID: ${result.requestId}`);
            console.log(`💰 Fee paid: ${result.feePaid} S`);
            console.log("⏱️ Expected fulfillment: 1-3 minutes");
            console.log("🔍 Monitor both Sonic and Arbitrum for events");
        } else {
            console.log("\n❌ VRF request failed");
            console.log("💡 Check fee amount and try again");
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Unexpected error:", error);
        process.exit(1);
    }); 