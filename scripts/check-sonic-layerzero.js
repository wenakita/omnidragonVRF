const { ethers } = require('hardhat');

async function main() {
    console.log('🔍 Checking Sonic LayerZero Contract Addresses...\n');

    // Sonic LayerZero Endpoint (this should be correct)
    const sonicEndpoint = '0x1a44076050125825900e736c501f859c50fE728c';
    
    // Addresses we're trying to verify
    const addressesToCheck = {
        'Sonic Endpoint': '0x1a44076050125825900e736c501f859c50fE728c',
        'Suspected SendUln302 (from docs)': '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B',
        'Previous SendUln302 (working)': '0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7',
        'Previous ReceiveUln302 (working)': '0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043',
        'Sonic Executor': '0x4208D6E27538189bB48E603D6123A94b8Abe0A0b',
        'LayerZero Labs DVN': '0x282b3386571f7f794450d5789911a9804fa346b4',
        'Alternative DVN': '0x2f55c492897526677c5b68fb199ea31e2c126416',
    };

    // Check if contracts exist at these addresses
    for (const [name, address] of Object.entries(addressesToCheck)) {
        try {
            const code = await ethers.provider.getCode(address);
            const hasContract = code !== '0x';
            console.log(`${name}:`);
            console.log(`  Address: ${address}`);
            console.log(`  Has Contract: ${hasContract ? '✅ YES' : '❌ NO'}`);
            
            if (hasContract) {
                // Try to get some basic info
                try {
                    const contract = new ethers.Contract(address, [
                        'function owner() view returns (address)',
                        'function getConfig(uint32, address, bytes32) view returns (bytes)',
                        'function getSendLibrary(address, uint32) view returns (address)',
                        'function getReceiveLibrary(address, uint32) view returns (address, bool)',
                    ], ethers.provider);
                    
                    // Try different function calls to identify contract type
                    try {
                        const owner = await contract.owner();
                        console.log(`  Owner: ${owner}`);
                    } catch (e) {
                        console.log(`  Owner: Not available`);
                    }
                    
                } catch (e) {
                    console.log(`  Contract Details: Unable to query`);
                }
            }
            console.log('');
        } catch (error) {
            console.log(`${name}: Error checking - ${error.message}\n`);
        }
    }

    // Try to get the actual libraries from the endpoint
    console.log('🔍 Querying Endpoint for Actual Libraries...\n');
    try {
        const endpointContract = new ethers.Contract(sonicEndpoint, [
            'function getSendLibrary(address, uint32) view returns (address)',
            'function getReceiveLibrary(address, uint32) view returns (address, bool)',
            'function getConfig(address, uint32, bytes32) view returns (bytes)',
        ], ethers.provider);

        const ourContract = '0x3bAc0b3C348425992224c8FafEeFc3aF6205755e';
        const arbitrumEid = 30110;

        console.log('Checking libraries for our contract...');
        try {
            const sendLib = await endpointContract.getSendLibrary(ourContract, arbitrumEid);
            console.log(`✅ Send Library: ${sendLib}`);
        } catch (e) {
            console.log(`❌ Send Library: ${e.message}`);
        }

        try {
            const [receiveLib, isDefault] = await endpointContract.getReceiveLibrary(ourContract, arbitrumEid);
            console.log(`✅ Receive Library: ${receiveLib} (default: ${isDefault})`);
        } catch (e) {
            console.log(`❌ Receive Library: ${e.message}`);
        }

    } catch (error) {
        console.log(`Error querying endpoint: ${error.message}`);
    }

    console.log('\n🔍 Checking Default Libraries...\n');
    try {
        const endpointContract = new ethers.Contract(sonicEndpoint, [
            'function getConfig(address, uint32, bytes32) view returns (bytes)',
            'function defaultSendLibrary(uint32) view returns (address)',
            'function defaultReceiveLibrary(uint32) view returns (address)',
        ], ethers.provider);

        try {
            const defaultSend = await endpointContract.defaultSendLibrary(30110);
            console.log(`✅ Default Send Library for Arbitrum: ${defaultSend}`);
        } catch (e) {
            console.log(`❌ Default Send Library: ${e.message}`);
        }

        try {
            const defaultReceive = await endpointContract.defaultReceiveLibrary(30110);
            console.log(`✅ Default Receive Library for Arbitrum: ${defaultReceive}`);
        } catch (e) {
            console.log(`❌ Default Receive Library: ${e.message}`);
        }

    } catch (error) {
        console.log(`Error checking defaults: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 