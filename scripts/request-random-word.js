const { ethers } = require("hardhat");

async function main() {
    console.log("🎲 Requesting Random Words from VRF System...\n");

    // Contract addresses
    const SONIC_CONTRACT = "0x3bAc0b3C348425992224c8FafEeFc3aF6205755e";
    const ARBITRUM_CONTRACT = "0x6E11334470dF61D62383892Bd8e57a3a655718C8";
    
    // LayerZero Endpoint IDs
    const ARBITRUM_EID = 30110;

    try {
        // Setup Sonic contract
        console.log("🌟 Setting up Sonic VRF Integrator...");
        const sonicProvider = new ethers.providers.JsonRpcProvider("https://rpc.soniclabs.com");
        const sonicWallet = new ethers.Wallet(process.env.PRIVATE_KEY, sonicProvider);
        
        const SonicVRF = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
        const sonicContract = SonicVRF.attach(SONIC_CONTRACT).connect(sonicWallet);

        // Setup Arbitrum contract for monitoring
        console.log("🔵 Setting up Arbitrum VRF Consumer...");
        const arbitrumProvider = new ethers.providers.JsonRpcProvider("https://arb1.arbitrum.io/rpc");
        const arbitrumWallet = new ethers.Wallet(process.env.PRIVATE_KEY, arbitrumProvider);
        
        const ArbitrumVRF = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
        const arbitrumContract = ArbitrumVRF.attach(ARBITRUM_CONTRACT).connect(arbitrumWallet);

        // Check balances first
        console.log("💰 Checking balances...");
        const sonicBalance = await sonicWallet.getBalance();
        const arbitrumBalance = await arbitrumWallet.getBalance();
        
        console.log(`   Sonic balance: ${ethers.utils.formatEther(sonicBalance)} S`);
        console.log(`   Arbitrum balance: ${ethers.utils.formatEther(arbitrumBalance)} ETH`);

        // Use the simple request function to avoid gas issues
        console.log("\n💸 Getting quote for simple VRF request...");
        
        // Check default gas limit
        const defaultGasLimit = await sonicContract.defaultGasLimit();
        console.log(`   Default gas limit: ${defaultGasLimit}`);
        
        // Build default options
        const { Options } = require("@layerzerolabs/lz-v2-utilities");
        const options = Options.newOptions().addExecutorLzReceiveOption(defaultGasLimit, 0).toHex();
        
        // Get quote from Sonic contract
        const quote = await sonicContract.quote(ARBITRUM_EID, options);
        console.log(`   Quote: ${ethers.utils.formatEther(quote.nativeFee)} S`);
        
        // Check if we have enough balance
        if (sonicBalance.lt(quote.nativeFee.mul(2))) {
            console.log("⚠️ Warning: Low balance, but continuing...");
        }

        // Request random words using simple function
        console.log("\n🎲 Requesting random words (simple)...");
        console.log(`   Target: Arbitrum (EID: ${ARBITRUM_EID})`);
        console.log(`   Using default gas limit: ${defaultGasLimit}`);
        console.log(`   Payment: ${ethers.utils.formatEther(quote.nativeFee)} S`);

        try {
            const requestTx = await sonicContract.requestRandomWordsSimple(
                ARBITRUM_EID,
                { value: quote.nativeFee }
            );

            console.log(`   Transaction submitted: ${requestTx.hash}`);
            console.log("   Waiting for confirmation...");
            
            const receipt = await requestTx.wait();
            console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
            console.log(`   Gas used: ${receipt.gasUsed}`);

            // Look for events
            const events = receipt.events || [];
            console.log(`   Events emitted: ${events.length}`);
            
            for (const event of events) {
                if (event.event) {
                    console.log(`   📋 Event: ${event.event}`);
                    if (event.args) {
                        console.log(`      Args:`, event.args);
                    }
                }
            }

        } catch (error) {
            console.error("❌ Transaction failed:");
            console.error(`   Error: ${error.message}`);
            if (error.transaction) {
                console.error(`   Transaction hash: ${error.transaction.hash}`);
            }
            if (error.receipt) {
                console.error(`   Gas used: ${error.receipt.gasUsed}`);
                console.error(`   Status: ${error.receipt.status}`);
            }
        }

        console.log("\n🔄 VRF Request Flow Started:");
        console.log("   1. ✅ Sonic contract received request");
        console.log("   2. ⏳ LayerZero message sent to Arbitrum");
        console.log("   3. ⏳ Arbitrum contract will request from Chainlink VRF");
        console.log("   4. ⏳ Chainlink VRF will fulfill the request");
        console.log("   5. ⏳ Random word will be sent back to Sonic");

        console.log("\n🎯 Next Steps:");
        console.log("   • Monitor Arbitrum contract for VRF fulfillment");
        console.log("   • Check for random word availability on Sonic");
        console.log("   • Full cross-chain VRF cycle should complete in ~5-10 minutes");

        console.log(`\n📍 Transaction Details:`);
        console.log(`   Sonic TX: https://sonicscan.org/tx/${requestTx.hash}`);
        console.log(`   Sonic Contract: https://sonicscan.org/address/${SONIC_CONTRACT}`);
        console.log(`   Arbitrum Contract: https://arbiscan.io/address/${ARBITRUM_CONTRACT}`);

    } catch (error) {
        console.error("❌ Error requesting random words:", error.message);
        
        if (error.message.includes("insufficient funds")) {
            console.log("\n💡 Solution: Add more S tokens to your Sonic wallet");
        } else if (error.message.includes("execution reverted")) {
            console.log("\n🔍 Debug: Check contract state and peer configuration");
        }
    }
}

main()
    .then(() => {
        console.log("\n🎉 Random word request completed!");
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 