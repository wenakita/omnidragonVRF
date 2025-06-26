import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployOracles: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // Only deploy on sonic network
  if (network.name !== 'sonic') {
    console.log('Not on sonic network, skipping Oracle deployment.');
    return;
  }

  try {
    console.log('📊 Deploying Oracle contracts to Sonic...');
    console.log('Deployer:', deployer);

    const SONIC_LZ_ENDPOINT = '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B';

    // 1. Deploy DragonMarketOracle
    console.log('\n📈 Deploying DragonMarketOracle...');
    const marketOracle = await deploy('DragonMarketOracle', {
      from: deployer,
      args: ['S', 'USD'], // Sonic native token
      log: true,
      deterministicDeployment: false,
      gasLimit: 3000000,
      gasPrice: "70000000000",
    });

    if (marketOracle.newlyDeployed) {
      console.log(`✅ DragonMarketOracle deployed to: ${marketOracle.address}`);
    }

    // 2. Deploy OmniDragonMarketOracle
    console.log('\n🌐 Deploying OmniDragonMarketOracle...');
    const omniMarketOracle = await deploy('OmniDragonMarketOracle', {
      from: deployer,
      args: [
        SONIC_LZ_ENDPOINT,
        deployer,
        marketOracle.address,
        'S',
        'USD'
      ],
      log: true,
      deterministicDeployment: false,
      gasLimit: 4000000,
      gasPrice: "70000000000",
    });

    if (omniMarketOracle.newlyDeployed) {
      console.log(`✅ OmniDragonMarketOracle deployed to: ${omniMarketOracle.address}`);
    }

    // 3. Deploy DragonMarketAnalyzer
    console.log('\n📊 Deploying DragonMarketAnalyzer...');
    const marketAnalyzer = await deploy('DragonMarketAnalyzer', {
      from: deployer,
      args: [
        omniMarketOracle.address,
        deployer
      ],
      log: true,
      deterministicDeployment: false,
      gasLimit: 4000000,
      gasPrice: "70000000000",
    });

    if (marketAnalyzer.newlyDeployed) {
      console.log(`✅ DragonMarketAnalyzer deployed to: ${marketAnalyzer.address}`);
    }

    // Summary
    console.log('\n🎯 Oracle Deployment Summary:');
    console.log('============================');
    console.log(`📈 DragonMarketOracle: ${marketOracle.address}`);
    console.log(`🌐 OmniDragonMarketOracle: ${omniMarketOracle.address}`);
    console.log(`📊 DragonMarketAnalyzer: ${marketAnalyzer.address}`);
    console.log('');
    console.log('🔧 Next Steps:');
    console.log('1. Configure oracle data feeds');
    console.log('2. Set up cross-chain oracle connections');
    console.log('3. Test price data retrieval');

  } catch (error: any) {
    console.error('❌ Oracle deployment failed:', error);
    if (error && error.stack) {
      console.error(error.stack);
    }
  }
};

export default deployOracles;
deployOracles.tags = ['oracles', 'DragonMarketOracle', 'OmniDragonMarketOracle', 'DragonMarketAnalyzer', 'sonic'];
deployOracles.dependencies = []; 