const { task } = require('hardhat/config');

task('deploy-dragon', 'Deploy Dragon token using CREATE2')
    .setAction(async (taskArgs, hre) => {
        console.log('🐲 Deploying Dragon Token using CREATE2');
        console.log('Network:', hre.network.name);
        
        const [deployer] = await hre.ethers.getSigners();
        console.log('Deployer:', deployer.address);
        
        const balance = await deployer.getBalance();
        console.log('Balance:', hre.ethers.utils.formatEther(balance), 'S');
        
        // Factory address (UPDATED - 🔐 LIVE STREAMING SAFE)
        const factoryAddress = '0xAA28020DDA6b954D16208eccF873D79AC6533833';
        console.log('Factory:', factoryAddress);
        
        try {
            // Check if factory exists
            const code = await hre.ethers.provider.getCode(factoryAddress);
            if (code === '0x') {
                console.log('❌ Factory not found at address');
                return;
            }
            
            console.log('✅ Factory found');
            
            // Get factory contract
            const factory = await hre.ethers.getContractAt('CREATE2FactoryWithOwnership', factoryAddress);
            
            // Create salt
            const salt = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('OMNIDRAGON_TOKEN_V1'));
            console.log('Salt:', salt);
            
            // Check if already deployed
            const existing = await factory.deploymentBySalt(salt);
            if (existing !== hre.ethers.constants.AddressZero) {
                console.log('✅ Dragon already deployed at:', existing);
                return existing;
            }
            
            // Get bytecode
            const DragonFactory = await hre.ethers.getContractFactory('omniDRAGON');
            const bytecode = DragonFactory.bytecode;
            
            console.log('Deploying Dragon...');
            const tx = await factory.deploy(bytecode, salt, 'omniDRAGON', {
                gasLimit: 15000000
            });
            
            console.log('TX:', tx.hash);
            const receipt = await tx.wait();
            
            const event = receipt.events?.find(e => e.event === 'ContractDeployed');
            const address = event?.args?.deployed;
            
            console.log('🎉 Dragon deployed at:', address);
            return address;
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }); 