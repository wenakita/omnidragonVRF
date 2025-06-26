import { ethers } from "hardhat";

async function testOfficialSonicQuote() {
    console.log("🧪 Testing Official Sonic VRF Integrator Quote Function");
    console.log("=" .repeat(60));

    const SONIC_INTEGRATOR = "0x89Ce5E25d8c635Bd41E5Ee33bF7c63DC50A3F0fb";
    const ARBITRUM_EID = 30110;

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    const sonicIntegrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        SONIC_INTEGRATOR
    );

    console.log("✅ Connected to Sonic Integrator:", SONIC_INTEGRATOR);

    try {
        // Create LayerZero options (using OptionsBuilder pattern)
        const options = "0x00030100110100000000000000000000000000030d40"; // Default options for 200k gas
        
        const fee = await sonicIntegrator.quote(
            ARBITRUM_EID,
            options
        );
        
        console.log("✅ Quote successful!");
        console.log("💰 Native fee:", ethers.utils.formatEther(fee.nativeFee), "ETH");
        console.log("🪙 LZ token fee:", fee.lzTokenFee.toString());
        console.log("🎯 VRF system is ready!");
    } catch (error: any) {
        console.log("❌ Quote failed:", error.message);
        if (error.message.includes("0x6592671c")) {
            console.log("🚨 Still getting LZDeadDVN error - needs DVN configuration");
        }
    }
}

testOfficialSonicQuote().catch(console.error); 