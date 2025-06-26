import { ethers } from "hardhat";

/**
 * Fresh Deployment Script - Complete VRF System
 * Deploy both Sonic Integrator and Arbitrum Consumer with proper LayerZero configuration
 * This avoids the 0xc4c52593 configuration conflicts we've been experiencing
 */

// Official LayerZero V2 Configuration
const LAYERZERO_CONFIG = {
    SONIC: {
        EID: 30332,
        ENDPOINT: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B",
        SEND_ULN_302: "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7",
        RECEIVE_ULN_302: "0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043",
        EXECUTOR: "0x4208D6E27538189bB48E603D6123A94b8Abe0A0b",
        DVNS: {
            LAYERZERO_LABS: "0x2f55c492897526677c5b68fb199ea31e2c126416",
            NETHERMIND: "0xa7b5189bca84cd304d8553977c7c614329750d99"
        }
    },
    ARBITRUM: {
        EID: 30110,
        ENDPOINT: "0x1a44076050125825900e736c501f859c50fE728c",
        SEND_ULN_302: "0x975bcD720be66659e3EB3C0e4F1866a3020E493A",
        RECEIVE_ULN_302: "0x7B9E184e07a6EE1aC23eAe0fe8D6Be2f663f05e6",
        EXECUTOR: "0x31CAe3B7fB82d847621859fb1585353c5720660D",
        DVNS: {
            LAYERZERO_LABS: "0x282b3386571f7f794450d5789911a9804fa346b4",
            NETHERMIND: "0x05aaefdf9db6e0f7d27fa3b6ee099edb33da029e"
        }
    }
};

// Chainlink VRF V2.5 Configuration (Arbitrum)
const CHAINLINK_CONFIG = {
    VRF_COORDINATOR: "0x50d47e4142598E3411aA864e08a44284e471AC6f",
    KEY_HASH: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    SUBSCRIPTION_ID: 1, // Will be updated after deployment
    REQUEST_CONFIRMATIONS: 3,
    CALLBACK_GAS_LIMIT: 2500000,
    NUM_WORDS: 1
};

