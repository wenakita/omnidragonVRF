const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging LayerZero Payment Issue...\n");

    const ARBITRUM_CONTRACT = "0x77913403bC1841F87d884101b25B6230CB4fbe28";
    const SONIC_EID = 30272; // Sonic's LayerZero endpoint ID
    
    try {
        // Get contract instance
        const VRFConsumer = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
        const vrfContract = VRFConsumer.attach(ARBITRUM_CONTRACT);

        console.log("📊 Contract Status:");
        console.log(`   Address: ${ARBITRUM_CONTRACT}`);
        
        // Check contract balance
        const contractBalance = await ethers.provider.getBalance(ARBITRUM_CONTRACT);
        console.log(`   ETH Balance: ${ethers.utils.formatEther(contractBalance)} ETH`);

        // Check if peer is set
        try {
            const peer = await vrfContract.peers(SONIC_EID);
            console.log(`   Sonic Peer: ${peer}`);
            console.log(`   Peer Set: ${peer !== "0x0000000000000000000000000000000000000000000000000000000000000000"}`);
        } catch (error) {
            console.log(`   ❌ Error checking peer: ${error.message}`);
        }

        // Check LayerZero endpoint
        const endpoint = await vrfContract.endpoint();
        console.log(`   LayerZero Endpoint: ${endpoint}`);

        // Try to quote the fee for sending a response
        console.log("\n💰 LayerZero Fee Analysis:");
        
        try {
            // Simulate a quote for sending random words back
            const mockMessage = ethers.utils.defaultAbiCoder.encode(
                ["uint256", "uint256[]"],
                [12345, [123456789, 987654321]] // Mock request ID and random words
            );

            // Quote the fee
            const quote = await vrfContract.quote(SONIC_EID, mockMessage, false);
            console.log(`   Native Fee: ${ethers.utils.formatEther(quote.nativeFee)} ETH`);
            console.log(`   LZ Token Fee: ${quote.lzTokenFee.toString()}`);
            
            // Check if contract has enough balance for the fee
            const hasEnoughBalance = contractBalance.gte(quote.nativeFee);
            console.log(`   Has Enough Balance: ${hasEnoughBalance}`);
            
            if (!hasEnoughBalance) {
                const deficit = quote.nativeFee.sub(contractBalance);
                console.log(`   ❌ Deficit: ${ethers.utils.formatEther(deficit)} ETH`);
            }

        } catch (error) {
            console.log(`   ❌ Error quoting fee: ${error.message}`);
        }

        // Check network gas price
        console.log("\n⛽ Network Status:");
        const gasPrice = await ethers.provider.getGasPrice();
        console.log(`   Current Gas Price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`);

        // Get latest block
        const block = await ethers.provider.getBlock("latest");
        console.log(`   Latest Block: ${block.number}`);
        console.log(`   Block Gas Limit: ${block.gasLimit.toString()}`);

        console.log("\n🔍 Analysis:");
        console.log("   The issue might be:");
        console.log("   1. Gas price spike during callback execution");
        console.log("   2. LayerZero fee calculation changed");
        console.log("   3. Contract balance insufficient at callback time");
        console.log("   4. msg.value mismatch in _payNative function");

        console.log("\n💡 Potential Solutions:");
        console.log("   1. Increase contract ETH balance");
        console.log("   2. Implement dynamic fee handling");
        console.log("   3. Add fallback payment mechanism");

    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.reason) {
            console.error("   Reason:", error.reason);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 