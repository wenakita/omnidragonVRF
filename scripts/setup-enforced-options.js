const { ethers } = require('hardhat');
const { OptionsBuilder } = require('@layerzerolabs/lz-v2-utilities');

async function main() {
    console.log('🔧 Setting up LayerZero Enforced Options...');
    
    const SONIC_CONTRACT = '0x5949156D5dD762aB15c1FEd4dE90B8a8CAF60746';
    const ARBITRUM_EID = 30110;
    const SONIC_EID = 30332;
    
    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log('Deployer:', deployer.address);
    console.log('Balance:', ethers.utils.formatEther(await deployer.getBalance()), 'ETH');
    
    // Connect to Sonic contract
    const sonicContract = await ethers.getContractAt('ChainlinkVRFIntegratorV2_5', SONIC_CONTRACT);
    
    try {
        // Check current enforced options
        console.log('\n📋 Checking current enforced options...');
        try {
            const currentOptions = await sonicContract.enforcedOptions(ARBITRUM_EID, 1);
            console.log('Current enforced options for Arbitrum (msgType 1):', currentOptions);
        } catch (error) {
            console.log('No enforced options currently set');
        }
        
        // Get default gas limit from contract
        const defaultGasLimit = await sonicContract.defaultGasLimit();
        console.log('Default gas limit:', defaultGasLimit.toString());
        
        // Create enforced options using OptionsBuilder
        console.log('\n⚙️ Creating enforced options...');
        const enforcedOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(defaultGasLimit, 0);
        console.log('Enforced options created:', ethers.utils.hexlify(enforcedOptions));
        
        // Set enforced options for Arbitrum
        console.log('\n🚀 Setting enforced options for Arbitrum...');
        
        const enforcedOptionParams = [
            {
                eid: ARBITRUM_EID,
                msgType: 1, // Standard message type
                options: enforcedOptions
            }
        ];
        
        const tx = await sonicContract.setEnforcedOptions(enforcedOptionParams, {
            gasLimit: 200000
        });
        
        console.log('Transaction Hash:', tx.hash);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        console.log('✅ Enforced options set successfully!');
        console.log('Gas Used:', receipt.gasUsed.toString());
        
        // Verify the options were set
        console.log('\n🔍 Verifying enforced options...');
        const newOptions = await sonicContract.enforcedOptions(ARBITRUM_EID, 1);
        console.log('New enforced options:', newOptions);
        console.log('Options match:', newOptions === ethers.utils.hexlify(enforcedOptions));
        
        // Now test the quote function
        console.log('\n💰 Testing quote with enforced options...');
        const emptyOptions = '0x';
        const quote = await sonicContract.quote(ARBITRUM_EID, emptyOptions);
        console.log('LayerZero Fee:', ethers.utils.formatEther(quote.nativeFee), 'ETH');
        
        if (quote.nativeFee.gt(0)) {
            console.log('✅ Quote successful! VRF system should now work.');
        } else {
            console.log('❌ Quote returned 0 fee - may need additional configuration');
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