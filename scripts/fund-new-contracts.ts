import hre from "hardhat";
const { ethers } = hre;

async function main() {
    console.log("💰 Funding new contracts with LayerZero fees...");
    console.log("===============================================");
    
    const [signer] = await ethers.getSigners();
    console.log("Signer address:", signer.address);
    
    // New contract addresses
    const NEW_ARBITRUM_CONTRACT = process.env.ARBITRUM_VRF_CONTRACT || "0xd703FFB355fcE93AFD73387A2BE11d8819CAF791";
const NEW_SONIC_CONTRACT = process.env.SONIC_VRF_CONTRACT || "0xe0dFebC010E0680b9B824A51227B2e7cb8C0F747";
    
    // Check current network
    const network = hre.network.name;
    console.log("Current network:", network);
    
    if (network === "arbitrum") {
        console.log("\n🔍 Funding Arbitrum contract...");
        console.log("Contract address:", NEW_ARBITRUM_CONTRACT);
        
        // Check current balance
        const currentBalance = await ethers.provider.getBalance(NEW_ARBITRUM_CONTRACT);
        console.log("Current balance:", ethers.utils.formatEther(currentBalance), "ETH");
        
        // Check signer balance
        const signerBalance = await signer.getBalance();
        console.log("Signer balance:", ethers.utils.formatEther(signerBalance), "ETH");
        
        // Fund with 0.01 ETH for LayerZero fees
        const fundAmount = ethers.utils.parseEther("0.01");
        
        if (signerBalance.gt(fundAmount.add(ethers.utils.parseEther("0.001")))) { // Leave some for gas
            console.log(`💸 Sending ${ethers.utils.formatEther(fundAmount)} ETH to contract...`);
            
            const fundTx = await signer.sendTransaction({
                to: NEW_ARBITRUM_CONTRACT,
                value: fundAmount,
                gasLimit: 50000 // Increased gas limit
            });
            
            console.log("Transaction sent:", fundTx.hash);
            await fundTx.wait();
            
            const newBalance = await ethers.provider.getBalance(NEW_ARBITRUM_CONTRACT);
            console.log("✅ Contract funded!");
            console.log("New balance:", ethers.utils.formatEther(newBalance), "ETH");
        } else {
            console.log("❌ Insufficient signer balance to fund contract");
        }
        
    } else if (network === "sonic") {
        console.log("\n🔍 Funding Sonic contract...");
        console.log("Contract address:", NEW_SONIC_CONTRACT);
        
        // Check current balance
        const currentBalance = await ethers.provider.getBalance(NEW_SONIC_CONTRACT);
        console.log("Current balance:", ethers.utils.formatEther(currentBalance), "S");
        
        // Check signer balance
        const signerBalance = await signer.getBalance();
        console.log("Signer balance:", ethers.utils.formatEther(signerBalance), "S");
        
        // Fund with 0.5 S for LayerZero fees (Sonic fees are typically lower)
        const fundAmount = ethers.utils.parseEther("0.5");
        
        if (signerBalance.gt(fundAmount.add(ethers.utils.parseEther("0.01")))) { // Leave some for gas
            console.log(`💸 Sending ${ethers.utils.formatEther(fundAmount)} S to contract...`);
            
            const fundTx = await signer.sendTransaction({
                to: NEW_SONIC_CONTRACT,
                value: fundAmount,
                gasLimit: 50000 // Increased gas limit
            });
            
            console.log("Transaction sent:", fundTx.hash);
            await fundTx.wait();
            
            const newBalance = await ethers.provider.getBalance(NEW_SONIC_CONTRACT);
            console.log("✅ Contract funded!");
            console.log("New balance:", ethers.utils.formatEther(newBalance), "S");
        } else {
            console.log("❌ Insufficient signer balance to fund contract");
        }
    } else {
        console.log("❌ Unknown network. Please run on 'arbitrum' or 'sonic' network");
    }
    
    console.log("\n📝 Next Steps:");
    console.log("1. Run this script on both networks:");
    console.log("   npx hardhat run scripts/fund-new-contracts.ts --network arbitrum");
    console.log("   npx hardhat run scripts/fund-new-contracts.ts --network sonic");
    console.log("2. Test the VRF system:");
    console.log("   npx hardhat run scripts/test-vrf-system.ts --network sonic");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 