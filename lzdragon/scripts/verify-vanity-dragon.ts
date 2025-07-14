import { ethers } from "hardhat";

async function main() {
    console.log("Verifying Vanity Dragon Address Calculation");
    console.log("===========================================");
    
    // Vanity address details from Rust generator
    const vanitySalt = "0x2cba8e159bea4252994ade12157f7e9324a2d6f6878baa8f0031cb0bd44bfefa";
    const expectedAddress = "0x69cb0574d4f7ca6879a72cb50123b391c4e60777";
    const factoryAddress = "0xAA28020DDA6b954D16208eccF873D79AC6533833";
    const registryAddress = "0x69637BfD5D2b851D870d9E0E38B5b73FaF950777";
    
    console.log(`Factory Address: ${factoryAddress}`);
    console.log(`Registry Address: ${registryAddress}`);
    console.log(`Salt: ${vanitySalt}`);
    console.log(`Expected Address: ${expectedAddress}`);
    console.log();
    
    // Get the contract factory
    const DragonFactory = await ethers.getContractFactory("omniDRAGON");
    const bytecode = DragonFactory.bytecode;
    
    // Use the same constructor arguments as in the vanity generator
    const constructorArgs = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "address"],
        [registryAddress, registryAddress, factoryAddress]
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
        console.log(`   omniDRAGON will be deployed at: ${computedAddress}`);
        console.log(`   Starts with: 0x69`);
        console.log(`   Ends with: 0777`);
        console.log("\n🎉 MATCHING VANITY ADDRESSES:");
        console.log(`   Registry: ${registryAddress} (0x69...0777)`);
        console.log(`   Dragon:   ${computedAddress} (0x69...0777)`);
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