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

    const layerZeroEndpoint = process.env.SONIC_LZ_ENDPOINT!;
    console.log('LayerZero Endpoint:', layerZeroEndpoint);
    console.log('Deployer:', deployer);

    const deployment = await deploy('ChainlinkVRFIntegratorV2_5', {
      from: deployer,
      args: [
        layerZeroEndpoint,  // LayerZero V2 endpoint for Sonic
        deployer,           // initial owner
      ],
      log: true,
      deterministicDeployment: false,
      gasLimit: 4000000, // Increased gas limit slightly
      gasPrice: "70000000000", // 70 gwei for Sonic
    });

    if (deployment.newlyDeployed) {
      console.log(`ChainlinkVRFIntegratorV2_5 deployed to: ${deployment.address}`);
      console.log('Remember to:');
      console.log('1. Set peer connection to Arbitrum VRF Consumer');
      console.log('2. Configure LayerZero DVN and Executor');
      console.log('3. Update lottery manager with new integrator address');
    } else {
      console.log(`ChainlinkVRFIntegratorV2_5 already deployed at: ${deployment.address}`);
    }
  } catch (error: any) {
    console.error('Deployment failed:', error);
    if (error && error.stack) {
      console.error(error.stack);
    }
  }
};

export default deploySonicContract;
deploySonicContract.tags = ['ChainlinkVRFIntegratorV2_5', 'sonic']; 