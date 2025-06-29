const { task } = require('hardhat/config');

task('verify-all-contracts', 'Verify all deployed contracts on Sonic and Arbitrum')
  .setAction(async (taskArgs, hre) => {
    console.log('\n=== Verifying All OmniDragon Ecosystem Contracts ===\n');
    
    const [deployer] = await hre.ethers.getSigners();
    console.log('Deployer address:', deployer.address);
    console.log('Network:', hre.network.name);
    
    // Load deployment addresses
    const fs = require('fs');
    let deployedAddresses = {};
    let arbitrumAddresses = {};
    
    try {
      if (fs.existsSync('deployed-addresses.json')) {
        deployedAddresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
      }
      if (fs.existsSync('deployed-vrf-arbitrum.json')) {
        arbitrumAddresses = JSON.parse(fs.readFileSync('deployed-vrf-arbitrum.json', 'utf8'));
      }
    } catch (error) {
      console.error('Error reading deployment files:', error.message);
      return;
    }
    
    const verificationResults = [];
    
    // Helper function to verify a contract
    async function verifyContract(contractName, address, constructorArgs = [], description = '') {
      try {
        console.log(`\n🔍 Verifying ${contractName}${description ? ` (${description})` : ''}...`);
        console.log(`   Address: ${address}`);
        
        if (constructorArgs.length > 0) {
          console.log(`   Constructor args:`, constructorArgs);
        }
        
        await hre.run('verify:verify', {
          address: address,
          constructorArguments: constructorArgs,
        });
        
        console.log(`✅ ${contractName} verified successfully`);
        verificationResults.push({ contract: contractName, address, status: 'SUCCESS' });
        
      } catch (error) {
        console.log(`❌ ${contractName} verification failed:`, error.message);
        verificationResults.push({ contract: contractName, address, status: 'FAILED', error: error.message });
      }
    }
    
    if (hre.network.name === 'sonic' || hre.network.name === 'sonicTestnet') {
      console.log('\n🌐 VERIFYING SONIC CONTRACTS\n');
      
      // Phase 1: Infrastructure
      if (deployedAddresses.contracts?.omniDragonDeployer?.address) {
        await verifyContract(
          'OmniDragonDeployer',
          deployedAddresses.contracts.omniDragonDeployer.address,
          ['0xAA28020DDA6b954D16208eccF873D79AC6533833'], // CREATE2Factory address
          'Phase 1'
        );
      }
      
      if (deployedAddresses.contracts?.chainRegistry?.address) {
        await verifyContract(
          'ChainRegistry',
          deployedAddresses.contracts.chainRegistry.address,
          [],
          'Phase 1'
        );
      }
      
      // Phase 2: Core Tokens
      if (deployedAddresses.contracts?.omniDRAGON?.address) {
        await verifyContract(
          'omniDRAGON',
          deployedAddresses.contracts.omniDRAGON.address,
          [
            '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B', // LayerZero V2 endpoint
            deployer.address // delegate
          ],
          'Phase 2'
        );
      }
      
      if (deployedAddresses.contracts?.redDRAGON?.address) {
        await verifyContract(
          'redDRAGON',
          deployedAddresses.contracts.redDRAGON.address,
          [
            '0x0000000000000000000000000000000000000000', // lpToken (placeholder)
            hre.ethers.utils.parseEther('1000') // rewardRate
          ],
          'Phase 2'
        );
      }
      
      if (deployedAddresses.contracts?.veDRAGON?.address) {
        await verifyContract(
          'veDRAGON',
          deployedAddresses.contracts.veDRAGON.address,
          [
            deployedAddresses.contracts.omniDRAGON.address, // omniDRAGON token
            'Vote-Escrowed DRAGON',
            'veDRAGON',
            '1.0.0'
          ],
          'Phase 2'
        );
      }
      
      // Phase 3: DeFi Infrastructure
      if (deployedAddresses.contracts?.feeManager?.address) {
        await verifyContract(
          'OmniDragonFeeManager',
          deployedAddresses.contracts.feeManager.address,
          [
            '0x0000000000000000000000000000000000000000', // priceOracle (skipped)
            1000, // totalFee (10%)
            690   // jackpotFee (6.9%)
          ],
          'Phase 3'
        );
      }
      
      if (deployedAddresses.contracts?.revenueDistributor?.address) {
        await verifyContract(
          'veDRAGONRevenueDistributor',
          deployedAddresses.contracts.revenueDistributor.address,
          [deployedAddresses.contracts.veDRAGON.address],
          'Phase 3'
        );
      }
      
      // Phase 4: Lottery System
      if (deployedAddresses.contracts?.drandProvider?.address) {
        await verifyContract(
          'DrandRandomnessProvider',
          deployedAddresses.contracts.drandProvider.address,
          [],
          'Phase 4'
        );
      }
      
      if (deployedAddresses.contracts?.jackpotVault?.address) {
        await verifyContract(
          'DragonJackpotVault',
          deployedAddresses.contracts.jackpotVault.address,
          [
            '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38', // wrappedToken (wS)
            deployedAddresses.contracts.feeManager.address // feeManager
          ],
          'Phase 4'
        );
      }
      
      if (deployedAddresses.contracts?.jackpotDistributor?.address) {
        await verifyContract(
          'DragonJackpotDistributor',
          deployedAddresses.contracts.jackpotDistributor.address,
          [
            deployedAddresses.contracts.omniDRAGON.address, // token
            hre.ethers.utils.parseEther('1000'), // swapTriggerAmount
            deployer.address // treasury
          ],
          'Phase 4'
        );
      }
      
      if (deployedAddresses.contracts?.lotteryManager?.address) {
        await verifyContract(
          'OmniDragonLotteryManager',
          deployedAddresses.contracts.lotteryManager.address,
          [
            deployedAddresses.contracts.drandProvider.address, // randomnessProvider
            deployedAddresses.contracts.jackpotDistributor.address, // jackpotDistributor
            deployedAddresses.contracts.veDRAGON.address, // veDRAGON
            '0x0000000000000000000000000000000000000000', // marketManager (placeholder)
            '0x0000000000000000000000000000000000000000', // priceOracle (skipped)
            146 // chainId
          ],
          'Phase 4'
        );
      }
      
      // Phase 5: VRF Integration
      if (deployedAddresses.contracts?.vrfIntegrator?.address) {
        await verifyContract(
          'ChainlinkVRFIntegratorV2_5',
          deployedAddresses.contracts.vrfIntegrator.address,
          [
            '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B', // LayerZero V2 endpoint
            deployer.address // delegate
          ],
          'Phase 5'
        );
      }
      
      if (deployedAddresses.contracts?.vrfConsumer?.address) {
        await verifyContract(
          'OmniDragonVRFConsumerV2_5',
          deployedAddresses.contracts.vrfConsumer.address,
          [
            '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B', // LayerZero V2 endpoint
            deployer.address, // delegate
            '0x0000000000000000000000000000000000000000', // vrfCoordinator (placeholder)
            0, // subscriptionId (placeholder)
            '0x0000000000000000000000000000000000000000000000000000000000000000' // keyHash (placeholder)
          ],
          'Phase 5 - Sonic'
        );
      }
    }
    
    if (hre.network.name === 'arbitrum' || hre.network.name === 'arbitrumGoerli') {
      console.log('\n🔵 VERIFYING ARBITRUM CONTRACTS\n');
      
      if (arbitrumAddresses.contracts?.vrfConsumerArbitrum?.address) {
        const config = arbitrumAddresses.contracts.vrfConsumerArbitrum.constructor;
        await verifyContract(
          'OmniDragonVRFConsumerV2_5',
          arbitrumAddresses.contracts.vrfConsumerArbitrum.address,
          [
            config.lzEndpoint, // LayerZero V2 endpoint
            config.delegate,   // delegate
            config.vrfCoordinator, // VRF Coordinator
            config.subscriptionId, // Subscription ID
            config.keyHash // Key Hash
          ],
          'Arbitrum VRF Consumer'
        );
      }
    }
    
    // Print verification summary
    console.log('\n=== Verification Summary ===');
    console.log(`Total contracts: ${verificationResults.length}`);
    
    const successful = verificationResults.filter(r => r.status === 'SUCCESS');
    const failed = verificationResults.filter(r => r.status === 'FAILED');
    
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    
    if (successful.length > 0) {
      console.log('\n✅ Successfully Verified:');
      successful.forEach(r => console.log(`   • ${r.contract}: ${r.address}`));
    }
    
    if (failed.length > 0) {
      console.log('\n❌ Failed Verifications:');
      failed.forEach(r => console.log(`   • ${r.contract}: ${r.address}\n     Error: ${r.error}`));
    }
    
    console.log('\n=== Verification Complete ===');
  });

module.exports = {}; 