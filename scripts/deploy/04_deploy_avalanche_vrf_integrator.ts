import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import 'dotenv/config';

const deployAvalancheVRFIntegrator: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    // Only deploy on avalanche network
    if (network.name !== 'avalanche') {
        console.log(`Not on avalanche network (currently on ${network.name}), skipping deployment.`);
        return;
    }

    try {
        console.log('🏔️  Deploying ChainlinkVRFIntegratorV2_5 to Avalanche...');

        // Avalanche LayerZero V2 Configuration
        const lzEndpoint = process.env.AVALANCHE_LZ_ENDPOINT || '0x1a44076050125825900e736c501f859c50fE728c';

        console.log('🔗 Configuration:');
        console.log('   LayerZero Endpoint:', lzEndpoint);
        console.log('   Deployer:', deployer);

        const deployment = await deploy('ChainlinkVRFIntegratorV2_5', {
            from: deployer,
            args: [
                lzEndpoint,  // LayerZero V2 endpoint for Avalanche
                deployer,    // initial owner
            ],
            log: true,
            deterministicDeployment: false,
            gasLimit: 4000000, // Standard gas limit
            gasPrice: "25000000000", // 25 gwei for Avalanche
        });

        if (deployment.newlyDeployed) {
            console.log(`✅ ChainlinkVRFIntegratorV2_5 deployed to: ${deployment.address}`);
            console.log('');
            console.log('🔧 CONFIGURATION OPTIONS:');
            console.log('');
            console.log('📡 OPTION 1: Avalanche → Arbitrum (VRF Consumer)');
            console.log('   - Set peer to Arbitrum VRF Consumer');
            console.log('   - Use Arbitrum EID: 30110');
            console.log('   - Leverages existing Chainlink VRF setup');
            console.log('');
            console.log('🏔️  OPTION 2: Avalanche → Avalanche (Local VRF)');
            console.log('   - Set peer to local Avalanche VRF Consumer');
            console.log('   - Use Avalanche EID: 30106');
            console.log('   - Requires separate VRF Consumer deployment');
            console.log('');
            console.log('🔧 NEXT STEPS:');
            console.log('1. Choose your configuration option above');
            console.log('2. Set peer connection to target VRF Consumer');
            console.log('3. Configure LayerZero DVN and Executor');
            console.log('4. Fund the contract with AVAX for LayerZero fees');
            console.log('5. Test with requestRandomWordsSimple()');
            console.log('');
            console.log('🌐 EXPLORER LINK:');
            console.log(`   https://snowtrace.io/address/${deployment.address}`);
        } else {
            console.log(`✅ ChainlinkVRFIntegratorV2_5 already deployed at: ${deployment.address}`);
        }
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        if (error instanceof Error && error.stack) {
            console.error(error.stack);
        }
    }
};

deployAvalancheVRFIntegrator.tags = ['ChainlinkVRFIntegratorV2_5', 'avalanche'];

export default deployAvalancheVRFIntegrator; 