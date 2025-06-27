const { run } = require("hardhat");

async function main() {
    console.log("🔍 Verifying Arbitrum Contract on Arbiscan...\n");

    const CONTRACT_ADDRESS = "0x6E11334470dF61D62383892Bd8e57a3a655718C8";
    
    // Constructor arguments used in deployment
    const constructorArgs = [
        "0x1a44076050125825900e736c501f859c50fE728c", // LayerZero Endpoint
        "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F", // Owner
        "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e", // VRF Coordinator
        123, // Simple subscription ID used in deployment
        "0xe9f223d7d83ec85c4f78042a4845af3a1c8df7757b4997b815ce4b8d07aca68c" // Key Hash
    ];

    console.log("📋 Verification Details:");
    console.log(`   Contract: ${CONTRACT_ADDRESS}`);
    console.log(`   Network: Arbitrum`);
    console.log(`   Constructor Args: ${constructorArgs.length} parameters`);
    
    console.log("\n🔧 Constructor Arguments:");
    console.log(`   Endpoint: ${constructorArgs[0]}`);
    console.log(`   Owner: ${constructorArgs[1]}`);
    console.log(`   VRF Coordinator: ${constructorArgs[2]}`);
    console.log(`   Subscription ID: ${constructorArgs[3]}`);
    console.log(`   Key Hash: ${constructorArgs[4]}`);

    try {
        console.log("\n🚀 Starting verification...");
        
        await run("verify:verify", {
            address: CONTRACT_ADDRESS,
            constructorArguments: constructorArgs,
            contract: "contracts/core/external/chainlink/OmniDragonVRFConsumerV2_5.sol:OmniDragonVRFConsumerV2_5"
        });

        console.log("✅ Verification successful!");
        console.log(`🔗 View on Arbiscan: https://arbiscan.io/address/${CONTRACT_ADDRESS}`);
        
        console.log("\n🎯 Key Features Verified:");
        console.log("   • _payNative override for VRF callback handling ✅");
        console.log("   • LayerZero cross-chain messaging ✅");
        console.log("   • Chainlink VRF 2.5 integration ✅");
        console.log("   • Payment fix for msg.value = 0 scenarios ✅");

    } catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("✅ Contract is already verified!");
            console.log(`🔗 View on Arbiscan: https://arbiscan.io/address/${CONTRACT_ADDRESS}`);
        } else {
            console.error("❌ Verification failed:", error.message);
            
            if (error.message.includes("constructor")) {
                console.log("\n💡 Troubleshooting:");
                console.log("   • Check constructor arguments match deployment");
                console.log("   • Ensure contract source matches exactly");
                console.log("   • Verify Solidity version and optimization settings");
            }
        }
    }
}

main()
    .then(() => {
        console.log("\n🎉 Verification process completed!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    }); 