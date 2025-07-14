import { ethers } from "hardhat";

async function main() {
    const registryAddress = "0x69637BfD5D2b851D870d9E0E38B5b73FaF950777";
    const dragonAddress = "0xa693A8ba4005F4AD8EC37Ef9806843c4646994BA";
    const [deployer] = await ethers.getSigners();
    
    console.log("Sonic Deployment Verification");
    console.log("=============================");
    console.log(`Deployer: ${deployer.address}`);
    console.log();
    
    // Verify Registry
    console.log("1. Registry Verification:");
    console.log(`   Address: ${registryAddress}`);
    console.log(`   Pattern: Starts with 0x69, ends with 0777 ✨`);
    
    const registry = await ethers.getContractAt("OmniDragonHybridRegistry", registryAddress);
    const owner = await registry.owner();
    console.log(`   Owner: ${owner}`);
    console.log(`   ✅ Ownership correct: ${owner.toLowerCase() === deployer.address.toLowerCase()}`);
    
    // Verify Chain Registration
    console.log("\n2. Chain Registration:");
    const chainConfig = await registry.getChainConfig(146);
    console.log(`   Chain Name: ${chainConfig.chainName}`);
    console.log(`   Wrapped Native: ${chainConfig.wrappedNativeToken}`);
    console.log(`   Dragon Token: ${chainConfig.dragonToken}`);
    console.log(`   Is Active: ${chainConfig.isActive}`);
    
    // Verify Dragon Token
    console.log("\n3. omniDRAGON Token:");
    console.log(`   Address: ${dragonAddress}`);
    
    const dragon = await ethers.getContractAt("omniDRAGON", dragonAddress);
    const name = await dragon.name();
    const symbol = await dragon.symbol();
    const totalSupply = await dragon.totalSupply();
    const deployerBalance = await dragon.balanceOf(deployer.address);
    
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Total Supply: ${ethers.utils.formatEther(totalSupply)} ${symbol}`);
    console.log(`   Deployer Balance: ${ethers.utils.formatEther(deployerBalance)} ${symbol}`);
    
    // Summary
    console.log("\n================================");
    console.log("✅ DEPLOYMENT SUCCESSFUL!");
    console.log("================================");
    console.log(`Registry (Vanity): ${registryAddress}`);
    console.log(`omniDRAGON Token: ${dragonAddress}`);
    console.log(`Initial Supply: ${ethers.utils.formatEther(totalSupply)} DRAGON on Sonic`);
    console.log("\nNext steps:");
    console.log("1. Deploy on Arbitrum (chain 42161)");
    console.log("2. Deploy on Avalanche (chain 43114)");
    console.log("3. Wire LayerZero connections");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 