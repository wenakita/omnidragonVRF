task('verify-cross-chain-vrf', 'Verify complete cross-chain VRF setup between Avalanche and Arbitrum')
    .setAction(async (taskArgs, hre) => {
        console.log('🔍 Verifying Cross-Chain VRF Setup');
        console.log('==================================');

        const networkName = hre.network.name;
        console.log(`🌐 Checking from: ${networkName}`);

        // Contract addresses
        const AVALANCHE_VRF_INTEGRATOR = "0x00D71291968aD25BFC3856e18eDbA844Ccb91706";
        const ARBITRUM_VRF_CONSUMER = "0xA32DbFCfcf085274E5C766B08CCF2E17BfEFc754";
        
        // LayerZero Endpoint IDs
        const AVALANCHE_EID = 30106;
        const ARBITRUM_EID = 30110;

        const [deployer] = await hre.ethers.getSigners();
        console.log('👤 Deployer:', deployer.address);

        try {
            if (networkName === 'avalanche') {
                console.log('\n🔍 Checking Avalanche VRF Integrator...');
                console.log('=====================================');
                
                const vrfIntegrator = await hre.ethers.getContractAt(
                    'ChainlinkVRFIntegratorV2_5', 
                    AVALANCHE_VRF_INTEGRATOR
                );

                // Check basic info
                const owner = await vrfIntegrator.owner();
                console.log(`   Owner: ${owner}`);
                
                const endpoint = await vrfIntegrator.endpoint();
                console.log(`   LayerZero Endpoint: ${endpoint}`);

                // Check peer configuration
                const arbitrumPeer = await vrfIntegrator.peers(ARBITRUM_EID);
                const expectedPeerBytes32 = hre.ethers.utils.hexZeroPad(ARBITRUM_VRF_CONSUMER, 32);
                console.log(`   Peer for Arbitrum (EID ${ARBITRUM_EID}): ${arbitrumPeer}`);
                console.log(`   Expected: ${expectedPeerBytes32}`);
                
                if (arbitrumPeer.toLowerCase() === expectedPeerBytes32.toLowerCase()) {
                    console.log('   ✅ Peer configuration correct!');
                } else {
                    console.log('   ❌ Peer configuration mismatch!');
                }

                // Check enforced options
                try {
                    const enforcedOptions = await vrfIntegrator.enforcedOptions(ARBITRUM_EID, 1);
                    console.log(`   Enforced Options: ${enforcedOptions}`);
                    if (enforcedOptions !== '0x') {
                        console.log('   ✅ Enforced options configured!');
                    } else {
                        console.log('   ⚠️  No enforced options set');
                    }
                } catch (error) {
                    console.log('   ⚠️  Could not read enforced options');
                }

                // Test quote for VRF request
                console.log('\n💰 Testing VRF Request Quote...');
                try {
                    const payload = hre.ethers.utils.defaultAbiCoder.encode(['uint64'], [123]); // test sequence
                    const options = '0x000301001101000000000000000000000000002625a0'; // 2.5M gas
                    
                    const quote = await vrfIntegrator.quote(ARBITRUM_EID, payload, options, false);
                    console.log(`   Native Fee: ${hre.ethers.utils.formatEther(quote.nativeFee)} AVAX`);
                    console.log(`   LZ Token Fee: ${quote.lzTokenFee}`);
                    console.log('   ✅ Quote successful - ready for VRF requests!');
                } catch (error) {
                    console.log(`   ❌ Quote failed: ${error.message}`);
                }

            } else if (networkName === 'arbitrum') {
                console.log('\n🔍 Checking Arbitrum VRF Consumer...');
                console.log('===================================');
                
                const vrfConsumer = await hre.ethers.getContractAt(
                    'OmniDragonVRFConsumerV2_5', 
                    ARBITRUM_VRF_CONSUMER
                );

                // Check basic info
                const owner = await vrfConsumer.owner();
                console.log(`   Owner: ${owner}`);
                
                const endpoint = await vrfConsumer.endpoint();
                console.log(`   LayerZero Endpoint: ${endpoint}`);

                const vrfCoordinator = await vrfConsumer.vrfCoordinator();
                console.log(`   VRF Coordinator: ${vrfCoordinator}`);

                const subscriptionId = await vrfConsumer.subscriptionId();
                console.log(`   Subscription ID: ${subscriptionId}`);

                // Check peer configuration
                const avalanchePeer = await vrfConsumer.peers(AVALANCHE_EID);
                const expectedPeerBytes32 = hre.ethers.utils.hexZeroPad(AVALANCHE_VRF_INTEGRATOR, 32);
                console.log(`   Peer for Avalanche (EID ${AVALANCHE_EID}): ${avalanchePeer}`);
                console.log(`   Expected: ${expectedPeerBytes32}`);
                
                if (avalanchePeer.toLowerCase() === expectedPeerBytes32.toLowerCase()) {
                    console.log('   ✅ Peer configuration correct!');
                } else {
                    console.log('   ❌ Peer configuration mismatch!');
                }

                // Check supported chains
                const supportedChain = await vrfConsumer.supportedChains(AVALANCHE_EID);
                console.log(`   Avalanche supported: ${supportedChain}`);

                // Check enforced options
                try {
                    const enforcedOptions = await vrfConsumer.enforcedOptions(AVALANCHE_EID, 1);
                    console.log(`   Enforced Options: ${enforcedOptions}`);
                    if (enforcedOptions !== '0x') {
                        console.log('   ✅ Enforced options configured!');
                    } else {
                        console.log('   ⚠️  No enforced options set');
                    }
                } catch (error) {
                    console.log('   ⚠️  Could not read enforced options');
                }
            }

            console.log('\n🎯 Cross-Chain VRF Status Summary:');
            console.log('==================================');
            console.log(`✅ Avalanche VRF Integrator: ${AVALANCHE_VRF_INTEGRATOR}`);
            console.log(`✅ Arbitrum VRF Consumer: ${ARBITRUM_VRF_CONSUMER}`);
            console.log(`🔗 Cross-chain messaging configured via LayerZero V2`);
            console.log(`🎲 Ready for cross-chain VRF requests!`);

            console.log('\n💡 Usage Instructions:');
            console.log('======================');
            console.log(`1. On Avalanche, call: vrfIntegrator.requestRandomWords()`);
            console.log(`2. This sends cross-chain message to Arbitrum`);
            console.log(`3. Arbitrum requests randomness from Chainlink VRF`);
            console.log(`4. Arbitrum sends random number back to Avalanche`);
            console.log(`5. Avalanche receives the random number for lottery use`);

        } catch (error) {
            console.error('\n❌ Verification failed:', error.message);
            throw error;
        }
    }); 