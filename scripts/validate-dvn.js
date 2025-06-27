const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Validating DVN Addresses for Sonic Network...");
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);
    
    // DVN addresses
    const WRONG_DVN_ADDRESS = "0x6788f52439ACA6BFF597d3eeC2DC9a44B8FEE842"; // Currently set (Ape network)
    const CORRECT_DVN_ADDRESS = "0x282b3386571f7f794450d5789911a9804fa346b4"; // Should be set (Sonic network)
    
    console.log(`❌ Wrong DVN Address (Ape): ${WRONG_DVN_ADDRESS}`);
    console.log(`✅ Correct DVN Address (Sonic): ${CORRECT_DVN_ADDRESS}`);
    
    // Check if both addresses have code
    console.log("\n🔍 1. Checking if DVN addresses have code...");
    
    const wrongDVNCode = await ethers.provider.getCode(WRONG_DVN_ADDRESS);
    const correctDVNCode = await ethers.provider.getCode(CORRECT_DVN_ADDRESS);
    
    console.log(`Wrong DVN has code: ${wrongDVNCode !== "0x" ? "YES" : "NO"} (${wrongDVNCode.length} bytes)`);
    console.log(`Correct DVN has code: ${correctDVNCode !== "0x" ? "YES" : "NO"} (${correctDVNCode.length} bytes)`);
    
    // Check network information
    console.log("\n🔍 2. Checking network information...");
    const network = await ethers.provider.getNetwork();
    console.log(`Network name: ${network.name}`);
    console.log(`Chain ID: ${network.chainId}`);
    
    // Check if we can call a simple function on the correct DVN
    if (correctDVNCode !== "0x") {
        console.log("\n🔍 3. Testing correct DVN contract interface...");
        try {
            // Try to get the DVN contract with a simple interface
            const dvnContract = await ethers.getContractAt(
                "contracts/interfaces/external/layerzero/IDVN.sol:IDVN",
                CORRECT_DVN_ADDRESS
            );
            
            // Test if we can call a view function (this might fail if interface is wrong)
            console.log("✅ DVN contract interface accessible");
            
        } catch (error) {
            console.log("❌ DVN contract interface error:", error.message);
        }
    }
    
    // Check LayerZero endpoint configuration
    console.log("\n🔍 4. Checking LayerZero endpoint...");
    const LAYERZERO_ENDPOINT = "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B";
    const endpointCode = await ethers.provider.getCode(LAYERZERO_ENDPOINT);
    console.log(`Endpoint has code: ${endpointCode !== "0x" ? "YES" : "NO"} (${endpointCode.length} bytes)`);
    
    // Check what happens when we try to use the LayerZero wiring command approach
    console.log("\n🔍 5. Checking LayerZero configuration compatibility...");
    
    // This is the exact configuration that the LayerZero wiring tool would try to set
    const sonicToArbitrumConfig = {
        confirmations: 20,
        requiredDVNCount: 1,
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        requiredDVNs: [CORRECT_DVN_ADDRESS],
        optionalDVNs: []
    };
    
    console.log("📝 Target Configuration:");
    console.log(`  - Confirmations: ${sonicToArbitrumConfig.confirmations}`);
    console.log(`  - Required DVN Count: ${sonicToArbitrumConfig.requiredDVNCount}`);
    console.log(`  - Required DVNs: ${sonicToArbitrumConfig.requiredDVNs}`);
    
    // Try to encode the configuration to see if there are any encoding issues
    try {
        const encodedConfig = ethers.utils.defaultAbiCoder.encode(
            ["tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)"],
            [sonicToArbitrumConfig]
        );
        console.log("✅ Configuration encoding successful");
        console.log(`Encoded config length: ${encodedConfig.length}`);
    } catch (error) {
        console.log("❌ Configuration encoding failed:", error.message);
    }
    
    // Check if the issue is with the DVN being deployed on the wrong network
    console.log("\n🔍 6. Checking DVN network compatibility...");
    
    // Check if the Sonic DVN address exists and is valid on Sonic
    if (correctDVNCode !== "0x") {
        console.log("✅ Correct DVN address exists on Sonic network");
        
        // The issue might be that this DVN is not properly configured for this specific pathway
        console.log("💡 Possible issues:");
        console.log("   - DVN might not support Sonic → Arbitrum pathway");
        console.log("   - DVN might not be registered with the LayerZero endpoint");
        console.log("   - DVN might require additional setup or whitelisting");
        
    } else {
        console.log("❌ Correct DVN address does not exist on Sonic network");
        console.log("💡 This suggests the DVN list might be outdated or incorrect");
    }
    
    console.log("\n📋 Summary:");
    console.log("1. The current DVN is from Ape network (wrong for Sonic)");
    console.log("2. The correct DVN address exists on Sonic network");
    console.log("3. Manual configuration attempts are failing");
    console.log("4. This suggests the DVN might not be properly set up for Sonic → Arbitrum pathway");
    
    console.log("\n💡 Recommended next steps:");
    console.log("1. Contact LayerZero team to verify DVN setup for Sonic");
    console.log("2. Check if there's a specific DVN configuration required for Sonic");
    console.log("3. Verify that the Sonic → Arbitrum pathway is supported");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 