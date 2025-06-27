const { ethers } = require('ethers');
require('dotenv').config();

// Contract addresses
const SONIC_VRF_CONTRACT = '0x7D996773dd3a1A9b7c54c171562FD6251e7d718B';
const ARBITRUM_VRF_CONTRACT = '0x6E11334470dF61D62383892Bd8e57a3a655718C8';

// Network configurations
const SONIC_RPC = process.env.SONIC_RPC_URL;
const ARBITRUM_RPC = process.env.ARBITRUM_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// EIDs
const SONIC_EID = 30332;
const ARBITRUM_EID = 30110;

// Contract ABIs (minimal for testing)
const VRF_ABI = [
    'function quote(uint32 _dstEid, bytes calldata _message, bytes calldata _options, bool _payInLzToken) external view returns (uint256 nativeFee, uint256 lzTokenFee)',
    'function requestRandomWords(uint32 _dstEid, bytes calldata _options) external payable returns (bytes32 guid)',
    'function isPeer(uint32 eid, bytes32 peer) external view returns (bool)',
    'function peers(uint32 eid) external view returns (bytes32)',
    'function owner() external view returns (address)',
    'function endpoint() external view returns (address)',
    'event PacketSent(bytes encodedPacket, bytes options, address sendLibrary)',
    'event RandomWordsRequested(uint256 indexed requestId, uint32 numWords, address indexed requester)',
    'function balanceOf(address account) external view returns (uint256)',
    'function transfer(address to, uint256 amount) external returns (bool)'
];

