import hre from "hardhat";
const { ethers } = hre;

async function main() {
    console.log("Checking VRF Request Status...");
    console.log("==============================");
    
    const contractAddress = process.env.SONIC_VRF_CONTRACT!;
    
    // Get the deployed contract on Sonic
    const sonicContract = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        contractAddress
    );
    
    console.log("Sonic Contract Address:", contractAddress);
    
    // Get the current request counter
    const requestCounter = await sonicContract.requestCounter();
    console.log("Total requests made:", requestCounter.toString());
    
    if (requestCounter.gt(0)) {
        console.log("\n📋 Recent Request Status:");
        console.log("========================");
        
        // Check the last few requests
        const startId = Math.max(1, requestCounter.toNumber() - 4); // Check last 5 requests
        
        for (let i = startId; i <= requestCounter.toNumber(); i++) {
            console.log(`\n🔍 Request ID: ${i}`);
            
            try {
                const status = await sonicContract.checkRequestStatus(i);
                console.log("  Fulfilled:", status.fulfilled);
                console.log("  Exists:", status.exists);
                console.log("  Provider:", status.provider);
                console.log("  Random Word:", status.randomWord.toString());
                console.log("  Timestamp:", new Date(status.timestamp.toNumber() * 1000).toISOString());
                console.log("  Expired:", status.expired);
                
                if (status.fulfilled) {
                    console.log("  ✅ Request completed successfully!");
                } else if (status.expired) {
                    console.log("  ⏰ Request expired");
                } else {
                    console.log("  ⏳ Request pending...");
                }
            } catch (error) {
                console.log("  ❌ Error checking request:", error.message);
            }
        }
    } else {
        console.log("No requests have been made yet.");
    }
    
    // Check contract balances
    console.log("\n💰 Contract Balances:");
    console.log("====================");
    
    const sonicBalance = await ethers.provider.getBalance(contractAddress);
    console.log("Sonic Contract Balance:", ethers.utils.formatEther(sonicBalance), "S");
    
    // Check Arbitrum contract balance (if we can connect)
    const arbitrumContractAddress = process.env.ARBITRUM_VRF_CONTRACT!;
    console.log("Arbitrum Contract Address:", arbitrumContractAddress);
    
    // Check peer connection
    const arbitrumEid = 30110;
    const peer = await sonicContract.peers(arbitrumEid);
    console.log("Arbitrum Peer Set:", peer !== ethers.constants.HashZero);
    
    console.log("\n📝 Next Steps:");
    console.log("==============");
    if (requestCounter.eq(0)) {
        console.log("1. Make a VRF request:");
        console.log("   npx hardhat run scripts/test-vrf-system.ts --network sonic");
    } else {
        console.log("1. Wait for pending requests to complete");
        console.log("2. Make another request if needed:");
        console.log("   npx hardhat run scripts/test-vrf-system.ts --network sonic");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 