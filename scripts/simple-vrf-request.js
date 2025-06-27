const { ethers } = require("hardhat");

async function main() {
    console.log("🎲 Simple VRF Request Test...\n");

    const SONIC_CONTRACT = '0x5949156D5dD762aB15c1FEd4dE90B8a8CAF60746';
    const ARBITRUM_EID = 30110;
    
    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`📝 Using signer: ${signer.address}`);
    console.log(`💰 Balance: ${ethers.utils.formatEther(await signer.getBalance())} S\n`);

    try {
        const contract = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5", 
            SONIC_CONTRACT, 
            signer
        );

        // Check contract balance
        const contractBalance = await ethers.provider.getBalance(SONIC_CONTRACT);
        console.log(`📊 Contract Balance: ${ethers.utils.formatEther(contractBalance)} S`);

        // Check peer configuration
        const peer = await contract.peers(ARBITRUM_EID);
        console.log(`🔗 Arbitrum Peer: ${peer}`);

        if (peer === "0x0000000000000000000000000000000000000000000000000000000000000000") {
            console.log("❌ Peer not set! Need to configure LayerZero peer first.");
            return;
        }

        console.log("✅ Peer is configured");

        // Try to send VRF request with a reasonable fee (0.01 S)
        console.log("\n🚀 Sending VRF Request...");
        const fee = ethers.utils.parseEther("0.01");
        
        console.log(`   Using fee: ${ethers.utils.formatEther(fee)} S`);
        
        const tx = await contract.requestRandomWordsSimple(ARBITRUM_EID, {
            value: fee,
            gasLimit: 500000 // Set a reasonable gas limit
        });

        console.log(`   Transaction Hash: ${tx.hash}`);
        console.log("   ⏳ Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log(`   ✅ Confirmed in block: ${receipt.blockNumber}`);
        console.log(`   ⛽ Gas Used: ${receipt.gasUsed.toString()}`);

        // Parse events
        console.log("\n📋 Transaction Events:");
        if (receipt.events && receipt.events.length > 0) {
            for (const event of receipt.events) {
                if (event.event) {
                    console.log(`   📡 ${event.event}`);
                    if (event.event === 'RandomWordsRequested') {
                        console.log(`      Request ID: ${event.args.requestId}`);
                        console.log(`      Provider: ${event.args.provider}`);
                        console.log(`      Destination: ${event.args.dstEid}`);
                    }
                }
            }
        } else {
            console.log("   No events found in receipt");
        }

        console.log("\n🎯 VRF Request sent successfully!");
        console.log("   The request will be processed by Arbitrum and randomness will be returned.");

    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.reason) {
            console.error("   Reason:", error.reason);
        }
        if (error.data) {
            console.error("   Data:", error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 