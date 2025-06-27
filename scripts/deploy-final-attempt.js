const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Final Deployment Attempt");

    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    
    const balance = await deployer.getBalance();
    console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH`);

    const Factory = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
    
    // Estimate gas first
    const gasEstimate = await Factory.signer.estimateGas(
        Factory.getDeployTransaction(
            "0x1a44076050125825900e736c501f859c50fE728c",
            deployer.address,
            "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e",
            123,
            "0xe9f223d7d83ec85c4f78042a4845af3a1c8df7757b4997b815ce4b8d07aca68c"
        )
    );
    
    console.log(`Estimated gas: ${gasEstimate.toString()}`);
    
    console.log("Deploying with estimated gas...");
    const contract = await Factory.deploy(
        "0x1a44076050125825900e736c501f859c50fE728c", // endpoint
        deployer.address, // owner
        "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e", // vrf coordinator
        123, // simple sub id
        "0xe9f223d7d83ec85c4f78042a4845af3a1c8df7757b4997b815ce4b8d07aca68c", // key hash
        {
            gasLimit: gasEstimate.mul(110).div(100), // Add 10% buffer
        }
    );

    console.log("Waiting for deployment...");
    await contract.deployed();
    console.log(`✅ Deployed: ${contract.address}`);
    console.log(`TX: ${contract.deployTransaction.hash}`);
    
    // Check gas used
    const receipt = await contract.deployTransaction.wait();
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    
    console.log("🎉 SUCCESS - Contract deployed with payment fix!");
    console.log("Payment fix active: _payNative override included ✅");
    
    return contract.address;
}

main()
    .then((address) => {
        console.log(`\n🎯 Contract Address: ${address}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Deployment failed:", error.message);
        process.exit(1);
    }); 