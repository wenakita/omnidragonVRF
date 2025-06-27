const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Setting DVN Configuration for Sonic VRF Contract...");
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);
    
    // Contract addresses
    const VRF_CONTRACT = "0x3bAc0b3C348425992224c8FafEeFc3aF6205755e";
    const LAYERZERO_ENDPOINT = "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B";
    const ARBITRUM_ENDPOINT_ID = 30110;
    const DVN_ADDRESS = "0x282b3386571f7f794450d5789911a9804fa346b4"; // LayerZero Labs DVN on Sonic
    
    console.log(`📡 VRF Contract: ${VRF_CONTRACT}`);
    console.log(`📡 LayerZero Endpoint: ${LAYERZERO_ENDPOINT}`);
    console.log(`📡 DVN Address: ${DVN_ADDRESS}`);
    
    // Get the endpoint contract
    const endpoint = await ethers.getContractAt("contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2", LAYERZERO_ENDPOINT);
    
    // Create ULN config with the correct DVN
    const ulnConfig = {
        confirmations: 20,
        requiredDVNCount: 1,
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        requiredDVNs: [DVN_ADDRESS],
        optionalDVNs: []
    };
    
    console.log("🔍 ULN Config:", ulnConfig);
    
    // Encode the config
    const configData = ethers.utils.defaultAbiCoder.encode(
        ["tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)"],
        [ulnConfig]
    );
    
    console.log(`📊 Config data length: ${configData.length}`);
    console.log(`📊 Config data: ${configData.substring(0, 100)}...`);
    
    try {
        // Set the config
        console.log("📝 Setting DVN configuration...");
        
        const tx = await endpoint.setConfig(
            VRF_CONTRACT,
            "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7", // Send library address for Sonic
            [
                {
                    eid: ARBITRUM_ENDPOINT_ID,
                    configType: 2, // ULN config type
                    config: configData
                }
            ],
            {
                gasLimit: 500000,
                gasPrice: ethers.utils.parseUnits("200", "gwei")
            }
        );
        
        console.log(`📝 Transaction hash: ${tx.hash}`);
        console.log("⏳ Waiting for confirmation...");
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            console.log("✅ DVN configuration set successfully!");
            console.log(`⛽ Gas used: ${receipt.gasUsed}`);
        } else {
            console.log("❌ Transaction failed!");
        }
        
    } catch (error) {
        console.error("❌ Error setting DVN configuration:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 