const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Testing Manual setConfig on New VRF Contract...");
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);
    
    const NEW_VRF_CONTRACT = "0xC8A27A512AC32B3d63803821e121233f1E05Dc34";
    const ARBITRUM_EID = 30110;
    const CORRECT_DVN_ADDRESS = "0x282b3386571f7f794450d5789911a9804fa346b4";
    const SEND_LIBRARY = "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7";
    
    console.log(`📡 VRF Contract: ${NEW_VRF_CONTRACT}`);
    console.log(`📡 Target DVN: ${CORRECT_DVN_ADDRESS}`);
    console.log(`📡 Send Library: ${SEND_LIBRARY}`);
    
    // Get the VRF contract
    const vrfContract = await ethers.getContractAt("ChainlinkVRFIntegratorV2_5", NEW_VRF_CONTRACT);
    
    console.log("\\n🔍 Step 1: Verify contract ownership...");
    const owner = await vrfContract.owner();
    console.log(`   📋 Contract owner: ${owner}`);
    console.log(`   📋 Is owner: ${owner.toLowerCase() === signer.address.toLowerCase()}`);
    
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        console.log("   ❌ Not the owner! Cannot set configuration.");
        return;
    }
    
    console.log("\\n🔍 Step 2: Test setConfig function...");
    
    try {
        // Create the ULN config
        const ulnConfig = ethers.utils.defaultAbiCoder.encode(
            ["tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)"],
            [{
                confirmations: 20,
                requiredDVNCount: 1,
                optionalDVNCount: 0,
                optionalDVNThreshold: 0,
                requiredDVNs: [CORRECT_DVN_ADDRESS],
                optionalDVNs: []
            }]
        );
        
        console.log(`   📦 ULN Config encoded: ${ulnConfig.substring(0, 100)}...`);
        
        // Create SetConfigParam array
        const setConfigParams = [
            {
                eid: ARBITRUM_EID,
                configType: 2, // Send ULN config
                config: ulnConfig
            }
        ];
        
        // Get current gas price
        const gasPrice = await ethers.provider.getGasPrice();
        const highGasPrice = gasPrice.mul(2);
        
        console.log(`   💰 Using gas price: ${ethers.utils.formatUnits(highGasPrice, "gwei")} gwei`);
        
        // Call setConfig on our VRF contract
        const tx = await vrfContract.setConfig(
            SEND_LIBRARY,      // _lib
            setConfigParams,   // _params
            {
                gasLimit: 1000000,
                gasPrice: highGasPrice
            }
        );
        
        console.log(`   📤 Configuration transaction sent: ${tx.hash}`);
        console.log(`   ⏳ Waiting for confirmation...`);
        
        const receipt = await tx.wait();
        console.log(`   ✅ Configuration set successfully!`);
        console.log(`   🧾 Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`   🔗 Transaction: https://sonicscan.org/tx/${tx.hash}`);
        
    } catch (error) {
        console.log(`   ❌ Failed to set configuration: ${error.message}`);
        if (error.data) {
            console.log(`   🔍 Error data: ${error.data}`);
        }
        if (error.reason) {
            console.log(`   🔍 Error reason: ${error.reason}`);
        }
    }
    
    console.log("\\n🔍 Step 3: Test quote function after configuration...");
    
    // Wait for configuration to propagate
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
        const options = "0x000301001101000000000000000000000000000aae60"; // 700000 gas
        const quote = await vrfContract.quote(ARBITRUM_EID, options);
        
        console.log(`   🎉 SUCCESS! Quote function works!`);
        console.log(`   💰 Native fee: ${ethers.utils.formatEther(quote.nativeFee)} S`);
        console.log(`   🪙 LZ token fee: ${quote.lzTokenFee.toString()}`);
        
    } catch (error) {
        console.log(`   ❌ Quote still failing: ${error.reason || error.message}`);
    }
    
    console.log("\\n🎯 Manual setConfig test completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 