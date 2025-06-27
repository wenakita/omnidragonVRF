const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking LayerZero Configuration in Detail...\n");

    const SONIC_VRF_ADDRESS = "0x3bAc0b3C348425992224c8FafEeFc3aF6205755e";
    const ARBITRUM_EID = 30110;

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
        "function getSendLibrary(address oapp, uint32 eid) external view returns (address lib)",
        "function getReceiveLibrary(address oapp, uint32 eid) external view returns (address lib, bool isDefault)",
        "function getConfig(address oapp, address lib, uint32 eid, uint32 configType) external view returns (bytes memory config)",
        "function setSendLibrary(address oapp, uint32 eid, address lib) external",
        "function setConfig(address oapp, address lib, uint32 eid, uint32 configType, bytes calldata config) external"
    ];
    
    const endpoint = new ethers.Contract(endpointAddress, endpointABI, signer);

    console.log("\n📋 Current LayerZero Configuration:");
    
    try {
        // Check send library
        const sendLib = await endpoint.getSendLibrary(SONIC_VRF_ADDRESS, ARBITRUM_EID);
        console.log(`   Send Library: ${sendLib}`);
        
        // Check receive library
        const [receiveLib, isDefault] = await endpoint.getReceiveLibrary(SONIC_VRF_ADDRESS, ARBITRUM_EID);
        console.log(`   Receive Library: ${receiveLib} (default: ${isDefault})`);

        // Check if libraries are set
        const sendLibSet = sendLib !== "0x0000000000000000000000000000000000000000";
        const receiveLibSet = receiveLib !== "0x0000000000000000000000000000000000000000";
        
        console.log(`   Send Library Set: ${sendLibSet ? '✅' : '❌'}`);
        console.log(`   Receive Library Set: ${receiveLibSet ? '✅' : '❌'}`);

        if (sendLibSet) {
            console.log("\n🔍 Checking ULN Configuration (DVNs)...");
            
            // ULN Config type is 2
            try {
                const ulnConfig = await endpoint.getConfig(SONIC_VRF_ADDRESS, sendLib, ARBITRUM_EID, 2);
                console.log(`   ULN Config Length: ${ulnConfig.length} bytes`);
                
                if (ulnConfig.length > 2) {
                    console.log(`   ULN Config Data: ${ulnConfig}`);
                    
                    // Try to decode the ULN config
                    if (ulnConfig.length >= 66) { // Minimum expected length
                        try {
                            // ULN config structure: confirmations (8 bytes) + requiredDVNCount (1 byte) + optionalDVNCount (1 byte) + optionalDVNThreshold (1 byte) + DVN addresses
                            const confirmations = ethers.BigNumber.from("0x" + ulnConfig.slice(2, 18));
                            console.log(`   Confirmations: ${confirmations}`);
                            
                            const requiredDVNCount = parseInt(ulnConfig.slice(18, 20), 16);
                            const optionalDVNCount = parseInt(ulnConfig.slice(20, 22), 16);
                            const optionalDVNThreshold = parseInt(ulnConfig.slice(22, 24), 16);
                            
                            console.log(`   Required DVN Count: ${requiredDVNCount}`);
                            console.log(`   Optional DVN Count: ${optionalDVNCount}`);
                            console.log(`   Optional DVN Threshold: ${optionalDVNThreshold}`);
                            
                            if (requiredDVNCount === 0 && optionalDVNCount === 0) {
                                console.log("   ❌ NO DVNs CONFIGURED!");
                            } else {
                                console.log("   ✅ DVNs are configured");
                            }
                        } catch (decodeError) {
                            console.log(`   ⚠️  Could not decode ULN config: ${decodeError.message}`);
                        }
                    } else {
                        console.log("   ❌ ULN config too short - likely not configured");
                    }
                } else {
                    console.log("   ❌ No ULN configuration found");
                }
            } catch (configError) {
                console.log(`   ❌ Error getting ULN config: ${configError.message}`);
            }

            console.log("\n🔍 Checking Executor Configuration...");
            
            // Executor config type is 1
            try {
                const executorConfig = await endpoint.getConfig(SONIC_VRF_ADDRESS, sendLib, ARBITRUM_EID, 1);
                console.log(`   Executor Config Length: ${executorConfig.length} bytes`);
                
                if (executorConfig.length > 2) {
                    console.log(`   Executor Config Data: ${executorConfig}`);
                    console.log("   ✅ Executor is configured");
                } else {
                    console.log("   ❌ No Executor configuration found");
                }
            } catch (configError) {
                console.log(`   ❌ Error getting Executor config: ${configError.message}`);
            }
        }

        // Check what our config file expects
        console.log("\n📋 Expected Configuration from layerzero.config.ts:");
        console.log("   Expected Send Library: 0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7");
        console.log("   Expected Receive Library: 0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043");
        console.log("   Expected DVN: 0x282b3386571f7f794450d5789911a9804fa346b4");
        console.log("   Expected Executor: 0x4208D6E27538189bB48E603D6123A94b8Abe0A0b");

        const expectedSendLib = "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7";
        const expectedReceiveLib = "0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043";
        
        console.log("\n🔍 Configuration Matches:");
        console.log(`   Send Library Match: ${sendLib.toLowerCase() === expectedSendLib.toLowerCase() ? '✅' : '❌'}`);
        console.log(`   Receive Library Match: ${receiveLib.toLowerCase() === expectedReceiveLib.toLowerCase() ? '✅' : '❌'}`);

    } catch (error) {
        console.error(`❌ Error checking LayerZero config: ${error.message}`);
    }

    console.log("\n🎯 Summary:");
    console.log("If DVNs and Executor are not configured, the LayerZero wiring command needs to complete successfully.");
    console.log("The error in the wiring suggests there might be an issue with the endpoint or library addresses.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 