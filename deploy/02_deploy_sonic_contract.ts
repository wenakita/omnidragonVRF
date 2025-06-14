import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deploySonicContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // Only deploy on sonic network
  if (network.name !== 'sonic') {
    console.log('Not on sonic network, skipping deployment.');
    return;
  }

  try {
    console.log('Deploying ChainlinkVRFIntegratorV2_5 to Sonic...');

    const layerZeroEndpoint = '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B'; // LayerZero V2 endpoint for Sonic
    console.log('LayerZero Endpoint:', layerZeroEndpoint);
    console.log('Deployer:', deployer);

    const deployment = await deploy('ChainlinkVRFIntegratorV2_5', {
      from: deployer,
      args: [
        layerZeroEndpoint,
        deployer // delegate
      ],
      log: true,
      deterministicDeployment: false,
      gasLimit: 3000000, // Reduced gas limit
    });

    if (deployment.newlyDeployed) {
      console.log(`ChainlinkVRFIntegratorV2_5 deployed to: ${deployment.address}`);
    } else {
      console.log(`ChainlinkVRFIntegratorV2_5 already deployed at: ${deployment.address}`);
    }
  } catch (error) {
    console.error('Deployment failed:', error);
    if (error && error.stack) {
      console.error(error.stack);
    }
  }
};

export default deploySonicContract;
deploySonicContract.tags = ['ChainlinkVRFIntegratorV2_5', 'sonic']; 