const { task } = require('hardhat/config');

task('deploy-ecosystem', 'Deploy OmniDragon ecosystem contracts')
    .setAction(async (taskArgs, hre) => {
        console.log('🐲 Deploying OmniDragon Ecosystem on Sonic');
        console.log('==========================================');
        
        const [deployer] = await hre.ethers.getSigners();
        console.log('👤 Deployer:', deployer.address);
        
        const balance = await deployer.getBalance();
        console.log('💰 Balance:', hre.ethers.utils.formatEther(balance), 'S');
        
        const deployedContracts = {};
        
        try {
            // 1. Deploy OmniDragonRandomnessProvider
            console.log('\n🎲 1. Deploying OmniDragonRandomnessProvider...');
            const EXISTING_VRF_INTEGRATOR = '0x3aB9Bf4C30F5995Ac27f09c487a32e97c87899E4';
            
            const RandomnessProviderFactory = await hre.ethers.getContractFactory('OmniDragonRandomnessProvider');
            const randomnessProvider = await RandomnessProviderFactory.deploy(EXISTING_VRF_INTEGRATOR, {
                gasLimit: 3000000
            });
            await randomnessProvider.deployed();
            deployedContracts.randomnessProvider = randomnessProvider.address;
            console.log('✅ RandomnessProvider deployed at:', randomnessProvider.address);
            
            // 2. Deploy DragonMarketOracle
            console.log('\n📊 2. Deploying DragonMarketOracle...');
            const MarketOracleFactory = await hre.ethers.getContractFactory('DragonMarketOracle');
            const marketOracle = await MarketOracleFactory.deploy('S', 'USD', {
                gasLimit: 3000000
            });
            await marketOracle.deployed();
            deployedContracts.marketOracle = marketOracle.address;
            console.log('✅ DragonMarketOracle deployed at:', marketOracle.address);
            
            // 3. Deploy OmniDragonMarketOracle
            console.log('\n🌐 3. Deploying OmniDragonMarketOracle...');
            const SONIC_LZ_ENDPOINT = '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B';
            const OmniMarketOracleFactory = await hre.ethers.getContractFactory('OmniDragonMarketOracle');
            const omniMarketOracle = await OmniMarketOracleFactory.deploy(
                SONIC_LZ_ENDPOINT,
                'S',
                'USD',
                {
                    gasLimit: 4000000
                }
            );
            await omniMarketOracle.deployed();
            deployedContracts.omniMarketOracle = omniMarketOracle.address;
            console.log('✅ OmniDragonMarketOracle deployed at:', omniMarketOracle.address);
            
            // 4. Skip DragonMarketAnalyzer (it's a library, not a contract)
            console.log('\n📈 4. Skipping DragonMarketAnalyzer (library, not deployable contract)...');
            
            // 5. Deploy ChainRegistry
            console.log('\n🔗 5. Deploying ChainRegistry...');
            const ChainRegistryFactory = await hre.ethers.getContractFactory('ChainRegistry');
            const chainRegistry = await ChainRegistryFactory.deploy(
                SONIC_LZ_ENDPOINT,
                deployer.address, // fee manager
                deployer.address, // owner
                {
                    gasLimit: 3000000
                }
            );
            await chainRegistry.deployed();
            deployedContracts.chainRegistry = chainRegistry.address;
            console.log('✅ ChainRegistry deployed at:', chainRegistry.address);
            
            // 6. Deploy CREATE2FactoryWithOwnership (if not using existing)
            console.log('\n🏭 6. Deploying CREATE2FactoryWithOwnership...');
            const FactoryFactory = await hre.ethers.getContractFactory('CREATE2FactoryWithOwnership');
            const factory = await FactoryFactory.deploy({
                gasLimit: 2000000
            });
            await factory.deployed();
            deployedContracts.factory = factory.address;
            console.log('✅ CREATE2FactoryWithOwnership deployed at:', factory.address);
            
            // Summary
            console.log('\n🎯 DEPLOYMENT SUMMARY');
            console.log('=====================');
            Object.entries(deployedContracts).forEach(([name, address]) => {
                console.log(`📋 ${name}: ${address}`);
                console.log(`   Explorer: https://sonicscan.org/address/${address}`);
            });
            
            // Save deployment data
            const deploymentData = {
                network: 'sonic',
                chainId: 146,
                timestamp: new Date().toISOString(),
                deployer: deployer.address,
                contracts: deployedContracts,
                configuration: {
                    layerZeroEndpoint: SONIC_LZ_ENDPOINT,
                    existingVRFIntegrator: EXISTING_VRF_INTEGRATOR
                }
            };
            
            const fs = require('fs');
            fs.writeFileSync('sonic-ecosystem-deployment.json', JSON.stringify(deploymentData, null, 2));
            console.log('\n💾 Deployment data saved to sonic-ecosystem-deployment.json');
            
            console.log('\n🚀 NEXT STEPS');
            console.log('==============');
            console.log('1. ✅ Core ecosystem contracts deployed');
            console.log('2. 🪙 Deploy Dragon token (needs size optimization)');
            console.log('3. 🎰 Deploy LotteryManager (needs Dragon token)');
            console.log('4. 🔧 Configure cross-chain connections');
            console.log('5. 🧪 Test system integration');
            
            return deployedContracts;
            
        } catch (error) {
            console.error('❌ Deployment failed:', error.message);
            console.log('\n📋 Partially deployed contracts:');
            Object.entries(deployedContracts).forEach(([name, address]) => {
                console.log(`• ${name}: ${address}`);
            });
            throw error;
        }
    }); 