async function freshDeployment() {
    console.log("🚀 Fresh Deployment - Complete VRF System");
    console.log("Deploying both Sonic Integrator and Arbitrum Consumer");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    const network = await ethers.provider.getNetwork();
    console.log("🌐 Network:", network.name, "- Chain ID:", network.chainId);
    console.log("💰 Balance:", ethers.utils.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    let sonicIntegrator: any;
    let arbitrumConsumer: any;

    // Deploy based on current network
    if (network.chainId === 146) { // Sonic
        console.log("\n🎵 Deploying on Sonic Network");
        sonicIntegrator = await deploySonicIntegrator(deployer);
    } else if (network.chainId === 42161) { // Arbitrum
        console.log("\n🔷 Deploying on Arbitrum Network");
        arbitrumConsumer = await deployArbitrumConsumer(deployer);
    } else {
        console.log("❌ Unsupported network. Please use --network sonic or --network arbitrum");
        return;
    }

    // Display deployment summary
    console.log("\n📋 DEPLOYMENT SUMMARY");
    console.log("=" .repeat(40));
    
    if (sonicIntegrator) {
        console.log("🎵 Sonic Integrator:", sonicIntegrator.address);
        console.log("   - Endpoint:", LAYERZERO_CONFIG.SONIC.ENDPOINT);
        console.log("   - EID:", LAYERZERO_CONFIG.SONIC.EID);
    }
    
    if (arbitrumConsumer) {
        console.log("🔷 Arbitrum Consumer:", arbitrumConsumer.address);
        console.log("   - Endpoint:", LAYERZERO_CONFIG.ARBITRUM.ENDPOINT);
        console.log("   - EID:", LAYERZERO_CONFIG.ARBITRUM.EID);
        console.log("   - VRF Coordinator:", CHAINLINK_CONFIG.VRF_COORDINATOR);
    }

    console.log("\n🔄 NEXT STEPS:");
    console.log("1. Deploy the other contract on the opposite network");
    console.log("2. Set peer connections between both contracts");
    console.log("3. Configure LayerZero DVNs and executors");
    console.log("4. Test VRF requests");
}

async function deploySonicIntegrator(deployer: any) {
    console.log("\n🎵 Deploying Sonic VRF Integrator...");
    
    const ChainlinkVRFIntegratorV2_5 = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
    
    console.log("🔧 Constructor parameters:");
    console.log("   - Endpoint:", LAYERZERO_CONFIG.SONIC.ENDPOINT);
    console.log("   - Owner:", deployer.address);
    
    const sonicIntegrator = await ChainlinkVRFIntegratorV2_5.deploy(
        LAYERZERO_CONFIG.SONIC.ENDPOINT,
        deployer.address,
        { gasLimit: 3000000 } // High gas limit for deployment
    );
    
    console.log("⏳ Waiting for deployment...");
    await sonicIntegrator.deployed();
    
    console.log("✅ Sonic Integrator deployed:", sonicIntegrator.address);
    
    // Verify deployment
    const endpoint = await sonicIntegrator.endpoint();
    const owner = await sonicIntegrator.owner();
    
    console.log("✅ Verification:");
    console.log("   - Endpoint set:", endpoint);
    console.log("   - Owner set:", owner);
    console.log("   - Endpoint correct:", endpoint.toLowerCase() === LAYERZERO_CONFIG.SONIC.ENDPOINT.toLowerCase());
    console.log("   - Owner correct:", owner.toLowerCase() === deployer.address.toLowerCase());
    
    return sonicIntegrator;
}

async function deployArbitrumConsumer(deployer: any) {
    console.log("\n🔷 Deploying Arbitrum VRF Consumer...");
    
    const OmniDragonVRFConsumerV2_5 = await ethers.getContractFactory("OmniDragonVRFConsumerV2_5");
    
    console.log("🔧 Constructor parameters:");
    console.log("   - Endpoint:", LAYERZERO_CONFIG.ARBITRUM.ENDPOINT);
    console.log("   - VRF Coordinator:", CHAINLINK_CONFIG.VRF_COORDINATOR);
    console.log("   - Owner:", deployer.address);
    
    const arbitrumConsumer = await OmniDragonVRFConsumerV2_5.deploy(
        LAYERZERO_CONFIG.ARBITRUM.ENDPOINT,
        CHAINLINK_CONFIG.VRF_COORDINATOR,
        deployer.address,
        { gasLimit: 4000000 } // High gas limit for deployment
    );
    
    console.log("⏳ Waiting for deployment...");
    await arbitrumConsumer.deployed();
    
    console.log("✅ Arbitrum Consumer deployed:", arbitrumConsumer.address);
    
    // Configure Chainlink VRF settings
    console.log("\n⚙️ Configuring Chainlink VRF...");
    try {
        const setVRFConfigTx = await arbitrumConsumer.setVRFConfig(
            CHAINLINK_CONFIG.KEY_HASH,
            CHAINLINK_CONFIG.SUBSCRIPTION_ID,
            CHAINLINK_CONFIG.REQUEST_CONFIRMATIONS,
            CHAINLINK_CONFIG.CALLBACK_GAS_LIMIT,
            CHAINLINK_CONFIG.NUM_WORDS,
            { gasLimit: 200000 }
        );
        
        await setVRFConfigTx.wait();
        console.log("✅ VRF configuration set");
        
    } catch (error: any) {
        console.log("⚠️ VRF config failed (can be set later):", error.message);
    }
    
    // Verify deployment
    const endpoint = await arbitrumConsumer.endpoint();
    const owner = await arbitrumConsumer.owner();
    const vrfCoordinator = await arbitrumConsumer.vrfCoordinator();
    
    console.log("✅ Verification:");
    console.log("   - Endpoint set:", endpoint);
    console.log("   - Owner set:", owner);
    console.log("   - VRF Coordinator:", vrfCoordinator);
    console.log("   - Endpoint correct:", endpoint.toLowerCase() === LAYERZERO_CONFIG.ARBITRUM.ENDPOINT.toLowerCase());
    console.log("   - Owner correct:", owner.toLowerCase() === deployer.address.toLowerCase());
    console.log("   - VRF Coordinator correct:", vrfCoordinator.toLowerCase() === CHAINLINK_CONFIG.VRF_COORDINATOR.toLowerCase());
    
    return arbitrumConsumer;
}

if (require.main === module) {
    freshDeployment()
        .then(() => {
            console.log("\n🎉 FRESH DEPLOYMENT COMPLETED!");
            console.log("Ready for LayerZero configuration! 🚀");
        })
        .catch((error) => {
            console.error("❌ Deployment failed:", error);
            process.exitCode = 1;
        });
} 