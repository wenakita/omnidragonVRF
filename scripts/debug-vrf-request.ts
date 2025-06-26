import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Debugging VRF Request Issues");
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
    console.log("🔢 Request Counter:", counter.toString());
    console.log("⛽ Default Gas Limit:", gasLimit.toString());

    // Test 1: Try quote function with empty options first
    console.log("\n🧪 Test 1: Quote Function Testing");
    
    // Test with empty options
    console.log("💡 Testing with empty options...");
    try {
        const emptyOptions = "0x";
        const fee = await integrator.quote(30110, emptyOptions);
        console.log("✅ Quote with empty options successful!");
        console.log("   Native Fee:", ethers.utils.formatEther(fee.nativeFee), "S");
        console.log("   LZ Token Fee:", fee.lzTokenFee.toString());
    } catch (quoteError: any) {
        console.log("❌ Quote with empty options failed:", quoteError.message);
        console.log("🔍 Error details:", quoteError.data || "No additional data");
    }

    // Test 2: Check LayerZero endpoint directly
    console.log("\n🌐 Test 2: LayerZero Endpoint Check");
    try {
        const endpoint = await integrator.endpoint();
        console.log("✅ Endpoint address:", endpoint);
        
        // Try to connect to the endpoint
        const endpointContract = await ethers.getContractAt(
            "ILayerZeroEndpointV2", 
            endpoint
        );
        
        // Check if endpoint is working
        const eid = await endpointContract.eid();
        console.log("✅ Endpoint EID:", eid.toString());
        
    } catch (endpointError: any) {
        console.log("❌ Endpoint check failed:", endpointError.message);
    }

    // Test 3: Check peer configuration more thoroughly
    console.log("\n🔗 Test 3: Peer Configuration");
    try {
        const peer = await integrator.peers(30110);
        console.log("✅ Raw peer bytes32:", peer);
        
        // Convert to address
        const peerAddress = ethers.utils.getAddress("0x" + peer.slice(26));
        console.log("✅ Peer address:", peerAddress);
        console.log("✅ Expected address: 0xD192343D5E351C983F6613e6d7c5c33f62C0eea4");
        
    } catch (peerError: any) {
        console.log("❌ Peer check failed:", peerError.message);
    }

    // Test 4: Try a minimal LayerZero send simulation
    console.log("\n📤 Test 4: LayerZero Send Simulation");
    try {
        // Create minimal payload
        const payload = ethers.utils.defaultAbiCoder.encode(["uint64"], [1]);
        console.log("✅ Payload created:", payload);
        
        // Try to estimate gas for the internal _lzSend call
        // This is tricky since _lzSend is internal, but we can try to estimate
        // the gas for requestRandomWords with minimal options
        
        console.log("💡 Attempting gas estimation for VRF request...");
        try {
            const gasEstimate = await integrator.estimateGas.requestRandomWordsSimple(30110, {
                value: ethers.utils.parseEther("0.01") // Higher fee
            });
            console.log("✅ Gas estimate:", gasEstimate.toString());
        } catch (gasError: any) {
            console.log("❌ Gas estimation failed:", gasError.message);
            console.log("🔍 This suggests the transaction would revert");
        }
        
    } catch (simulationError: any) {
        console.log("❌ Simulation failed:", simulationError.message);
    }

    console.log("\n🎯 Debug Complete!");
    console.log("💡 If quote function fails, the issue is likely with LayerZero configuration");
    console.log("💡 If gas estimation fails, the issue is with the VRF request logic");
}

main()
    .then(() => {
        console.log("\n🏁 Debug session complete!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Debug error:", error);
        process.exit(1);
    }); 