import { ethers } from "hardhat";

/**
 * Set Sonic DVN Configuration to use LayerZero Labs + Nethermind
 * This script directly interacts with the LayerZero endpoint to update DVN settings
 */

const CONTRACTS = {
    SONIC_INTEGRATOR: "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84",
};

const CHAIN_EIDS = {
    ARBITRUM: 30110
};

const DVN_ADDRESSES = {
    LAYERZERO_LABS: "0x05AaEfDf9dB6E0f7d27FA3b6EE099EDB33dA029E",
    NETHERMIND: "0x31F748a368a893Bdb5aBB67ec95F232507601A73",
};

// ULN v2 configuration type constants
const CONFIG_TYPE_ULN = 2;

async function setSonicDVNConfig() {
    console.log("🔧 Setting Sonic DVN Configuration");
    console.log("DVNs: LayerZero Labs + Nethermind");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    // Connect to Sonic VRF Integrator
    const sonicIntegrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        CONTRACTS.SONIC_INTEGRATOR
    );

    // Get the LayerZero endpoint
    const endpointAddress = await sonicIntegrator.endpoint();
    console.log("🔗 LayerZero Endpoint:", endpointAddress);

    // Connect to the endpoint
    const endpoint = await ethers.getContractAt("ILayerZeroEndpointV2", endpointAddress);

    // Get the send library address
    const sendLibrary = await endpoint.getSendLibrary(CONTRACTS.SONIC_INTEGRATOR, CHAIN_EIDS.ARBITRUM);
    console.log("📚 Send Library:", sendLibrary);

    // Prepare ULN config with LayerZero Labs + Nethermind DVNs
    const ulnConfig = {
        confirmations: 20,
        requiredDVNCount: 2,
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        requiredDVNs: [DVN_ADDRESSES.LAYERZERO_LABS, DVN_ADDRESSES.NETHERMIND],
        optionalDVNs: []
    };

    console.log("\n📋 New ULN Configuration:");
    console.log("   Confirmations:", ulnConfig.confirmations);
    console.log("   Required DVN Count:", ulnConfig.requiredDVNCount);
    console.log("   Required DVNs:");
    console.log("     - LayerZero Labs:", DVN_ADDRESSES.LAYERZERO_LABS);
    console.log("     - Nethermind:", DVN_ADDRESSES.NETHERMIND);

    // Encode the ULN config
    const encodedConfig = ethers.utils.defaultAbiCoder.encode(
        ["uint64", "uint8", "uint8", "uint8", "address[]", "address[]"],
        [
            ulnConfig.confirmations,
            ulnConfig.requiredDVNCount,
            ulnConfig.optionalDVNCount,
            ulnConfig.optionalDVNThreshold,
            ulnConfig.requiredDVNs,
            ulnConfig.optionalDVNs
        ]
    );

    try {
        console.log("\n🚀 Setting DVN Configuration...");
        
        // Set the config through the endpoint
        const setConfigTx = await endpoint.setConfig(
            CONTRACTS.SONIC_INTEGRATOR,
            sendLibrary,
            [
                {
                    eid: CHAIN_EIDS.ARBITRUM,
                    configType: CONFIG_TYPE_ULN,
                    config: encodedConfig
                }
            ],
            {
                gasLimit: 500000,
                gasPrice: ethers.utils.parseUnits("100", "gwei")
            }
        );

        console.log("⏳ Transaction sent:", setConfigTx.hash);
        const receipt = await setConfigTx.wait();
        console.log("✅ DVN configuration updated!");
        console.log("⛽ Gas used:", receipt.gasUsed.toString());

        return {
            success: true,
            transactionHash: setConfigTx.hash,
            newDVNs: ulnConfig.requiredDVNs
        };

    } catch (error: any) {
        console.log("❌ Configuration update failed:", error.message);
        
        if (error.message.includes("Ownable")) {
            console.log("💡 Note: Only the contract owner can update DVN configuration");
        }
        
        return { success: false, error: error.message };
    }
}

// Run if called directly
if (require.main === module) {
    setSonicDVNConfig()
        .then((result) => {
            if (result.success) {
                console.log(`\n🎉 DVN Configuration Update Complete!`);
                console.log(`📋 Transaction: ${result.transactionHash}`);
                console.log("🔐 New DVNs:", result.newDVNs);
            } else {
                console.log(`\n❌ Update Failed: ${result.error}`);
            }
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Configuration error:", error);
            process.exit(1);
        });
}

export { setSonicDVNConfig }; 