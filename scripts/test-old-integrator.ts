import { ethers } from "hardhat";

/**
 * Test Old Integrator - The One That Was Working
 * Let's see if the old integrator still works
 */

const OLD_SONIC_INTEGRATOR = "0x9e9F4E70d9752043612eD192f97A6384F63D6903"; // The one that was working
const CURRENT_SONIC_INTEGRATOR = "0x5aCd5D42605b925CEF3d8DdD9e83545E708904B4"; // Current one we're testing
const ARBITRUM_CONSUMER = "0x1aFF9b2bCDe8a9c29d598c40558a23b61be78551";
const ARBITRUM_EID = 30110;

async function testOldIntegrator() {
    console.log("🔍 Test Old Integrator - The One That Was Working");
    console.log("=================================================");

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    try {
        // Test the OLD integrator that was working
        console.log("\n1️⃣ Testing OLD Integrator (the one that was working)");
        console.log("=====================================================");
        console.log("📍 Old Integrator:", OLD_SONIC_INTEGRATOR);

        try {
            const oldIntegrator = await ethers.getContractAt(
                "ChainlinkVRFIntegratorV2_5",
                OLD_SONIC_INTEGRATOR
            );

            console.log("🔗 Connected to old integrator");

            // Check if it still exists and works
            const oldOwner = await oldIntegrator.owner();
            const oldEndpoint = await oldIntegrator.endpoint();
            console.log("👑 Old Owner:", oldOwner);
            console.log("📍 Old Endpoint:", oldEndpoint);

            // Test quote function
            try {
                const oldQuote = await oldIntegrator.quote(ARBITRUM_EID, "0x");
                console.log("✅ OLD INTEGRATOR STILL WORKS!");
                console.log("💰 Quote Fee:", ethers.utils.formatEther(oldQuote.nativeFee), "ETH");
                
                // Check peer configuration
                const oldPeer = await oldIntegrator.peers(ARBITRUM_EID);
                console.log("👥 Old Peer:", oldPeer);
                
                if (oldPeer === "0x0000000000000000000000000000000000000000000000000000000000000000") {
                    console.log("⚠️ Old integrator has no peer set - that might be why we switched");
                } else {
                    console.log("✅ Old integrator has peer configured");
                    
                    // Try a VRF request with the old integrator!
                    console.log("\n🎲 Testing VRF Request with OLD integrator...");
                    try {
                        const vrfTx = await oldIntegrator.requestRandomWords(ARBITRUM_EID, "0x", {
                            value: oldQuote.nativeFee.mul(110).div(100),
                            gasLimit: 500000,
                            gasPrice: ethers.utils.parseUnits("100", "gwei")
                        });
                        
                        console.log("✅ VRF request sent with OLD integrator!");
                        console.log("📋 TX Hash:", vrfTx.hash);
                        
                        const receipt = await vrfTx.wait();
                        console.log("✅ Confirmed! Gas used:", receipt.gasUsed.toString());
                        console.log("🎉 OLD INTEGRATOR IS WORKING PERFECTLY!");
                        
                    } catch (vrfError: any) {
                        console.log("❌ VRF request failed with old integrator:", vrfError.message.substring(0, 100) + "...");
                    }
                }
                
            } catch (quoteError: any) {
                console.log("❌ Old integrator quote failed:", quoteError.message.substring(0, 100) + "...");
            }

        } catch (oldError: any) {
            console.log("❌ Cannot connect to old integrator:", oldError.message);
            console.log("   This might mean the old contract was replaced or doesn't exist");
        }

        // Compare with current integrator
        console.log("\n2️⃣ Comparing with CURRENT Integrator");
        console.log("====================================");
        console.log("📍 Current Integrator:", CURRENT_SONIC_INTEGRATOR);

        try {
            const currentIntegrator = await ethers.getContractAt(
                "ChainlinkVRFIntegratorV2_5",
                CURRENT_SONIC_INTEGRATOR
            );

            const currentOwner = await currentIntegrator.owner();
            const currentEndpoint = await currentIntegrator.endpoint();
            console.log("👑 Current Owner:", currentOwner);
            console.log("📍 Current Endpoint:", currentEndpoint);

            try {
                const currentQuote = await currentIntegrator.quote(ARBITRUM_EID, "0x");
                console.log("✅ Current integrator quote works!");
                console.log("💰 Quote Fee:", ethers.utils.formatEther(currentQuote.nativeFee), "ETH");
            } catch (currentQuoteError: any) {
                console.log("❌ Current integrator quote failed:", currentQuoteError.message.substring(0, 100) + "...");
            }

        } catch (currentError: any) {
            console.log("❌ Cannot connect to current integrator:", currentError.message);
        }

        // 3. Check what changed between the two
        console.log("\n3️⃣ What Changed Analysis");
        console.log("========================");
        console.log("🔍 Possible reasons for the switch:");
        console.log("1. Old integrator had configuration issues");
        console.log("2. Old integrator was deployed with wrong parameters");
        console.log("3. New integrator was deployed for testing/improvements");
        console.log("4. LayerZero configuration changed requiring new deployment");
        
        console.log("\n💡 Solution:");
        console.log("If the old integrator works, we should:");
        console.log("1. Use the old integrator that's working");
        console.log("2. Or figure out why the new one doesn't work");
        console.log("3. Update the Arbitrum consumer peer to point to the working integrator");

    } catch (error: any) {
        console.log("❌ Test failed:", error.message);
    }

    console.log("\n🏁 Test completed!");
}

// Run the test
testOldIntegrator()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }); 