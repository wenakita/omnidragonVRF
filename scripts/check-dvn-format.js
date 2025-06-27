const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking DVN Configuration Format...\n");

    // Let's examine the current working config to understand the format
    const SONIC_VRF_ADDRESS = "0x3bAc0b3C348425992224c8FafEeFc3aF6205755e";
    const ARBITRUM_EID = 30110;
    const SEND_LIBRARY = "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7";

    const [signer] = await ethers.getSigners();

    // Connect to VRF contract
    const VRFContract = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
    const sonicContract = VRFContract.attach(SONIC_VRF_ADDRESS);

    // Get endpoint address
    const endpointAddress = await sonicContract.endpoint();
    console.log(`📡 LayerZero Endpoint: ${endpointAddress}`);

    // Get current config to understand the format
    const endpoint = new ethers.Contract(endpointAddress, [
        "function getConfig(address oapp, address lib, uint32 eid, uint32 configType) external view returns (bytes memory config)"
    ], signer);

    const currentConfig = await endpoint.getConfig(SONIC_VRF_ADDRESS, SEND_LIBRARY, ARBITRUM_EID, 2);
    console.log(`Current ULN Config: ${currentConfig}`);
    console.log(`Length: ${currentConfig.length} characters (${(currentConfig.length - 2) / 2} bytes)`);

    // Let's decode it manually
    if (currentConfig.length > 2) {
        console.log("\n🔍 Decoding current config:");
        
        // Remove 0x prefix
        const hex = currentConfig.slice(2);
        
        // The config appears to be ABI-encoded, let's try to decode it
        try {
            // Try decoding as a struct or array
            console.log("Raw hex:", hex);
            
            // Let's break it down in chunks
            console.log("\nHex breakdown (32-byte chunks):");
            for (let i = 0; i < hex.length; i += 64) {
                const chunk = hex.slice(i, i + 64);
                console.log(`Chunk ${Math.floor(i/64)}: 0x${chunk}`);
            }
            
        } catch (error) {
            console.log("Could not decode:", error.message);
        }
    }

    // Let's also check what the LayerZero config expects
    console.log("\n📋 From layerzero.config.ts, we expect:");
    console.log("   Confirmations: 20");
    console.log("   Required DVNs: ['0x282b3386571f7f794450d5789911a9804fa346b4']");
    console.log("   Optional DVNs: []");
    console.log("   Optional DVN Threshold: 0");

    // Let's try to build the config in the same format as the existing one
    console.log("\n🔧 Trying different encoding approaches:");

    // Approach 1: Simple struct encoding
    try {
        const ulnConfigStruct = ethers.utils.defaultAbiCoder.encode(
            ["tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)"],
            [{
                confirmations: 20,
                requiredDVNCount: 1,
                optionalDVNCount: 0,
                optionalDVNThreshold: 0,
                requiredDVNs: ["0x282b3386571f7f794450d5789911a9804fa346b4"],
                optionalDVNs: []
            }]
        );
        console.log(`Approach 1 (struct): ${ulnConfigStruct}`);
        console.log(`Length: ${(ulnConfigStruct.length - 2) / 2} bytes`);
    } catch (error) {
        console.log(`Approach 1 failed: ${error.message}`);
    }

    // Approach 2: Separate components
    try {
        const ulnConfigComponents = ethers.utils.defaultAbiCoder.encode(
            ["uint64", "uint8", "uint8", "uint8", "address[]", "address[]"],
            [20, 1, 0, 0, ["0x282b3386571f7f794450d5789911a9804fa346b4"], []]
        );
        console.log(`Approach 2 (components): ${ulnConfigComponents}`);
        console.log(`Length: ${(ulnConfigComponents.length - 2) / 2} bytes`);
    } catch (error) {
        console.log(`Approach 2 failed: ${error.message}`);
    }

    // Approach 3: Match the existing format structure
    try {
        // Looking at the current config, it seems to have a specific structure
        // Let's try to mimic it but with our DVN
        console.log("\nApproach 3: Try to match existing structure but with DVN...");
        
        // The existing config has this pattern - let's try to understand it
        const existingHex = currentConfig.slice(2);
        console.log("Existing config analysis:");
        console.log("First 64 chars (32 bytes):", existingHex.slice(0, 64));
        console.log("Second 64 chars (32 bytes):", existingHex.slice(64, 128));
        
    } catch (error) {
        console.log(`Approach 3 failed: ${error.message}`);
    }

    console.log("\n💡 Next steps:");
    console.log("1. The transaction failed, which suggests the encoding format is wrong");
    console.log("2. We need to match the exact format that LayerZero V2 expects");
    console.log("3. The current config shows 642 bytes but no DVNs - this might be the default empty config");
    console.log("4. We may need to use the LayerZero SDK or check their documentation for the exact format");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 