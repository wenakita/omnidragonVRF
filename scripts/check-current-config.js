const { ethers } = require('hardhat');

async function main() {
    console.log('🔍 Checking Current LayerZero Configuration...\n');

    const sonicEndpoint = '0x1a44076050125825900e736c501f859c50fE728c';
    const arbitrumEndpoint = '0x1a44076050125825900e736c501f859c50fE728c';
    
    const sonicContract = '0x3bAc0b3C348425992224c8FafEeFc3aF6205755e';
    const arbitrumContract = '0x1aFF9b2bCDe8a9c29d598c40558a23b61be78551';
    
    const arbitrumEid = 30110;
    const sonicEid = 30332;

    // Check Sonic endpoint configuration
    console.log('🌊 SONIC NETWORK CONFIGURATION:');
    console.log('='.repeat(50));
    
    try {
        const sonicEndpointContract = new ethers.Contract(sonicEndpoint, [
            'function getSendLibrary(address, uint32) view returns (address)',
            'function getReceiveLibrary(address, uint32) view returns (address, bool)',
            'function defaultSendLibrary(uint32) view returns (address)',
            'function defaultReceiveLibrary(uint32) view returns (address)',
            'function getConfig(address, uint32, bytes32) view returns (bytes)',
        ], ethers.provider);

        // Check current send library
        try {
            const sendLib = await sonicEndpointContract.getSendLibrary(sonicContract, arbitrumEid);
            console.log(`✅ Current Send Library (Sonic → Arbitrum): ${sendLib}`);
        } catch (e) {
            console.log(`❌ Send Library: ${e.message}`);
        }

        // Check current receive library
        try {
            const [receiveLib, isDefault] = await sonicEndpointContract.getReceiveLibrary(sonicContract, arbitrumEid);
            console.log(`✅ Current Receive Library (Sonic ← Arbitrum): ${receiveLib} (default: ${isDefault})`);
        } catch (e) {
            console.log(`❌ Receive Library: ${e.message}`);
        }

        // Check default libraries
        try {
            const defaultSend = await sonicEndpointContract.defaultSendLibrary(arbitrumEid);
            console.log(`📋 Default Send Library for Arbitrum: ${defaultSend}`);
        } catch (e) {
            console.log(`❌ Default Send Library: ${e.message}`);
        }

        try {
            const defaultReceive = await sonicEndpointContract.defaultReceiveLibrary(arbitrumEid);
            console.log(`📋 Default Receive Library for Arbitrum: ${defaultReceive}`);
        } catch (e) {
            console.log(`❌ Default Receive Library: ${e.message}`);
        }

    } catch (error) {
        console.log(`Error checking Sonic endpoint: ${error.message}`);
    }

    console.log('\n🏛️ ARBITRUM NETWORK CONFIGURATION:');
    console.log('='.repeat(50));

    // Switch to Arbitrum network to check
    try {
        // We'll need to manually check this or create a separate script
        console.log('Note: To check Arbitrum config, run this script with --network arbitrum');
        console.log(`Arbitrum Contract: ${arbitrumContract}`);
        console.log(`Sonic EID: ${sonicEid}`);
    } catch (error) {
        console.log(`Error: ${error.message}`);
    }

    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('='.repeat(50));
    
    console.log('1. If libraries are already set correctly, you may only need to configure DVNs and executors');
    console.log('2. If libraries are set to different addresses, you may need to update them');
    console.log('3. Check if the contract owner has permission to modify these settings');
    console.log('4. Consider using --dry-run flag with LayerZero CLI to see what would be changed');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 