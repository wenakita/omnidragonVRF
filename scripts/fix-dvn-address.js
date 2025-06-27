const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Fixing DVN Configuration for Sonic VRF Contract...");
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);
    
    // Contract addresses
    const VRF_CONTRACT = "0x3bAc0b3C348425992224c8FafEeFc3aF6205755e";
    const LAYERZERO_ENDPOINT = "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B";
    const ARBITRUM_ENDPOINT_ID = 30110;
    const CORRECT_DVN_ADDRESS = "0x282b3386571f7f794450d5789911a9804fa346b4"; // Correct LayerZero Labs DVN for Sonic
    const WRONG_DVN_ADDRESS = "0x6788f52439ACA6BFF597d3eeC2DC9a44B8FEE842"; // Incorrect DVN (Ape network)
    const SEND_LIBRARY = "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7";
    
    console.log(`📡 VRF Contract: ${VRF_CONTRACT}`);
    console.log(`📡 LayerZero Endpoint: ${LAYERZERO_ENDPOINT}`);
    console.log(`❌ Wrong DVN Address (Ape): ${WRONG_DVN_ADDRESS}`);
    console.log(`✅ Correct DVN Address (Sonic): ${CORRECT_DVN_ADDRESS}`);
    
    // Get the endpoint contract
    const endpoint = await ethers.getContractAt(
        "contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2", 
        LAYERZERO_ENDPOINT
    );
    
    console.log("\n🔍 1. Checking current configuration...");
    const currentConfig = await endpoint.getConfig(VRF_CONTRACT, SEND_LIBRARY, ARBITRUM_ENDPOINT_ID, 2);
    console.log(`Current config length: ${currentConfig.length}`);
    
    // Decode the current configuration
    const decoded = ethers.utils.defaultAbiCoder.decode(
        ["tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)"],
        currentConfig
    );
    
    console.log("📊 Current Configuration:");
    console.log(`  - Confirmations: ${decoded[0].confirmations}`);
    console.log(`  - Required DVN Count: ${decoded[0].requiredDVNCount}`);
    console.log(`  - Required DVNs: ${decoded[0].requiredDVNs}`);
    console.log(`  - Optional DVN Count: ${decoded[0].optionalDVNCount}`);
    console.log(`  - Optional DVNs: ${decoded[0].optionalDVNs}`);
    
    // Check if we have the wrong DVN
    const hasWrongDVN = decoded[0].requiredDVNs.includes(WRONG_DVN_ADDRESS.toLowerCase()) || 
                       decoded[0].requiredDVNs.includes(WRONG_DVN_ADDRESS);
    
    if (hasWrongDVN) {
        console.log(`\n❌ Found incorrect DVN address: ${WRONG_DVN_ADDRESS}`);
        console.log(`✅ Setting correct DVN address: ${CORRECT_DVN_ADDRESS}`);
        
        // Create new configuration with correct DVN
        const newConfig = {
            confirmations: decoded[0].confirmations,
            requiredDVNCount: 1,
            optionalDVNCount: 0,
            optionalDVNThreshold: 0,
            requiredDVNs: [CORRECT_DVN_ADDRESS],
            optionalDVNs: []
        };
        
        console.log("\n📝 New Configuration:");
        console.log(`  - Confirmations: ${newConfig.confirmations}`);
        console.log(`  - Required DVN Count: ${newConfig.requiredDVNCount}`);
        console.log(`  - Required DVNs: ${newConfig.requiredDVNs}`);
        
        // Encode the new configuration
        const encodedConfig = ethers.utils.defaultAbiCoder.encode(
            ["tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)"],
            [newConfig]
        );
        
        console.log(`\n🔧 Setting new DVN configuration...`);
        
        try {
            const tx = await endpoint.setConfig(
                VRF_CONTRACT,
                SEND_LIBRARY,
                [
                    {
                        eid: ARBITRUM_ENDPOINT_ID,
                        configType: 2, // ULN_CONFIG_TYPE
                        config: encodedConfig
                    }
                ],
                {
                    gasLimit: 500000,
                    gasPrice: ethers.utils.parseUnits("100", "gwei")
                }
            );
            
            console.log(`📝 Transaction hash: ${tx.hash}`);
            console.log("⏳ Waiting for confirmation...");
            
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                console.log("✅ DVN configuration updated successfully!");
                
                // Verify the new configuration
                console.log("\n🔍 Verifying new configuration...");
                const newConfigData = await endpoint.getConfig(VRF_CONTRACT, SEND_LIBRARY, ARBITRUM_ENDPOINT_ID, 2);
                const newDecoded = ethers.utils.defaultAbiCoder.decode(
                    ["tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)"],
                    newConfigData
                );
                
                console.log("📊 Updated Configuration:");
                console.log(`  - Confirmations: ${newDecoded[0].confirmations}`);
                console.log(`  - Required DVN Count: ${newDecoded[0].requiredDVNCount}`);
                console.log(`  - Required DVNs: ${newDecoded[0].requiredDVNs}`);
                
                const hasCorrectDVN = newDecoded[0].requiredDVNs.some(dvn => 
                    dvn.toLowerCase() === CORRECT_DVN_ADDRESS.toLowerCase()
                );
                
                if (hasCorrectDVN) {
                    console.log("✅ DVN configuration is now correct!");
                } else {
                    console.log("❌ DVN configuration still incorrect");
                }
                
            } else {
                console.log("❌ Transaction failed");
            }
            
        } catch (error) {
            console.error("❌ Error setting DVN configuration:", error.message);
            if (error.data) {
                console.error("Error data:", error.data);
            }
        }
        
    } else {
        console.log("✅ DVN configuration is already correct!");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 