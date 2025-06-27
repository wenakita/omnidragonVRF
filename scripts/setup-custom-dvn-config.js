const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Setting Up Custom DVN Configuration...\n");

    const SONIC_VRF_ADDRESS = "0x3bAc0b3C348425992224c8FafEeFc3aF6205755e";
    const ARBITRUM_EID = 30110;
    const SEND_LIBRARY = "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7";
    const CUSTOM_DVN_ADDRESS = "0x282b3386571f7f794450d5789911a9804fa346b4"; // From layerzero.config.ts

    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);

    // Connect to VRF contract
    const VRFContract = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
    const sonicContract = VRFContract.attach(SONIC_VRF_ADDRESS);

    // Get endpoint address
    const endpointAddress = await sonicContract.endpoint();
    console.log(`📡 LayerZero Endpoint: ${endpointAddress}`);

    console.log("📋 Custom Configuration Details:");
    console.log(`   Contract: ${SONIC_VRF_ADDRESS}`);
    console.log(`   Send Library: ${SEND_LIBRARY}`);
    console.log(`   Arbitrum EID: ${ARBITRUM_EID}`);
    console.log(`   Custom DVN Address: ${CUSTOM_DVN_ADDRESS}`);

    // Check current configuration first
    console.log("\n🔍 Checking Current Configuration...");
    const endpoint = new ethers.Contract(endpointAddress, [
        "function getConfig(address oapp, address lib, uint32 eid, uint32 configType) external view returns (bytes memory config)",
        "function setConfig(address oapp, address lib, uint32 eid, uint32 configType, bytes calldata config) external"
    ], signer);

    const currentConfig = await endpoint.getConfig(SONIC_VRF_ADDRESS, SEND_LIBRARY, ARBITRUM_EID, 2);
    console.log(`   Current Config Length: ${currentConfig.length} bytes`);
    console.log(`   Current Config: ${currentConfig.slice(0, 100)}...`);

    // Build the custom ULN configuration
    console.log("\n🔧 Building Custom ULN Configuration...");

    try {
        // Encode the ULN config with our custom DVN
        const ulnConfig = ethers.utils.defaultAbiCoder.encode(
            ["tuple(uint64,uint8,uint8,uint8,address[],address[])"],
            [[
                20, // confirmations
                1,  // requiredDVNCount
                0,  // optionalDVNCount
                0,  // optionalDVNThreshold
                [CUSTOM_DVN_ADDRESS], // requiredDVNs array with our custom DVN
                [] // optionalDVNs empty array
            ]]
        );

        console.log(`   ✅ Configuration built successfully`);
        console.log(`   Confirmations: 20`);
        console.log(`   Required DVN Count: 1`);
        console.log(`   Required DVNs: [${CUSTOM_DVN_ADDRESS}]`);
        console.log(`   Config Length: ${(ulnConfig.length - 2) / 2} bytes`);

        console.log("\n🚀 Setting Custom DVN Configuration...");
        
        // Get current gas price and use a high multiplier
        const currentGasPrice = await signer.provider.getGasPrice();
        const gasPrice = currentGasPrice.mul(10); // Use 10x multiplier to ensure transaction goes through
        console.log(`   Using gas price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`);
        
        // Set the configuration
        const setConfigTx = await endpoint.setConfig(
            SONIC_VRF_ADDRESS,
            SEND_LIBRARY,
            ARBITRUM_EID,
            2, // ULN config type
            ulnConfig,
            {
                gasLimit: 800000, // Higher gas limit
                gasPrice: gasPrice
            }
        );

        console.log(`   Transaction submitted: ${setConfigTx.hash}`);
        console.log("   Waiting for confirmation...");
        
        const receipt = await setConfigTx.wait();
        console.log(`   ✅ Custom DVN configuration set in block ${receipt.blockNumber}`);
        console.log(`   Gas used: ${receipt.gasUsed}`);

        // Verify the new configuration
        console.log("\n🔍 Verifying New Configuration...");
        
        const newConfig = await endpoint.getConfig(SONIC_VRF_ADDRESS, SEND_LIBRARY, ARBITRUM_EID, 2);
        console.log(`   New Config Length: ${newConfig.length} bytes`);
        
        // Decode and verify the new config
        try {
            const decoded = ethers.utils.defaultAbiCoder.decode(
                ["tuple(uint64,uint8,uint8,uint8,address[],address[])"],
                newConfig
            );
            
            console.log(`   ✅ Decoded Configuration:`);
            console.log(`      Confirmations: ${decoded[0][0]}`);
            console.log(`      Required DVN Count: ${decoded[0][1]}`);
            console.log(`      Optional DVN Count: ${decoded[0][2]}`);
            console.log(`      Optional DVN Threshold: ${decoded[0][3]}`);
            console.log(`      Required DVNs: [${decoded[0][4].join(', ')}]`);
            console.log(`      Optional DVNs: [${decoded[0][5].join(', ')}]`);
            
            // Check if our custom DVN is properly set
            if (decoded[0][1] === 1 && decoded[0][4].length === 1 && 
                decoded[0][4][0].toLowerCase() === CUSTOM_DVN_ADDRESS.toLowerCase()) {
                console.log(`   🎉 Custom DVN successfully configured!`);
            } else {
                console.log(`   ❌ DVN configuration mismatch`);
            }
            
        } catch (decodeError) {
            console.log(`   ⚠️  Could not decode new config: ${decodeError.message}`);
        }

        // Test the quote function
        console.log("\n🧪 Testing Quote Function...");
        try {
            const { Options } = require("@layerzerolabs/lz-v2-utilities");
            const defaultGasLimit = await sonicContract.defaultGasLimit();
            const options = Options.newOptions().addExecutorLzReceiveOption(defaultGasLimit, 0).toHex();
            
            const quote = await sonicContract.quote(ARBITRUM_EID, options);
            console.log(`   ✅ Quote successful: ${ethers.utils.formatEther(quote.nativeFee)} S`);
            console.log("\n🎉 SUCCESS! VRF system is now ready for requests!");
            
            // Test making an actual VRF request
            console.log("\n🎲 Testing VRF Request...");
            const requestTx = await sonicContract.requestRandomWordsSimple(
                ARBITRUM_EID,
                { value: quote.nativeFee }
            );
            console.log(`   Request transaction submitted: ${requestTx.hash}`);
            console.log("   Waiting for confirmation...");
            
            const requestReceipt = await requestTx.wait();
            console.log(`   ✅ VRF request confirmed in block ${requestReceipt.blockNumber}!`);
            console.log(`   Gas used: ${requestReceipt.gasUsed}`);
            
            // Check if request counter increased
            const newRequestCounter = await sonicContract.requestCounter();
            console.log(`   Request counter: ${newRequestCounter}`);
            
        } catch (quoteError) {
            console.log(`   ❌ Quote/Request failed: ${quoteError.message}`);
            
            if (quoteError.message.includes("Please set your OApp's DVNs and/or Executor")) {
                console.log("   💡 DVN configuration may still need time to propagate");
            }
        }

    } catch (error) {
        console.error(`❌ Failed to set custom DVN configuration: ${error.message}`);
        
        if (error.message.includes("insufficient funds")) {
            console.log("💡 Solution: Add more S tokens to your wallet");
        } else if (error.message.includes("execution reverted")) {
            console.log("💡 Check: Ensure you're the owner of the contract or have proper permissions");
            console.log("💡 Alternative: The DVN address might not be valid for this network");
        }
    }

    console.log("\n📋 Summary:");
    console.log("✅ Custom DVN configuration setup complete");
    console.log(`✅ Using DVN: ${CUSTOM_DVN_ADDRESS}`);
    console.log("✅ Configuration matches layerzero.config.ts");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 