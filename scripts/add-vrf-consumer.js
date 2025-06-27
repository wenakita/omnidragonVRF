const { ethers } = require('hardhat');

async function main() {
    console.log('🔧 Adding VRF Consumer to Subscription...');
    
    const ARBITRUM_CONTRACT = '0x77913403bC1841F87d884101b25B6230CB4fbe28';
    const VRF_COORDINATOR = '0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e'; // Arbitrum VRF Coordinator
    const SUBSCRIPTION_ID = '49130512167777098004519592693541429977179420141459329604059253338290818062746';
    
    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log('Deployer:', deployer.address);
    console.log('Balance:', ethers.utils.formatEther(await deployer.getBalance()), 'ETH');
    
    // Connect to VRF Coordinator on Arbitrum
    const vrfCoordinator = await ethers.getContractAt(
        [
            'function addConsumer(uint256 subId, address consumer) external',
            'function getSubscription(uint256 subId) external view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address owner, address[] memory consumers)',
            'function removeConsumer(uint256 subId, address consumer) external'
        ],
        VRF_COORDINATOR
    );
    
    try {
        // Check current subscription status
        console.log('\n📋 Checking subscription status...');
        const subscription = await vrfCoordinator.getSubscription(SUBSCRIPTION_ID);
        console.log('Subscription Owner:', subscription.owner);
        console.log('Current Consumers:', subscription.consumers);
        console.log('Consumer Count:', subscription.consumers.length);
        
        // Check if our contract is already a consumer
        const isConsumer = subscription.consumers.includes(ARBITRUM_CONTRACT);
        console.log('Is our contract already a consumer?', isConsumer);
        
        if (!isConsumer) {
            console.log('\n🚀 Adding contract as VRF consumer...');
            
            // Add our contract as a consumer
            const tx = await vrfCoordinator.addConsumer(SUBSCRIPTION_ID, ARBITRUM_CONTRACT, {
                gasLimit: 200000
            });
            
            console.log('Transaction Hash:', tx.hash);
            console.log('⏳ Waiting for confirmation...');
            
            const receipt = await tx.wait();
            console.log('✅ Consumer added successfully!');
            console.log('Gas Used:', receipt.gasUsed.toString());
            
            // Verify the consumer was added
            console.log('\n🔍 Verifying consumer was added...');
            const updatedSubscription = await vrfCoordinator.getSubscription(SUBSCRIPTION_ID);
            console.log('Updated Consumers:', updatedSubscription.consumers);
            
            const isNowConsumer = updatedSubscription.consumers.includes(ARBITRUM_CONTRACT);
            console.log('✅ Contract is now a consumer:', isNowConsumer);
            
        } else {
            console.log('✅ Contract is already a consumer!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.data) {
            console.error('Error data:', error.data);
        }
        
        // Check if we're not the subscription owner
        if (error.message.includes('MustBeSubOwner')) {
            console.log('\n💡 Note: You must be the subscription owner to add consumers.');
            console.log('Please add the contract as a consumer via the Chainlink VRF dashboard:');
            console.log('https://vrf.chain.link/arbitrum');
            console.log('Subscription ID:', SUBSCRIPTION_ID);
            console.log('Consumer Address:', ARBITRUM_CONTRACT);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 