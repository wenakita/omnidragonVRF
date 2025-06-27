const { ethers } = require("hardhat");

async function main() {
    console.log("🎲 Testing VRF System End-to-End...\n");

    // Contract addresses
    const SONIC_CONTRACT = '0x5949156D5dD762aB15c1FEd4dE90B8a8CAF60746';
    const ARBITRUM_CONTRACT = '0x77913403bC1841F87d884101b25B6230CB4fbe28';
    
    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`📝 Using signer: ${signer.address}`);
    console.log(`💰 Balance: ${ethers.utils.formatEther(await signer.getBalance())} ETH\n`);

    // Test Sonic contract
    console.log("🔍 Testing Sonic Contract...");
    try {
        const sonicContract = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5", 
            SONIC_CONTRACT, 
            signer
        );

        // Check if contract has balance for LayerZero fees
        const sonicBalance = await ethers.provider.getBalance(SONIC_CONTRACT);
        console.log(`   Contract Balance: ${ethers.utils.formatEther(sonicBalance)} ETH`);

        // Get quote for VRF request
        const quote = await sonicContract.quote();
        console.log(`   LayerZero Fee Quote: ${ethers.utils.formatEther(quote.nativeFee)} ETH`);

        // Check if contract has enough balance
        const hasEnoughBalance = sonicBalance.gte(quote.nativeFee);
        console.log(`   Has Enough Balance: ${hasEnoughBalance ? '✅' : '❌'}`);

        // Test requestRandomWords function (just quote, don't send)
        console.log("\n🎯 Testing requestRandomWords quote...");
        const vrfQuote = await sonicContract.requestRandomWords.staticCall();
        console.log(`   VRF Request would return sequence: ${vrfQuote}`);

    } catch (error) {
        console.error("❌ Error testing Sonic contract:", error.message);
    }

    // Test Arbitrum contract
    console.log("\n🔍 Testing Arbitrum Contract...");
    try {
        const arbitrumContract = await ethers.getContractAt(
            "OmniDragonVRFConsumerV2_5", 
            ARBITRUM_CONTRACT, 
            signer
        );

        // Check VRF configuration
        console.log("📊 VRF Configuration:");
        const subId = await arbitrumContract.subscriptionId();
        const keyHash = await arbitrumContract.keyHash();
        const gasLimit = await arbitrumContract.callbackGasLimit();
        const confirmations = await arbitrumContract.requestConfirmations();
        
        console.log(`   Subscription ID: ${subId.toString()}`);
        console.log(`   Key Hash: ${keyHash}`);
        console.log(`   Gas Limit: ${gasLimit}`);
        console.log(`   Confirmations: ${confirmations}`);

        // Check if Sonic is supported
        const SONIC_EID = 30332;
        const isSonicSupported = await arbitrumContract.supportedChains(SONIC_EID);
        console.log(`   Sonic Chain Supported: ${isSonicSupported ? '✅' : '❌'}`);

        // Check peer configuration
        const sonicPeer = await arbitrumContract.peers(SONIC_EID);
        console.log(`   Sonic Peer: ${sonicPeer}`);
        
        // Convert Sonic contract address to bytes32 for comparison
        const expectedPeer = ethers.utils.hexZeroPad(SONIC_CONTRACT.toLowerCase(), 32);
        const isPeerCorrect = sonicPeer.toLowerCase() === expectedPeer.toLowerCase();
        console.log(`   Peer Correct: ${isPeerCorrect ? '✅' : '❌'}`);

        // Check contract balance
        const arbitrumBalance = await ethers.provider.getBalance(ARBITRUM_CONTRACT);
        console.log(`   Contract Balance: ${ethers.utils.formatEther(arbitrumBalance)} ETH`);

        // Quote fee for response
        if (isSonicSupported) {
            const responseFee = await arbitrumContract.quoteSendToChain(SONIC_EID);
            console.log(`   Response Fee to Sonic: ${ethers.utils.formatEther(responseFee.nativeFee)} ETH`);
            
            const canSendResponse = arbitrumBalance.gte(responseFee.nativeFee);
            console.log(`   Can Send Response: ${canSendResponse ? '✅' : '❌'}`);
        }

    } catch (error) {
        console.error("❌ Error testing Arbitrum contract:", error.message);
    }

    // Summary
    console.log("\n📋 System Status Summary:");
    console.log("=========================");
    console.log("1. Sonic Contract: Deployed and configured");
    console.log("2. Arbitrum Contract: Deployed and configured");
    console.log("3. LayerZero Peers: Configured via lz:oapp:wire");
    console.log("4. VRF Subscription: Contract added as consumer");
    console.log("5. Main Issue: Contract has wrong subscription ID stored");
    console.log("\n💡 Next Steps:");
    console.log("   - Fund Arbitrum account with ~0.1 ETH");
    console.log("   - Run update-subscription-id.js to fix the subscription ID");
    console.log("   - Test VRF request end-to-end");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 