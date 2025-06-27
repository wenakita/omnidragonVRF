const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Testing VRF Quote Function on New Contract...");
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);
    
    const NEW_VRF_CONTRACT = "0xC8A27A512AC32B3d63803821e121233f1E05Dc34";
    const ARBITRUM_EID = 30110;
    
    console.log(`📡 New VRF Contract: ${NEW_VRF_CONTRACT}`);
    
    // Get the contract
    const vrfContract = await ethers.getContractAt("ChainlinkVRFIntegratorV2_5", NEW_VRF_CONTRACT);
    
    console.log("\\n🔍 Step 1: Check contract basic info...");
    try {
        const owner = await vrfContract.owner();
        const balance = await ethers.provider.getBalance(NEW_VRF_CONTRACT);
        const requestCounter = await vrfContract.requestCounter();
        const defaultGasLimit = await vrfContract.defaultGasLimit();
        
        console.log(`   ✅ Owner: ${owner}`);
        console.log(`   ✅ Balance: ${ethers.utils.formatEther(balance)} S`);
        console.log(`   ✅ Request counter: ${requestCounter}`);
        console.log(`   ✅ Default gas limit: ${defaultGasLimit}`);
    } catch (error) {
        console.log(`   ❌ Failed to get basic info: ${error.message}`);
        return;
    }
    
    console.log("\\n🔍 Step 2: Check peer configuration...");
    try {
        const peer = await vrfContract.peers(ARBITRUM_EID);
        console.log(`   ✅ Arbitrum peer: ${peer}`);
    } catch (error) {
        console.log(`   ❌ Failed to get peer: ${error.message}`);
        return;
    }
    
    console.log("\\n🔍 Step 3: Test quote function...");
    try {
        const options = "0x000301001101000000000000000000000000000aae60"; // 700000 gas
        console.log(`   Options: ${options}`);
        
        const quote = await vrfContract.quote(ARBITRUM_EID, options);
        
        console.log(`   🎉 SUCCESS! Quote function works!`);
        console.log(`   💰 Native fee: ${ethers.utils.formatEther(quote.nativeFee)} S`);
        console.log(`   🪙 LZ token fee: ${quote.lzTokenFee.toString()}`);
        
        // Test if we can make a request
        console.log("\\n🔍 Step 4: Test request simulation...");
        const requestFee = quote.nativeFee;
        console.log(`   💰 Required fee: ${ethers.utils.formatEther(requestFee)} S`);
        
        if (requestFee.gt(0)) {
            console.log("   ✅ Fee calculation successful - ready for VRF requests!");
        } else {
            console.log("   ⚠️  Fee is 0 - may indicate configuration issue");
        }
        
    } catch (error) {
        console.log(`   ❌ Quote failed: ${error.reason || error.message}`);
        
        if (error.message.includes("DVN")) {
            console.log("   🔍 DVN configuration issue detected");
            console.log("   💡 LayerZero wiring may still be in progress");
        }
    }
    
    console.log("\\n🔍 Step 5: Check setConfig function...");
    try {
        const hasSetConfig = vrfContract.interface.getFunction("setConfig");
        console.log(`   ✅ setConfig function available: ${hasSetConfig.name}`);
    } catch (error) {
        console.log(`   ❌ setConfig function not found: ${error.message}`);
    }
    
    console.log("\\n🎯 Test completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 