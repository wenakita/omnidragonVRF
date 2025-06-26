import { ethers } from "hardhat";

async function main() {
    const [signer] = await ethers.getSigners();
    const balance = await signer.provider!.getBalance(signer.address);
    
    console.log("📍 Arbitrum Account Status:");
    console.log("Address:", signer.address);
    console.log("Balance:", ethers.utils.formatEther(balance), "ETH");
    
    // Check if we have enough for deployment (estimate ~0.01 ETH)
    const minRequired = ethers.utils.parseEther("0.01");
    const hasEnough = balance.gte(minRequired);
    
    console.log("Minimum required:", ethers.utils.formatEther(minRequired), "ETH");
    console.log("Has enough funds:", hasEnough ? "✅ YES" : "❌ NO");
    
    if (!hasEnough) {
        const needed = minRequired.sub(balance);
        console.log("Need to add:", ethers.utils.formatEther(needed), "ETH");
    }
}

main().catch(console.error); 