const { ethers } = require('hardhat');
const { OptionsBuilder } = require('@layerzerolabs/lz-v2-utilities');

async function main() {
    console.log('🎲 Testing VRF with Proper Options...');
    
    const SONIC_CONTRACT = '0x5949156D5dD762aB15c1FEd4dE90B8a8CAF60746';
    const ARBITRUM_EID = 30110;
    
    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log('Deployer:', deployer.address);
    console.log('Balance:', ethers.utils.formatEther(await deployer.getBalance()), 'ETH');
    
    // Connect to Sonic contract
    const sonicContract = await ethers.getContractAt('ChainlinkVRFIntegratorV2_5', SONIC_CONTRACT);
    
    try {
        // Check contract status first
        console.log('\n📊 Checking contract status...');
        const status = await sonicContract.getContractStatus();
        console.log('Contract balance:', ethers.utils.formatEther(status.balance), 'ETH');
        console.log('Can operate:', status.canOperate);
        
        // Check peer connection
        const peer = await sonicContract.peers(ARBITRUM_EID);
        console.log('Arbitrum peer set:', peer !== '0x0000000000000000000000000000000000000000000000000000000000000000');
        
        // Get default gas limit from contract
        const defaultGasLimit = await sonicContract.defaultGasLimit();
        console.log('Default gas limit:', defaultGasLimit.toString());
        
        // Build proper options
        console.log('\n🔧 Building LayerZero options...');
        const options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(defaultGasLimit, 0);
        console.log('Options built:', ethers.utils.hexlify(options));
        
        // Get quote with proper options
        console.log('\n💰 Getting quote...');
        const quote = await sonicContract.quote(ARBITRUM_EID, options);
        console.log('LayerZero Fee:', ethers.utils.formatEther(quote.nativeFee), 'ETH');
        
        if (quote.nativeFee.gt(0)) {
            // Make VRF request with proper options
            console.log('\n🎯 Making VRF Request...');
            
            const tx = await sonicContract.requestRandomWords(ARBITRUM_EID, options, {
                value: quote.nativeFee,
                gasLimit: 500000
            });
            
            console.log('Transaction Hash:', tx.hash);
            console.log('⏳ Waiting for confirmation...');
            
            const receipt = await tx.wait();
            console.log('✅ VRF Request sent successfully!');
            console.log('Gas Used:', receipt.gasUsed.toString());
            
            // Look for events
            const events = receipt.events?.filter(e => e.event) || [];
            console.log('\n📋 Events emitted:');
            events.forEach(event => {
                console.log(`- ${event.event}`);
                if (event.args) {
                    Object.keys(event.args).forEach(key => {
                        if (isNaN(key)) { // Skip numeric indices
                            console.log(`  ${key}:`, event.args[key].toString());
                        }
                    });
                }
            });
            
        } else {
            console.log('❌ Quote returned 0 fee - configuration issue');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.data) {
            console.error('Error data:', error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 