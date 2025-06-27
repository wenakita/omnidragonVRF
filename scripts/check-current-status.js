const { ethers } = require('hardhat');

async function main() {
    console.log('🔍 Checking Current VRF System Status...');
    
    const SONIC_CONTRACT = '0x5949156D5dD762aB15c1FEd4dE90B8a8CAF60746';
    const ARBITRUM_CONTRACT = '0x77913403bC1841F87d884101b25B6230CB4fbe28';
    const ARBITRUM_EID = 30110;
    const SONIC_EID = 30332;
    
    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log('Deployer:', deployer.address);
    console.log('Balance:', ethers.utils.formatEther(await deployer.getBalance()), 'ETH');
    
    // Check Sonic contract
    console.log('\n🎵 SONIC CONTRACT STATUS');
    console.log('Address:', SONIC_CONTRACT);
    
    const sonicProvider = new ethers.providers.JsonRpcProvider('https://rpc.sonic.fantom.network');
    const sonicContract = new ethers.Contract(
        SONIC_CONTRACT,
        [
            'function getContractStatus() external view returns (uint256 balance, bool canOperate)',
            'function peers(uint32) external view returns (bytes32)',
            'function defaultGasLimit() external view returns (uint32)',
            'function owner() external view returns (address)'
        ],
        sonicProvider
    );
    
    try {
        const sonicStatus = await sonicContract.getContractStatus();
        console.log('Balance:', ethers.utils.formatEther(sonicStatus.balance), 'ETH');
        console.log('Can operate:', sonicStatus.canOperate);
        
        const sonicPeer = await sonicContract.peers(ARBITRUM_EID);
        console.log('Arbitrum peer:', sonicPeer);
        console.log('Peer set:', sonicPeer !== '0x0000000000000000000000000000000000000000000000000000000000000000');
        
        const gasLimit = await sonicContract.defaultGasLimit();
        console.log('Default gas limit:', gasLimit.toString());
        
        const owner = await sonicContract.owner();
        console.log('Owner:', owner);
        
    } catch (error) {
        console.error('❌ Error checking Sonic contract:', error.message);
    }
    
    // Check Arbitrum contract
    console.log('\n🔷 ARBITRUM CONTRACT STATUS');
    console.log('Address:', ARBITRUM_CONTRACT);
    
    const arbitrumProvider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    const arbitrumContract = new ethers.Contract(
        ARBITRUM_CONTRACT,
        [
            'function peers(uint32) external view returns (bytes32)',
            'function owner() external view returns (address)',
            'function s_subscriptionId() external view returns (uint64)'
        ],
        arbitrumProvider
    );
    
    try {
        const arbitrumPeer = await arbitrumContract.peers(SONIC_EID);
        console.log('Sonic peer:', arbitrumPeer);
        console.log('Peer set:', arbitrumPeer !== '0x0000000000000000000000000000000000000000000000000000000000000000');
        
        const arbOwner = await arbitrumContract.owner();
        console.log('Owner:', arbOwner);
        
        const subscriptionId = await arbitrumContract.s_subscriptionId();
        console.log('VRF Subscription ID:', subscriptionId.toString());
        
    } catch (error) {
        console.error('❌ Error checking Arbitrum contract:', error.message);
    }
    
    console.log('\n✅ Status check complete!');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 