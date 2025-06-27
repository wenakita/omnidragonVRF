const { ethers } = require('hardhat');

async function main() {
    console.log('🎲 Testing VRF Request System...');
    
    const SONIC_CONTRACT = '0x5949156D5dD762aB15c1FEd4dE90B8a8CAF60746';
    const ARBITRUM_EID = 30110;
    
    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log('Deployer:', deployer.address);
    console.log('Balance:', ethers.utils.formatEther(await deployer.getBalance()), 'ETH');
    
    // Connect to Sonic contract
    const sonicContract = await ethers.getContractAt('ChainlinkVRFIntegratorV2_5', SONIC_CONTRACT);
    
    // Get quote for LayerZero message
    console.log('\n📊 Getting LayerZero quote...');
    
    // Create options for the message (using default gas limit)
    const defaultGasLimit = 500000;
    const options = ethers.utils.solidityPack(
        ['uint16', 'uint256', 'uint256'],
        [3, defaultGasLimit, 0] // Type 3 option: executor with gas limit and value
    );
    
    try {
        const quote = await sonicContract.quote(ARBITRUM_EID, options);
        console.log('LayerZero Fee:', ethers.utils.formatEther(quote.nativeFee), 'ETH');
        
        // Test VRF request
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
            console.log(`- ${event.event}:`, event.args);
        });
        
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