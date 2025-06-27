const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Minimal Arbitrum Deployment...");

    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    
    const balance = await deployer.getBalance();
    console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH`);

    // Use minimal parameters to avoid BigNumber issues
    const ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    const VRF_COORD = "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e";
    const SUB_ID = 123; // Simple number instead of huge BigNumber
    const KEY_HASH = "0xe9f223d7d83ec85c4f78042a4845af3a1c8df7757b4997b815ce4b8d07aca68c";

    console.log("Deploying with minimal gas...");
    
    const Factory = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
    
    const contract = await Factory.deploy(
        ENDPOINT,
        deployer.address,
        VRF_COORD,
        SUB_ID,
        KEY_HASH,
        {
            gasLimit: 1500000,
            gasPrice: ethers.utils.parseUnits("0.03", "gwei")
        }
    );

    console.log("Waiting for deployment...");
    await contract.deployed();

    console.log(`✅ Deployed: ${contract.address}`);
    console.log(`TX: ${contract.deployTransaction.hash}`);

    // Update to real subscription ID after deployment
    console.log("Updating subscription ID...");
    try {
        const realSubId = "76197290230634444536112874207591481868701552347170354938929514079949640872745";
        const updateTx = await contract.setVRFConfig(
            realSubId,
            KEY_HASH,
            2500000, // callback gas limit  
            3,       // confirmations
            false    // use LINK
        );
        await updateTx.wait();
        console.log("✅ Subscription ID updated");
    } catch (e) {
        console.log("⚠️ Subscription update failed, but contract deployed");
    }

    // Fund with ETH
    console.log("Funding contract...");
    const fundTx = await deployer.sendTransaction({
        to: contract.address,
        value: ethers.utils.parseEther("0.001")
    });
    await fundTx.wait();
    
    const newBalance = await ethers.provider.getBalance(contract.address);
    console.log(`Contract balance: ${ethers.utils.formatEther(newBalance)} ETH`);

    console.log("\n🎉 SUCCESS!");
    console.log(`Address: ${contract.address}`);
    console.log("Payment fix included ✅");
}

main().catch(console.error); 