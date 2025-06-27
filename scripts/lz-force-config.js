const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 Force Setting LayerZero Configuration...");
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);
    
    // Contract addresses
    const VRF_CONTRACT = "0x3bAc0b3C348425992224c8FafEeFc3aF6205755e";
    const ARBITRUM_ENDPOINT_ID = 30110;
    const CORRECT_DVN_ADDRESS = "0x282b3386571f7f794450d5789911a9804fa346b4";
    const SEND_LIBRARY = "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7";
    const SONIC_ENDPOINT = "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B";
    
    console.log(`📡 VRF Contract: ${VRF_CONTRACT}`);
    console.log(`📡 Target DVN: ${CORRECT_DVN_ADDRESS}`);
    console.log(`📡 Send Library: ${SEND_LIBRARY}`);
    console.log(`📡 Sonic Endpoint: ${SONIC_ENDPOINT}`);
    
    // Get the VRF contract and endpoint
    const vrfContract = await ethers.getContractAt("ChainlinkVRFIntegratorV2_5", VRF_CONTRACT);
    const endpoint = await ethers.getContractAt("lib/layerzero-v2/packages/layerzero-v2/evm/protocol/contracts/interfaces/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2", SONIC_ENDPOINT);
    
    console.log("\\n🔍 Step 1: Check current owner...");
    const owner = await vrfContract.owner();
    console.log(`   📋 Contract owner: ${owner}`);
    console.log(`   📋 Is owner: ${owner.toLowerCase() === signer.address.toLowerCase()}`);
    
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        console.log("   ❌ Not the owner! Cannot set configuration.");
        return;
    }
    
    console.log("\\n🔍 Step 2: Check current delegate...");
    try {
        // Check if we can call endpoint methods (means we're a delegate)
        const currentSendLib = await endpoint.getSendLibrary(VRF_CONTRACT, ARBITRUM_ENDPOINT_ID);
        console.log(`   📋 Current send library: ${currentSendLib}`);
    } catch (error) {
        console.log(`   ⚠️  Cannot check send library (may need to set delegate): ${error.message}`);
    }
    
    console.log("\\n🔍 Step 3: Setting send configuration via LayerZero Endpoint...");
    
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
                eid: ARBITRUM_ENDPOINT_ID,
                configType: 2, // Send ULN config
                config: ulnConfig
            }
        ];
        
        // Get current gas price
        const gasPrice = await ethers.provider.getGasPrice();
        const highGasPrice = gasPrice.mul(3);
        
        console.log(`   💰 Using gas price: ${ethers.utils.formatUnits(highGasPrice, "gwei")} gwei`);
        
        // Call setConfig on the LayerZero endpoint
        const tx = await endpoint.setConfig(
            VRF_CONTRACT,      // _oapp
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
        
        // If we're not a delegate, let's try to set ourselves as delegate first
        if (error.message.includes("Ownable") || error.message.includes("delegate")) {
            console.log("\\n🔍 Step 3b: Setting ourselves as delegate...");
            try {
                const delegateTx = await vrfContract.setDelegate(signer.address, {
                    gasLimit: 200000,
                    gasPrice: highGasPrice
                });
                
                console.log(`   📤 Delegate transaction sent: ${delegateTx.hash}`);
                await delegateTx.wait();
                console.log(`   ✅ Delegate set successfully!`);
                
                // Now retry the configuration
                console.log("\\n🔍 Step 3c: Retrying configuration...");
                const retryTx = await endpoint.setConfig(
                    VRF_CONTRACT,
                    SEND_LIBRARY,
                    setConfigParams,
                    {
                        gasLimit: 1000000,
                        gasPrice: highGasPrice
                    }
                );
                
                console.log(`   📤 Retry configuration transaction sent: ${retryTx.hash}`);
                const retryReceipt = await retryTx.wait();
                console.log(`   ✅ Configuration set successfully on retry!`);
                console.log(`   🧾 Gas used: ${retryReceipt.gasUsed.toString()}`);
                console.log(`   🔗 Transaction: https://sonicscan.org/tx/${retryTx.hash}`);
                
            } catch (delegateError) {
                console.log(`   ❌ Failed to set delegate: ${delegateError.message}`);
                return;
            }
        } else {
            return;
        }
    }
    
    console.log("\\n🔍 Step 4: Testing quote function...");
    
    // Wait for configuration to propagate
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
        const options = "0x000301001101000000000000000000000000000aae60"; // 700000 gas
        const quote = await vrfContract.quote(ARBITRUM_ENDPOINT_ID, options);
        
        console.log(`   🎉 SUCCESS! Quote function works!`);
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