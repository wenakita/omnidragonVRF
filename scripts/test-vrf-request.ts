import { ethers } from "hardhat";

async function main() {
    console.log("🎲 Testing VRF Request with New Arbitrum Consumer");
    console.log("=" .repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Updated addresses
    const sonicIntegrator = "0x3aB9Bf4C30F5995Ac27f09c487a32e97c87899E4";
    const arbitrumConsumer = "0xD192343D5E351C983F6613e6d7c5c33f62C0eea4";

    console.log("Sonic Integrator:", sonicIntegrator);
    console.log("Arbitrum Consumer:", arbitrumConsumer);

    try {
        const integrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            sonicIntegrator
        );

        console.log("✅ Connected to Sonic VRF Integrator");

        // Test quote function
        const arbitrumEid = 30110;
        const numWords = 1;
        const extraArgs = "0x";

        console.log("\\nTesting quote function...");
        try {
            const quote = await integrator.quote(arbitrumEid, numWords, false, extraArgs);
            console.log("Quote:", ethers.utils.formatEther(quote), "S");

            // If quote works, try the request
            console.log("\\nMaking VRF request...");
            const tx = await integrator.requestRandomWords(
                arbitrumEid,
                numWords,
                extraArgs,
                { value: quote }
            );

            console.log("TX Hash:", tx.hash);
            const receipt = await tx.wait();
            console.log("✅ Success! Block:", receipt?.blockNumber);

        } catch (error: any) {
            console.error("❌ Error:", error.message);
            if (error.data) {
                console.error("Error data:", error.data);
            }
        }

    } catch (error) {
        console.error("❌ Connection error:", error);
    }
}

main().catch(console.error); 