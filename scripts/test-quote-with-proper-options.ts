import { ethers } from "hardhat";

async function main() {
    console.log("🔧 Testing Quote Function with Proper LayerZero V2 Options");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    const integratorAddress = "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84";
    
    // Connect to Sonic VRF Integrator
    console.log("🔗 Connecting to Sonic VRF Integrator...");
    const integrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        integratorAddress
    );

    console.log("✅ Connected to Sonic Integrator");

    // Test different options formats
    console.log("\n🧪 Testing Different Options Formats:");

    // Test 1: Empty options (what was failing)
    console.log("\n1️⃣ Testing with empty options:");
    try {
        const fee1 = await integrator.quote(30110, "0x");
        console.log("✅ Empty options SUCCESS:", ethers.utils.formatEther(fee1.nativeFee), "S");
    } catch (error: any) {
        console.log("❌ Empty options FAILED:", error.message.slice(0, 100) + "...");
    }

    // Test 2: Proper LayerZero V2 executor options
    console.log("\n2️⃣ Testing with LayerZero V2 executor options:");
    try {
        // Format: 0x0001 (type 1 = executor) + gas (32 bytes) + value (32 bytes)
        const optionsV2 = "0x0001" + 
            ethers.utils.hexZeroPad(ethers.utils.hexlify(690420), 32).slice(2) + 
            ethers.utils.hexZeroPad(ethers.utils.hexlify(0), 32).slice(2);
        
        console.log("   Options:", optionsV2);
        const fee2 = await integrator.quote(30110, optionsV2);
        console.log("✅ V2 options SUCCESS:", ethers.utils.formatEther(fee2.nativeFee), "S");
        
        return {
            success: true,
            optionsFormat: "LayerZero V2",
            nativeFee: fee2.nativeFee.toString(),
            nativeFeeEther: ethers.utils.formatEther(fee2.nativeFee)
        };
        
    } catch (error: any) {
        console.log("❌ V2 options FAILED:", error.message.slice(0, 100) + "...");
    }

    // Test 3: Using solidityPack for cleaner options
    console.log("\n3️⃣ Testing with solidityPack options:");
    try {
        const optionsPacked = ethers.utils.solidityPack(
            ["uint16", "uint256", "uint256"],
            [1, 690420, 0] // type 1 (executor), gas limit, value
        );
        
        console.log("   Packed options:", optionsPacked);
        const fee3 = await integrator.quote(30110, optionsPacked);
        console.log("✅ Packed options SUCCESS:", ethers.utils.formatEther(fee3.nativeFee), "S");
        
        return {
            success: true,
            optionsFormat: "SolidityPack",
            nativeFee: fee3.nativeFee.toString(),
            nativeFeeEther: ethers.utils.formatEther(fee3.nativeFee)
        };
        
    } catch (error: any) {
        console.log("❌ Packed options FAILED:", error.message.slice(0, 100) + "...");
    }

    // Test 4: Try with minimal gas
    console.log("\n4️⃣ Testing with minimal gas options:");
    try {
        const optionsMinimal = ethers.utils.solidityPack(
            ["uint16", "uint256", "uint256"],
            [1, 200000, 0] // type 1 (executor), minimal gas, value
        );
        
        console.log("   Minimal options:", optionsMinimal);
        const fee4 = await integrator.quote(30110, optionsMinimal);
        console.log("✅ Minimal options SUCCESS:", ethers.utils.formatEther(fee4.nativeFee), "S");
        
        return {
            success: true,
            optionsFormat: "Minimal Gas",
            nativeFee: fee4.nativeFee.toString(),
            nativeFeeEther: ethers.utils.formatEther(fee4.nativeFee)
        };
        
    } catch (error: any) {
        console.log("❌ Minimal options FAILED:", error.message.slice(0, 100) + "...");
    }

    // Test 5: Check if the issue is with the integrator's quote implementation
    console.log("\n5️⃣ Testing integrator's internal quote function:");
    try {
        // Check if there's a different quote function
        const defaultGasLimit = await integrator.defaultGasLimit();
        console.log("   Default gas limit:", defaultGasLimit.toString());
        
        // Try calling the LayerZero endpoint directly
        const endpoint = await integrator.endpoint();
        console.log("   LayerZero endpoint:", endpoint);
        
        const endpointContract = await ethers.getContractAt(
            "contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2",
            endpoint
        );
        
        // Create a simple message payload
        const payload = ethers.utils.defaultAbiCoder.encode(["uint64"], [1]);
        const peer = ethers.utils.hexZeroPad("0xD192343D5E351C983F6613e6d7c5c33f62C0eea4", 32);
        
        const directQuote = await endpointContract.quote(
            {
                dstEid: 30110,
                to: peer,
                message: payload,
                options: "0x",
                payInLzToken: false
            },
            integratorAddress
        );
        
        console.log("✅ Direct endpoint quote SUCCESS:", ethers.utils.formatEther(directQuote.nativeFee), "S");
        
        return {
            success: true,
            optionsFormat: "Direct Endpoint",
            nativeFee: directQuote.nativeFee.toString(),
            nativeFeeEther: ethers.utils.formatEther(directQuote.nativeFee)
        };
        
    } catch (error: any) {
        console.log("❌ Direct endpoint FAILED:", error.message.slice(0, 100) + "...");
    }

    return {
        success: false,
        error: "All quote attempts failed"
    };
}

main()
    .then((result) => {
        if (result.success) {
            console.log("\n🎯 QUOTE TEST: ✅ SUCCESS!");
            console.log(`🔧 Working format: ${result.optionsFormat}`);
            console.log(`💰 Fee required: ${result.nativeFeeEther} S`);
            console.log("\n🚀 Ready to test VRF request with working options!");
        } else {
            console.log("\n🎯 QUOTE TEST: ❌ ALL ATTEMPTS FAILED");
            console.log("🔧 Need to investigate LayerZero configuration further");
        }
        process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
        console.error("❌ Script error:", error);
        process.exit(1);
    }); 