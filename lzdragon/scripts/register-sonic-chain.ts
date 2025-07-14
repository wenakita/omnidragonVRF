import { ethers } from "hardhat";

async function main() {
    const registryAddress = "0x69637BfD5D2b851D870d9E0E38B5b73FaF950777";
    const dragonAddress = "0xa693A8ba4005F4AD8EC37Ef9806843c4646994BA";
    const [deployer] = await ethers.getSigners();
    
    console.log("Registering Sonic Chain in Registry");
    console.log("===================================");
    console.log(`Registry: ${registryAddress}`);
    console.log(`Signer: ${deployer.address}`);
    
    // Get the registry contract
    const registry = await ethers.getContractAt("OmniDragonHybridRegistry", registryAddress);
    
    // Check if chain is already registered
    const chainId = 146; // Sonic
    const isRegistered = await registry.isChainSupported(chainId);
    
    if (!isRegistered) {
        console.log("\nRegistering Sonic chain...");
        
        const tx = await registry.registerChain(
            chainId,
            "Sonic",
            "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38", // Wrapped S
            ethers.constants.AddressZero, // lotteryManager (will be set later)
            ethers.constants.AddressZero, // randomnessProvider
            ethers.constants.AddressZero, // priceOracle
            ethers.constants.AddressZero, // vrfConsumer
            dragonAddress, // dragon token
            ethers.constants.AddressZero  // jackpotVault
        );
        
        console.log(`Transaction: ${tx.hash}`);
        await tx.wait();
        console.log("✅ Sonic chain registered successfully!");
        
        // Verify registration
        const chainConfig = await registry.getChainConfig(chainId);
        console.log("\nRegistered chain config:");
        console.log(`- Chain Name: ${chainConfig.chainName}`);
        console.log(`- Wrapped Native: ${chainConfig.wrappedNativeToken}`);
        console.log(`- Dragon Token: ${chainConfig.dragonToken}`);
        console.log(`- Is Active: ${chainConfig.isActive}`);
    } else {
        console.log("\n✅ Sonic chain already registered!");
        
        // Show current config
        const chainConfig = await registry.getChainConfig(chainId);
        console.log("\nCurrent chain config:");
        console.log(`- Chain Name: ${chainConfig.chainName}`);
        console.log(`- Wrapped Native: ${chainConfig.wrappedNativeToken}`);
        console.log(`- Dragon Token: ${chainConfig.dragonToken}`);
        console.log(`- Is Active: ${chainConfig.isActive}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 