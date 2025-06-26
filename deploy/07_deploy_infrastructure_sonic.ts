import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployInfrastructure: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // Only deploy on sonic network
  if (network.name !== 'sonic') {
    console.log('Not on sonic network, skipping Infrastructure deployment.');
    return;
  }

  try {
    console.log('🏗️ Deploying Infrastructure contracts to Sonic...');
    console.log('Deployer:', deployer);

    const SONIC_LZ_ENDPOINT = '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B';

    // 1. Deploy ChainRegistry
    console.log('\n🔗 Deploying ChainRegistry...');
    const chainRegistry = await deploy('ChainRegistry', {
      from: deployer,
      args: [
        SONIC_LZ_ENDPOINT,
        deployer, // fee manager address
        deployer  // initial owner
      ],
      log: true,
      deterministicDeployment: false,
      gasLimit: 3000000,
      gasPrice: "70000000000",
    });

    if (chainRegistry.newlyDeployed) {
      console.log(`✅ ChainRegistry deployed to: ${chainRegistry.address}`);
    }

    // 2. Deploy CREATE2FactoryWithOwnership
    console.log('\n🏭 Deploying CREATE2FactoryWithOwnership...');
    const factory = await deploy('CREATE2FactoryWithOwnership', {
      from: deployer,
      args: [], // No constructor arguments
      log: true,
      deterministicDeployment: false,
      gasLimit: 2000000,
      gasPrice: "70000000000",
    });

    if (factory.newlyDeployed) {
      console.log(`✅ CREATE2FactoryWithOwnership deployed to: ${factory.address}`);
    }

    // Summary
    console.log('\n🎯 Infrastructure Deployment Summary:');
    console.log('===================================');
    console.log(`🔗 ChainRegistry: ${chainRegistry.address}`);
    console.log(`🏭 CREATE2FactoryWithOwnership: ${factory.address}`);
    console.log('');
    console.log('🔧 Next Steps:');
    console.log('1. Register supported chains in ChainRegistry');
    console.log('2. Configure factory permissions');
    console.log('3. Set up cross-chain infrastructure');

  } catch (error: any) {
    console.error('❌ Infrastructure deployment failed:', error);
    if (error && error.stack) {
      console.error(error.stack);
    }
  }
};

export default deployInfrastructure;
deployInfrastructure.tags = ['infrastructure', 'ChainRegistry', 'CREATE2FactoryWithOwnership', 'sonic'];
deployInfrastructure.dependencies = []; 