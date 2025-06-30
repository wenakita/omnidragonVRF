const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying omniDRAGON with CREATE2...");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");

    // Contract addresses
    const CHAIN_REGISTRY = "0x567eB27f7EA8c69988e30B045987Ad58A597685C";
    const LZ_PROXY = "0x6Fa6abF394d4f827988FBAD17CadFb506b83c3e8";
    const CREATE2_FACTORY = "0xAA28020DDA6b954D16208eccF873D79AC6533833";
    
    // Delegate (user's address)
    const delegate = deployer.address;
    
    console.log("Chain Registry:", CHAIN_REGISTRY);
    console.log("LZ Proxy:", LZ_PROXY);
    console.log("Delegate:", delegate);

    try {
        // Get the contract factory
        const omniDRAGON = await ethers.getContractFactory("omniDRAGON");
        
        // Deploy using CREATE2 factory
        console.log("\n📦 Deploying with CREATE2...");
        
        // Salt for CREATE2 - you can change this to get different addresses
        const salt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("omniDRAGON_v2"));
        
        // Create deployment transaction
        const deployTx = await omniDRAGON.deploy({
            gasLimit: 5000000
        });
        
        await deployTx.deployTransaction.wait();
        
        console.log("✅ omniDRAGON deployed to:", deployTx.address);
        
        // Initialize the contract
        console.log("\n🔧 Initializing contract...");
        
        const initTx = await deployTx.initialize(
            LZ_PROXY,
            delegate,
            ethers.utils.parseEther("6942000") // 6.942M initial supply
        );
        
        await initTx.wait();
        console.log("✅ Contract initialized");
        
        // Set core addresses
        console.log("\n🔗 Setting core addresses...");
        
        const coreAddressesTx = await deployTx.setCoreAddresses(
            "0x0000000000000000000000000000000000000000", // Jackpot vault - set later
            "0x0000000000000000000000000000000000000000", // Revenue distributor - set later
            "0x0000000000000000000000000000000000000000"  // Lottery manager - set later
        );
        
        await coreAddressesTx.wait();
        console.log("✅ Core addresses set (initially to zero)");
        
        console.log("\n🎉 Deployment completed!");
        console.log("Contract Address:", deployTx.address);
        console.log("Transaction Hash:", deployTx.deployTransaction.hash);
        
        // Verify contract info
        console.log("\n📊 Contract Info:");
        console.log("Owner:", await deployTx.owner());
        console.log("Total Supply:", ethers.utils.formatEther(await deployTx.totalSupply()));
        console.log("Initialized:", await deployTx.initialized());
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        console.error("Error details:", error.message);
        
        if (error.reason) {
            console.error("Reason:", error.reason);
        }
        
        if (error.data) {
            console.error("Data:", error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 