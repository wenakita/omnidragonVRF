import { ethers } from "hardhat";

async function main() {
    console.log("🎲 Requesting Random Words via Cross-Chain VRF");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    // Use the correct deployed addresses
    const sonicIntegratorAddress = "0x3aB9Bf4C30F5995Ac27f09c487a32e97c87899E4";
    const arbitrumConsumerAddress = "0xD192343D5E351C983F6613e6d7c5c33f62C0eea4";

    try {
        // Connect to Sonic VRF Integrator
        const integrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            sonicIntegratorAddress
        );

        console.log("✅ Connected to Sonic VRF Integrator");

        // Step 1: Get quote for the cross-chain message
        console.log("\n🔍 Getting quote for cross-chain VRF request...");
        
        // LayerZero message parameters
        const arbitrumEid = 30110; // Arbitrum EID
        const numWords = 1;
        const extraArgs = "0x"; // No extra args needed
        
        try {
            const quote = await integrator.quote(arbitrumEid, numWords, false, extraArgs);
            console.log("💰 Quote for VRF request:", ethers.utils.formatEther(quote), "ETH");

            // Step 2: Request random words
            console.log("\n🎯 Requesting random words...");
            
            const tx = await integrator.requestRandomWords(
                arbitrumEid,
                numWords,
                extraArgs,
                { value: quote }
            );
            
            console.log("📝 Transaction hash:", tx.hash);
            console.log("⏳ Waiting for confirmation...");
            
            const receipt = await tx.wait();
            console.log("✅ Transaction confirmed in block:", receipt?.blockNumber);
            
            // Get the request ID from events
            const events = receipt?.logs || [];
            for (const event of events) {
                try {
                    const parsedEvent = integrator.interface.parseLog(event);
                    if (parsedEvent?.name === "RandomWordsRequested") {
                        console.log("🎲 VRF Request ID:", parsedEvent.args.requestId);
                        console.log("🌐 Target Chain EID:", parsedEvent.args.targetEid);
                        console.log("📊 Number of Words:", parsedEvent.args.numWords);
                    }
                } catch (e) {
                    // Ignore parsing errors for other events
                }
            }
            
            console.log("\n🎉 VRF request submitted successfully!");
            console.log("⏱️  Please wait for LayerZero message delivery and Chainlink VRF fulfillment");
            console.log("🔍 Monitor the Arbitrum VRF Consumer for the response");
            
        } catch (quoteError: any) {
            console.error("❌ Error getting quote or requesting VRF:");
            console.error("Error code:", quoteError.code);
            console.error("Error data:", quoteError.data);
            console.error("Full error:", quoteError);
        }
        
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 