import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import 'dotenv/config';

const deployArbitrumContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    // Only deploy on arbitrum network
    if (network.name !== 'arbitrum') {
        console.log('Not on arbitrum network, skipping deployment.');
        return;
    }

    try {
        console.log('Deploying OmniDragonVRFConsumerV2_5 to Arbitrum...');

        // Get configuration from environment
        const lzEndpoint = process.env.ARBITRUM_LZ_ENDPOINT!;
        const vrfCoordinator = process.env.CHAINLINK_VRF_COORDINATOR!;
        const subscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID!;
        const keyHash = process.env.CHAINLINK_KEY_HASH!;

        console.log('LayerZero Endpoint:', lzEndpoint);
        console.log('VRF Coordinator:', vrfCoordinator);
        console.log('Subscription ID:', subscriptionId);
        console.log('Key Hash:', keyHash);
        console.log('Deployer:', deployer);

        const deployment = await deploy('OmniDragonVRFConsumerV2_5', {
            from: deployer,
            args: [
                lzEndpoint,      // LayerZero V2 endpoint
                deployer,        // initial owner
                vrfCoordinator,  // Chainlink VRF Coordinator V2.5
                subscriptionId,  // Chainlink subscription ID
                keyHash         // Chainlink key hash
            ],
            log: true,
            deterministicDeployment: false,
            gasLimit: 8000000, // Significantly increased gas limit for large contract
            gasPrice: "500000000", // 0.5 gwei - matching your transaction
        });

        if (deployment.newlyDeployed) {
            console.log(`OmniDragonVRFConsumerV2_5 deployed to: ${deployment.address}`);
            console.log('Remember to:');
            console.log('1. Set peer connection to Sonic VRF Integrator');
            console.log('2. Configure LayerZero DVN and Executor');
            console.log('3. Fund the contract with ETH for LayerZero fees');
        } else {
            console.log(`OmniDragonVRFConsumerV2_5 already deployed at: ${deployment.address}`);
        }
    } catch (error) {
        console.error('Deployment failed:', error);
        if (error instanceof Error && error.stack) {
            console.error(error.stack);
        }
    }
};

deployArbitrumContract.tags = ['OmniDragonVRFConsumerV2_5', 'arbitrum'];

export default deployArbitrumContract;