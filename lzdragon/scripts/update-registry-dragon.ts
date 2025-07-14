import { ethers } from "hardhat";

async function main() {
    const registryAddress = "0x69637BfD5D2b851D870d9E0E38B5b73FaF950777";
    const dragonAddress = "0xa693A8ba4005F4AD8EC37Ef9806843c4646994BA";
    const [deployer] = await ethers.getSigners();
    
    console.log("Updating Registry with Dragon Token");
    console.log("===================================");
    console.log(`Registry: ${registryAddress}`);
    console.log(`Dragon Token: ${dragonAddress}`);
    console.log(`Signer: ${deployer.address}`);
    
    // Get the registry contract
    const registry = await ethers.getContractAt("OmniDragonHybridRegistry", registryAddress);
    
    // Get current chain config
    const chainId = 146; // Sonic
    const chainConfig = await registry.getChainConfig(chainId);
    
    console.log("\nCurrent chain config:");
    console.log(`- Wrapped Native: ${chainConfig.wrappedNativeToken}`);
    console.log(`- Dragon Token: ${chainConfig.dragonToken}`);
    
    if (chainConfig.dragonToken === ethers.constants.AddressZero) {
        console.log("\nUpdating dragon token address...");
        
        // Update with existing values except for dragon token
        const tx = await registry.updateChain(
            chainId,
            chainConfig.wrappedNativeToken,
            chainConfig.lotteryManager,
            chainConfig.randomnessProvider,
            chainConfig.priceOracle,
            chainConfig.vrfConsumer,
            dragonAddress, // Update dragon token
            chainConfig.jackpotVault
        );
        
        console.log(`Transaction: ${tx.hash}`);
        await tx.wait();
        console.log("✅ Registry updated successfully!");
        
        // Verify update
        const updatedConfig = await registry.getChainConfig(chainId);
        console.log(`\nVerified dragon token: ${updatedConfig.dragonToken}`);
    } else {
        console.log("\n✅ Dragon token already set in registry!");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 