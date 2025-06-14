import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployArbitrumContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // Only deploy on arbitrum network
  if (network.name !== 'arbitrum') {
    return;
  }

  console.log('Deploying OmniDragonVRFConsumerV2_5 to Arbitrum...');

  const layerZeroEndpoint = process.env.LZ_ARBITRUM_ENDPOINT!; // LayerZero V2 endpoint for Arbitrum
  const vrfCoordinator = process.env.CHAINLINK_VRF_COORDINATOR!; // VRF V2.5 Plus Coordinator for Arbitrum
  const subscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID!;
  const keyHash = process.env.CHAINLINK_KEY_HASH!; // 30 gwei gas lane

  const deployment = await deploy('OmniDragonVRFConsumerV2_5', {
    from: deployer,
    args: [
      layerZeroEndpoint,
      deployer, // owner
      vrfCoordinator,
      subscriptionId,
      keyHash
    ],
    log: true,
    deterministicDeployment: false,
  });

  console.log(`OmniDragonVRFConsumerV2_5 deployed to: ${deployment.address}`);
};

export default deployArbitrumContract;
deployArbitrumContract.tags = ['OmniDragonVRFConsumerV2_5', 'arbitrum']; 