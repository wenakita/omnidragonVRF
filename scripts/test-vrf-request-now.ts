import { ethers } from "hardhat";

/**
 * Test an actual VRF request to see if the system works
 * Despite the one failed LayerZero configuration transaction
 */

const CONTRACTS = {
    SONIC_INTEGRATOR: "0x89Ce5E25d8c635Bd41E5Ee33bF7c63DC50A3F0fb",
    ARBITRUM_CONSUMER: "0xD192343D5E351C983F6613e6d7c5c33f62C0eea4"
};

const CHAIN_EIDS = {
    ARBITRUM: 30110
};

async function testVRFRequestNow() {
    console.log("🎲 Testing VRF Request - The Moment of Truth!");
    console.log("Attempting actual VRF request despite LayerZero config issues");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    // Connect to Sonic integrator
    const sonicIntegrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        CONTRACTS.SONIC_INTEGRATOR
    );

    console.log("✅ Connected to Sonic Integrator:", CONTRACTS.SONIC_INTEGRATOR);

    // 1. First try to quote the request
    console.log("\n💰 Step 1: Getting Quote...");
    const options = "0x00030100110100000000000000000000000000030d40"; // 200k gas
    
    let fee;
    try {
        fee = await sonicIntegrator.quote(CHAIN_EIDS.ARBITRUM, options);
        console.log("✅ Quote successful!");
        console.log("💰 Native fee:", ethers.utils.formatEther(fee.nativeFee), "ETH");
        console.log("🪙 LZ token fee:", fee.lzTokenFee.toString());
    } catch (error: any) {
        console.log("❌ Quote failed:", error.message);
        if (error.message.includes("Please set your OApp's DVNs")) {
            console.log("🚨 DVN configuration issue - cannot proceed with request");
            return false;
        }
        console.log("⚠️ Proceeding anyway with estimated fee...");
        fee = { nativeFee: ethers.utils.parseEther("0.01"), lzTokenFee: 0 }; // Estimate
    }

    // 2. Check peer connection
    console.log("\n🔗 Step 2: Checking Peer Connection...");
    try {
        const peer = await sonicIntegrator.peers(CHAIN_EIDS.ARBITRUM);
        console.log("🔗 Arbitrum peer:", peer);
        
        const expectedPeer = "0x00000000000000000000000" + CONTRACTS.ARBITRUM_CONSUMER.slice(2).toLowerCase();
        if (peer.toLowerCase() === expectedPeer.toLowerCase()) {
            console.log("✅ Peer connection is correct!");
        } else {
            console.log("⚠️ Peer connection may be incorrect");
        }
    } catch (error: any) {
        console.log("❌ Could not check peer:", error.message);
    }

    // 3. Fund the contract if needed
    console.log("\n💸 Step 3: Funding Contract...");
    const contractBalance = await ethers.provider.getBalance(CONTRACTS.SONIC_INTEGRATOR);
    console.log("📊 Current contract balance:", ethers.utils.formatEther(contractBalance), "ETH");
    
    const requiredFee = fee.nativeFee;
    if (contractBalance.lt(requiredFee)) {
        console.log("💰 Funding contract with LayerZero fee...");
        try {
            const fundTx = await sonicIntegrator.fundContract({
                value: requiredFee.mul(2), // Fund with 2x the required fee
                gasLimit: 100000
            });
            await fundTx.wait();
            console.log("✅ Contract funded!");
        } catch (error: any) {
            console.log("❌ Funding failed:", error.message);
        }
    } else {
        console.log("✅ Contract has sufficient balance");
    }

    // 4. Attempt VRF request
    console.log("\n🎲 Step 4: Making VRF Request...");
    try {
        const requestTx = await sonicIntegrator.requestRandomWordsSimple(
            CHAIN_EIDS.ARBITRUM,
            {
                value: requiredFee,
                gasLimit: 500000
            }
        );

        console.log("⏳ VRF request submitted...");
        const receipt = await requestTx.wait();
        console.log("✅ VRF request successful!");
        console.log("📋 Transaction:", requestTx.hash);
        console.log("⛽ Gas used:", receipt.gasUsed.toString());

        // Look for events
        const events = receipt.events || [];
        console.log("📡 Events emitted:", events.length);
        
        events.forEach((event: any, index: number) => {
            console.log(`  Event ${index + 1}:`, event.event || 'Unknown');
        });

        console.log("\n🎯 VRF Request Status:");
        console.log("✅ Request submitted to LayerZero");
        console.log("⏳ Waiting for Arbitrum VRF Consumer to process...");
        console.log("🔄 Response will come back via LayerZero");

        return true;

    } catch (error: any) {
        console.log("❌ VRF request failed:", error.message);
        
        if (error.message.includes("Peer not set")) {
            console.log("🚨 Peer connection issue");
        } else if (error.message.includes("DVN")) {
            console.log("🚨 DVN configuration issue");
        } else {
            console.log("🤔 Unknown error - check logs");
        }
        
        return false;
    }
}

if (require.main === module) {
    testVRFRequestNow()
        .then((success) => {
            if (success) {
                console.log("\n🎉 VRF REQUEST SUCCESSFUL!");
                console.log("The system is working! 🚀");
            } else {
                console.log("\n❌ VRF request failed");
                console.log("Need to fix configuration issues");
            }
        })
        .catch((error) => {
            console.error("❌ Script failed:", error);
            process.exitCode = 1;
        });
} 