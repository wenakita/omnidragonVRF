const { ethers } = require('hardhat');

async function main() {
    console.log('Getting init code for omniDRAGON...');
    
    // Get accounts
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    
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
    
    console.log(`\nBytecode: ${bytecode}`);
    console.log(`\nConstructor args: ${constructorArgs}`);
    console.log(`\nFull init code: ${deploymentBytecode}`);
    console.log(`\nInit code length: ${deploymentBytecode.length}`);
    
    // Also calculate the bytecode hash
    const bytecodeHash = ethers.utils.keccak256(deploymentBytecode);
    console.log(`\nBytecode hash: ${bytecodeHash}`);
    
    // Factory address
    const factoryAddress = "0xAA28020DDA6b954D16208eccF873D79AC6533833";
    console.log(`\nFactory address: ${factoryAddress}`);
    
    console.log(`\nTo use with cast create2:`);
    console.log(`cast create2 --starts-with 69 --deployer ${factoryAddress} --init-code ${deploymentBytecode}`);
    
    // Also provide the command with ends-with for the full vanity pattern
    console.log(`\nFor full vanity pattern (69...0777):`);
    console.log(`cast create2 --starts-with 69 --ends-with 0777 --deployer ${factoryAddress} --init-code ${deploymentBytecode}`);
}

main().catch(console.error); 