import { ethers } from "ethers";
import fs from "fs";
import path from "path";

async function main() {
    // Read the contract artifact
    const artifactPath = path.join(__dirname, "../artifacts/contracts/core/tokens/omniDRAGON.sol/omniDRAGON.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    
    // Get the bytecode
    const bytecode = artifact.bytecode;
    
    // The constructor takes 5 parameters: name, symbol, delegate, registry, owner
    const factoryAddress = "0xAA28020DDA6b954D16208eccF873D79AC6533833";
    const registryAddress = "0x69B029B7EF2468c2B546556022be2DD66cd20777";
    const deployerAddress = "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F";
    
    // Encode constructor arguments matching the deployment script
    const constructorArgs = ethers.utils.defaultAbiCoder.encode(
        ["string", "string", "address", "address", "address"],
        ["Dragon", "DRAGON", registryAddress, registryAddress, deployerAddress]
    );
    
    // Combine bytecode with constructor arguments to get init code
    const initCode = bytecode + constructorArgs.slice(2); // Remove '0x' prefix from args
    
    // Calculate init code hash
    const initCodeHash = ethers.utils.keccak256(initCode);
    
    console.log("omniDRAGON Contract Init Code Details:");
    console.log("=====================================");
    console.log("Factory Address:", factoryAddress);
    console.log("Registry Address:", registryAddress);
    console.log("Deployer Address:", deployerAddress);
    console.log("Constructor Args:", constructorArgs);
    console.log("Init Code Length:", initCode.length);
    console.log("Init Code Hash:", initCodeHash);
    console.log("\nInit Code (first 100 chars):", initCode.substring(0, 100) + "...");
    
    // Save to file for the Rust vanity generator
    const output = {
        factoryAddress,
        registryAddress,
        initCodeHash,
        initCode,
        bytecode,
        constructorArgs
    };
    
    fs.writeFileSync(
        path.join(__dirname, "../../vanity-address-generator/dragon-init-code.json"),
        JSON.stringify(output, null, 2)
    );
    
    console.log("\nSaved init code data to vanity-address-generator/dragon-init-code.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 