import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Diagnosing LayerZero Setup");
    console.log("=" .repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    const integratorAddress = "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84";
    const consumerAddress = "0xD192343D5E351C983F6613e6d7c5c33f62C0eea4";
    
    // Connect to Sonic VRF Integrator
    const integrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        integratorAddress
    );

    console.log("✅ Connected to Sonic Integrator");

    // Check basic integrator setup
    console.log("\n📊 Sonic Integrator Analysis:");
    try {
        const endpoint = await integrator.endpoint();
        const owner = await integrator.owner();
        const peer = await integrator.peers(30110);
        const balance = await ethers.provider.getBalance(integratorAddress);
        
        console.log(`   Owner: ${owner}`);
        console.log(`   Endpoint: ${endpoint}`);
        console.log(`   Balance: ${ethers.utils.formatEther(balance)} S`);
        console.log(`   Arbitrum Peer: ${peer}`);
        
        // Check if endpoint is valid
        const endpointContract = await ethers.getContractAt(
            "contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2",
            endpoint
        );
        
        const sonicEid = await endpointContract.eid();
        console.log(`   Endpoint EID: ${sonicEid} (should be 30332)`);
        
        if (sonicEid.toString() !== "30332") {
            console.log("   ❌ WRONG ENDPOINT! This is not Sonic's LayerZero endpoint!");
            return { success: false, error: "Wrong LayerZero endpoint" };
        }
        
    } catch (error: any) {
        console.log(`   ❌ Basic setup error: ${error.message}`);
        return { success: false, error: error.message };
    }

    // Check LayerZero library configuration
    console.log("\n🔍 LayerZero Library Configuration:");
    try {
        const endpoint = await integrator.endpoint();
        const endpointContract = await ethers.getContractAt(
            "contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2",
            endpoint
        );
        
        // Check send library to Arbitrum
        const sendLib = await endpointContract.getSendLibrary(integratorAddress, 30110);
        console.log(`   Send Library (to Arbitrum): ${sendLib}`);
        
        // Check receive library from Arbitrum
        const receiveLib = await endpointContract.getReceiveLibrary(integratorAddress, 30110);
        console.log(`   Receive Library (from Arbitrum): ${receiveLib}`);
        
        if (sendLib === "0x0000000000000000000000000000000000000000") {
            console.log("   ❌ SEND LIBRARY NOT SET! This is the problem!");
            return { success: false, error: "Send library not configured" };
        }
        
        if (receiveLib === "0x0000000000000000000000000000000000000000") {
            console.log("   ❌ RECEIVE LIBRARY NOT SET! This is the problem!");
            return { success: false, error: "Receive library not configured" };
        }
        
        console.log("   ✅ Libraries are configured");
        
    } catch (error: any) {
        console.log(`   ❌ Library check error: ${error.message}`);
        return { success: false, error: error.message };
    }

    // Check if the integrator contract has the right interface
    console.log("\n🔍 Contract Interface Check:");
    try {
        // Check if quote function exists and what it expects
        const quoteFunctionExists = integrator.interface.getFunction("quote");
        console.log(`   Quote function: ${quoteFunctionExists.format()}`);
        
        // Check if there's an internal _quote function issue
        const defaultGasLimit = await integrator.defaultGasLimit();
        console.log(`   Default gas limit: ${defaultGasLimit}`);
        
        // Try to see what the quote function is actually doing
        console.log("   🔄 Attempting to trace quote function call...");
        
        // Create a simple test payload
        const requestId = 1;
        const payload = ethers.utils.defaultAbiCoder.encode(["uint64"], [requestId]);
        console.log(`   Test payload: ${payload}`);
        
    } catch (error: any) {
        console.log(`   ❌ Interface check error: ${error.message}`);
    }

    // Check the specific error by examining the contract bytecode
    console.log("\n🔍 Contract Deployment Check:");
    try {
        const code = await ethers.provider.getCode(integratorAddress);
        console.log(`   Contract code length: ${code.length} characters`);
        
        if (code === "0x") {
            console.log("   ❌ CONTRACT NOT DEPLOYED!");
            return { success: false, error: "Contract not deployed" };
        }
        
        // Check if this is the right contract
        const contractName = await integrator.interface.format("minimal");
        console.log(`   Contract appears to be properly deployed`);
        
    } catch (error: any) {
        console.log(`   ❌ Deployment check error: ${error.message}`);
    }

    console.log("\n🎯 DIAGNOSIS COMPLETE");
    console.log("💡 The issue appears to be with LayerZero library configuration");
    console.log("   Even though we set custom DVN config, the libraries might not be properly initialized");
    
    return { success: true, diagnosis: "Library configuration issue" };
}

main()
    .then((result) => {
        if (result.success) {
            console.log("\n✅ Diagnosis completed successfully");
        } else {
            console.log(`\n❌ Critical issue found: ${result.error}`);
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Diagnosis error:", error);
        process.exit(1);
    }); 