const { ethers } = require("hardhat");

async function main() {
    try {
        console.log("🔍 Checking Arbitrum balance...");
        
        const [signer] = await ethers.getSigners();
        console.log("Address:", signer.address);
        
        const balance = await signer.provider.getBalance(signer.address);
        const balanceInEth = ethers.utils.formatEther(balance);
        
        console.log("Balance:", balanceInEth, "ETH");
        
        // Check if we have enough for deployment
        const minRequired = ethers.utils.parseEther("0.01");
        const hasEnough = balance.gte(minRequired);
        
        console.log("Has enough for deployment (0.01 ETH):", hasEnough ? "✅ YES" : "❌ NO");
        
        if (!hasEnough) {
            const needed = minRequired.sub(balance);
            console.log("Need to add:", ethers.utils.formatEther(needed), "ETH");
        }
        
        return { address: signer.address, balance: balanceInEth, hasEnough };
    } catch (error) {
        console.error("Error checking balance:", error.message);
    }
}

main()
    .then(result => {
        console.log("Result:", result);
        process.exit(0);
    })
    .catch(error => {
        console.error("Failed:", error);
        process.exit(1);
    }); 