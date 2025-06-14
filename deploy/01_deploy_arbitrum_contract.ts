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

  const layerZeroEndpoint = process.env.LZ_ARBITRUM_ENDPOINT || '0x1a44076050125825900e736c501f859c50fE728c'; // LayerZero V2 endpoint for Arbitrum
  const vrfCoordinator = process.env.CHAINLINK_VRF_COORDINATOR || '0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e'; // VRF V2.5 Plus Coordinator for Arbitrum
  const subscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID || '76197290230634444536112874207591481868701552347170354938929514079949640872745';
  const keyHash = process.env.CHAINLINK_KEY_HASH || '0xe9f223d7d83ec85c4f78042a4845af3a1c8df7757b4997b815ce4b8d07aca68c'; // 30 gwei gas lane

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