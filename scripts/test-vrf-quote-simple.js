const { ethers } = require('hardhat');

async function main() {
    console.log('🧪 Testing VRF Quote Function...\n');

    const vrfContractAddress = '0x3bAc0b3C348425992224c8FafEeFc3aF6205755e';
    
    // VRF contract ABI (just the functions we need)
    const vrfABI = [
        'function quote() external view returns (uint256)',
        'function owner() external view returns (address)',
        'function endpoint() external view returns (address)',
        'function peers(uint32) external view returns (bytes32)',
        'function requestCounter() external view returns (uint256)',
    ];

    try {
        const vrfContract = new ethers.Contract(vrfContractAddress, vrfABI, ethers.provider);

        console.log('📋 VRF Contract Info:');
        console.log('='.repeat(40));

        // Check basic contract info
        try {
            const owner = await vrfContract.owner();
            console.log(`✅ Owner: ${owner}`);
        } catch (e) {
            console.log(`❌ Owner: ${e.message}`);
        }

        try {
            const endpoint = await vrfContract.endpoint();
            console.log(`✅ Endpoint: ${endpoint}`);
        } catch (e) {
            console.log(`❌ Endpoint: ${e.message}`);
        }

        try {
            const arbitrumPeer = await vrfContract.peers(30110);
            console.log(`✅ Arbitrum Peer: ${arbitrumPeer}`);
        } catch (e) {
            console.log(`❌ Arbitrum Peer: ${e.message}`);
        }

        try {
            const requestCounter = await vrfContract.requestCounter();
            console.log(`✅ Request Counter: ${requestCounter.toString()}`);
        } catch (e) {
            console.log(`❌ Request Counter: ${e.message}`);
        }

        console.log('\n🎯 Testing Quote Function:');
        console.log('='.repeat(40));

        // Test the quote function
        try {
            const quote = await vrfContract.quote();
            console.log(`✅ Quote successful: ${ethers.utils.formatEther(quote)} ETH`);
            console.log(`   Raw value: ${quote.toString()} wei`);
            
            if (quote.gt(0)) {
                console.log('\n🎉 SUCCESS: VRF quote function is working!');
                console.log('   This means LayerZero configuration is already correct.');
                console.log('   You can proceed with VRF requests.');
            } else {
                console.log('\n⚠️  WARNING: Quote returned 0, may indicate configuration issues.');
            }
            
        } catch (e) {
            console.log(`❌ Quote failed: ${e.message}`);
            
            if (e.message.includes('Please set your OApp\'s DVNs')) {
                console.log('\n🔧 DIAGNOSIS: DVN configuration needed');
                console.log('   The LayerZero libraries are set but DVNs need configuration.');
            } else if (e.message.includes('LZDeadDVN')) {
                console.log('\n🔧 DIAGNOSIS: Dead DVN error');
                console.log('   Need to configure proper DVN addresses.');
            } else {
                console.log('\n🔧 DIAGNOSIS: Unknown error');
                console.log('   May need full LayerZero configuration.');
            }
        }

        console.log('\n📊 Network Status:');
        console.log('='.repeat(40));
        const blockNumber = await ethers.provider.getBlockNumber();
        console.log(`Current Sonic block: ${blockNumber}`);
        
        const balance = await ethers.provider.getBalance(vrfContractAddress);
        console.log(`Contract balance: ${ethers.utils.formatEther(balance)} ETH`);

    } catch (error) {
        console.error('❌ Error testing VRF contract:', error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 