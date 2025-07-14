const { ethers } = require('hardhat');

async function main() {
    console.log('Testing direct omniDRAGON deployment via factory...');
    
    // CREATE2 Factory address
    const CREATE2_FACTORY_ADDRESS = "0xAA28020DDA6b954D16208eccF873D79AC6533833";
    const salt = "0x2f0ba868fd4e8f5eeaff014a55bffb5b4d75973058a490628cd46096debf5d28";
    
    // Get accounts
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    
    // Check balance
    const balance = await deployer.getBalance();
    console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH`);
    
    // Get factory contract
    const factoryContract = await ethers.getContractAt("CREATE2FactoryWithOwnership", CREATE2_FACTORY_ADDRESS);
    console.log(`Factory: ${CREATE2_FACTORY_ADDRESS}`);
    
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
    
    // Check current gas price
    const gasPrice = await ethers.provider.getGasPrice();
    console.log(`Current gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
    
    try {
        console.log('\n--- Attempting deployment with high gas fees ---');
        const tx = await factoryContract.deploy(deploymentBytecode, salt, "omniDRAGON", {
            gasLimit: 5000000,
            maxFeePerGas: ethers.utils.parseUnits('200', 'gwei'),
            maxPriorityFeePerGas: ethers.utils.parseUnits('100', 'gwei'),
        });
        
        console.log(`Transaction hash: ${tx.hash}`);
        console.log('Waiting for confirmation...');
        
        const receipt = await tx.wait();
        console.log(`✅ Deployment successful! Gas used: ${receipt.gasUsed}`);
        
        // Verify deployment
        const code = await ethers.provider.getCode(computedAddress);
        console.log(`Contract deployed: ${code !== '0x'}`);
        
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
    }
}

main().catch(console.error); 