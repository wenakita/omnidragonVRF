const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Setting DVN Configuration Manually...\n");

    const SONIC_VRF_ADDRESS = "0x3bAc0b3C348425992224c8FafEeFc3aF6205755e";
    const ARBITRUM_EID = 30110;
    const SEND_LIBRARY = "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7";
    const DVN_ADDRESS = "0x282b3386571f7f794450d5789911a9804fa346b4";

    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);

    // Connect to VRF contract
    const VRFContract = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
    const sonicContract = VRFContract.attach(SONIC_VRF_ADDRESS);

    // Get endpoint address
    const endpointAddress = await sonicContract.endpoint();
    console.log(`📡 LayerZero Endpoint: ${endpointAddress}`);

    // Connect to endpoint
    const endpointABI = [
        "function setConfig(address oapp, address lib, uint32 eid, uint32 configType, bytes calldata config) external"
    ];
    
    const endpoint = new ethers.Contract(endpointAddress, endpointABI, signer);

    console.log("📋 Configuration Details:");
    console.log(`   Contract: ${SONIC_VRF_ADDRESS}`);
    console.log(`   Send Library: ${SEND_LIBRARY}`);
    console.log(`   Arbitrum EID: ${ARBITRUM_EID}`);
    console.log(`   DVN Address: ${DVN_ADDRESS}`);

    // Build ULN config with DVN
    // ULN Config structure:
    // - confirmations (uint64): 8 bytes
    // - requiredDVNCount (uint8): 1 byte  
    // - optionalDVNCount (uint8): 1 byte
    // - optionalDVNThreshold (uint8): 1 byte
    // - requiredDVNs: 20 bytes each
    // - optionalDVNs: 20 bytes each

    console.log("\n🔧 Building ULN Configuration...");
    
    const confirmations = 20; // 20 confirmations
    const requiredDVNCount = 1; // 1 required DVN
    const optionalDVNCount = 0; // 0 optional DVNs
    const optionalDVNThreshold = 0; // 0 threshold

    // Encode the config
    const ulnConfig = ethers.utils.solidityPack(
        ["uint64", "uint8", "uint8", "uint8", "address"],
        [confirmations, requiredDVNCount, optionalDVNCount, optionalDVNThreshold, DVN_ADDRESS]
    );

    console.log(`   Confirmations: ${confirmations}`);
    console.log(`   Required DVN Count: ${requiredDVNCount}`);
    console.log(`   Optional DVN Count: ${optionalDVNCount}`);
    console.log(`   Optional DVN Threshold: ${optionalDVNThreshold}`);
    console.log(`   DVN Address: ${DVN_ADDRESS}`);
    console.log(`   Encoded Config: ${ulnConfig}`);
    console.log(`   Config Length: ${ulnConfig.length} characters (${(ulnConfig.length - 2) / 2} bytes)`);

    try {
        console.log("\n🚀 Setting DVN Configuration...");
        
        // Get current gas price and multiply by 5
        const currentGasPrice = await signer.provider.getGasPrice();
        const gasPrice = currentGasPrice.mul(5);
        console.log(`   Current gas price: ${ethers.utils.formatUnits(currentGasPrice, "gwei")} gwei`);
        console.log(`   Using gas price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`);
        
        // ULN config type is 2
        const setConfigTx = await endpoint.setConfig(
            SONIC_VRF_ADDRESS,
            SEND_LIBRARY,
            ARBITRUM_EID,
            2, // ULN config type
            ulnConfig,
            {
                gasLimit: 500000,
                gasPrice: gasPrice
            }
        );

        console.log(`   Transaction submitted: ${setConfigTx.hash}`);
        console.log("   Waiting for confirmation...");
        
        const receipt = await setConfigTx.wait();
        console.log(`   ✅ DVN configuration set in block ${receipt.blockNumber}`);
        console.log(`   Gas used: ${receipt.gasUsed}`);

        // Verify the configuration
        console.log("\n🔍 Verifying DVN Configuration...");
        
        const endpointRead = new ethers.Contract(endpointAddress, [
            "function getConfig(address oapp, address lib, uint32 eid, uint32 configType) external view returns (bytes memory config)"
        ], signer);
        
        const newConfig = await endpointRead.getConfig(SONIC_VRF_ADDRESS, SEND_LIBRARY, ARBITRUM_EID, 2);
        console.log(`   New Config Length: ${newConfig.length} bytes`);
        console.log(`   New Config Data: ${newConfig}`);

        // Try to test the quote function now
        console.log("\n🧪 Testing Quote Function...");
        try {
            const { Options } = require("@layerzerolabs/lz-v2-utilities");
            const defaultGasLimit = await sonicContract.defaultGasLimit();
            const options = Options.newOptions().addExecutorLzReceiveOption(defaultGasLimit, 0).toHex();
            
            const quote = await sonicContract.quote(ARBITRUM_EID, options);
            console.log(`   ✅ Quote successful: ${ethers.utils.formatEther(quote.nativeFee)} S`);
            console.log("\n🎉 SUCCESS! VRF system is now ready for requests!");
        } catch (quoteError) {
            console.log(`   ❌ Quote still failing: ${quoteError.message}`);
        }

    } catch (error) {
        console.error(`❌ Failed to set DVN configuration: ${error.message}`);
        
        if (error.message.includes("insufficient funds")) {
            console.log("💡 Solution: Add more S tokens to your wallet");
        } else if (error.message.includes("execution reverted")) {
            console.log("💡 Check: Ensure you're the owner of the contract or have proper permissions");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 