import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Debugging Quote Function Issues");
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

    // Check basic contract state
    console.log("\n📊 Contract State:");
    const counter = await integrator.requestCounter();
    const gasLimit = await integrator.defaultGasLimit();
    const endpoint = await integrator.endpoint();
    const peer = await integrator.peers(30110);
    
    console.log("🔢 Request Counter:", counter.toString());
    console.log("⛽ Default Gas Limit:", gasLimit.toString());
    console.log("🌐 LayerZero Endpoint:", endpoint);
    console.log("🔗 Arbitrum Peer:", peer);

    // Test 1: Check if peer is properly set
    console.log("\n🧪 Test 1: Peer Configuration");
    const expectedPeerBytes32 = ethers.utils.hexZeroPad("0xD192343D5E351C983F6613e6d7c5c33f62C0eea4", 32);
    console.log("Expected peer:", expectedPeerBytes32);
    console.log("Actual peer:  ", peer);
    console.log("Peer match:", peer.toLowerCase() === expectedPeerBytes32.toLowerCase());

    if (peer === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        console.log("❌ Peer not set! This will cause quote to fail.");
        return;
    }

    // Test 2: Check LayerZero endpoint
    console.log("\n🧪 Test 2: LayerZero Endpoint");
    try {
        const endpointContract = await ethers.getContractAt(
            "contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2",
            endpoint
        );
        
        const eid = await endpointContract.eid();
        console.log("✅ Endpoint EID:", eid.toString());
        console.log("✅ Expected EID: 30332 (Sonic)");
        
        if (eid.toString() !== "30332") {
            console.log("❌ Wrong endpoint EID! Expected 30332 for Sonic");
        }
    } catch (endpointError: any) {
        console.log("❌ Endpoint error:", endpointError.message);
    }

    // Test 3: Check quote function step by step
    console.log("\n🧪 Test 3: Quote Function Analysis");
    
    // Create the exact payload that quote function would use
    const nextRequestId = counter.add(1);
    const payload = ethers.utils.defaultAbiCoder.encode(["uint64"], [nextRequestId]);
    console.log("📦 Payload:", payload);
    console.log("📦 Payload length:", payload.length);

    // Test with different options
    console.log("\n💸 Testing quote with different options:");
    
    // Test 1: Empty options
    try {
        console.log("1️⃣ Testing with empty options...");
        const fee1 = await integrator.quote(30110, "0x");
        console.log("✅ Empty options success:", ethers.utils.formatEther(fee1.nativeFee), "S");
    } catch (error1: any) {
        console.log("❌ Empty options failed:", error1.message);
        if (error1.data) {
            console.log("🔍 Error data:", error1.data);
        }
    }

    // Test 2: Manual options (type 1 = executor, gas limit, value)
    try {
        console.log("2️⃣ Testing with manual executor options...");
        // Format: 0x0001 (type) + gas (32 bytes) + value (32 bytes)  
        const manualOptions = "0x0001" + 
            ethers.utils.hexZeroPad(ethers.utils.hexlify(690420), 32).slice(2) + 
            ethers.utils.hexZeroPad(ethers.utils.hexlify(0), 32).slice(2);
        
        console.log("📋 Manual options:", manualOptions);
        const fee2 = await integrator.quote(30110, manualOptions);
        console.log("✅ Manual options success:", ethers.utils.formatEther(fee2.nativeFee), "S");
    } catch (error2: any) {
        console.log("❌ Manual options failed:", error2.message);
        if (error2.data) {
            console.log("🔍 Error data:", error2.data);
        }
    }

    // Test 4: Check if the issue is with the _quote internal function
    console.log("\n🧪 Test 4: Internal _quote Function");
    try {
        // Try to call the LayerZero endpoint quote directly
        const endpointContract = await ethers.getContractAt(
            "contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2",
            endpoint
        );
        
        console.log("📞 Calling endpoint.quote directly...");
        const directQuote = await endpointContract.quote(
            {
                dstEid: 30110,
                to: ethers.utils.hexZeroPad("0xD192343D5E351C983F6613e6d7c5c33f62C0eea4", 32),
                message: payload,
                options: "0x",
                payInLzToken: false
            },
            integratorAddress
        );
        
        console.log("✅ Direct endpoint quote:", ethers.utils.formatEther(directQuote.nativeFee), "S");
        
    } catch (directError: any) {
        console.log("❌ Direct endpoint quote failed:", directError.message);
        if (directError.message.includes("LZ_ULN_InvalidReceiveLibrary")) {
            console.log("🔍 ULN library not configured properly!");
        }
        if (directError.message.includes("LZ_ULN_InvalidSendLibrary")) {
            console.log("🔍 Send library not configured properly!");
        }
    }

    // Test 5: Check ULN configuration
    console.log("\n🧪 Test 5: ULN Configuration Check");
    try {
        const endpointContract = await ethers.getContractAt(
            "contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2",
            endpoint
        );
        
        // Check send library
        const sendLibrary = await endpointContract.getSendLibrary(integratorAddress, 30110);
        console.log("📚 Send Library:", sendLibrary);
        
        // Check receive library  
        const receiveLibrary = await endpointContract.getReceiveLibrary(integratorAddress, 30110);
        console.log("📚 Receive Library:", receiveLibrary);
        
        if (sendLibrary === "0x0000000000000000000000000000000000000000") {
            console.log("❌ Send library not configured!");
        }
        if (receiveLibrary === "0x0000000000000000000000000000000000000000") {
            console.log("❌ Receive library not configured!");
        }
        
    } catch (ulnError: any) {
        console.log("❌ ULN check failed:", ulnError.message);
    }

    console.log("\n🎯 Quote Function Debug Complete!");
    console.log("💡 Common issues:");
    console.log("   - Peer not set (should be fixed)");
    console.log("   - ULN libraries not configured");
    console.log("   - DVN configuration missing");
    console.log("   - Wrong endpoint or EID");
}

main()
    .then(() => {
        console.log("\n🏁 Debug complete!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Debug error:", error);
        process.exit(1);
    }); 