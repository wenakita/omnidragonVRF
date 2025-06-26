import { ethers } from "hardhat";

/**
 * Deploy Fresh Sonic VRF Integrator with Official LayerZero Configuration
 * Using official endpoints and DVNs from LayerZero metadata API
 */

// Official Sonic Configuration from LayerZero Metadata API
const OFFICIAL_CONFIG = {
    SONIC_LZ_ENDPOINT: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B",
    SONIC_LZ_EID: "30332",
    SONIC_EXECUTOR: "0x4208D6E27538189bB48E603D6123A94b8Abe0A0b",
    SONIC_SEND_ULN302: "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7",
    SONIC_RECEIVE_ULN302: "0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043",
    SONIC_LAYERZERO_DVN: "0x282b3386571f7f794450d5789911a9804fa346b4",
    SONIC_NETHERMIND_DVN: "0x05aaefdf9db6e0f7d27fa3b6ee099edb33da029e"
};

// Chain EIDs
const CHAIN_EIDS = {
    ARBITRUM: 30110,
    SONIC: 30332
};

async function deployFreshSonicIntegrator() {
    console.log("🚀 Deploying Fresh Sonic VRF Integrator with Official Configuration");
    console.log("Using LayerZero Metadata API verified endpoints and DVNs");
    console.log("=" .repeat(70));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    // Deploy the contract
    console.log("\n🏗️ Deploying ChainlinkVRFIntegratorV2_5...");
    const ChainlinkVRFIntegrator = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
    
    const integrator = await ChainlinkVRFIntegrator.deploy(
        OFFICIAL_CONFIG.SONIC_LZ_ENDPOINT,
        deployer.address, // owner
        {
            gasLimit: 4000000,
            gasPrice: ethers.utils.parseUnits("70", "gwei")
        }
    );

    console.log("⏳ Waiting for deployment...");
    await integrator.deployed();
    const integratorAddress = integrator.address;

    console.log("✅ Sonic VRF Integrator deployed!");
    console.log("📍 Address:", integratorAddress);
    console.log("🔗 Explorer:", `https://sonicscan.org/address/${integratorAddress}`);

    // Verify configuration
    console.log("\n🔍 Verifying Configuration...");
    const endpoint = await integrator.endpoint();
    const owner = await integrator.owner();
    
    console.log("✅ Endpoint:", endpoint);
    console.log("✅ Owner:", owner);
    console.log("✅ Endpoint matches official:", endpoint === OFFICIAL_CONFIG.SONIC_LZ_ENDPOINT);

    // Connect to LayerZero endpoint to check configuration
    console.log("\n🔧 Checking LayerZero Configuration...");
    const lzEndpoint = await ethers.getContractAt("ILayerZeroEndpointV2", endpoint);
    
    try {
        const sendLibrary = await lzEndpoint.getSendLibrary(integratorAddress, CHAIN_EIDS.ARBITRUM);
        console.log("📚 Send Library:", sendLibrary);
        
        // Check if it's using the official ULN
        console.log("✅ Send Library matches official:", sendLibrary === OFFICIAL_CONFIG.SONIC_SEND_ULN302);
    } catch (error) {
        console.log("⚠️ Could not check send library (normal for fresh deployment)");
    }

    console.log("\n📋 Next Steps:");
    console.log("1. ✅ Contract deployed with official endpoint");
    console.log("2. 🔧 Configure peer connection to Arbitrum");
    console.log("3. 🛡️ Set up official DVNs (LayerZero Labs + Nethermind)");
    console.log("4. 🧪 Test VRF request");

    console.log("\n🔧 Configuration Commands:");
    console.log(`export SONIC_INTEGRATOR="${integratorAddress}"`);
    console.log(`export ARBITRUM_CONSUMER="0xD192343D5E351C983F6613e6d7c5c33f62C0eea4"`);

    return {
        address: integratorAddress,
        endpoint: endpoint,
        owner: owner,
        config: OFFICIAL_CONFIG
    };
}

if (require.main === module) {
    deployFreshSonicIntegrator()
        .then((result) => {
            console.log("\n🎯 Deployment Summary:");
            console.log("Address:", result.address);
            console.log("Endpoint:", result.endpoint);
            console.log("Ready for peer configuration!");
        })
        .catch((error) => {
            console.error("❌ Deployment failed:", error);
            process.exitCode = 1;
        });
} 