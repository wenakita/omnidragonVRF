import { ethers } from "hardhat";

/**
 * Set peer connection on Arbitrum side: Arbitrum Consumer → Sonic Integrator
 * This might help complete the bidirectional connection needed for VRF
 */

const CONTRACTS = {
    SONIC_INTEGRATOR: "0x89Ce5E25d8c635Bd41E5Ee33bF7c63DC50A3F0fb",
    ARBITRUM_CONSUMER: "0xD192343D5E351C983F6613e6d7c5c33f62C0eea4"
};

const CHAIN_EIDS = {
    SONIC: 30332
};

async function setArbitrumPeer() {
    console.log("🔗 Setting Arbitrum → Sonic Peer Connection");
    console.log("This completes the bidirectional connection");
    console.log("=" .repeat(50));

    // Note: This would need to be run on Arbitrum network
    console.log("⚠️ This script should be run with --network arbitrum");
    console.log("📋 Arbitrum Consumer:", CONTRACTS.ARBITRUM_CONSUMER);
    console.log("🎯 Sonic Integrator:", CONTRACTS.SONIC_INTEGRATOR);
    console.log("🔗 Sonic EID:", CHAIN_EIDS.SONIC);
    
    // Convert Sonic integrator address to bytes32
    const sonicIntegratorBytes32 = ethers.utils.hexZeroPad(CONTRACTS.SONIC_INTEGRATOR, 32);
    console.log("📦 Sonic address as bytes32:", sonicIntegratorBytes32);
    
    console.log("\n🔧 Command to run on Arbitrum:");
    console.log("npx hardhat run scripts/set-arbitrum-peer.ts --network arbitrum");
    
    // If we're actually on Arbitrum, do the peer setting
    const network = await ethers.provider.getNetwork();
    if (network.chainId === 42161) { // Arbitrum mainnet
        console.log("\n✅ Running on Arbitrum - setting peer...");
        
        const [deployer] = await ethers.getSigners();
        console.log("📋 Deployer:", deployer.address);
        
        const arbitrumConsumer = await ethers.getContractAt(
            "OmniDragonVRFConsumerV2_5",
            CONTRACTS.ARBITRUM_CONSUMER
        );
        
        try {
            const setPeerTx = await arbitrumConsumer.setPeer(
                CHAIN_EIDS.SONIC,
                sonicIntegratorBytes32,
                { gasLimit: 200000 }
            );
            
            console.log("⏳ Setting peer connection...");
            await setPeerTx.wait();
            console.log("✅ Arbitrum → Sonic peer connection set!");
            console.log("📋 Transaction:", setPeerTx.hash);
            
        } catch (error: any) {
            console.log("❌ Failed to set peer:", error.message);
        }
    } else {
        console.log("❌ Not on Arbitrum network (chainId:", network.chainId, ")");
        console.log("Please run: npx hardhat run scripts/set-arbitrum-peer.ts --network arbitrum");
    }
}

if (require.main === module) {
    setArbitrumPeer().catch(console.error);
} 