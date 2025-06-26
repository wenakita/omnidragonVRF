import { ethers } from "hardhat";

/**
 * Test VRF Request from Sonic to Multi-Chain Arbitrum Consumer
 * Flow: Sonic Integrator → Arbitrum Consumer → Chainlink VRF → Arbitrum Consumer → Sonic Integrator
 */

const CONTRACTS = {
    SONIC_INTEGRATOR: "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84",
    ARBITRUM_CONSUMER: "0xD192343D5E351C983F6613e6d7c5c33f62C0eea4"
};

const CHAIN_EIDS = {
    SONIC: 30332,
    ARBITRUM: 30110
};

async function testSonicVRFRequest() {
    console.log("🎲 Testing Sonic VRF Request to Multi-Chain Consumer");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Requester:", deployer.address);

    // Connect to Sonic VRF Integrator
    console.log("\n🔗 Connecting to Sonic VRF Integrator...");
    const sonicIntegrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        CONTRACTS.SONIC_INTEGRATOR
    );

    console.log(`✅ Connected to Sonic Integrator: ${CONTRACTS.SONIC_INTEGRATOR}`);

    // Check Sonic integrator status
    console.log("\n📊 Sonic Integrator Status:");
    try {
        const balance = await deployer.provider!.getBalance(CONTRACTS.SONIC_INTEGRATOR);
        const owner = await sonicIntegrator.owner();
        const peer = await sonicIntegrator.peers(CHAIN_EIDS.ARBITRUM);
        
        console.log(`   Balance: ${ethers.utils.formatEther(balance)} S`);
        console.log(`   Owner: ${owner}`);
        console.log(`   Arbitrum Peer: ${peer}`);
        
        // Check if peer is set correctly
        const expectedPeer = ethers.utils.hexZeroPad(CONTRACTS.ARBITRUM_CONSUMER, 32);
        const isPeerSet = peer.toLowerCase() === expectedPeer.toLowerCase();
        console.log(`   Peer Correctly Set: ${isPeerSet ? '✅ Yes' : '❌ No'}`);
        
        if (!isPeerSet) {
            console.log(`   Expected: ${expectedPeer}`);
            console.log(`   Actual: ${peer}`);
        }
    } catch (error: any) {
        console.log(`   ❌ Error checking status: ${error.message}`);
    }

    // Get LayerZero fee estimate
    console.log("\n💰 LayerZero Fee Estimate:");
    try {
        // Create empty options for simple quote
        const options = "0x"; // Empty options
        const fee = await sonicIntegrator.quote(CHAIN_EIDS.ARBITRUM, options);
        console.log(`   Required Fee: ${ethers.utils.formatEther(fee.nativeFee)} S`);
        
        // Check if integrator has enough balance
        const integratorBalance = await deployer.provider!.getBalance(CONTRACTS.SONIC_INTEGRATOR);
        const hasEnoughBalance = integratorBalance.gte(fee.nativeFee);
        console.log(`   Integrator Has Enough Balance: ${hasEnoughBalance ? '✅ Yes' : '❌ No'}`);
        
        if (!hasEnoughBalance) {
            console.log("   💡 Funding integrator with additional S...");
            try {
                const fundTx = await sonicIntegrator.fundContract({
                    value: ethers.utils.parseEther("0.01")
                });
                await fundTx.wait();
                console.log("   ✅ Integrator funded!");
            } catch (fundError: any) {
                console.log(`   ❌ Funding failed: ${fundError.message}`);
            }
        }
    } catch (error: any) {
        console.log(`   ❌ Error getting fee: ${error.message}`);
    }

    // Check current request counter
    console.log("\n🔢 Request Counter:");
    try {
        const currentCounter = await sonicIntegrator.requestCounter();
        console.log(`   Current Counter: ${currentCounter}`);
        console.log(`   Next Request ID: ${currentCounter.add(1)}`);
    } catch (error: any) {
        console.log(`   ❌ Error getting counter: ${error.message}`);
    }

    // Initiate VRF Request
    console.log("\n🚀 Initiating VRF Request from Sonic...");
    let requestTx: any;
    try {
        // Use the simple request function with required fee
        const options = "0x"; // Empty options for simple request
        const fee = await sonicIntegrator.quote(CHAIN_EIDS.ARBITRUM, options);
        
        requestTx = await sonicIntegrator.requestRandomWordsSimple(CHAIN_EIDS.ARBITRUM, {
            value: fee.nativeFee,
            gasLimit: 500000,
            gasPrice: ethers.utils.parseUnits("1", "gwei")
        });
        
        console.log(`   ⏳ Transaction sent: ${requestTx.hash}`);
        console.log("   ⏳ Waiting for confirmation...");
        
        const receipt = await requestTx.wait();
        console.log(`   ✅ Request confirmed in block ${receipt.blockNumber}`);
        console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);

        // Parse events from the transaction
        console.log("\n📋 Transaction Events:");
        for (const log of receipt.logs) {
            try {
                const parsed = sonicIntegrator.interface.parseLog(log);
                console.log(`   📝 ${parsed.name}:`);
                
                if (parsed.name === "RandomWordsRequested") {
                    console.log(`      Request ID: ${parsed.args.requestId}`);
                    console.log(`      Provider: ${parsed.args.provider}`);
                    console.log(`      Destination EID: ${parsed.args.dstEid}`);
                } else if (parsed.name === "MessageSent") {
                    console.log(`      Request ID: ${parsed.args.requestId}`);
                    console.log(`      Destination EID: ${parsed.args.dstEid}`);
                    console.log(`      Message: ${parsed.args.message}`);
                }
            } catch (parseError) {
                // Skip unparseable logs
            }
        }

    } catch (error: any) {
        console.log(`   ❌ Request failed: ${error.message}`);
        return { success: false, error: error.message };
    }

    // Monitor for response (this would normally take some time)
    console.log("\n👀 Monitoring for VRF Response...");
    console.log("   📡 The flow is now:");
    console.log("   1. ✅ Sonic → LayerZero → Arbitrum (Request sent)");
    console.log("   2. ⏳ Arbitrum → Chainlink VRF (Processing...)");
    console.log("   3. ⏳ Chainlink VRF → Arbitrum (Waiting for randomness...)");
    console.log("   4. ⏳ Arbitrum → LayerZero → Sonic (Response pending...)");

    console.log("\n🔍 To monitor the complete flow:");
    console.log("   1. Check Arbitrum VRF Consumer for VRF request events");
    console.log("   2. Wait for Chainlink VRF fulfillment (~1-3 minutes)");
    console.log("   3. Check Sonic Integrator for response events");

    console.log("\n🎯 VRF Request Test Summary:");
    console.log("┌─────────────────────────────────────────────────────┐");
    console.log("│ ✅ Sonic VRF request initiated successfully        │");
    console.log("│ ✅ LayerZero message sent to Arbitrum              │");
    console.log("│ ⏳ Waiting for Chainlink VRF fulfillment           │");
    console.log("│ ⏳ Response will be sent back to Sonic             │");
    console.log("└─────────────────────────────────────────────────────┘");

    return {
        success: true,
        sonicIntegrator: CONTRACTS.SONIC_INTEGRATOR,
        arbitrumConsumer: CONTRACTS.ARBITRUM_CONSUMER,
        transactionHash: requestTx.hash
    };
}

