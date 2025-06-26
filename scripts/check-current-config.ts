import { ethers } from "hardhat";

/**
 * Check current LayerZero configuration status
 * See what's working and what still needs to be configured
 */

const CONTRACTS = {
    SONIC_INTEGRATOR: "0x89Ce5E25d8c635Bd41E5Ee33bF7c63DC50A3F0fb",
    ARBITRUM_CONSUMER: "0xD192343D5E351C983F6613e6d7c5c33f62C0eea4"
};

const CHAIN_EIDS = {
    ARBITRUM: 30110,
    SONIC: 30332
};

async function checkCurrentConfig() {
    console.log("🔍 Checking Current LayerZero Configuration");
    console.log("=" .repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    // Connect to Sonic integrator
    const sonicIntegrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        CONTRACTS.SONIC_INTEGRATOR
    );

    console.log("✅ Connected to Sonic Integrator:", CONTRACTS.SONIC_INTEGRATOR);

    // 1. Check endpoint
    console.log("\n🔗 Step 1: Checking Endpoint...");
    try {
        const endpoint = await sonicIntegrator.endpoint();
        console.log("✅ Endpoint:", endpoint);
        console.log("✅ Expected: 0x6F475642a6e85809B1c36Fa62763669b1b48DD5B");
        console.log("✅ Match:", endpoint.toLowerCase() === "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B".toLowerCase());
    } catch (error: any) {
        console.log("❌ Could not check endpoint:", error.message);
    }

    // 2. Check peer connection
    console.log("\n🔗 Step 2: Checking Peer Connection...");
    try {
        const peer = await sonicIntegrator.peers(CHAIN_EIDS.ARBITRUM);
        console.log("🔗 Arbitrum peer:", peer);
        
        const expectedPeer = ethers.utils.hexZeroPad(CONTRACTS.ARBITRUM_CONSUMER, 32);
        console.log("🎯 Expected peer:", expectedPeer);
        console.log("✅ Peer match:", peer.toLowerCase() === expectedPeer.toLowerCase());
    } catch (error: any) {
        console.log("❌ Could not check peer:", error.message);
    }

    // 3. Check owner
    console.log("\n👤 Step 3: Checking Owner...");
    try {
        const owner = await sonicIntegrator.owner();
        console.log("👤 Owner:", owner);
        console.log("✅ Is deployer:", owner.toLowerCase() === deployer.address.toLowerCase());
    } catch (error: any) {
        console.log("❌ Could not check owner:", error.message);
    }

    // 4. Try quote function
    console.log("\n💰 Step 4: Testing Quote Function...");
    const options = "0x00030100110100000000000000000000000000030d40"; // 200k gas
    
    try {
        const fee = await sonicIntegrator.quote(CHAIN_EIDS.ARBITRUM, options);
        console.log("✅ Quote successful!");
        console.log("💰 Native fee:", ethers.utils.formatEther(fee.nativeFee), "ETH");
        console.log("🪙 LZ token fee:", fee.lzTokenFee.toString());
        return true;
    } catch (error: any) {
        console.log("❌ Quote failed:", error.message);
        
        if (error.message.includes("Please set your OApp's DVNs")) {
            console.log("🚨 DVN configuration still incomplete");
        } else if (error.message.includes("0xc4c52593")) {
            console.log("🚨 Send library configuration issue");
        }
        return false;
    }
}

if (require.main === module) {
    checkCurrentConfig()
        .then((quoteWorks) => {
            if (quoteWorks) {
                console.log("\n🎉 QUOTE FUNCTION WORKS!");
                console.log("Ready to make VRF requests! 🚀");
            } else {
                console.log("\n❌ Configuration still incomplete");
                console.log("Need to fix remaining issues");
            }
        })
        .catch((error) => {
            console.error("❌ Script failed:", error);
            process.exitCode = 1;
        });
} 