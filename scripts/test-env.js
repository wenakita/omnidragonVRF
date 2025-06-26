const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("🧪 Testing environment...");
    console.log("Private key loaded:", !!process.env.PRIVATE_KEY);
    console.log("Ethers version:", ethers.version);
    
    try {
        const sonicProvider = new ethers.providers.JsonRpcProvider("https://rpc.soniclabs.com");
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, sonicProvider);
        console.log("Wallet address:", wallet.address);
        
        const balance = await wallet.getBalance();
        console.log("Sonic balance:", ethers.utils.formatEther(balance), "ETH");
        
        console.log("✅ Environment test successful!");
    } catch (error) {
        console.error("❌ Environment test failed:", error.message);
    }
}

main().catch(console.error); 