/**
 * Check for VRF response on Sonic (run this after the request)
 */
async function checkSonicVRFResponse(requestId: number) {
    console.log(`\n🔍 Checking for VRF response (Request ID: ${requestId})...`);
    
    const sonicIntegrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        CONTRACTS.SONIC_INTEGRATOR
    );

    try {
        const [randomWord, fulfilled] = await sonicIntegrator.getRandomWord(requestId);
        
        console.log(`   Request ID: ${requestId}`);
        console.log(`   Fulfilled: ${fulfilled}`);
        console.log(`   Random Word: ${randomWord}`);
        
        if (fulfilled && randomWord.gt(0)) {
            console.log("   🎉 VRF Response received successfully!");
            return { fulfilled: true, randomWord: randomWord.toString() };
        } else {
            console.log("   ⏳ Still waiting for VRF response...");
            return { fulfilled: false };
        }
    } catch (error: any) {
        console.log(`   ❌ Error checking response: ${error.message}`);
        return { fulfilled: false, error: error.message };
    }
}

// Export functions
export { testSonicVRFRequest, checkSonicVRFResponse };

// Run if called directly
if (require.main === module) {
    testSonicVRFRequest()
        .then((result) => {
            if (result.success) {
                console.log(`\n🎉 Sonic VRF Request Test Complete!`);
                console.log(`📋 Transaction: ${result.transactionHash}`);
                console.log("🕐 Check back in 2-3 minutes for the VRF response!");
            } else {
                console.log(`\n❌ Test Failed: ${result.error}`);
            }
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Test error:", error);
            process.exit(1);
        });
} 