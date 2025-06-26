import { ethers } from "hardhat";

/**
 * Test VRF Quote Function - Now that LayerZero is configured
 * The send library is already set correctly, so let's test the VRF flow
 */

const SONIC_INTEGRATOR = "0x5aCd5D42605b925CEF3d8DdD9e83545E708904B4";
const ARBITRUM_EID = 30110;

async function testVRFQuote() {
    console.log("🎯 Testing VRF Quote Function");
    console.log("=" .repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    // Connect to Sonic VRF Integrator
    const integrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        SONIC_INTEGRATOR
    );

    console.log("🔗 Connected to Sonic Integrator:", SONIC_INTEGRATOR);

    // Test the quote function that was previously failing
    console.log("\n💰 Testing Quote Function...");
    
    try {
        // Create LayerZero options (empty for basic message)
        const options = "0x";
        
        console.log("📋 Parameters:");
        console.log("   Destination EID:", ARBITRUM_EID);
        console.log("   Options:", options);

        // Call the quote function
        const quote = await integrator.quote(ARBITRUM_EID, options);
        
        console.log("✅ Quote successful!");
        console.log("💰 Native Fee:", ethers.utils.formatEther(quote.nativeFee), "ETH");
        console.log("🪙 LZ Token Fee:", ethers.utils.formatEther(quote.lzTokenFee), "LZ");
        
        // If quote works, let's try a test VRF request
        console.log("\n🎲 Testing VRF Request...");
        
        const vrfTx = await integrator.requestRandomWords(
            ARBITRUM_EID,
            options,
            {
                value: quote.nativeFee,
                gasLimit: 500000,
                gasPrice: ethers.utils.parseUnits("100", "gwei")
            }
        );
        
        console.log("✅ VRF request sent!");
        console.log("📋 Transaction hash:", vrfTx.hash);
        
        const receipt = await vrfTx.wait();
        console.log("✅ Transaction confirmed!");
        console.log("⛽ Gas used:", receipt.gasUsed.toString());
        console.log("🎉 VRF system is working!");

    } catch (error: any) {
        console.log("❌ Quote/VRF request failed:", error.message);
        console.log("📋 Error code:", error.code);
        console.log("📋 Error data:", error.data);
        
        if (error.message.includes("0x6592671c")) {
            console.log("\n🔍 Still getting 0x6592671c error");
            console.log("This might be a DVN configuration issue");
        }
    }

    // Check peer connection
    console.log("\n🔗 Checking Peer Connection...");
    try {
        const peer = await integrator.peers(ARBITRUM_EID);
        console.log("📋 Peer for Arbitrum EID:", peer);
        
        if (peer === "0x0000000000000000000000000000000000000000000000000000000000000000") {
            console.log("❌ Peer not set! Need to set peer connection.");
        } else {
            console.log("✅ Peer connection is set");
        }
    } catch (error: any) {
        console.log("❌ Failed to check peer:", error.message);
    }
}

// Run the test
if (require.main === module) {
    testVRFQuote()
        .then(() => {
            console.log("\n🎉 VRF quote test completed!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ VRF test failed:", error);
            process.exit(1);
        });
}

export { testVRFQuote }; 