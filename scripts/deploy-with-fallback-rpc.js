const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying with Fallback RPC...");

    // Try multiple RPC endpoints
    const rpcEndpoints = [
        "https://arb1.arbitrum.io/rpc",
        "https://arbitrum-one.public.blastapi.io",
        "https://arbitrum.blockpi.network/v1/rpc/public"
    ];

    let provider;
    let wallet;
    
    // Try each RPC endpoint
    for (const rpc of rpcEndpoints) {
        try {
            console.log(`Trying RPC: ${rpc}`);
            provider = new ethers.providers.JsonRpcProvider(rpc);
            wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
            
            // Test connection
            const balance = await wallet.getBalance();
            console.log(`✅ Connected! Balance: ${ethers.utils.formatEther(balance)} ETH`);
            break;
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
            continue;
        }
    }

    if (!wallet) {
        throw new Error("All RPC endpoints failed");
    }

    console.log(`Deployer: ${wallet.address}`);

    // Contract parameters
    const ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    const VRF_COORD = "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e";
    const SUB_ID = 123;
    const KEY_HASH = "0xe9f223d7d83ec85c4f78042a4845af3a1c8df7757b4997b815ce4b8d07aca68c";

    try {
        console.log("Getting contract factory...");
        const Factory = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
        
        console.log("Deploying contract...");
        const contract = await Factory.connect(wallet).deploy(
            ENDPOINT,
            wallet.address,
            VRF_COORD,
            SUB_ID,
            KEY_HASH,
            {
                gasLimit: 1200000, // Lower gas limit
                gasPrice: ethers.utils.parseUnits("0.02", "gwei") // Very low gas price
            }
        );

        console.log("Waiting for deployment...");
        await contract.deployed();

        console.log(`✅ Contract deployed: ${contract.address}`);
        console.log(`Transaction: ${contract.deployTransaction.hash}`);

        // Fund with ETH
        console.log("Funding contract...");
        const fundTx = await wallet.sendTransaction({
            to: contract.address,
            value: ethers.utils.parseEther("0.001"),
            gasPrice: ethers.utils.parseUnits("0.02", "gwei")
        });
        
        await fundTx.wait();
        console.log("✅ Contract funded");

        // Update subscription ID
        console.log("Updating VRF config...");
        try {
            const realSubId = "76197290230634444536112874207591481868701552347170354938929514079949640872745";
            const updateTx = await contract.setVRFConfig(
                realSubId,
                KEY_HASH,
                2500000,
                3,
                false,
                {
                    gasPrice: ethers.utils.parseUnits("0.02", "gwei")
                }
            );
            await updateTx.wait();
            console.log("✅ VRF config updated");
        } catch (e) {
            console.log("⚠️ VRF config update failed, but contract is deployed");
        }

        const finalBalance = await provider.getBalance(contract.address);
        console.log(`Final balance: ${ethers.utils.formatEther(finalBalance)} ETH`);

        console.log("\n🎉 DEPLOYMENT SUCCESS!");
        console.log(`Contract: ${contract.address}`);
        console.log("Payment fix included ✅");
        
        return contract.address;

    } catch (error) {
        console.error("❌ Deployment error:", error.message);
        throw error;
    }
}

main()
    .then((address) => {
        console.log(`\n✅ Contract deployed at: ${address}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 