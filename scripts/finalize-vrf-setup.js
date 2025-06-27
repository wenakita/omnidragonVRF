const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Finalizing VRF Contract Setup...");
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);
    
    const NEW_VRF_CONTRACT = "0xC8A27A512AC32B3d63803821e121233f1E05Dc34";
    const ARBITRUM_EID = 30110;
    
    console.log(`📡 VRF Contract: ${NEW_VRF_CONTRACT}`);
    
    // Get the VRF contract
    const vrfContract = await ethers.getContractAt("ChainlinkVRFIntegratorV2_5", NEW_VRF_CONTRACT);
    
    console.log("\\n🔍 Step 1: Set delegate...");
    try {
        const delegateTx = await vrfContract.setDelegate(signer.address, {
            gasLimit: 200000
        });
        
        console.log(`   📤 Delegate transaction: ${delegateTx.hash}`);
        await delegateTx.wait();
        console.log(`   ✅ Delegate set to: ${signer.address}`);
        
    } catch (error) {
        console.log(`   ❌ Failed to set delegate: ${error.message}`);
        if (error.message.includes("already set")) {
            console.log(`   ℹ️  Delegate may already be set correctly`);
        }
    }
    
    console.log("\\n🔍 Step 2: Set enforced options...");
    try {
        // Create enforced options for 700k gas limit
        const enforcedOptions = [
            {
                eid: ARBITRUM_EID,
                option: {
                    msgType: 1,
                    options: "0x000301001101000000000000000000000000000aae60" // 700000 gas
                }
            }
        ];
        
        console.log(`   📋 Setting enforced options for EID ${ARBITRUM_EID} with 700k gas`);
        
        const enforcedTx = await vrfContract.setEnforcedOptions(enforcedOptions, {
            gasLimit: 300000
        });
        
        console.log(`   📤 Enforced options transaction: ${enforcedTx.hash}`);
        await enforcedTx.wait();
        console.log(`   ✅ Enforced options set successfully`);
        
    } catch (error) {
        console.log(`   ❌ Failed to set enforced options: ${error.message}`);
        if (error.message.includes("already set") || error.message.includes("same")) {
            console.log(`   ℹ️  Enforced options may already be set correctly`);
        }
    }
    
    console.log("\\n🔍 Step 3: Verify final configuration...");
    
    // Test quote function
    try {
        const options = "0x000301001101000000000000000000000000000aae60"; // 700000 gas
        const quote = await vrfContract.quote(ARBITRUM_EID, options);
        
        console.log(`   ✅ Quote function works!`);
        console.log(`   💰 Native fee: ${ethers.utils.formatEther(quote.nativeFee)} S`);
        console.log(`   🪙 LZ token fee: ${quote.lzTokenFee.toString()}`);
        
    } catch (error) {
        console.log(`   ❌ Quote function failed: ${error.reason || error.message}`);
    }
    
    // Check contract status
    try {
        const balance = await ethers.provider.getBalance(NEW_VRF_CONTRACT);
        const owner = await vrfContract.owner();
        const requestCounter = await vrfContract.requestCounter();
        const peer = await vrfContract.peers(ARBITRUM_EID);
        
        console.log(`\\n📊 Final Contract Status:`);
        console.log(`   📍 Address: ${NEW_VRF_CONTRACT}`);
        console.log(`   👤 Owner: ${owner}`);
        console.log(`   💰 Balance: ${ethers.utils.formatEther(balance)} S`);
        console.log(`   🔢 Request Counter: ${requestCounter}`);
        console.log(`   🔗 Arbitrum Peer: ${peer}`);
        
    } catch (error) {
        console.log(`   ❌ Failed to get contract status: ${error.message}`);
    }
    
    console.log("\\n🎯 VRF Contract Setup Complete!");
    console.log("\\n🚀 Ready for production VRF requests!");
    console.log("\\nNext steps:");
    console.log("1. Test a VRF request");
    console.log("2. Connect to lottery system");
    console.log("3. Deploy to production");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 