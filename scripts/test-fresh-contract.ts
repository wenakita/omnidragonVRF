import { ethers } from "hardhat";

/**
 * Test the fresh Sonic integrator contract
 * Check if it works without the 0xc4c52593 configuration conflicts
 */

const FRESH_SONIC_INTEGRATOR = "0x5aCd5D42605b925CEF3d8DdD9e83545E708904B4";
const ARBITRUM_CONSUMER = "0xD192343D5E351C983F6613e6d7c5c33f62C0eea4"; // Existing
const CHAIN_EIDS = {
    ARBITRUM: 30110
};

async function testFreshContract() {
    console.log("🧪 Testing Fresh Sonic Integrator Contract");
    console.log("Checking if it works without LayerZero configuration conflicts");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    // Connect to fresh contract
    const freshIntegrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        FRESH_SONIC_INTEGRATOR
    );

    console.log("✅ Connected to fresh integrator:", FRESH_SONIC_INTEGRATOR);

    // Step 1: Verify basic contract state
    console.log("\n🔍 Step 1: Verifying Contract State...");
    try {
        const endpoint = await freshIntegrator.endpoint();
        const owner = await freshIntegrator.owner();
        const requestCounter = await freshIntegrator.requestCounter();
        
        console.log("✅ Contract verification:");
        console.log("   - Endpoint:", endpoint);
        console.log("   - Owner:", owner);
        console.log("   - Request Counter:", requestCounter.toString());
        console.log("   - Endpoint Correct:", endpoint.toLowerCase() === "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B".toLowerCase());
        
    } catch (error: any) {
        console.log("❌ Contract state check failed:", error.message);
        return false;
    }

    // Step 2: Set peer connection
    console.log("\n🔗 Step 2: Setting Peer Connection...");
    try {
        const arbitrumPeerBytes32 = ethers.utils.hexZeroPad(ARBITRUM_CONSUMER, 32);
        console.log("🎯 Setting Arbitrum peer:", arbitrumPeerBytes32);
        
        const setPeerTx = await freshIntegrator.setPeer(
            CHAIN_EIDS.ARBITRUM,
            arbitrumPeerBytes32,
            { gasLimit: 200000 }
        );
        
        await setPeerTx.wait();
        console.log("✅ Peer connection set successfully!");
        
        // Verify peer was set
        const peer = await freshIntegrator.peers(CHAIN_EIDS.ARBITRUM);
        console.log("🔍 Peer verification:", peer);
        console.log("✅ Peer correct:", peer.toLowerCase() === arbitrumPeerBytes32.toLowerCase());
        
    } catch (error: any) {
        console.log("❌ Peer setting failed:", error.message);
        return false;
    }

    // Step 3: Test quote function (the critical test)
    console.log("\n💰 Step 3: Testing Quote Function...");
    const options = "0x00030100110100000000000000000000000000030d40"; // 200k gas
    
    try {
        console.log("🔍 Calling quote function...");
        console.log("   - Destination EID:", CHAIN_EIDS.ARBITRUM);
        console.log("   - Options:", options);
        
        const fee = await freshIntegrator.quote(CHAIN_EIDS.ARBITRUM, options);
        console.log("✅ QUOTE FUNCTION WORKS!");
        console.log("💰 Native fee:", ethers.utils.formatEther(fee.nativeFee), "ETH");
        console.log("🪙 LZ token fee:", fee.lzTokenFee.toString());
        
        // If quote works, this fresh contract doesn't have the LayerZero config issues!
        return true;
        
    } catch (error: any) {
        console.log("❌ Quote function failed:", error.message);
        
        if (error.message.includes("Please set your OApp's DVNs")) {
            console.log("🚨 Same DVN configuration issue as before");
            console.log("💡 This fresh contract also needs LayerZero configuration");
        } else if (error.message.includes("Peer not set")) {
            console.log("🚨 Peer connection issue");
        } else {
            console.log("🤔 Different error - this might be progress!");
        }
        
        return false;
    }
}

if (require.main === module) {
    testFreshContract()
        .then((quoteWorks) => {
            if (quoteWorks) {
                console.log("\n🎉 FRESH CONTRACT WORKS!");
                console.log("✅ No LayerZero configuration conflicts!");
                console.log("🚀 Ready to configure LayerZero and test VRF!");
            } else {
                console.log("\n❌ Fresh contract has same issues");
                console.log("💡 Need to configure LayerZero properly");
            }
        })
        .catch((error) => {
            console.error("❌ Test failed:", error);
            process.exitCode = 1;
        });
} 