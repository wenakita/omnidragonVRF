const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 Fixing Sonic → Arbitrum DVN Configuration...");
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);
    
    // Contract addresses
    const VRF_CONTRACT = "0x3bAc0b3C348425992224c8FafEeFc3aF6205755e";
    const LAYERZERO_ENDPOINT = "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B";
    const ARBITRUM_ENDPOINT_ID = 30110;
    const WRONG_DVN_ADDRESS = "0x6788f52439ACA6BFF597d3eeC2DC9a44B8FEE842"; // Currently set (wrong)
    const CORRECT_DVN_ADDRESS = "0x282b3386571f7f794450d5789911a9804fa346b4"; // Should be set (correct)
    const SEND_LIBRARY = "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7";
    
    console.log(`📡 VRF Contract: ${VRF_CONTRACT}`);
    console.log(`📡 Current DVN (wrong): ${WRONG_DVN_ADDRESS}`);
    console.log(`📡 Target DVN (correct): ${CORRECT_DVN_ADDRESS}`);
    
    // Get the endpoint contract
    const endpoint = await ethers.getContractAt(
        "contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2",
        LAYERZERO_ENDPOINT
    );
    
    console.log("\\n🔍 Step 1: Creating correct ULN Config...");
    
    // Create the ULN config with the correct DVN for Sonic
    const correctUlnConfig = {
        confirmations: 20,
        requiredDVNCount: 1,
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        requiredDVNs: [CORRECT_DVN_ADDRESS],
        optionalDVNs: []
    };
    
    console.log(`   ✅ Confirmations: ${correctUlnConfig.confirmations}`);
    console.log(`   ✅ Required DVN Count: ${correctUlnConfig.requiredDVNCount}`);
    console.log(`   ✅ Required DVNs: ${correctUlnConfig.requiredDVNs[0]}`);
    
    // Encode the ULN config
    const ulnConfigEncoded = ethers.utils.defaultAbiCoder.encode(
        ["tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)"],
        [correctUlnConfig]
    );
    
    console.log(`   📦 Encoded ULN Config: ${ulnConfigEncoded.substring(0, 100)}...`);
    
    console.log("\\n🔍 Step 2: Setting correct DVN configuration...");
    
    try {
        // Get current gas price and set it high
        const gasPrice = await ethers.provider.getGasPrice();
        const highGasPrice = gasPrice.mul(3);
        
        console.log(`   💰 Using gas price: ${ethers.utils.formatUnits(highGasPrice, "gwei")} gwei`);
        
        // Create the SetConfigParam for send config (DVN configuration)
        const setConfigParams = [
            {
                eid: ARBITRUM_ENDPOINT_ID,
                configType: 2, // Send ULN config type
                config: ulnConfigEncoded
            }
        ];
        
        console.log(`   📋 Setting send config for endpoint ${ARBITRUM_ENDPOINT_ID}`);
        
        const tx = await endpoint.setConfig(
            VRF_CONTRACT,
            SEND_LIBRARY,
            setConfigParams,
            {
                gasLimit: 500000,
                gasPrice: highGasPrice
            }
        );
        
        console.log(`   📤 DVN configuration transaction sent: ${tx.hash}`);
        console.log(`   ⏳ Waiting for confirmation...`);
        
        const receipt = await tx.wait();
        console.log(`   ✅ DVN configuration updated successfully!`);
        console.log(`   🧾 Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`   🔗 Transaction: https://sonicscan.org/tx/${tx.hash}`);
        
    } catch (error) {
        console.log(`   ❌ Failed to set DVN configuration: ${error.message}`);
        if (error.data) {
            console.log(`   🔍 Error data: ${error.data}`);
        }
        if (error.reason) {
            console.log(`   🔍 Error reason: ${error.reason}`);
        }
        return;
    }
    
    console.log("\\n🔍 Step 3: Verifying the fix...");
    
    // Wait for the configuration to propagate
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test the quote function
    try {
        const vrfContract = await ethers.getContractAt("ChainlinkVRFIntegratorV2_5", VRF_CONTRACT);
        const options = "0x000301001101000000000000000000000000000aae60"; // 700000 gas
        
        console.log(`   🧪 Testing quote function...`);
        const quote = await vrfContract.quote(ARBITRUM_ENDPOINT_ID, options);
        
        console.log(`   🎉 SUCCESS! Quote function now works!`);
        console.log(`   💰 Native fee: ${ethers.utils.formatEther(quote.nativeFee)} S`);
        console.log(`   🪙 LZ token fee: ${quote.lzTokenFee.toString()}`);
        
        console.log("\\n🎯 VRF System is now ready for requests!");
        
    } catch (error) {
        console.log(`   ❌ Quote still failing: ${error.reason || error.message}`);
        console.log(`   🔍 Additional debugging may be needed`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 