import hre from "hardhat";
const { ethers } = hre;

async function main() {
    console.log("Testing VRF System...");
    
    const contractAddress = process.env.SONIC_VRF_CONTRACT!;
    
    // Get the deployed contract on Sonic
    const sonicContract = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        contractAddress
    );
    
    console.log("Sonic Contract Address:", contractAddress);
    
    // Check if peer is set
    const arbitrumEid = 30110; // Arbitrum endpoint ID
    const peer = await sonicContract.peers(arbitrumEid);
    console.log("Arbitrum Peer:", peer);
    
    // Get quote for cross-chain message using the simple quote function
    const quote = await sonicContract.quoteSimple();
    console.log("Quote for VRF request:", ethers.utils.formatEther(quote.nativeFee), "S");
    
    // Check contract balance
    const [signer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(contractAddress);
    console.log("Contract Balance:", ethers.utils.formatEther(balance), "S");
    
    if (balance.lt(quote.nativeFee)) {
        console.log("⚠️  Contract needs funding for LayerZero fees");
        console.log("Required:", ethers.utils.formatEther(quote.nativeFee), "S");
        console.log("Current:", ethers.utils.formatEther(balance), "S");
        
        // Fund the contract
        const fundTx = await signer.sendTransaction({
            to: contractAddress,
            value: quote.nativeFee.mul(2) // Fund with 2x the required amount
        });
        await fundTx.wait();
        console.log("✅ Contract funded!");
    }
    
    // Make a VRF request using the simple method
    console.log("Making VRF request...");
    const tx = await sonicContract.requestRandomWordsSimple({ value: quote.nativeFee });
    const receipt = await tx.wait();
    
    console.log("✅ VRF request sent!");
    console.log("Transaction hash:", receipt.transactionHash);
    
    // Get the request ID from the event
    const requestEvent = receipt.events?.find(e => e.event === "RandomWordsRequested");
    if (requestEvent) {
        const requestId = requestEvent.args?.requestId;
        console.log("Request ID:", requestId.toString());
    }
    
    // Listen for events
    console.log("Listening for VRF response...");
    
    sonicContract.on("RandomWordsReceived", (randomWords, sequence, provider, event) => {
        console.log("🎉 Random words received!");
        console.log("Sequence:", sequence.toString());
        console.log("Provider:", provider);
        console.log("Random Words:", randomWords.map((w: any) => w.toString()));
        process.exit(0);
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
        console.log("⏰ Timeout reached. Check transaction manually.");
        console.log("You can check the request status using:");
        console.log("npx hardhat run scripts/check-request-status.ts --network sonic");
        process.exit(1);
    }, 300000);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 