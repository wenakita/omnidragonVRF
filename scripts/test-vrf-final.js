const { ethers } = require('hardhat');

async function main() {
    console.log('🎲 Final VRF Test with Combined Options...');
    
    const SONIC_CONTRACT = '0x5949156D5dD762aB15c1FEd4dE90B8a8CAF60746';
    const ARBITRUM_EID = 30110;
    
    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log('Deployer:', deployer.address);
    console.log('Balance:', ethers.utils.formatEther(await deployer.getBalance()), 'ETH');
    
    // Connect to Sonic contract
    const sonicContract = await ethers.getContractAt('ChainlinkVRFIntegratorV2_5', SONIC_CONTRACT);
    
    try {
        // Check contract status
        console.log('\n📊 Checking contract status...');
        const status = await sonicContract.getContractStatus();
        console.log('Contract balance:', ethers.utils.formatEther(status.balance), 'ETH');
        console.log('Can operate:', status.canOperate);
        
        // Check enforced options
        console.log('\n📋 Checking enforced options...');
        const enforcedOptions = await sonicContract.enforcedOptions(ARBITRUM_EID, 1);
        console.log('Enforced options:', enforcedOptions);
        console.log('Enforced options set:', enforcedOptions !== '0x');
        
        // Use combineOptions to properly merge enforced options with empty extra options
        console.log('\n🔧 Combining options...');
        const emptyExtraOptions = '0x';
        const combinedOptions = await sonicContract.combineOptions(ARBITRUM_EID, 1, emptyExtraOptions);
        console.log('Combined options:', combinedOptions);
        
        // Get quote with combined options
        console.log('\n💰 Getting quote with combined options...');
        const quote = await sonicContract.quote(ARBITRUM_EID, combinedOptions);
        console.log('LayerZero Fee:', ethers.utils.formatEther(quote.nativeFee), 'ETH');
        
        if (quote.nativeFee.gt(0)) {
            // Make VRF request
            console.log('\n🎯 Making VRF Request...');
            
            const tx = await sonicContract.requestRandomWords(ARBITRUM_EID, combinedOptions, {
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
            
            // Get the request ID from events
            const randomWordsRequestedEvent = events.find(e => e.event === 'RandomWordsRequested');
            if (randomWordsRequestedEvent) {
                const requestId = randomWordsRequestedEvent.args.requestId;
                console.log('\n🎲 Request ID:', requestId.toString());
                console.log('You can check the status with: getRandomWord(' + requestId.toString() + ')');
            }
            
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