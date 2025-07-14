const { ethers } = require("hardhat");
const fs = require("fs");

// CREATE2 Factory ABI (minimal)
const CREATE2_FACTORY_ABI = [
    "function deploy(uint256 _salt, bytes memory _bytecode) external returns (address)"
];

async function main() {
    // Load vanity addresses
    const vanityAddresses = JSON.parse(fs.readFileSync("vanity_addresses_combined.json", "utf8"));
    
    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()));

    // CREATE2 Factory contract
    const factoryAddress = vanityAddresses.factory;
    const factory = new ethers.Contract(factoryAddress, CREATE2_FACTORY_ABI, deployer);
    
    console.log("\n🚀 Starting CREATE2 deployments with vanity addresses...");
    console.log("Factory address:", factoryAddress);
    
    // Deploy OmniDragonHybridRegistry
    const registryData = vanityAddresses.contracts.OmniDragonHybridRegistry;
    if (registryData) {
        console.log("\n📋 Deploying OmniDragonHybridRegistry...");
        console.log("Expected address:", registryData.address);
        console.log("Salt:", registryData.salt);
        
        // Get contract factory
        const RegistryFactory = await ethers.getContractFactory("OmniDragonHybridRegistry");
        
        // Encode constructor parameters
        const constructorArgs = [deployer.address]; // initialOwner
        const bytecode = RegistryFactory.bytecode + RegistryFactory.interface.encodeDeploy(constructorArgs).slice(2);
        
        // Deploy with CREATE2
        const deployTx = await factory.deploy(registryData.salt, bytecode);
        const receipt = await deployTx.wait();
        
        console.log("✅ Registry deployed at:", receipt.events?.[0]?.address || "Check transaction");
        console.log("Transaction hash:", receipt.transactionHash);
        
        // Verify the address matches
        const deployedAddress = receipt.events?.[0]?.address;
        if (deployedAddress && deployedAddress.toLowerCase() === registryData.address.toLowerCase()) {
            console.log("✅ Address matches vanity address!");
        } else {
            console.log("❌ Address mismatch!");
        }
    }
    
    // Deploy omniDRAGON
    const dragonData = vanityAddresses.contracts.omniDRAGON;
    if (dragonData) {
        console.log("\n🐉 Deploying omniDRAGON...");
        console.log("Expected address:", dragonData.address);
        console.log("Salt:", dragonData.salt);
        
        // Get contract factory
        const DragonFactory = await ethers.getContractFactory("omniDRAGON");
        
        // Constructor parameters for omniDRAGON
        const constructorArgs = [
            "omniDRAGON",           // name
            "omniDRAGON",           // symbol
            registryData.address,   // delegate (registry address)
            registryData.address,   // registry address
            deployer.address        // owner
        ];
        
        const bytecode = DragonFactory.bytecode + DragonFactory.interface.encodeDeploy(constructorArgs).slice(2);
        
        // Deploy with CREATE2
        const deployTx = await factory.deploy(dragonData.salt, bytecode);
        const receipt = await deployTx.wait();
        
        console.log("✅ omniDRAGON deployed at:", receipt.events?.[0]?.address || "Check transaction");
        console.log("Transaction hash:", receipt.transactionHash);
        
        // Verify the address matches
        const deployedAddress = receipt.events?.[0]?.address;
        if (deployedAddress && deployedAddress.toLowerCase() === dragonData.address.toLowerCase()) {
            console.log("✅ Address matches vanity address!");
        } else {
            console.log("❌ Address mismatch!");
        }
    }
    
    console.log("\n🎉 Deployment complete!");
    console.log("Verify the contracts on the block explorer and update your configuration.");
}

// Error handling
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }); 