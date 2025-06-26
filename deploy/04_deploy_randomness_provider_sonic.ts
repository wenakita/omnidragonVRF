import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployRandomnessProvider: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  // Only deploy on sonic network
  if (network.name !== 'sonic') {
    console.log('Not on sonic network, skipping RandomnessProvider deployment.');
    return;
  }

  try {
    console.log('🎲 Deploying OmniDragonRandomnessProvider to Sonic...');
    console.log('Deployer:', deployer);

    // Get the existing VRF Integrator address
    const EXISTING_VRF_INTEGRATOR = '0x3aB9Bf4C30F5995Ac27f09c487a32e97c87899E4';
    
    console.log('VRF Integrator:', EXISTING_VRF_INTEGRATOR);

    const deployment = await deploy('OmniDragonRandomnessProvider', {
      from: deployer,
      args: [EXISTING_VRF_INTEGRATOR],
      log: true,
      deterministicDeployment: false,
      gasLimit: 3000000,
      gasPrice: "70000000000", // 70 gwei for Sonic
    });

    if (deployment.newlyDeployed) {
      console.log(`✅ OmniDragonRandomnessProvider deployed to: ${deployment.address}`);
      console.log('📋 Contract Details:');
      console.log(`   - Network: Sonic (${network.config.chainId})`);
      console.log(`   - VRF Integrator: ${EXISTING_VRF_INTEGRATOR}`);
      console.log(`   - Explorer: https://sonicscan.org/address/${deployment.address}`);
      console.log('');
      console.log('🔧 Next Steps:');
      console.log('1. Set lottery manager address');
      console.log('2. Configure VRF request parameters');
      console.log('3. Test randomness generation');
    } else {
      console.log(`✅ OmniDragonRandomnessProvider already deployed at: ${deployment.address}`);
    }
  } catch (error: any) {
    console.error('❌ RandomnessProvider deployment failed:', error);
    if (error && error.stack) {
      console.error(error.stack);
    }
  }
};

export default deployRandomnessProvider;
deployRandomnessProvider.tags = ['OmniDragonRandomnessProvider', 'randomness', 'sonic'];
deployRandomnessProvider.dependencies = []; // No contract dependencies 