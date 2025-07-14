import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("Verifying Vanity Address Calculation");
    console.log("====================================");
    
    // Vanity address details from Rust generator
    const vanitySalt = "0x0888aac688ac4325402d896dc7d5b5510eae7276238830f82ce7df49a57cb3d5";
    const expectedAddress = "0x69637bfd5d2b851d870d9e0e38b5b73faf950777";
    const factoryAddress = "0xAA28020DDA6b954D16208eccF873D79AC6533833";
    
    console.log(`Factory Address: ${factoryAddress}`);
    console.log(`Salt: ${vanitySalt}`);
    console.log(`Expected Address: ${expectedAddress}`);
    console.log();
    
    // Get the contract factory
    const RegistryFactory = await ethers.getContractFactory("OmniDragonHybridRegistry");
    const bytecode = RegistryFactory.bytecode;
    
    // Use the same constructor argument as in the vanity generator (factory address as owner)
    const constructorArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [factoryAddress]
    );
    const deploymentBytecode = bytecode + constructorArgs.slice(2);
    
    // Calculate init code hash
    const initCodeHash = ethers.utils.keccak256(deploymentBytecode);
    console.log(`Init Code Hash: ${initCodeHash}`);
    
    // Calculate CREATE2 address
    const computedAddress = ethers.utils.getCreate2Address(
        factoryAddress,
        vanitySalt,
        initCodeHash
    );
    
    console.log(`Computed Address: ${computedAddress}`);
    console.log();
    
    if (computedAddress.toLowerCase() === expectedAddress.toLowerCase()) {
        console.log("✅ SUCCESS: Computed address matches expected vanity address!");
        console.log(`   Registry will be deployed at: ${computedAddress}`);
        console.log(`   Starts with: 0x69`);
        console.log(`   Ends with: 0777`);
    } else {
        console.log("❌ ERROR: Computed address does not match expected address!");
        console.log(`   Expected: ${expectedAddress}`);
        console.log(`   Got: ${computedAddress}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 