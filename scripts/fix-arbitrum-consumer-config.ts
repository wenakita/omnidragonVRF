import { ethers } from "hardhat";

async function main() {
    console.log("🔧 Fixing Arbitrum VRF Consumer LayerZero Configuration");
    console.log("=" .repeat(60));

    // This needs to be run on Arbitrum network
    const networkName = (await ethers.provider.getNetwork()).name;
    console.log("🌐 Network:", networkName);

    if (networkName !== "arbitrum") {
        console.log("❌ This script must be run on Arbitrum network");
        console.log("💡 Run with: npx hardhat run scripts/fix-arbitrum-consumer-config.ts --network arbitrum");
        return;
    }

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    const consumerAddress = "0xD192343D5E351C983F6613e6d7c5c33f62C0eea4";
    
    // Connect to Arbitrum VRF Consumer
    const consumer = await ethers.getContractAt(
        "OmniDragonVRFConsumerV2_5",
        consumerAddress
    );

    console.log("✅ Connected to Arbitrum VRF Consumer");

    // Check current configuration
    console.log("\n📊 Current Configuration:");
    try {
        const owner = await consumer.owner();
        const endpoint = await consumer.endpoint();
        const sonicPeer = await consumer.peers(30332);
        
        console.log(`   Owner: ${owner}`);
        console.log(`   LayerZero Endpoint: ${endpoint}`);
        console.log(`   Sonic Peer: ${sonicPeer}`);
        
        // Check if peer is set correctly
        const expectedPeer = ethers.utils.hexZeroPad("0xD4023F563c2ea3Bd477786D99a14b5edA1252A84", 32);
        const isPeerSet = sonicPeer.toLowerCase() === expectedPeer.toLowerCase();
        console.log(`   Peer Correctly Set: ${isPeerSet ? '✅ Yes' : '❌ No'}`);
        
        if (!isPeerSet) {
            console.log(`   Expected: ${expectedPeer}`);
            console.log(`   Actual: ${sonicPeer}`);
            
            console.log("\n🔧 Setting Sonic peer...");
            const setPeerTx = await consumer.setPeer(30332, expectedPeer);
            await setPeerTx.wait();
            console.log("✅ Sonic peer set!");
        }
        
    } catch (error: any) {
        console.log(`   ❌ Error checking configuration: ${error.message}`);
    }

    // Check LayerZero endpoint configuration
    console.log("\n🔍 Checking LayerZero Endpoint Configuration:");
    try {
        const endpoint = await consumer.endpoint();
        const endpointContract = await ethers.getContractAt(
            "contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2",
            endpoint
        );
        
        // Check send library for Sonic
        const sendLibrary = await endpointContract.getSendLibrary(consumerAddress, 30332);
        console.log(`   Send Library (to Sonic): ${sendLibrary}`);
        
        // Check receive library from Sonic
        const receiveLibrary = await endpointContract.getReceiveLibrary(consumerAddress, 30332);
        console.log(`   Receive Library (from Sonic): ${receiveLibrary}`);
        
        if (sendLibrary === "0x0000000000000000000000000000000000000000") {
            console.log("   ❌ Send library not configured!");
            console.log("   💡 This explains why the quote function fails!");
        } else {
            console.log("   ✅ Send library configured");
        }
        
        if (receiveLibrary === "0x0000000000000000000000000000000000000000") {
            console.log("   ❌ Receive library not configured!");
        } else {
            console.log("   ✅ Receive library configured");
        }
        
    } catch (error: any) {
        console.log(`   ❌ Error checking endpoint: ${error.message}`);
    }

    // Test quote function from Arbitrum side
    console.log("\n💰 Testing Quote Function (Arbitrum → Sonic):");
    try {
        const fee = await consumer.quote(30332, "0x");
        console.log("✅ Quote successful!");
        console.log(`   Required Fee: ${ethers.utils.formatEther(fee.nativeFee)} ETH`);
    } catch (error: any) {
        console.log("❌ Quote failed:", error.message);
        if (error.data) {
            console.log("🔍 Error data:", error.data);
        }
    }

    console.log("\n🎯 Configuration Check Complete!");
    console.log("💡 If send library is not configured, the issue is that");
    console.log("   the Arbitrum consumer needs proper LayerZero V2 setup.");
}

main()
    .then(() => {
        console.log("\n🏁 Configuration check complete!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Configuration error:", error);
        process.exit(1);
    }); 