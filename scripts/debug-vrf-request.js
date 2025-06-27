const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging VRF Request Process...\n");

    // Contract addresses
    const SONIC_VRF_ADDRESS = "0x3bAc0b3C348425992224c8FafEeFc3aF6205755e";
    const ARBITRUM_EID = 30110;

    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);

    // Connect to Sonic VRF contract
    const VRFContract = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
    const sonicContract = VRFContract.attach(SONIC_VRF_ADDRESS);

    console.log("📋 Step 1: Check contract basic info");
    try {
        const owner = await sonicContract.owner();
        const requestCounter = await sonicContract.requestCounter();
        const defaultGasLimit = await sonicContract.defaultGasLimit();
        const balance = await ethers.provider.getBalance(SONIC_VRF_ADDRESS);
        
        console.log(`   ✅ Owner: ${owner}`);
        console.log(`   ✅ Request counter: ${requestCounter}`);
        console.log(`   ✅ Default gas limit: ${defaultGasLimit}`);
        console.log(`   ✅ Contract balance: ${ethers.utils.formatEther(balance)} S`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return;
    }

    console.log("\n📋 Step 2: Check peer configuration");
    try {
        const peer = await sonicContract.peers(ARBITRUM_EID);
        console.log(`   ✅ Arbitrum peer: ${peer}`);
        
        if (peer === "0x0000000000000000000000000000000000000000000000000000000000000000") {
            console.log("   ❌ Peer not set!");
            return;
        }
    } catch (error) {
        console.log(`   ❌ Error checking peer: ${error.message}`);
        return;
    }

    console.log("\n📋 Step 3: Test quote function");
    try {
        const { Options } = require("@layerzerolabs/lz-v2-utilities");
        const defaultGasLimit = await sonicContract.defaultGasLimit();
        const options = Options.newOptions().addExecutorLzReceiveOption(defaultGasLimit, 0).toHex();
        
        console.log(`   Options: ${options}`);
        
        const quote = await sonicContract.quote(ARBITRUM_EID, options);
        console.log(`   ✅ Quote successful: ${ethers.utils.formatEther(quote.nativeFee)} S`);
    } catch (error) {
        console.log(`   ❌ Quote failed: ${error.message}`);
        
        // Try to get more details about the error
        if (error.reason) {
            console.log(`   Reason: ${error.reason}`);
        }
        if (error.code) {
            console.log(`   Code: ${error.code}`);
        }
        return;
    }

    console.log("\n📋 Step 4: Test transaction simulation (estimateGas)");
    try {
        const gasEstimate = await sonicContract.estimateGas.requestRandomWordsSimple(
            ARBITRUM_EID,
            { value: ethers.utils.parseEther("0.17") }
        );
        console.log(`   ✅ Gas estimate: ${gasEstimate}`);
    } catch (error) {
        console.log(`   ❌ Gas estimation failed: ${error.message}`);
        
        // Try to decode the error
        if (error.data) {
            try {
                const decoded = sonicContract.interface.parseError(error.data);
                console.log(`   Decoded error: ${decoded.name}`);
                if (decoded.args) {
                    console.log(`   Args:`, decoded.args);
                }
            } catch (decodeError) {
                console.log(`   Raw error data: ${error.data}`);
            }
        }
        
        if (error.reason) {
            console.log(`   Reason: ${error.reason}`);
        }
        return;
    }

    console.log("\n📋 Step 5: Check LayerZero endpoint configuration");
    try {
        // Get the endpoint address from the contract
        const endpoint = await sonicContract.endpoint();
        console.log(`   ✅ Endpoint: ${endpoint}`);
        
        // Connect to endpoint to check configuration
        const endpointABI = [
            "function getSendLibrary(address oapp, uint32 eid) external view returns (address lib)",
            "function getReceiveLibrary(address oapp, uint32 eid) external view returns (address lib, bool isDefault)",
            "function getConfig(address oapp, address lib, uint32 eid, uint32 configType) external view returns (bytes memory config)"
        ];
        
        const endpointContract = new ethers.Contract(endpoint, endpointABI, signer);
        
        const sendLib = await endpointContract.getSendLibrary(SONIC_VRF_ADDRESS, ARBITRUM_EID);
        console.log(`   ✅ Send library: ${sendLib}`);
        
        const [receiveLib, isDefault] = await endpointContract.getReceiveLibrary(SONIC_VRF_ADDRESS, ARBITRUM_EID);
        console.log(`   ✅ Receive library: ${receiveLib} (default: ${isDefault})`);
        
    } catch (error) {
        console.log(`   ❌ Endpoint check failed: ${error.message}`);
    }

    console.log("\n✅ Debug complete. If all steps passed, the issue might be in the actual transaction execution.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 