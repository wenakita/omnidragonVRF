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
    const SEND_LIBRARY = "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7";
    
    console.log(`📡 VRF Contract: ${VRF_CONTRACT}`);
    console.log(`📡 LayerZero Endpoint: ${LAYERZERO_ENDPOINT}`);
    console.log(`📡 Correct DVN Address: ${CORRECT_DVN_ADDRESS}`);
    
    // Get the endpoint contract
    const endpoint = await ethers.getContractAt(
        "contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2",
        LAYERZERO_ENDPOINT
    );
    
    console.log("\\n🔍 Step 1: Creating ULN Config with correct DVN...");
    
    // Create the ULN config with the correct DVN
    const ulnConfig = {
        confirmations: 20,
        requiredDVNCount: 1,
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        requiredDVNs: [CORRECT_DVN_ADDRESS],
        optionalDVNs: []
    };
    
    console.log(`   ✅ Confirmations: ${ulnConfig.confirmations}`);
    console.log(`   ✅ Required DVN Count: ${ulnConfig.requiredDVNCount}`);
    console.log(`   ✅ Required DVNs: ${ulnConfig.requiredDVNs[0]}`);
    
    // Encode the ULN config
    const ulnConfigEncoded = ethers.utils.defaultAbiCoder.encode(
        ["tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)"],
        [ulnConfig]
    );
    
    console.log(`   📦 Encoded ULN Config: ${ulnConfigEncoded}`);
    console.log(`   📏 Config Length: ${ulnConfigEncoded.length} characters`);
    
    console.log("\\n🔍 Step 2: Setting ULN configuration...");
    
    try {
        // Get current gas price and multiply by 5 for high priority
        const gasPrice = await ethers.provider.getGasPrice();
        const highGasPrice = gasPrice.mul(5);
        
        console.log(`   💰 Using gas price: ${ethers.utils.formatUnits(highGasPrice, "gwei")} gwei`);
        
        // Create the SetConfigParam array
        const setConfigParams = [
            {
                eid: ARBITRUM_ENDPOINT_ID,
                configType: 2, // ULN config type
                config: ulnConfigEncoded
            }
        ];
        
        console.log(`   📋 Config params:`, setConfigParams);
        
        const tx = await endpoint.setConfig(
            VRF_CONTRACT,
            SEND_LIBRARY,
            setConfigParams,
            {
                gasLimit: 1000000,
                gasPrice: highGasPrice
            }
        );
        
        console.log(`   📤 DVN configuration transaction sent: ${tx.hash}`);
        console.log(`   ⏳ Waiting for confirmation...`);
        
        const receipt = await tx.wait();
        console.log(`   ✅ DVN configuration set successfully!`);
        console.log(`   🧾 Gas used: ${receipt.gasUsed.toString()}`);
        
    } catch (error) {
        console.log(`   ❌ Failed to set DVN configuration: ${error.message}`);
        if (error.data) {
            console.log(`   🔍 Error data: ${error.data}`);
        }
        if (error.reason) {
            console.log(`   🔍 Error reason: ${error.reason}`);
        }
    }
    
    console.log("\\n🔍 Step 3: Verifying configuration...");
    
    // Wait a moment for the configuration to propagate
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check the new configuration
    try {
        const config = await endpoint.getConfig(
            VRF_CONTRACT,
            SEND_LIBRARY,
            ARBITRUM_ENDPOINT_ID,
            2 // ULN config type
        );
        
        console.log(`   📋 New config length: ${config.length} bytes`);
        console.log(`   📋 New config data: ${config}`);
        
        // Decode the config to verify
        const decoded = ethers.utils.defaultAbiCoder.decode(
            ["tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)"],
            config
        );
        
        console.log(`   ✅ Decoded confirmations: ${decoded[0].confirmations}`);
        console.log(`   ✅ Decoded required DVN count: ${decoded[0].requiredDVNCount}`);
        console.log(`   ✅ Decoded required DVNs: ${decoded[0].requiredDVNs}`);
        
    } catch (error) {
        console.log(`   ❌ Failed to get config: ${error.message}`);
    }
    
    // Check if the quote function works now
    try {
        const vrfContract = await ethers.getContractAt("ChainlinkVRFIntegratorV2_5", VRF_CONTRACT);
        const options = "0x000301001101000000000000000000000000000aae60"; // 700000 gas
        
        const quote = await vrfContract.quote(ARBITRUM_ENDPOINT_ID, options);
        console.log(`   ✅ Quote successful!`);
        console.log(`   💰 Native fee: ${ethers.utils.formatEther(quote.nativeFee)} S`);
        console.log(`   🪙 LZ token fee: ${quote.lzTokenFee.toString()}`);
        
    } catch (error) {
        console.log(`   ❌ Quote still failing: ${error.reason || error.message}`);
    }
    
    console.log("\\n🎯 Configuration attempt completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 