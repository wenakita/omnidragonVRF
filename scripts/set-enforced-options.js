const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Setting Enforced Options...");
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);
    
    const NEW_VRF_CONTRACT = "0xC8A27A512AC32B3d63803821e121233f1E05Dc34";
    const ARBITRUM_EID = 30110;
    
    console.log(`📡 VRF Contract: ${NEW_VRF_CONTRACT}`);
    
    // Get the VRF contract
    const vrfContract = await ethers.getContractAt("ChainlinkVRFIntegratorV2_5", NEW_VRF_CONTRACT);
    
    console.log("\\n🔍 Setting enforced options...");
    try {
        // Create enforced options array with proper structure
        const enforcedOptions = [
            {
                eid: ARBITRUM_EID,
                option: {
                    msgType: 1,
                    options: "0x000301001101000000000000000000000000000aae60" // 700000 gas
                }
            }
        ];
        
        console.log(`   📋 Setting enforced options for EID ${ARBITRUM_EID}`);
        console.log(`   📋 Options: ${enforcedOptions[0].option.options}`);
        console.log(`   📋 Message Type: ${enforcedOptions[0].option.msgType}`);
        
        // Check if function exists first
        try {
            const hasFunction = vrfContract.interface.getFunction("setEnforcedOptions");
            console.log(`   ✅ setEnforcedOptions function found: ${hasFunction.name}`);
        } catch (error) {
            console.log(`   ❌ setEnforcedOptions function not found: ${error.message}`);
            return;
        }
        
        const enforcedTx = await vrfContract.setEnforcedOptions(enforcedOptions, {
            gasLimit: 500000
        });
        
        console.log(`   📤 Enforced options transaction: ${enforcedTx.hash}`);
        await enforcedTx.wait();
        console.log(`   ✅ Enforced options set successfully`);
        
    } catch (error) {
        console.log(`   ❌ Failed to set enforced options: ${error.message}`);
        
        // Try alternative format
        console.log("\\n🔍 Trying alternative format...");
        try {
            // Alternative: Just the options bytes directly
            const enforcedOptionsAlt = [
                [ARBITRUM_EID, 1, "0x000301001101000000000000000000000000000aae60"]
            ];
            
            const enforcedTxAlt = await vrfContract.setEnforcedOptions(enforcedOptionsAlt, {
                gasLimit: 500000
            });
            
            console.log(`   📤 Alternative enforced options transaction: ${enforcedTxAlt.hash}`);
            await enforcedTxAlt.wait();
            console.log(`   ✅ Enforced options set successfully with alternative format`);
            
        } catch (altError) {
            console.log(`   ❌ Alternative format also failed: ${altError.message}`);
            
            // Check what the actual function signature expects
            console.log("\\n🔍 Checking function signature...");
            const functionFragment = vrfContract.interface.getFunction("setEnforcedOptions");
            console.log(`   📋 Function signature: ${functionFragment.format()}`);
        }
    }
    
    console.log("\\n🔍 Testing quote function after enforced options...");
    try {
        const options = "0x000301001101000000000000000000000000000aae60"; // 700000 gas
        const quote = await vrfContract.quote(ARBITRUM_EID, options);
        
        console.log(`   ✅ Quote function still works!`);
        console.log(`   💰 Native fee: ${ethers.utils.formatEther(quote.nativeFee)} S`);
        
    } catch (error) {
        console.log(`   ❌ Quote function failed: ${error.reason || error.message}`);
    }
    
    console.log("\\n🎯 Enforced options setup completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 