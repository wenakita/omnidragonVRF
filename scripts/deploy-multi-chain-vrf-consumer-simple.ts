import { ethers } from "hardhat";

async function deploySimpleVRFConsumer() {
    console.log("🚀 Deploying Multi-Chain VRF Consumer (Simple)");
    console.log("=" .repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    // Configuration
    const config = {
        endpoint: "0x1a44076050125825900e736c501f859c50fE728c",
        coordinator: "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e", 
        subscriptionId: ethers.BigNumber.from("49130512167777098004519592693541429977179420141459329604059253338290818062746"),
        keyHash: "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409"
    };

    console.log("🏗️ Deploying contract...");
    
    const factory = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
    
    const contract = await factory.deploy(
        config.endpoint,
        deployer.address,
        config.coordinator,
        config.subscriptionId,
        config.keyHash,
        {
            gasLimit: 5000000,
            gasPrice: ethers.utils.parseUnits("0.1", "gwei")
        }
    );

    console.log("⏳ Waiting for deployment...");
    await contract.deployed();
    
    console.log(`✅ Deployed to: ${contract.address}`);
    console.log(`📋 Transaction: ${contract.deployTransaction.hash}`);

    return contract.address;
}

if (require.main === module) {
    deploySimpleVRFConsumer()
        .then((address) => {
            console.log(`\n🎉 Success! Address: ${address}`);
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Error:", error.message);
            process.exit(1);
        });
} 