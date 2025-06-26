import { ethers } from "hardhat";

/**
 * Simple VRF Test - Clean and Focused
 * Test the VRF system without complex LayerZero interface dependencies
 */

const SONIC_INTEGRATOR = "0x5aCd5D42605b925CEF3d8DdD9e83545E708904B4";
const ARBITRUM_CONSUMER = "0x1aFF9b2bCDe8a9c29d598c40558a23b61be78551";
const ARBITRUM_EID = 30110;

async function simpleVRFTest() {
    console.log("🎯 Simple VRF Test");
    console.log("==================");

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    // Connect to Sonic VRF Integrator
    const integrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        SONIC_INTEGRATOR
    );

    console.log("🔗 Connected to Sonic Integrator");

    try {
        // 1. Check peer connection
        console.log("\n1️⃣ Checking peer connection...");
        const peer = await integrator.peers(ARBITRUM_EID);
        const expectedPeer = ethers.utils.hexZeroPad(ARBITRUM_CONSUMER, 32);
        
        console.log("Current peer:", peer);
        console.log("Expected peer:", expectedPeer);
        
        if (peer === "0x0000000000000000000000000000000000000000000000000000000000000000") {
            console.log("❌ Peer not set - setting now...");
            
            const setPeerTx = await integrator.setPeer(ARBITRUM_EID, expectedPeer, {
                gasLimit: 200000,
                gasPrice: ethers.utils.parseUnits("100", "gwei")
            });
            
            console.log("⏳ Setting peer... TX:", setPeerTx.hash);
            await setPeerTx.wait();
            console.log("✅ Peer set successfully!");
        } else {
            console.log("✅ Peer already configured");
        }

        // 2. Test quote function
        console.log("\n2️⃣ Testing quote function...");
        const options = "0x";
        
        const quote = await integrator.quote(ARBITRUM_EID, options);
        console.log("✅ Quote successful!");
        console.log("💰 Fee:", ethers.utils.formatEther(quote.nativeFee), "ETH");

        // 3. Test VRF request (if quote works)
        if (quote.nativeFee.gt(0)) {
            console.log("\n3️⃣ Testing VRF request...");
            
            const vrfTx = await integrator.requestRandomWords(ARBITRUM_EID, options, {
                value: quote.nativeFee.mul(110).div(100), // 10% buffer
                gasLimit: 500000,
                gasPrice: ethers.utils.parseUnits("100", "gwei")
            });
            
            console.log("✅ VRF request sent!");
            console.log("📋 TX Hash:", vrfTx.hash);
            
            const receipt = await vrfTx.wait();
            console.log("✅ Confirmed! Gas used:", receipt.gasUsed.toString());
            
            console.log("\n🎉 SUCCESS! VRF system is working!");
            
        } else {
            console.log("❌ Quote returned zero fee");
        }

    } catch (error: any) {
        console.log("❌ Error:", error.message);
        
        if (error.message.includes("0x6592671c")) {
            console.log("🔍 This is the LayerZero DVN error - need DVN configuration");
        }
    }

    console.log("\n📊 Test completed!");
}

// Run the test
simpleVRFTest()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }); 