async function testVRFSystem() {
    console.log('🧪 Testing OmniDragon VRF System');
    console.log('=' .repeat(60));
    
    try {
        // Setup providers and signers
        const sonicProvider = new ethers.providers.JsonRpcProvider(SONIC_RPC);
        const arbitrumProvider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
        
        const sonicSigner = new ethers.Wallet(PRIVATE_KEY, sonicProvider);
        const arbitrumSigner = new ethers.Wallet(PRIVATE_KEY, arbitrumProvider);
        
        console.log('🔑 Using address:', sonicSigner.address);
        
        // Connect to contracts
        const sonicVRF = new ethers.Contract(SONIC_VRF_CONTRACT, VRF_ABI, sonicSigner);
        const arbitrumVRF = new ethers.Contract(ARBITRUM_VRF_CONTRACT, VRF_ABI, arbitrumSigner);
        
        console.log('\n📋 Contract Information:');
        console.log('   Sonic VRF:', SONIC_VRF_CONTRACT);
        console.log('   Arbitrum VRF:', ARBITRUM_VRF_CONTRACT);
        
        // Check balances
        console.log('\n💰 Account Balances:');
        const sonicBalance = await sonicProvider.getBalance(sonicSigner.address);
        const arbitrumBalance = await arbitrumProvider.getBalance(arbitrumSigner.address);
        
        console.log('   Sonic:', ethers.utils.formatEther(sonicBalance), 'S');
        console.log('   Arbitrum:', ethers.utils.formatEther(arbitrumBalance), 'ETH');
        
        if (sonicBalance.lt(ethers.utils.parseEther('0.1'))) {
            console.log('⚠️  Low Sonic balance - may need more S for testing');
        }
        
        // Check contract ownership
        console.log('\n👤 Contract Ownership:');
        try {
            const sonicOwner = await sonicVRF.owner();
            const arbitrumOwner = await arbitrumVRF.owner();
            console.log('   Sonic Owner:', sonicOwner);
            console.log('   Arbitrum Owner:', arbitrumOwner);
            
            if (sonicOwner.toLowerCase() === sonicSigner.address.toLowerCase()) {
                console.log('   ✅ You own the Sonic contract');
            } else {
                console.log('   ⚠️  You do not own the Sonic contract');
            }
            
            if (arbitrumOwner.toLowerCase() === arbitrumSigner.address.toLowerCase()) {
                console.log('   ✅ You own the Arbitrum contract');
            } else {
                console.log('   ⚠️  You do not own the Arbitrum contract');
            }
        } catch (error) {
            console.log('   ⚠️  Could not check ownership:', error.message);
        }
        
        // Check LayerZero peer configuration
        console.log('\n🔗 LayerZero Peer Configuration:');
        try {
            // Check Sonic -> Arbitrum peer
            const sonicPeer = await sonicVRF.peers(ARBITRUM_EID);
            const expectedArbitrumPeer = ethers.utils.hexZeroPad(ARBITRUM_VRF_CONTRACT.toLowerCase(), 32);
            
            console.log('   Sonic -> Arbitrum Peer:', sonicPeer);
            console.log('   Expected Arbitrum Peer:', expectedArbitrumPeer);
            
            if (sonicPeer.toLowerCase() === expectedArbitrumPeer.toLowerCase()) {
                console.log('   ✅ Sonic peer correctly configured');
            } else {
                console.log('   ❌ Sonic peer misconfigured');
            }
            
            // Check Arbitrum -> Sonic peer
            const arbitrumPeer = await arbitrumVRF.peers(SONIC_EID);
            const expectedSonicPeer = ethers.utils.hexZeroPad(SONIC_VRF_CONTRACT.toLowerCase(), 32);
            
            console.log('   Arbitrum -> Sonic Peer:', arbitrumPeer);
            console.log('   Expected Sonic Peer:', expectedSonicPeer);
            
            if (arbitrumPeer.toLowerCase() === expectedSonicPeer.toLowerCase()) {
                console.log('   ✅ Arbitrum peer correctly configured');
            } else {
                console.log('   ❌ Arbitrum peer misconfigured');
            }
        } catch (error) {
            console.log('   ❌ Error checking peers:', error.message);
        }
        
        // Test quote function
        console.log('\n💸 Testing Quote Function:');
        try {
            // Simple message for testing
            const message = ethers.utils.defaultAbiCoder.encode(['uint256'], [1]);
            const options = '0x000301001101000000000000000000000000000aae60'; // 700000 gas
            
            const quote = await sonicVRF.quote(ARBITRUM_EID, message, options, false);
            console.log('   Quote successful!');
            console.log('   Native Fee:', ethers.utils.formatEther(quote.nativeFee), 'S');
            console.log('   LZ Token Fee:', quote.lzTokenFee.toString());
            
            if (quote.nativeFee.gt(0)) {
                console.log('   ✅ Quote function working correctly');
                
                // Check if we have enough balance for the fee
                if (sonicBalance.gte(quote.nativeFee)) {
                    console.log('   ✅ Sufficient balance for transaction');
                    
                    // Attempt a test VRF request
                    console.log('\n🎲 Testing VRF Request:');
                    console.log('   Attempting VRF request...');
                    
                    const vrfTx = await sonicVRF.requestRandomWords(
                        ARBITRUM_EID,
                        options,
                        { 
                            value: quote.nativeFee.mul(110).div(100), // 10% buffer
                            gasLimit: 500000
                        }
                    );
                    
                    console.log('   Transaction sent:', vrfTx.hash);
                    console.log('   Waiting for confirmation...');
                    
                    const receipt = await vrfTx.wait();
                    console.log('   ✅ VRF request successful!');
                    console.log('   Gas used:', receipt.gasUsed.toString());
                    console.log('   Block number:', receipt.blockNumber);
                    
                    // Look for events
                    if (receipt.events && receipt.events.length > 0) {
                        console.log('   📡 Events emitted:');
                        receipt.events.forEach((event, index) => {
                            console.log(`     Event ${index + 1}: ${event.event || 'Unknown'}`);
                        });
                    }
                    
                } else {
                    console.log('   ❌ Insufficient balance for transaction');
                    console.log('   Need:', ethers.utils.formatEther(quote.nativeFee), 'S');
                    console.log('   Have:', ethers.utils.formatEther(sonicBalance), 'S');
                }
            } else {
                console.log('   ❌ Quote returned zero fee - configuration issue');
            }
            
        } catch (error) {
            console.log('   ❌ Quote function failed:', error.message);
            
            if (error.message.includes('DVN_INVALID')) {
                console.log('   🔧 DVN configuration issue detected');
            } else if (error.message.includes('PEER_NOT_SET')) {
                console.log('   🔧 Peer configuration issue detected');
            } else if (error.message.includes('revert')) {
                console.log('   🔧 Contract revert - check configuration');
            }
        }
        
        console.log('\n🏁 Test Complete!');
        console.log('\n📋 Summary:');
        console.log('   - Contract addresses verified');
        console.log('   - Balances checked');
        console.log('   - LayerZero configuration tested');
        console.log('   - Quote function tested');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('\n🔧 Debugging tips:');
        console.error('   - Check RPC URLs in .env');
        console.error('   - Verify private key has funds');
        console.error('   - Ensure contracts are deployed');
        console.error('   - Check LayerZero configuration');
    }
}

testVRFSystem().catch(console.error); 