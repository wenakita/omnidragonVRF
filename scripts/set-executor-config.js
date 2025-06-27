const { ethers } = require('hardhat');
require('dotenv').config();

// Contract addresses
const SONIC_CONTRACT = '0x7D996773dd3a1A9b7c54c171562FD6251e7d718B';
const ARBITRUM_CONTRACT = '0x6E11334470dF61D62383892Bd8e57a3a655718C8';

// Endpoint addresses
const SONIC_ENDPOINT = '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B';
const ARBITRUM_ENDPOINT = '0x1a44076050125825900e736c501f859c50fE728c';

// Library addresses
const SONIC_SEND_LIB = '0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7';
const ARBITRUM_SEND_LIB = '0x975bcD720be66659e3EB3C0e4F1866a3020E493A';

// Executor addresses (our custom ones from config)
const SONIC_EXECUTOR = '0x4208D6E27538189bB48E603D6123A94b8Abe0A0b';
const ARBITRUM_EXECUTOR = '0x31CAe3B7fB82d847621859fb1585353c5720660D';

// EIDs
const SONIC_EID = 30332;
const ARBITRUM_EID = 30110;

const EXECUTOR_CONFIG_TYPE = 1;

async function setExecutorConfig() {
    console.log('🔧 Setting Custom Executor Configuration');
    console.log('=' .repeat(60));

    try {
        // Get signers
        const [deployer] = await ethers.getSigners();
        console.log('🔑 Using deployer:', deployer.address);

        // Endpoint ABI for setConfig
        const endpointAbi = [
            'function setConfig(address oapp, address sendLib, tuple(uint32 eid, uint32 configType, bytes config)[] setConfigParams) external'
        ];

        // Set Sonic → Arbitrum executor config
        console.log('\n📡 Setting Sonic → Arbitrum executor config...');
        const sonicEndpoint = new ethers.Contract(SONIC_ENDPOINT, endpointAbi, deployer);
        
        const sonicExecutorConfig = {
            maxMessageSize: 10000,
            executor: SONIC_EXECUTOR
        };
        
        const encodedSonicExecutorConfig = ethers.utils.defaultAbiCoder.encode(
            ['tuple(uint32 maxMessageSize, address executor)'],
            [sonicExecutorConfig]
        );
        
        const sonicSetConfigParam = {
            eid: ARBITRUM_EID,
            configType: EXECUTOR_CONFIG_TYPE,
            config: encodedSonicExecutorConfig
        };

        const sonicTx = await sonicEndpoint.setConfig(
            SONIC_CONTRACT,
            SONIC_SEND_LIB,
            [sonicSetConfigParam],
            { gasLimit: 500000 }
        );
        
        console.log('   Transaction hash:', sonicTx.hash);
        await sonicTx.wait();
        console.log('✅ Sonic executor config set successfully');

        // Set Arbitrum → Sonic executor config
        console.log('\n📡 Setting Arbitrum → Sonic executor config...');
        
        // Switch to Arbitrum network
        const arbitrumProvider = new ethers.providers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
        const arbitrumSigner = new ethers.Wallet(process.env.PRIVATE_KEY, arbitrumProvider);
        const arbitrumEndpoint = new ethers.Contract(ARBITRUM_ENDPOINT, endpointAbi, arbitrumSigner);
        
        const arbitrumExecutorConfig = {
            maxMessageSize: 10000,
            executor: ARBITRUM_EXECUTOR
        };
        
        const encodedArbitrumExecutorConfig = ethers.utils.defaultAbiCoder.encode(
            ['tuple(uint32 maxMessageSize, address executor)'],
            [arbitrumExecutorConfig]
        );
        
        const arbitrumSetConfigParam = {
            eid: SONIC_EID,
            configType: EXECUTOR_CONFIG_TYPE,
            config: encodedArbitrumExecutorConfig
        };

        const arbitrumTx = await arbitrumEndpoint.setConfig(
            ARBITRUM_CONTRACT,
            ARBITRUM_SEND_LIB,
            [arbitrumSetConfigParam],
            { gasLimit: 500000 }
        );
        
        console.log('   Transaction hash:', arbitrumTx.hash);
        await arbitrumTx.wait();
        console.log('✅ Arbitrum executor config set successfully');

        console.log('\n🎉 All executor configurations set successfully!');
        console.log('\n📋 Next Steps:');
        console.log('   1. Run: npm run config-check');
        console.log('   2. Verify executor addresses are now correct');
        console.log('   3. Test VRF functionality');

    } catch (error) {
        console.error('❌ Error setting executor config:', error);
        
        if (error.message.includes('insufficient funds')) {
            console.error('\n💰 Insufficient funds for gas fees');
        } else if (error.message.includes('nonce')) {
            console.error('\n🔄 Nonce issue - please retry');
        } else {
            console.error('\n🔧 Check that:');
            console.error('   - Private key has sufficient funds on both chains');
            console.error('   - RPC URLs are correct');
            console.error('   - Contract addresses are valid');
        }
    }
}

setExecutorConfig().catch(console.error); 