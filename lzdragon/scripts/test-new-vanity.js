const { ethers } = require('hardhat');

async function main() {
    console.log('Testing new vanity address...');
    
    // CREATE2 Factory address
    const CREATE2_FACTORY_ADDRESS = "0xAA28020DDA6b954D16208eccF873D79AC6533833";
    const salt = "0x4df4723768345f9e3f21042ccdf073b7ad9d43b538ce70bc2f611ae90a0419b5";
    
    // Get accounts
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    
    // Check balance
    const balance = await deployer.getBalance();
    console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH`);
    
    // Get registry deployment
    const registryAddress = "0x69B029B7EF2468c2B546556022be2DD66cd20777";
    console.log(`Registry: ${registryAddress}`);
    
    // Get the contract factory
    const DragonFactory = await ethers.getContractFactory("omniDRAGON");
    const bytecode = DragonFactory.bytecode;
    
    // Constructor arguments
    const constructorArgs = ethers.utils.defaultAbiCoder.encode(
        ["string", "string", "address", "address", "address"],
        ["Dragon", "DRAGON", registryAddress, registryAddress, deployer.address]
    );
    const deploymentBytecode = bytecode + constructorArgs.slice(2);
    
    // Calculate deployment address
    const computedAddress = ethers.utils.getCreate2Address(
        CREATE2_FACTORY_ADDRESS,
        salt,
        ethers.utils.keccak256(deploymentBytecode)
    );
    console.log(`Computed address: ${computedAddress}`);
    
    // Verify the address matches our vanity pattern
    if (computedAddress.toLowerCase().startsWith('0x69') && computedAddress.toLowerCase().endsWith('0777')) {
        console.log('✅ Address matches vanity pattern!');
    } else {
        console.log('❌ Address does not match vanity pattern');
    }
    
    // Check if address already has code
    const code = await ethers.provider.getCode(computedAddress);
    console.log(`Code at address: ${code.length > 2 ? 'deployed' : 'not deployed'}`);
    
    // Get factory contract
    const factoryContract = await ethers.getContractAt("CREATE2FactoryWithOwnership", CREATE2_FACTORY_ADDRESS);
    
    // Try to check if salt can be used
    try {
        console.log('Testing salt availability...');
        
        // Test deployment with dry run
        const tx = await factoryContract.callStatic.deploy(deploymentBytecode, salt, "omniDRAGON");
        console.log('✅ Salt is available for deployment');
        
        // Now try actual deployment
        console.log('Attempting deployment...');
        const realTx = await factoryContract.deploy(deploymentBytecode, salt, "omniDRAGON", {
            gasLimit: 5000000,
            maxFeePerGas: ethers.utils.parseUnits('200', 'gwei'),
            maxPriorityFeePerGas: ethers.utils.parseUnits('100', 'gwei'),
        });
        
        console.log(`Transaction hash: ${realTx.hash}`);
        console.log('Waiting for confirmation...');
        
        const receipt = await realTx.wait();
        console.log(`✅ Deployment successful! Gas used: ${receipt.gasUsed}`);
        
        // Verify deployment
        const finalCode = await ethers.provider.getCode(computedAddress);
        console.log(`Contract deployed: ${finalCode !== '0x'}`);
        
    } catch (error) {
        console.error('❌ Deployment failed:');
        console.error('Error message:', error.message);
        if (error.reason) {
            console.error('Reason:', error.reason);
        }
    }
}

main().catch(console.error); 