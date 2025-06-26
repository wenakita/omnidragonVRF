import { ethers } from "hardhat";

/**
 * Script to add new chain support to the OmniDragonVRFConsumerV2_5
 * This demonstrates how to add new chains in the future
 */

// LayerZero V2 Endpoint IDs for various chains
const CHAIN_EIDS = {
    // Currently supported
    SONIC: 30332,
    AVALANCHE: 30106,
    BASE: 30184,
    ETHEREUM: 30101,
    
    // Future chains we might want to add
    POLYGON: 30109,
    BSC: 30102,
    OPTIMISM: 30111,
    FANTOM: 30112,
    METIS: 30151,
    KAVA: 30177,
    CELO: 30125,
    GNOSIS: 30145,
    MOONBEAM: 30126,
    FUSE: 30138,
    KLAYTN: 30150,
    COREDAO: 30153,
    TENET: 30173,
    NOVA: 30175,
    KROMA: 30172,
    MANTLE: 30181,
    SCROLL: 30214,
    TAIKO: 30290,
    BLAST: 30243
};

async function addNewChainSupport() {
    console.log("🌐 Adding New Chain Support to Multi-Chain VRF Consumer");
    console.log("=" .repeat(60));

    // Get the deployed VRF Consumer contract on Arbitrum
    const VRF_CONSUMER_ADDRESS = "0xfc1f46fd517ed4193D605c59a4B27b5375457cE1"; // Your Arbitrum address
    
    const [deployer] = await ethers.getSigners();
    console.log("📋 Owner address:", deployer.address);

    // Connect to the VRF Consumer contract
    const vrfConsumer = await ethers.getContractAt(
        "OmniDragonVRFConsumerV2_5",
        VRF_CONSUMER_ADDRESS
    );

    // Example: Add Polygon support
    console.log("\n🔗 Adding Polygon Chain Support...");
    
    try {
        const tx = await vrfConsumer.setSupportedChain(
            CHAIN_EIDS.POLYGON,  // Chain EID
            true,                // Enable support
            690420              // Gas limit for responses to Polygon
        );
        
        console.log("⏳ Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Polygon support added!");
        
    } catch (error: any) {
        console.log("❌ Error adding Polygon:", error.message);
    }

    // Example: Add BSC support
    console.log("\n🔗 Adding BSC Chain Support...");
    
    try {
        const tx = await vrfConsumer.setSupportedChain(
            CHAIN_EIDS.BSC,     // Chain EID  
            true,               // Enable support
            500000             // Lower gas limit for BSC (cheaper)
        );
        
        console.log("⏳ Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ BSC support added!");
        
    } catch (error: any) {
        console.log("❌ Error adding BSC:", error.message);
    }

    // Check current supported chains
    console.log("\n📊 Current Supported Chains:");
    try {
        const [eids, supported, gasLimits] = await vrfConsumer.getSupportedChains();
        
        const chainNames = {
            [CHAIN_EIDS.SONIC]: "Sonic",
            [CHAIN_EIDS.AVALANCHE]: "Avalanche", 
            [CHAIN_EIDS.BASE]: "Base",
            [CHAIN_EIDS.ETHEREUM]: "Ethereum",
            [CHAIN_EIDS.POLYGON]: "Polygon",
            [CHAIN_EIDS.BSC]: "BSC"
        };

        for (let i = 0; i < eids.length; i++) {
            const chainName = chainNames[eids[i].toString()] || `Chain ${eids[i]}`;
            console.log(`  ${chainName} (${eids[i]}): ${supported[i] ? '✅ Supported' : '❌ Not Supported'} - Gas: ${gasLimits[i]}`);
        }
        
    } catch (error: any) {
        console.log("❌ Error getting supported chains:", error.message);
    }

    console.log("\n🎯 Next Steps:");
    console.log("1. Deploy ChainlinkVRFIntegratorV2_5 on the new chain");
    console.log("2. Set up LayerZero peer connections");
    console.log("3. Configure DVN settings");
    console.log("4. Test VRF requests");
}

/**
 * Function to remove chain support (if needed)
 */
async function removeChainSupport(chainEid: number) {
    console.log(`🗑️ Removing support for chain ${chainEid}...`);
    
    const VRF_CONSUMER_ADDRESS = "0xfc1f46fd517ed4193D605c59a4B27b5375457cE1";
    const vrfConsumer = await ethers.getContractAt(
        "OmniDragonVRFConsumerV2_5", 
        VRF_CONSUMER_ADDRESS
    );

    try {
        const tx = await vrfConsumer.setSupportedChain(
            chainEid,
            false,  // Disable support
            0       // Gas limit doesn't matter when disabled
        );
        
        console.log("⏳ Transaction sent:", tx.hash);
        await tx.wait();
        console.log(`✅ Chain ${chainEid} support removed!`);
        
    } catch (error: any) {
        console.log(`❌ Error removing chain ${chainEid}:`, error.message);
    }
}

/**
 * Function to update gas limits for existing chains
 */
async function updateChainGasLimit(chainEid: number, newGasLimit: number) {
    console.log(`⚡ Updating gas limit for chain ${chainEid} to ${newGasLimit}...`);
    
    const VRF_CONSUMER_ADDRESS = "0xfc1f46fd517ed4193D605c59a4B27b5375457cE1";
    const vrfConsumer = await ethers.getContractAt(
        "OmniDragonVRFConsumerV2_5",
        VRF_CONSUMER_ADDRESS
    );

    try {
        const tx = await vrfConsumer.setSupportedChain(
            chainEid,
            true,           // Keep supported
            newGasLimit     // New gas limit
        );
        
        console.log("⏳ Transaction sent:", tx.hash);
        await tx.wait();
        console.log(`✅ Gas limit updated for chain ${chainEid}!`);
        
    } catch (error: any) {
        console.log(`❌ Error updating chain ${chainEid}:`, error.message);
    }
}

// Export functions for use in other scripts
export { addNewChainSupport, removeChainSupport, updateChainGasLimit, CHAIN_EIDS };

// Run if called directly
if (require.main === module) {
    addNewChainSupport()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
} 