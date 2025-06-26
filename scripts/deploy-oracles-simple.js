const { ethers } = require("hardhat");

async function main() {
    console.log("🔮 Deploying Price Oracles System");
    console.log("=================================");

    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying with:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("💰 Balance:", ethers.utils.formatEther(balance), "S");

    if (balance.lt(ethers.utils.parseEther("1.0"))) {
        throw new Error("Insufficient balance for deployment");
    }

    try {
        // Deploy ChainRegistry first
        console.log("\n1️⃣ Deploying ChainRegistry...");
        const ChainRegistry = await ethers.getContractFactory("ChainRegistry");
        const chainRegistry = await ChainRegistry.deploy(
            "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B", // LayerZero endpoint
            "0x8680CEaBcb9b56913c519c069Add6Bc3494B7020", // Sonic FeeM address
            deployer.address, // Initial owner
            { gasLimit: 3000000 }
        );
        await chainRegistry.deployed();
        console.log("✅ ChainRegistry deployed:", chainRegistry.address);

        // Deploy DragonMarketOracle
        console.log("\n2️⃣ Deploying DragonMarketOracle...");
        const DragonMarketOracle = await ethers.getContractFactory("DragonMarketOracle");
        const marketOracle = await DragonMarketOracle.deploy(
            chainRegistry.address,
            { gasLimit: 3000000 }
        );
        await marketOracle.deployed();
        console.log("✅ DragonMarketOracle deployed:", marketOracle.address);

        // Deploy OmniDragonMarketOracle
        console.log("\n3️⃣ Deploying OmniDragonMarketOracle...");
        const OmniDragonMarketOracle = await ethers.getContractFactory("OmniDragonMarketOracle");
        const omniMarketOracle = await OmniDragonMarketOracle.deploy(
            chainRegistry.address,
            marketOracle.address,
            { gasLimit: 3000000 }
        );
        await omniMarketOracle.deployed();
        console.log("✅ OmniDragonMarketOracle deployed:", omniMarketOracle.address);

        console.log("\n🎉 Price Oracles Deployment Complete!");
        console.log("=====================================");
        console.log(`ChainRegistry: ${chainRegistry.address}`);
        console.log(`DragonMarketOracle: ${marketOracle.address}`);
        console.log(`OmniDragonMarketOracle: ${omniMarketOracle.address}`);

        return {
            chainRegistry: chainRegistry.address,
            marketOracle: marketOracle.address,
            omniMarketOracle: omniMarketOracle.address
        };

    } catch (error) {
        console.error("\n❌ Deployment failed:");
        console.error("Error:", error.message);
        if (error.transaction) {
            console.error("TX Hash:", error.transaction.hash);
        }
        throw error;
    }
}

main()
    .then((addresses) => {
        console.log("\n✅ All oracles deployed successfully!");
        console.log("Addresses:", JSON.stringify(addresses, null, 2));
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Fatal error:", error.message);
        process.exit(1);
    }); 