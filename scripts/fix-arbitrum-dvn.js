const { ethers } = require('ethers');
require('dotenv').config();

// Contract and network configurations
const ARBITRUM_CONTRACT = '0x6E11334470dF61D62383892Bd8e57a3a655718C8';
const ARBITRUM_ENDPOINT = '0x1a44076050125825900e736c501f859c50fE728c';
const ARBITRUM_RECEIVE_LIB = '0x7B9E184e07a6EE1aC23eAe0fe8D6Be2f663f05e6';

// DVN addresses
const ARBITRUM_DVN = '0x2f55c492897526677c5b68fb199ea31e2c126416'; // LayerZero Labs DVN on Arbitrum
const SONIC_EID = 30332;

// Configuration types
const ULN_CONFIG_TYPE = 2;

async function fixArbitrumDVN() {
    console.log('🔧 Fixing Arbitrum DVN Configuration');
    console.log('=' .repeat(50));
    
    try {
        // Connect to Arbitrum
        const arbitrumProvider = new ethers.providers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
        const arbitrumSigner = new ethers.Wallet(process.env.PRIVATE_KEY, arbitrumProvider);
        
        console.log('🔑 Using address:', arbitrumSigner.address);
        console.log('📋 Arbitrum Contract:', ARBITRUM_CONTRACT);
        console.log('🎯 Target DVN:', ARBITRUM_DVN);
        
        // Contract ABI for setting config
        const contractABI = [
            'function setConfig(address _lib, tuple(uint32 eid, uint32 configType, bytes config)[] _params) external',
            'function owner() external view returns (address)'
        ];
        
        const contract = new ethers.Contract(ARBITRUM_CONTRACT, contractABI, arbitrumSigner);
        
        // Check ownership
        const owner = await contract.owner();
        console.log('📝 Contract Owner:', owner);
        
        if (owner.toLowerCase() !== arbitrumSigner.address.toLowerCase()) {
            console.log('❌ You are not the owner of this contract');
            return;
        }
        
        // Encode ULN config with Arbitrum DVN
        console.log('\n🔧 Encoding ULN Config...');
        
        // ULN Config structure: confirmations (8 bytes) + requiredDVNCount (1 byte) + optionalDVNCount (1 byte) + optionalDVNThreshold (1 byte) + dvn addresses
        const confirmations = 15;
        const requiredDVNCount = 1;
        const optionalDVNCount = 0;
        const optionalDVNThreshold = 0;
        
        // Encode the ULN config
        const ulnConfig = ethers.utils.concat([
            ethers.utils.hexZeroPad(ethers.utils.hexlify(confirmations), 8), // confirmations (8 bytes)
            ethers.utils.hexZeroPad(ethers.utils.hexlify(requiredDVNCount), 1), // requiredDVNCount (1 byte)
            ethers.utils.hexZeroPad(ethers.utils.hexlify(optionalDVNCount), 1), // optionalDVNCount (1 byte)
            ethers.utils.hexZeroPad(ethers.utils.hexlify(optionalDVNThreshold), 1), // optionalDVNThreshold (1 byte)
            ethers.utils.hexZeroPad(ARBITRUM_DVN, 32) // Required DVN address (32 bytes)
        ]);
        
        console.log('   ULN Config:', ulnConfig);
        
        // Prepare config parameters
        const configParams = [{
            eid: SONIC_EID,
            configType: ULN_CONFIG_TYPE,
            config: ulnConfig
        }];
        
        console.log('\n📡 Setting Arbitrum Receive Config...');
        console.log('   EID:', SONIC_EID);
        console.log('   Config Type:', ULN_CONFIG_TYPE);
        console.log('   Library:', ARBITRUM_RECEIVE_LIB);
        
        // Set the configuration
        const tx = await contract.setConfig(ARBITRUM_RECEIVE_LIB, configParams, {
            gasLimit: 500000
        });
        
        console.log('   Transaction sent:', tx.hash);
        console.log('   Waiting for confirmation...');
        
        const receipt = await tx.wait();
        console.log('   ✅ Configuration set successfully!');
        console.log('   Gas used:', receipt.gasUsed.toString());
        console.log('   Block number:', receipt.blockNumber);
        
        console.log('\n🎉 Arbitrum DVN Configuration Fixed!');
        console.log('   Both Sonic and Arbitrum now use the same Arbitrum DVN');
        console.log('   DVN:', ARBITRUM_DVN);
        
        console.log('\n⏳ Next Steps:');
        console.log('   1. Wait 5-10 minutes for configuration to take effect');
        console.log('   2. Check LayerZero scan for transaction progress');
        console.log('   3. Test the quote function again');
        
    } catch (error) {
        console.error('❌ Failed to fix Arbitrum DVN config:', error.message);
        
        if (error.message.includes('insufficient funds')) {
            console.log('💰 Need more ETH on Arbitrum for gas fees');
        } else if (error.message.includes('Ownable')) {
            console.log('🔐 Only the contract owner can set configuration');
        }
    }
}

fixArbitrumDVN().catch(console.error); 