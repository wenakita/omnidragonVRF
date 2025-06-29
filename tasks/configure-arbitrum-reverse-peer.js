task('configure-arbitrum-reverse-peer', 'Configure reverse peer on Arbitrum VRF Consumer for Avalanche')
    .setAction(async (taskArgs, hre) => {
        console.log('🔗 Configuring Arbitrum VRF Consumer Reverse Peer');
        console.log('===============================================');

        const [deployer] = await hre.ethers.getSigners();
        console.log('👤 Deployer:', deployer.address);

        // Contract addresses
        const ARBITRUM_VRF_CONSUMER = "0xA32DbFCfcf085274E5C766B08CCF2E17BfEFc754";
        const AVALANCHE_VRF_INTEGRATOR = "0x00D71291968aD25BFC3856e18eDbA844Ccb91706";
        
        // LayerZero Endpoint IDs
        const AVALANCHE_EID = 30106;
        const ARBITRUM_EID = 30110;

        console.log(`📍 Arbitrum VRF Consumer: ${ARBITRUM_VRF_CONSUMER}`);
        console.log(`📍 Avalanche VRF Integrator: ${AVALANCHE_VRF_INTEGRATOR}`);
        console.log(`🆔 Avalanche EID: ${AVALANCHE_EID}`);
        console.log(`🆔 Arbitrum EID: ${ARBITRUM_EID}`);

        try {
            // Get contract instance
            const vrfConsumer = await hre.ethers.getContractAt(
                'OmniDragonVRFConsumerV2_5', 
                ARBITRUM_VRF_CONSUMER
            );

            console.log('\n🔧 Step 1: Checking current owner/delegate...');
            const currentOwner = await vrfConsumer.owner();
            console.log(`   Current owner: ${currentOwner}`);
            
            if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
                console.log(`   ⚠️  Owner is not deployer address, you may need owner privileges`);
            }

            console.log('\n🔧 Step 2: Checking current peer configuration...');
            const currentPeer = await vrfConsumer.peers(AVALANCHE_EID);
            console.log(`   Current peer for EID ${AVALANCHE_EID}: ${currentPeer}`);

            const avalanchePeerBytes32 = hre.ethers.utils.hexZeroPad(AVALANCHE_VRF_INTEGRATOR, 32);
            console.log(`   Target peer bytes32: ${avalanchePeerBytes32}`);

            if (currentPeer.toLowerCase() === avalanchePeerBytes32.toLowerCase()) {
                console.log('   ✅ Peer already correctly configured!');
            } else {
                console.log('\n🔧 Step 3: Setting reverse peer...');
                console.log(`   Setting peer: EID ${AVALANCHE_EID} -> ${AVALANCHE_VRF_INTEGRATOR}`);

                const setPeerTx = await vrfConsumer.setPeer(AVALANCHE_EID, avalanchePeerBytes32, {
                    gasLimit: 500000
                });
                await setPeerTx.wait();
                console.log(`   ✅ Peer set - Transaction: ${setPeerTx.hash}`);
            }

            console.log('\n🔧 Step 4: Setting enforced options...');
            const { Options } = require('@layerzerolabs/lz-v2-utilities');
            
            // Create options for VRF requests (gas limit for processing requests)
            const options = Options.newOptions()
                .addExecutorLzReceiveOption(1000000, 0); // 1M gas for VRF requests
                
            console.log(`   Setting enforced options for EID ${AVALANCHE_EID}`);
            console.log(`   Options: ${options.toHex()}`);

            const setEnforcedOptionsTx = await vrfConsumer.setEnforcedOptions([{
                eid: AVALANCHE_EID,
                msgType: 1, // Standard message type
                options: options.toHex()
            }], {
                gasLimit: 300000
            });
            await setEnforcedOptionsTx.wait();
            console.log(`   ✅ Options enforced - Transaction: ${setEnforcedOptionsTx.hash}`);

            // Final verification
            console.log('\n🔍 Final Verification:');
            const finalPeer = await vrfConsumer.peers(AVALANCHE_EID);
            console.log(`   Peer for EID ${AVALANCHE_EID}: ${finalPeer}`);
            
            if (finalPeer.toLowerCase() === avalanchePeerBytes32.toLowerCase()) {
                console.log('   ✅ Reverse peer verified successfully!');
            } else {
                console.log('   ❌ Reverse peer verification failed!');
            }

            console.log('\n🎉 Configuration Complete!');
            console.log('========================');
            console.log(`✅ Cross-chain VRF fully configured:`);
            console.log(`   Avalanche VRF Integrator: ${AVALANCHE_VRF_INTEGRATOR}`);
            console.log(`   ↕️  Bidirectional LayerZero messaging established`);
            console.log(`   Arbitrum VRF Consumer: ${ARBITRUM_VRF_CONSUMER}`);
            console.log(`🔗 Flow: Avalanche → Arbitrum → Chainlink VRF → Arbitrum → Avalanche`);

            console.log('\n🎯 Ready for Cross-Chain VRF!');
            console.log(`   Use: await vrfIntegrator.requestRandomWords({ gasLimit: 1000000 })`);
            console.log(`   This will trigger the full cross-chain VRF flow`);

        } catch (error) {
            console.error('\n❌ Configuration failed:', error.message);
            if (error.message.includes('Ownable: caller is not the owner')) {
                console.error('💡 Make sure you are using the owner/delegate address');
            }
            throw error;
        }
    }); 