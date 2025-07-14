const { ethers } = require('hardhat');

async function main() {
    console.log('Checking if salt is already used in factory...');
    
    // CREATE2 Factory address
    const CREATE2_FACTORY_ADDRESS = "0xAA28020DDA6b954D16208eccF873D79AC6533833";
    const salt = "0x2f0ba868fd4e8f5eeaff014a55bffb5b4d75973058a490628cd46096debf5d28";
    
    // Get accounts
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    
    // Get factory contract
    const factoryContract = await ethers.getContractAt("CREATE2FactoryWithOwnership", CREATE2_FACTORY_ADDRESS);
    console.log(`Factory: ${CREATE2_FACTORY_ADDRESS}`);
    
    // Get the contract factory
    const DragonFactory = await ethers.getContractFactory("omniDRAGON");
    const bytecode = DragonFactory.bytecode;
    
    // Constructor arguments
    const registryAddress = "0x69B029B7EF2468c2B546556022be2DD66cd20777";
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
    
    // Check if address already has code
    const code = await ethers.provider.getCode(computedAddress);
    console.log(`Code at address: ${code}`);
    console.log(`Already deployed: ${code !== '0x'}`);
    
    // Try to check if salt has been used by calling the factory
    try {
        // This might revert if salt is already used
        const canDeploy = await factoryContract.callStatic.deploy(deploymentBytecode, salt, "omniDRAGON");
        console.log(`Can deploy: ${canDeploy}`);
    } catch (error) {
        console.error('Cannot deploy - likely salt already used:');
        console.error('Error:', error.message);
        
        // Let's try to generate a new salt
        console.log('\n--- Generating new salt ---');
        const newSalt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`omniDRAGON-${Date.now()}`));
        console.log(`New salt: ${newSalt}`);
        
        const newAddress = ethers.utils.getCreate2Address(
            CREATE2_FACTORY_ADDRESS,
            newSalt,
            ethers.utils.keccak256(deploymentBytecode)
        );
        console.log(`New computed address: ${newAddress}`);
        
        // Check if new address has nice vanity (starts with 69)
        if (newAddress.toLowerCase().startsWith('0x69')) {
            console.log('✅ New address has vanity prefix!');
        } else {
            console.log('❌ New address does not have vanity prefix');
        }
    }
}

main().catch(console.error); 