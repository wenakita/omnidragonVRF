const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Testing Sonic Contract...\n");

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
        console.log(`📊 Contract Status:`);
        console.log(`   Contract Balance: ${ethers.utils.formatEther(contractBalance)} S`);

        // Check peer configuration
        const peer = await contract.peers(ARBITRUM_EID);
        console.log(`   Arbitrum Peer: ${peer}`);

        // Check if we can get a quote (with proper parameters)
        console.log("\n🎯 Testing Quote Function...");
        try {
            // The quote function likely needs destination EID and message
            const testMessage = ethers.utils.defaultAbiCoder.encode(['uint64'], [1]);
            const quote = await contract.quote(ARBITRUM_EID, testMessage, "0x", false);
            console.log(`   LayerZero Fee: ${ethers.utils.formatEther(quote.nativeFee)} S`);
            
            const hasEnoughBalance = contractBalance.gte(quote.nativeFee);
            console.log(`   Contract Can Pay Fee: ${hasEnoughBalance ? '✅' : '❌'}`);
        } catch (quoteError) {
            console.log(`   Quote Error: ${quoteError.message}`);
        }

        // Test requestRandomWords (static call)
        console.log("\n🎲 Testing VRF Request...");
        try {
            const sequence = await contract.requestRandomWords.staticCall();
            console.log(`   Next Sequence: ${sequence}`);
        } catch (vrfError) {
            console.log(`   VRF Error: ${vrfError.message}`);
        }

        // Check if contract needs funding
        if (contractBalance.eq(0)) {
            console.log("\n💰 Contract Funding Needed:");
            console.log("   The Sonic contract has 0 balance and needs funding for LayerZero fees");
            console.log("   Suggested: Send 0.01 S to the contract");
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 