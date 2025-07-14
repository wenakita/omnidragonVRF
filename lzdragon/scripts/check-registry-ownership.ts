import { ethers } from "hardhat";

async function main() {
    const registryAddress = "0x69637BfD5D2b851D870d9E0E38B5b73FaF950777";
    const [deployer] = await ethers.getSigners();
    
    console.log("Checking Registry Ownership");
    console.log("==========================");
    console.log(`Registry Address: ${registryAddress}`);
    console.log(`Current Signer: ${deployer.address}`);
    
    // Get the registry contract
    const registry = await ethers.getContractAt("OmniDragonHybridRegistry", registryAddress);
    
    try {
        const owner = await registry.owner();
        console.log(`Current Owner: ${owner}`);
        
        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
            console.log("✅ Registry is owned by the deployer!");
        } else {
            console.log("⚠️  Registry is owned by a different address");
            console.log("   Expected:", deployer.address);
            console.log("   Actual:", owner);
        }
        
        // Check if current chain ID is set
        const currentChainId = await registry.getCurrentChainId();
        console.log(`\nCurrent Chain ID: ${currentChainId}`);
        
    } catch (error) {
        console.error("Error checking ownership:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 