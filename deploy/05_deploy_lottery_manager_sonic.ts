import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployLotteryManager: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  // Only deploy on sonic network
  if (network.name !== 'sonic') {
    console.log('Not on sonic network, skipping LotteryManager deployment.');
    return;
  }

  try {
    console.log('🎰 Deploying OmniDragonLotteryManager to Sonic...');
    console.log('Deployer:', deployer);

    // Get deployed contract addresses
    const randomnessProvider = await get('OmniDragonRandomnessProvider');
    const omniDRAGON = await get('omniDRAGON');
    
    console.log('RandomnessProvider:', randomnessProvider.address);
    console.log('omniDRAGON Token:', omniDRAGON.address);

    const deployment = await deploy('OmniDragonLotteryManager', {
      from: deployer,
      args: [
        randomnessProvider.address,
        omniDRAGON.address,
        deployer // fee recipient
      ],
      log: true,
      deterministicDeployment: false,
      gasLimit: 4000000,
      gasPrice: "70000000000", // 70 gwei for Sonic
    });

    if (deployment.newlyDeployed) {
      console.log(`✅ OmniDragonLotteryManager deployed to: ${deployment.address}`);
      console.log('📋 Contract Details:');
      console.log(`   - Network: Sonic (${network.config.chainId})`);
      console.log(`   - RandomnessProvider: ${randomnessProvider.address}`);
      console.log(`   - Token: ${omniDRAGON.address}`);
      console.log(`   - Fee Recipient: ${deployer}`);
      console.log(`   - Explorer: https://sonicscan.org/address/${deployment.address}`);
      console.log('');
      console.log('🔧 Next Steps:');
      console.log('1. Set lottery manager in RandomnessProvider');
      console.log('2. Configure lottery parameters');
      console.log('3. Set minimum ticket price');
      console.log('4. Test lottery creation');
    } else {
      console.log(`✅ OmniDragonLotteryManager already deployed at: ${deployment.address}`);
    }
  } catch (error: any) {
    console.error('❌ LotteryManager deployment failed:', error);
    if (error && error.stack) {
      console.error(error.stack);
    }
  }
};

export default deployLotteryManager;
deployLotteryManager.tags = ['OmniDragonLotteryManager', 'lottery', 'sonic'];
deployLotteryManager.dependencies = ['OmniDragonRandomnessProvider', 'omniDRAGON']; 