import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import 'dotenv/config';

const deployAvalancheVRFConsumer: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    // Only deploy on avalanche network
    if (network.name !== 'avalanche') {
        console.log('Not on avalanche network, skipping deployment.');
        return;
    }

    try {
        console.log('🏔️  Deploying OmniDragonVRFConsumerV2_5 to Avalanche...');

        // Avalanche Chainlink VRF 2.5 Configuration
        const lzEndpoint = process.env.AVALANCHE_LZ_ENDPOINT || '0x1a44076050125825900e736c501f859c50fE728c';
        const vrfCoordinator = process.env.AVALANCHE_VRF_COORDINATOR || '0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634';
        const subscriptionId = process.env.AVALANCHE_SUBSCRIPTION_ID || '1'; // You'll need to create this
        const keyHash = process.env.AVALANCHE_KEY_HASH || '0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61';

        console.log('🔗 Configuration:');
        console.log('   LayerZero Endpoint:', lzEndpoint);
        console.log('   VRF Coordinator:', vrfCoordinator);
        console.log('   Subscription ID:', subscriptionId);
        console.log('   Key Hash:', keyHash);
        console.log('   Deployer:', deployer);

        const deployment = await deploy('OmniDragonVRFConsumerV2_5', {
            from: deployer,
            args: [
                lzEndpoint,      // LayerZero V2 endpoint for Avalanche
                deployer,        // initial owner
                vrfCoordinator,  // Chainlink VRF Coordinator V2.5 on Avalanche
                subscriptionId,  // Chainlink subscription ID
                keyHash         // Chainlink key hash for Avalanche
            ],
            log: true,
            deterministicDeployment: false,
            gasLimit: 8000000, // High gas limit for large contract
            gasPrice: "25000000000", // 25 gwei for Avalanche
        });

        if (deployment.newlyDeployed) {
            console.log(`✅ OmniDragonVRFConsumerV2_5 deployed to: ${deployment.address}`);
            console.log('');
            console.log('🔧 NEXT STEPS:');
            console.log('1. Create Chainlink VRF subscription on Avalanche');
            console.log('2. Add this contract as a consumer to the subscription');
            console.log('3. Fund the subscription with LINK tokens');
            console.log('4. Set peer connection to Sonic VRF Integrator');
            console.log('5. Configure LayerZero DVN and Executor');
            console.log('6. Fund the contract with AVAX for LayerZero fees');
            console.log('');
            console.log('🌐 EXPLORER LINK:');
            console.log(`   https://snowtrace.io/address/${deployment.address}`);
        } else {
            console.log(`✅ OmniDragonVRFConsumerV2_5 already deployed at: ${deployment.address}`);
        }
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        if (error instanceof Error && error.stack) {
            console.error(error.stack);
        }
    }
};

deployAvalancheVRFConsumer.tags = ['OmniDragonVRFConsumerV2_5', 'avalanche'];

export default deployAvalancheVRFConsumer; 