import { ethers } from "hardhat";

/**
 * Check recent deployments to find the newly deployed contract
 */

async function checkRecentDeployments() {
    console.log("🔍 Checking Recent Deployments");
    console.log("=" .repeat(40));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);
    console.log("💰 Current Balance:", ethers.utils.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    // Get recent blocks to find deployment transactions
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log("📦 Current Block:", currentBlock);

    // Check last 100 blocks for deployment transactions
    console.log("\n🔍 Searching last 100 blocks for deployments...");
    
    for (let i = 0; i < 100; i++) {
        const blockNumber = currentBlock - i;
        try {
            const block = await ethers.provider.getBlock(blockNumber);
            if (block && block.transactions) {
                for (const txHash of block.transactions) {
                    const tx = await ethers.provider.getTransaction(txHash);
                    if (tx && tx.from.toLowerCase() === deployer.address.toLowerCase() && !tx.to) {
                        // This is a contract deployment transaction
                        const receipt = await ethers.provider.getTransactionReceipt(txHash);
                        if (receipt && receipt.status === 1) {
                            console.log("\n✅ Found Deployment Transaction:");
                            console.log("   - Block:", blockNumber);
                            console.log("   - TX Hash:", txHash);
                            console.log("   - Contract Address:", receipt.contractAddress);
                            console.log("   - Gas Used:", receipt.gasUsed.toString());
                            
                            // Test if it's our ChainlinkVRFIntegratorV2_5
                            try {
                                const contract = await ethers.getContractAt(
                                    "ChainlinkVRFIntegratorV2_5",
                                    receipt.contractAddress!
                                );
                                
                                const endpoint = await contract.endpoint();
                                const owner = await contract.owner();
                                
                                console.log("   - Contract Type: ChainlinkVRFIntegratorV2_5 ✅");
                                console.log("   - Endpoint:", endpoint);
                                console.log("   - Owner:", owner);
                                
                                // Check if this has the correct endpoint
                                if (endpoint.toLowerCase() === "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B".toLowerCase()) {
                                    console.log("   - ✅ CORRECT ENDPOINT - This is our fresh deployment!");
                                    return receipt.contractAddress;
                                }
                                
                            } catch (error) {
                                console.log("   - Contract Type: Unknown or different contract");
                            }
                        }
                    }
                }
            }
        } catch (error) {
            // Skip blocks that can't be fetched
            continue;
        }
    }
    
    console.log("❌ No recent deployments found");
    return null;
}

if (require.main === module) {
    checkRecentDeployments()
        .then((contractAddress) => {
            if (contractAddress) {
                console.log("\n🎉 FRESH DEPLOYMENT FOUND!");
                console.log("📋 New Sonic Integrator:", contractAddress);
                console.log("🔄 Update layerzero-fresh.config.ts with this address");
            } else {
                console.log("\n❌ No fresh deployment found");
            }
        })
        .catch((error) => {
            console.error("❌ Script failed:", error);
            process.exitCode = 1;
        });
} 