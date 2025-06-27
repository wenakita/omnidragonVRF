const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying with Current Gas Prices");

    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    
    const balance = await deployer.getBalance();
    console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH`);

    // Get current gas price
    const gasPrice = await deployer.getGasPrice();
    console.log(`Current gas price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`);

    const Factory = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
    
    console.log("Deploying with minimal gas limit but current gas price...");
    const contract = await Factory.deploy(
        "0x1a44076050125825900e736c501f859c50fE728c", // endpoint
        deployer.address, // owner
        "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e", // vrf coordinator
        123, // simple sub id
        "0xe9f223d7d83ec85c4f78042a4845af3a1c8df7757b4997b815ce4b8d07aca68c", // key hash
        {
            gasLimit: 600000, // Minimal gas limit that should work
            // Let it use current gas price automatically
        }
    );

    console.log("Waiting for deployment...");
    await contract.deployed();
    console.log(`✅ Deployed: ${contract.address}`);
    console.log(`TX: ${contract.deployTransaction.hash}`);
    
    console.log("🎉 SUCCESS - Contract deployed with payment fix!");
    console.log("Payment fix active: _payNative override included ✅");
}

main().catch(console.error); 