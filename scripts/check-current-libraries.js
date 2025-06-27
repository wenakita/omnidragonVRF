const { ethers } = require('hardhat');

async function main() {
    console.log('🔍 Checking Current LayerZero Libraries Configuration...\n');

    const vrfContractAddress = '0x3bAc0b3C348425992224c8FafEeFc3aF6205755e';
    const sonicEndpoint = '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B';
    const arbitrumEid = 30110;

    // LayerZero Endpoint ABI for checking libraries
    const endpointABI = [
        'function getSendLibrary(address oapp, uint32 eid) external view returns (address lib)',
        'function getReceiveLibrary(address oapp, uint32 eid) external view returns (address lib, bool isDefault)',
        'function isDefaultSendLibrary(address oapp, uint32 eid) external view returns (bool)',
        'function isDefaultReceiveLibrary(address oapp, uint32 eid) external view returns (bool)'
    ];

    try {
        const endpoint = new ethers.Contract(sonicEndpoint, endpointABI, ethers.provider);

        console.log('📋 Current Library Configuration:');
        console.log('='.repeat(50));
        console.log(`VRF Contract: ${vrfContractAddress}`);
        console.log(`Sonic Endpoint: ${sonicEndpoint}`);
        console.log(`Target EID (Arbitrum): ${arbitrumEid}\n`);

        // Check send library
        try {
            const sendLib = await endpoint.getSendLibrary(vrfContractAddress, arbitrumEid);
            console.log(`✅ Send Library: ${sendLib}`);
            
            const isDefaultSend = await endpoint.isDefaultSendLibrary(vrfContractAddress, arbitrumEid);
            console.log(`   Is Default Send: ${isDefaultSend}`);
        } catch (error) {
            console.log(`❌ Send Library check failed: ${error.message}`);
        }

        // Check receive library
        try {
            const [receiveLib, isDefault] = await endpoint.getReceiveLibrary(vrfContractAddress, arbitrumEid);
            console.log(`✅ Receive Library: ${receiveLib}`);
            console.log(`   Is Default Receive: ${isDefault}`);
        } catch (error) {
            console.log(`❌ Receive Library check failed: ${error.message}`);
        }

        console.log('\n🎯 Analysis:');
        console.log('='.repeat(50));
        console.log('If libraries are already set, we only need to configure DVNs and executors.');
        console.log('The error 0xc4c52593 means "LibraryAlreadySet" - libraries are configured!');

    } catch (error) {
        console.error('❌ Failed to check libraries:', error.message);
    }
}

main().catch(console.error); 