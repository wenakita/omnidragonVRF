const { ethers } = require("hardhat");

async function checkTx() {
    console.log("Checking transaction...");
    
    const txHash = "0xe19af114565d3593a7dcda34dc9a1cccaf1cbc652b1d2495c78da506f76d6c5e";
    
    try {
        const receipt = await ethers.provider.getTransactionReceipt(txHash);
        
        if (!receipt) {
            console.log("Transaction not found or not mined yet");
            return;
        }
        
        console.log("Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
        console.log("Block:", receipt.blockNumber);
        console.log("Gas Used:", receipt.gasUsed.toString());
        console.log("Logs count:", receipt.logs.length);
        
        // Simple log analysis
        receipt.logs.forEach((log, i) => {
            console.log(`Log ${i}: ${log.topics[0]}`);
        });
        
    } catch (error) {
        console.log("Error:", error.message);
    }
}

checkTx(); 