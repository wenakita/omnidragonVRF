const { ethers } = require('hardhat');

async function main() {
    console.log('🎲 Testing Simple VRF Request (Direct)...');
    
    const SONIC_CONTRACT = '0x5949156D5dD762aB15c1FEd4dE90B8a8CAF60746';
    const ARBITRUM_EID = 30110;
    
    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log('Deployer:', deployer.address);
    
    // Connect to Sonic contract
    const sonicContract = await ethers.getContractAt('ChainlinkVRFIntegratorV2_5', SONIC_CONTRACT);
    
    try {
        // Check balance
        const balance = await deployer.getBalance();
        console.log('Balance:', ethers.utils.formatEther(balance), 'ETH');
        
        // Check contract status
        const status = await sonicContract.getContractStatus();
        console.log('Contract funded:', status.canOperate);
        
        // Try to estimate gas for the simple request
        console.log('\n⛽ Estimating gas for simple request...');
        
        try {
            const gasEstimate = await sonicContract.estimateGas.requestRandomWordsSimple(ARBITRUM_EID, {
                value: ethers.utils.parseEther('0.01') // 0.01 ETH
            });
            console.log('Gas estimate:', gasEstimate.toString());
            
            // Make the request
            console.log('\n🎯 Making Simple VRF Request...');
            const tx = await sonicContract.requestRandomWordsSimple(ARBITRUM_EID, {
                value: ethers.utils.parseEther('0.01'),
                gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
            });
            
            console.log('Transaction Hash:', tx.hash);
            const receipt = await tx.wait();
            console.log('✅ Transaction confirmed!');
            console.log('Gas Used:', receipt.gasUsed.toString());
            
            // Check for events
            console.log('\n📋 Transaction logs:');
            receipt.logs.forEach((log, index) => {
                console.log(`Log ${index}:`, log.topics[0]);
            });
            
        } catch (gasError) {
            console.log('❌ Gas estimation failed:', gasError.message);
            
            // Try with a fixed amount
            console.log('\n🎯 Trying with fixed gas and value...');
            const tx = await sonicContract.requestRandomWordsSimple(ARBITRUM_EID, {
                value: ethers.utils.parseEther('0.01'),
                gasLimit: 500000
            });
            
            console.log('Transaction Hash:', tx.hash);
            const receipt = await tx.wait();
            console.log('✅ Transaction confirmed!');
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