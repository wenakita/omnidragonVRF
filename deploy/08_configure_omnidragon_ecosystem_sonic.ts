import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const configureEcosystem: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;
  const { get } = deployments;
  const { deployer } = await getNamedAccounts();

  // Only configure on sonic network
  if (network.name !== 'sonic') {
    console.log('Not on sonic network, skipping configuration.');
    return;
  }

  try {
    console.log('⚙️ Configuring OmniDragon Ecosystem on Sonic...');
    console.log('Deployer:', deployer);

    // Get all deployed contracts
    const randomnessProvider = await get('OmniDragonRandomnessProvider');
    const lotteryManager = await get('OmniDragonLotteryManager');
    const omniDRAGON = await get('omniDRAGON');

    console.log('🔧 Setting up contract relationships...');

    // 1. Configure RandomnessProvider with LotteryManager
    console.log('\n🎲 Configuring RandomnessProvider...');
    const randomnessProviderContract = await ethers.getContractAt(
      'OmniDragonRandomnessProvider',
      randomnessProvider.address
    );

    const currentLotteryManager = await randomnessProviderContract.lotteryManager();
    if (currentLotteryManager !== lotteryManager.address) {
      console.log(`Setting lottery manager to: ${lotteryManager.address}`);
      const tx1 = await randomnessProviderContract.setLotteryManager(lotteryManager.address);
      await tx1.wait();
      console.log('✅ Lottery manager set in RandomnessProvider');
    } else {
      console.log('✅ Lottery manager already configured');
    }

    // 2. Configure LotteryManager parameters
    console.log('\n🎰 Configuring LotteryManager...');
    const lotteryManagerContract = await ethers.getContractAt(
      'OmniDragonLotteryManager',
      lotteryManager.address
    );

    // Set minimum ticket price (1 DRAGON)
    const minTicketPrice = ethers.utils.parseEther('1');
    const currentMinPrice = await lotteryManagerContract.minimumTicketPrice();
    
    if (!currentMinPrice.eq(minTicketPrice)) {
      console.log('Setting minimum ticket price to 1 DRAGON...');
      const tx2 = await lotteryManagerContract.setMinimumTicketPrice(minTicketPrice);
      await tx2.wait();
      console.log('✅ Minimum ticket price set to 1 DRAGON');
    } else {
      console.log('✅ Minimum ticket price already configured');
    }

    // 3. Display configuration summary
    console.log('\n🎯 Configuration Summary:');
    console.log('========================');
    console.log(`🎲 RandomnessProvider: ${randomnessProvider.address}`);
    console.log(`   - Lottery Manager: ${await randomnessProviderContract.lotteryManager()}`);
    console.log(`   - VRF Integrator: ${await randomnessProviderContract.vrfIntegrator()}`);
    
    console.log(`\n🎰 LotteryManager: ${lotteryManager.address}`);
    console.log(`   - Randomness Provider: ${await lotteryManagerContract.randomnessProvider()}`);
    console.log(`   - Token: ${await lotteryManagerContract.token()}`);
    console.log(`   - Min Ticket Price: ${ethers.utils.formatEther(await lotteryManagerContract.minimumTicketPrice())} DRAGON`);
    console.log(`   - Fee Recipient: ${await lotteryManagerContract.feeRecipient()}`);
    
    console.log(`\n🪙 omniDRAGON: ${omniDRAGON.address}`);

    console.log('\n🚀 Next Steps:');
    console.log('==============');
    console.log('1. ✅ Core contracts deployed and configured');
    console.log('2. 🔧 Set up LayerZero cross-chain connections');
    console.log('3. 💰 Fund contracts for operations');
    console.log('4. 🧪 Test lottery system');
    console.log('5. 🌐 Verify contracts on SonicScan');

  } catch (error: any) {
    console.error('❌ Configuration failed:', error);
    if (error && error.stack) {
      console.error(error.stack);
    }
  }
};

export default configureEcosystem;
configureEcosystem.tags = ['configure', 'ecosystem', 'sonic'];
configureEcosystem.dependencies = ['OmniDragonRandomnessProvider', 'OmniDragonLotteryManager', 'omniDRAGON'];
configureEcosystem.runAtTheEnd = true; // Run after all deployments 