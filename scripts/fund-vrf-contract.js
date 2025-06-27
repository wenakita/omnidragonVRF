require('dotenv').config();
const { ethers } = require('ethers');

async function main() {
    console.log("💰 Funding VRF Contract and checking configuration...\n");

    // Contract addresses
    const SONIC_VRF_ADDRESS = "0x3bAc0b3C348425992224c8FafEeFc3aF6205755e";

    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);

    // Check current balance
    const currentBalance = await ethers.provider.getBalance(SONIC_VRF_ADDRESS);
    console.log(`📊 Current VRF contract balance: ${ethers.utils.formatEther(currentBalance)} S`);

    // Fund the contract if needed
    if (currentBalance.lt(ethers.utils.parseEther("0.5"))) {
        console.log("💸 Funding contract with 1 S...");
        const fundTx = await signer.sendTransaction({
            to: SONIC_VRF_ADDRESS,
            value: ethers.utils.parseEther("1.0")
        });
        
        console.log(`   Transaction: ${fundTx.hash}`);
        await fundTx.wait();
        
        const newBalance = await ethers.provider.getBalance(SONIC_VRF_ADDRESS);
        console.log(`   ✅ New balance: ${ethers.utils.formatEther(newBalance)} S`);
    } else {
        console.log("✅ Contract already has sufficient funds");
    }

    // Connect to VRF contract and check LayerZero configuration
    const VRFContract = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
    const sonicContract = VRFContract.attach(SONIC_VRF_ADDRESS);

    console.log("\n🔍 Checking LayerZero configuration...");
    
    // Get endpoint
    const endpoint = await sonicContract.endpoint();
    console.log(`   Endpoint: ${endpoint}`);

    // Check peer
    const ARBITRUM_EID = 30110;
    const peer = await sonicContract.peers(ARBITRUM_EID);
    console.log(`   Arbitrum peer: ${peer}`);

    // Check LayerZero endpoint configuration
    const endpointABI = [
        "function getSendLibrary(address oapp, uint32 eid) external view returns (address lib)",
        "function getReceiveLibrary(address oapp, uint32 eid) external view returns (address lib, bool isDefault)",
        "function getConfig(address oapp, address lib, uint32 eid, uint32 configType) external view returns (bytes memory config)"
    ];
    
    const endpointContract = new ethers.Contract(endpoint, endpointABI, signer);
    
    try {
        const sendLib = await endpointContract.getSendLibrary(SONIC_VRF_ADDRESS, ARBITRUM_EID);
        console.log(`   Send library: ${sendLib}`);
        
        const [receiveLib, isDefault] = await endpointContract.getReceiveLibrary(SONIC_VRF_ADDRESS, ARBITRUM_EID);
        console.log(`   Receive library: ${receiveLib} (default: ${isDefault})`);

        // Check if libraries are set (not zero address)
        const isConfigured = sendLib !== "0x0000000000000000000000000000000000000000" && 
                           receiveLib !== "0x0000000000000000000000000000000000000000";
        
        console.log(`   Libraries configured: ${isConfigured}`);

        if (isConfigured) {
            // Try to get DVN configuration
            console.log("\n🔍 Checking DVN configuration...");
            
            // ULN Config type is typically 2
            try {
                const sendConfig = await endpointContract.getConfig(SONIC_VRF_ADDRESS, sendLib, ARBITRUM_EID, 2);
                console.log(`   Send config length: ${sendConfig.length} bytes`);
                
                if (sendConfig.length > 2) {
                    console.log(`   Send config data: ${sendConfig}`);
                }
            } catch (error) {
                console.log(`   ❌ Could not get send config: ${error.message}`);
            }

            // Try quote function now
            console.log("\n🧪 Testing quote function...");
            try {
                const { Options } = require("@layerzerolabs/lz-v2-utilities");
                const defaultGasLimit = await sonicContract.defaultGasLimit();
                const options = Options.newOptions().addExecutorLzReceiveOption(defaultGasLimit, 0).toHex();
                
                const quote = await sonicContract.quote(ARBITRUM_EID, options);
                console.log(`   ✅ Quote successful: ${ethers.utils.formatEther(quote.nativeFee)} S`);
            } catch (error) {
                console.log(`   ❌ Quote still failing: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.log(`   ❌ Error checking endpoint config: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports = { main }; 