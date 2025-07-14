import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    // Read the contract artifact
    const artifactPath = path.join(__dirname, "../artifacts/contracts/config/OmniDragonHybridRegistry.sol/OmniDragonHybridRegistry.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    
    // Get the bytecode
    const bytecode = artifact.bytecode;
    
    // The constructor takes an address parameter (initial owner)
    // For vanity address generation, we'll use the CREATE2 factory address as the owner
    const factoryAddress = "0xAA28020DDA6b954D16208eccF873D79AC6533833";
    
    // Encode constructor arguments
    const constructorArgs = ethers.utils.defaultAbiCoder.encode(["address"], [factoryAddress]);
    
    // Combine bytecode with constructor arguments to get init code
    const initCode = bytecode + constructorArgs.slice(2); // Remove '0x' prefix from args
    
    // Calculate init code hash
    const initCodeHash = ethers.utils.keccak256(initCode);
    
    console.log("Registry Contract Init Code Details:");
    console.log("====================================");
    console.log("Factory Address:", factoryAddress);
    console.log("Constructor Args:", constructorArgs);
    console.log("Init Code Length:", initCode.length);
    console.log("Init Code Hash:", initCodeHash);
    console.log("\nInit Code (first 100 chars):", initCode.substring(0, 100) + "...");
    
    // Save to file for the Rust vanity generator
    const output = {
        factoryAddress,
        initCodeHash,
        initCode,
        bytecode,
        constructorArgs
    };
    
    fs.writeFileSync(
        path.join(__dirname, "../../vanity-address-generator/registry-init-code.json"),
        JSON.stringify(output, null, 2)
    );
    
    console.log("\nSaved init code data to vanity-address-generator/registry-init-code.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 