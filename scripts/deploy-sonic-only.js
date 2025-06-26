const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("🚀 Deploying Sonic Integrator Only");
    
    try {
        // Setup
        const sonicProvider = new ethers.providers.JsonRpcProvider("https://rpc.soniclabs.com");
        const sonicWallet = new ethers.Wallet(process.env.PRIVATE_KEY, sonicProvider);
        
        console.log(`Deploying from: ${sonicWallet.address}`);
        
        // Check balance
        const balance = await sonicWallet.getBalance();
        console.log(`Sonic balance: ${ethers.utils.formatEther(balance)} ETH`);
        
        if (balance.lt(ethers.utils.parseEther("0.01"))) {
            throw new Error("Insufficient balance for deployment");
        }
        
        // Deploy Sonic Integrator
        console.log("\n📡 Deploying ChainlinkVRFIntegratorV2_5 on Sonic...");
        const SONIC_ENDPOINT = "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B";
        
        const IntegratorFactory = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
        console.log("Factory created, deploying...");
        
        const integrator = await IntegratorFactory.connect(sonicWallet).deploy(
            SONIC_ENDPOINT,
            sonicWallet.address,
            {
                gasLimit: 3000000,
                gasPrice: ethers.utils.parseUnits("100", "gwei")
            }
        );
        
        console.log("Deployment transaction sent, waiting for confirmation...");
        await integrator.deployed();
        
        console.log(`✅ Sonic Integrator deployed: ${integrator.address}`);
        console.log(`Transaction hash: ${integrator.deployTransaction.hash}`);
        
        // Test basic functionality
        console.log("\n🧪 Testing basic functions...");
        const owner = await integrator.owner();
        console.log(`Owner: ${owner}`);
        
        console.log("🎉 Sonic deployment successful!");
        
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        if (error.transaction) {
            console.error("Transaction hash:", error.transaction.hash);
        }
    }
}

main().catch(console.error); 