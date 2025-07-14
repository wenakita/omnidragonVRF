const { ethers } = require('hardhat');

async function main() {
    console.log('Simple omniDRAGON deployment...');
    
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
    
    // Get factory contract
    const factoryContract = await ethers.getContractAt("CREATE2FactoryWithOwnership", CREATE2_FACTORY_ADDRESS);
    
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
    
    // Check if already deployed
    const code = await ethers.provider.getCode(computedAddress);
    if (code !== '0x') {
        console.log(`✅ Contract already deployed at ${computedAddress}`);
        
        // Try to interact with it
        const contract = await ethers.getContractAt('omniDRAGON', computedAddress);
        try {
            const name = await contract.name();
            const symbol = await contract.symbol();
            const totalSupply = await contract.totalSupply();
            const owner = await contract.owner();
            
            console.log(`Name: ${name}`);
            console.log(`Symbol: ${symbol}`);
            console.log(`Total Supply: ${ethers.utils.formatEther(totalSupply)} DRAGON`);
            console.log(`Owner: ${owner}`);
        } catch (error) {
            console.log('Error interacting with contract:', error.message);
        }
        return;
    }
    
    // Try deployment with reduced gas to see specific error
    try {
        console.log('Attempting deployment with specific gas parameters...');
        
        // Get current gas price
        const gasPrice = await ethers.provider.getGasPrice();
        console.log(`Current gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
        
        // Try with the exact gas settings that worked in cast
        const tx = await factoryContract.deploy(deploymentBytecode, salt, "omniDRAGON", {
            gasLimit: 3000000, // Lower gas limit to see if that helps
            maxFeePerGas: ethers.utils.parseUnits('100', 'gwei'),
            maxPriorityFeePerGas: ethers.utils.parseUnits('50', 'gwei'),
        });
        
        console.log(`Transaction submitted: ${tx.hash}`);
        console.log('Waiting for confirmation...');
        
        const receipt = await tx.wait();
        console.log(`✅ Deployment successful!`);
        console.log(`Gas used: ${receipt.gasUsed}`);
        console.log(`Effective gas price: ${ethers.utils.formatUnits(receipt.effectiveGasPrice, 'gwei')} gwei`);
        
        // Verify deployment
        const finalCode = await ethers.provider.getCode(computedAddress);
        console.log(`Contract deployed: ${finalCode !== '0x'}`);
        
        if (finalCode !== '0x') {
            // Try to interact with the deployed contract
            const contract = await ethers.getContractAt('omniDRAGON', computedAddress);
            try {
                const name = await contract.name();
                const symbol = await contract.symbol();
                const totalSupply = await contract.totalSupply();
                const owner = await contract.owner();
                
                console.log(`\n📋 Contract Details:`);
                console.log(`Name: ${name}`);
                console.log(`Symbol: ${symbol}`);
                console.log(`Total Supply: ${ethers.utils.formatEther(totalSupply)} DRAGON`);
                console.log(`Owner: ${owner}`);
                console.log(`Address: ${computedAddress}`);
            } catch (error) {
                console.log('Error reading contract state:', error.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Deployment failed:');
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        if (error.reason) {
            console.error('Reason:', error.reason);
        }
        if (error.data) {
            console.error('Data:', error.data);
        }
        
        // If transaction failed, let's try to understand why
        if (error.transactionHash) {
            console.log(`Transaction hash: ${error.transactionHash}`);
        }
    }
}

main().catch(console.error); 