const { ethers } = require('ethers');
require('dotenv').config();

// Contract addresses
const ARBITRUM_CONTRACT = '0x6E11334470dF61D62383892Bd8e57a3a655718C8';
const ARBITRUM_ENDPOINT = '0x1a44076050125825900e736c501f859c50fE728c';
const ARBITRUM_SEND_LIB = '0x975bcD720be66659e3EB3C0e4F1866a3020E493A';
const ARBITRUM_EXECUTOR = '0x31CAe3B7fB82d847621859fb1585353c5720660D';

// EIDs
const SONIC_EID = 30332;
const EXECUTOR_CONFIG_TYPE = 1;

async function setArbitrumExecutorConfig() {
    console.log('🔧 Setting Arbitrum Executor Configuration');
    console.log('=' .repeat(50));

    try {
        // Connect to Arbitrum
        const arbitrumProvider = new ethers.providers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
        const arbitrumSigner = new ethers.Wallet(process.env.PRIVATE_KEY, arbitrumProvider);
        
        console.log('🔑 Using signer:', arbitrumSigner.address);
        console.log('🌐 Arbitrum RPC:', process.env.ARBITRUM_RPC_URL?.substring(0, 50) + '...');

        // Check balance
        const balance = await arbitrumProvider.getBalance(arbitrumSigner.address);
        console.log('💰 Balance:', ethers.utils.formatEther(balance), 'ETH');

        if (balance.lt(ethers.utils.parseEther('0.001'))) {
            throw new Error('Insufficient balance for gas fees');
        }

        // Endpoint ABI for setConfig
        const endpointAbi = [
            'function setConfig(address oapp, address sendLib, tuple(uint32 eid, uint32 configType, bytes config)[] setConfigParams) external'
        ];

        const arbitrumEndpoint = new ethers.Contract(ARBITRUM_ENDPOINT, endpointAbi, arbitrumSigner);
        
        const arbitrumExecutorConfig = {
            maxMessageSize: 10000,
            executor: ARBITRUM_EXECUTOR
        };
        
        console.log('📋 Executor Config:', arbitrumExecutorConfig);
        
        const encodedArbitrumExecutorConfig = ethers.utils.defaultAbiCoder.encode(
            ['tuple(uint32 maxMessageSize, address executor)'],
            [arbitrumExecutorConfig]
        );
        
        const arbitrumSetConfigParam = {
            eid: SONIC_EID,
            configType: EXECUTOR_CONFIG_TYPE,
            config: encodedArbitrumExecutorConfig
        };

        console.log('\n📡 Setting Arbitrum → Sonic executor config...');
        console.log('   Contract:', ARBITRUM_CONTRACT);
        console.log('   Send Lib:', ARBITRUM_SEND_LIB);
        console.log('   Target EID:', SONIC_EID);

        const arbitrumTx = await arbitrumEndpoint.setConfig(
            ARBITRUM_CONTRACT,
            ARBITRUM_SEND_LIB,
            [arbitrumSetConfigParam],
            { 
                gasLimit: 500000,
                gasPrice: ethers.utils.parseUnits('0.1', 'gwei') // Low gas price
            }
        );
        
        console.log('   Transaction hash:', arbitrumTx.hash);
        console.log('   Waiting for confirmation...');
        
        const receipt = await arbitrumTx.wait();
        console.log('✅ Arbitrum executor config set successfully!');
        console.log('   Gas used:', receipt.gasUsed.toString());

        console.log('\n🎉 Arbitrum executor configuration completed!');
        console.log('\n📋 Next Steps:');
        console.log('   1. Run: npm run config-check');
        console.log('   2. Verify both executor addresses are now correct');
        console.log('   3. Test VRF functionality');

    } catch (error) {
        console.error('❌ Error setting Arbitrum executor config:', error);
        
        if (error.message.includes('insufficient funds')) {
            console.error('\n💰 Insufficient funds for gas fees on Arbitrum');
        } else if (error.message.includes('network')) {
            console.error('\n🌐 Network connectivity issue');
            console.error('   Check ARBITRUM_RPC_URL in .env file');
        } else if (error.code === 'NETWORK_ERROR') {
            console.error('\n🔗 RPC connection failed');
            console.error('   Try using a different Arbitrum RPC endpoint');
        } else {
            console.error('\n🔧 Debug info:');
            console.error('   Error code:', error.code);
            console.error('   Error message:', error.message);
        }
    }
}

setArbitrumExecutorConfig().catch(console.error); 