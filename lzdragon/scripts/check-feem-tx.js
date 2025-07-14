const { ethers } = require("hardhat");

async function main() {
    const txHash = "0x717002db1ad6dae7b8df2322dfda53604a62660ceca97afaa8c47773fd918f37";
    
    try {
        const tx = await ethers.provider.getTransaction(txHash);
        const receipt = await ethers.provider.getTransactionReceipt(txHash);
        
        console.log("✅ Successful FeeM Registration:");
        console.log(`Gas Limit: ${tx.gasLimit.toString()}`);
        console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
        console.log(`Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
        console.log(`Logs: ${receipt.logs.length} events`);
        
        // Check if any events were emitted
        if (receipt.logs.length > 0) {
            console.log("Events emitted:");
            receipt.logs.forEach((log, i) => {
                console.log(`  ${i}: ${log.address} - ${log.topics[0]}`);
            });
        }
        
    } catch (error) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error); 