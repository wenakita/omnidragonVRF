const { ethers } = require('hardhat');
const fs = require('fs');

async function main() {
    console.log('Saving init code for omniDRAGON...');
    
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
    
    // Save to file
    fs.writeFileSync('init-code.txt', deploymentBytecode);
    
    console.log(`Init code saved to init-code.txt`);
    console.log(`Init code length: ${deploymentBytecode.length}`);
    
    // Factory address
    const factoryAddress = "0xAA28020DDA6b954D16208eccF873D79AC6533833";
    
    console.log(`\nNow run:`);
    console.log(`cast create2 --starts-with 69 --deployer ${factoryAddress} --init-code-file init-code.txt`);
    console.log(`\nOr for the full vanity pattern:`);
    console.log(`cast create2 --starts-with 69 --ends-with 0777 --deployer ${factoryAddress} --init-code-file init-code.txt`);
}

main().catch(console.error); 