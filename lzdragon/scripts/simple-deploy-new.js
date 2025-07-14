const { ethers } = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log('Deploying with account:', deployer.address);
    console.log('Account balance:', ethers.utils.formatEther(await deployer.getBalance()));

    // New vanity address details
    const factoryAddress = '0xAA28020DDA6b954D16208eccF873D79AC6533833';
    const salt = '0x9f010b008dece704b9b0846eb4b3cc0e28fdaebe4cceb74a0ac1744147605743';
    const expectedAddress = '0x690E5d16e171E3545895F3E064c25a8858A30777';
    
    console.log('Factory address:', factoryAddress);
    console.log('Salt:', salt);
    console.log('Expected address:', expectedAddress);
    
    // Get the factory contract
    const factoryContract = await ethers.getContractAt('CREATE2FactoryWithOwnership', factoryAddress);
    
    // Get registry address
    const registryAddress = '0x69B029B7EF2468c2B546556022be2DD66cd20777';
    
    // Get the contract factory
    const DragonFactory = await ethers.getContractFactory('omniDRAGON');
    const bytecode = DragonFactory.bytecode;
    
    // Constructor arguments for omniDRAGON deployment
    const constructorArgs = ethers.utils.defaultAbiCoder.encode(
        ['string', 'string', 'address', 'address', 'address'],
        ['Dragon', 'DRAGON', registryAddress, registryAddress, deployer.address]
    );
    const deploymentBytecode = bytecode + constructorArgs.slice(2);
    
    console.log('Deployment bytecode length:', deploymentBytecode.length);
    console.log('Bytecode hash:', ethers.utils.keccak256(deploymentBytecode));
    
    // Calculate deployment address
    const computedAddress = ethers.utils.getCreate2Address(
        factoryAddress,
        salt,
        ethers.utils.keccak256(deploymentBytecode)
    );
    console.log('Computed address:', computedAddress);
    
    if (computedAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
        console.error('Address mismatch!');
        process.exit(1);
    }
    
    // Check if already deployed
    const codeAtAddress = await ethers.provider.getCode(computedAddress);
    if (codeAtAddress !== '0x') {
        console.log('Contract already deployed at', computedAddress);
        return;
    }
    
    // Deploy via factory
    console.log('Deploying omniDRAGON via CREATE2...');
    
    try {
        const tx = await factoryContract.deploy(deploymentBytecode, salt, 'omniDRAGON', {
            gasLimit: 10000000,
            gasPrice: ethers.utils.parseUnits('100', 'gwei'),
        });
        
        console.log('Transaction hash:', tx.hash);
        const receipt = await tx.wait();
        console.log('Transaction confirmed in block:', receipt.blockNumber);
        console.log('Gas used:', receipt.gasUsed.toString());
        
        // Check deployment
        const finalCode = await ethers.provider.getCode(computedAddress);
        if (finalCode !== '0x') {
            console.log('✅ Contract successfully deployed at:', computedAddress);
        } else {
            console.log('❌ Contract deployment failed');
        }
        
    } catch (error) {
        console.error('Deployment failed:', error);
        
        // Try to get more details about the failure
        if (error.transaction) {
            const receipt = await ethers.provider.getTransactionReceipt(error.transaction.hash);
            console.log('Transaction receipt:', receipt);
        }
    }
}

main().catch(console.error); 