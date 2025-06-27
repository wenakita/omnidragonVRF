const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Ultra Minimal Deployment");

    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);

    const Factory = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
    
    console.log("Deploying...");
    const contract = await Factory.deploy(
        "0x1a44076050125825900e736c501f859c50fE728c", // endpoint
        deployer.address, // owner
        "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e", // vrf coordinator
        123, // simple sub id
        "0xe9f223d7d83ec85c4f78042a4845af3a1c8df7757b4997b815ce4b8d07aca68c" // key hash
    );

    await contract.deployed();
    console.log(`✅ Deployed: ${contract.address}`);
    
    // Fund it
    await deployer.sendTransaction({
        to: contract.address,
        value: ethers.utils.parseEther("0.001")
    });
    
    console.log("✅ Funded with 0.001 ETH");
    console.log(`🎉 SUCCESS: ${contract.address}`);
}

main().catch(console.error); 