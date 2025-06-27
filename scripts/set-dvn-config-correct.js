const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Setting DVN Configuration with Correct Format...\n");

    const SONIC_VRF_ADDRESS = "0x3bAc0b3C348425992224c8FafEeFc3aF6205755e";
    const ARBITRUM_EID = 30110;
    const SEND_LIBRARY = "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7";
    const DVN_ADDRESS = "0x6788f52439aca6bff597d3eec2dc9a44b8fee842"; // Use the address that's already there

    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);

    // Connect to VRF contract
    const VRFContract = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
    const sonicContract = VRFContract.attach(SONIC_VRF_ADDRESS);

    // Get endpoint address
    const endpointAddress = await sonicContract.endpoint();
    console.log(`📡 LayerZero Endpoint: ${endpointAddress}`);

    console.log("📋 Configuration Details:");
    console.log(`   Contract: ${SONIC_VRF_ADDRESS}`);
    console.log(`   Send Library: ${SEND_LIBRARY}`);
    console.log(`   Arbitrum EID: ${ARBITRUM_EID}`);
    console.log(`   DVN Address: ${DVN_ADDRESS}`);

    // Based on the existing config format, let me build the correct structure
    // The existing config shows this pattern:
    // Chunk 0: offset pointer (0x20)
    // Chunk 1: confirmations (20 = 0x14)
    // Chunk 2: some value (1)
    // ...
    // Chunk 8: DVN address
    
    // Let me build the config using the exact same ABI encoding as LayerZero expects
    console.log("\n🔧 Building ULN Configuration with correct format...");

    try {
        // The LayerZero ULN config appears to be ABI-encoded as:
        // struct UlnConfig {
        //     uint64 confirmations;
        //     uint8 requiredDVNCount;
        //     uint8 optionalDVNCount;
        //     uint8 optionalDVNThreshold;
        //     address[] requiredDVNs;
        //     address[] optionalDVNs;
        // }

        const ulnConfig = ethers.utils.defaultAbiCoder.encode(
            ["tuple(uint64,uint8,uint8,uint8,address[],address[])"],
            [[
                20, // confirmations
                1,  // requiredDVNCount - THIS IS THE KEY CHANGE!
                0,  // optionalDVNCount
                0,  // optionalDVNThreshold
                [DVN_ADDRESS], // requiredDVNs array with our DVN
                [] // optionalDVNs empty array
            ]]
        );

        console.log(`   Confirmations: 20`);
        console.log(`   Required DVN Count: 1`);
        console.log(`   Optional DVN Count: 0`);
        console.log(`   Optional DVN Threshold: 0`);
        console.log(`   Required DVNs: [${DVN_ADDRESS}]`);
        console.log(`   Optional DVNs: []`);
        console.log(`   Encoded Config: ${ulnConfig}`);
        console.log(`   Config Length: ${(ulnConfig.length - 2) / 2} bytes`);

        // Connect to endpoint
        const endpoint = new ethers.Contract(endpointAddress, [
            "function setConfig(address oapp, address lib, uint32 eid, uint32 configType, bytes calldata config) external"
        ], signer);

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
            
            // Test making an actual request
            console.log("\n🎲 Testing VRF Request...");
            const requestTx = await sonicContract.requestRandomWordsSimple(
                ARBITRUM_EID,
                { value: quote.nativeFee }
            );
            console.log(`   Request transaction: ${requestTx.hash}`);
            const requestReceipt = await requestTx.wait();
            console.log(`   ✅ VRF request sent in block ${requestReceipt.blockNumber}!`);
            
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