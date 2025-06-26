import { ethers } from "hardhat";

/**
 * Update Sonic VRF Integrator peer to new multi-chain consumer
 */

const CONTRACTS = {
    SONIC_INTEGRATOR: "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84",
    OLD_ARBITRUM_CONSUMER: "0xfc1f46fd517ed4193D605c59a4B27b5375457cE1",
    NEW_ARBITRUM_CONSUMER: "0xD192343D5E351C983F6613e6d7c5c33f62C0eea4"
};

const CHAIN_EIDS = {
    ARBITRUM: 30110
};

async function updateSonicPeer() {
    console.log("🔄 Updating Sonic VRF Integrator Peer Connection");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    // Connect to Sonic VRF Integrator
    console.log("\n🔗 Connecting to Sonic VRF Integrator...");
    const sonicIntegrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        CONTRACTS.SONIC_INTEGRATOR
    );

    console.log(`✅ Connected to Sonic Integrator: ${CONTRACTS.SONIC_INTEGRATOR}`);

    // Check current peer
    console.log("\n📊 Current Peer Status:");
    const currentPeer = await sonicIntegrator.peers(CHAIN_EIDS.ARBITRUM);
    console.log(`   Current Arbitrum Peer: ${currentPeer}`);
    
    const expectedOldPeer = ethers.utils.hexZeroPad(CONTRACTS.OLD_ARBITRUM_CONSUMER, 32);
    const expectedNewPeer = ethers.utils.hexZeroPad(CONTRACTS.NEW_ARBITRUM_CONSUMER, 32);
    
    console.log(`   Expected Old Peer: ${expectedOldPeer}`);
    console.log(`   Expected New Peer: ${expectedNewPeer}`);
    
    const isOldPeer = currentPeer.toLowerCase() === expectedOldPeer.toLowerCase();
    const isNewPeer = currentPeer.toLowerCase() === expectedNewPeer.toLowerCase();
    
    console.log(`   Is Old Peer: ${isOldPeer ? '✅ Yes' : '❌ No'}`);
    console.log(`   Is New Peer: ${isNewPeer ? '✅ Yes' : '❌ No'}`);

    if (isNewPeer) {
        console.log("\n🎉 Peer is already set to the new multi-chain consumer!");
        return { success: true, updated: false };
    }

    // Update peer to new multi-chain consumer
    console.log("\n🔄 Updating peer to new multi-chain consumer...");
    try {
        const updateTx = await sonicIntegrator.setPeer(
            CHAIN_EIDS.ARBITRUM,
            expectedNewPeer,
            {
                gasLimit: 100000,
                gasPrice: ethers.utils.parseUnits("100", "gwei")
            }
        );
        
        console.log(`   ⏳ Transaction sent: ${updateTx.hash}`);
        console.log("   ⏳ Waiting for confirmation...");
        
        const receipt = await updateTx.wait();
        console.log(`   ✅ Peer updated in block ${receipt.blockNumber}`);
        console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);

        // Verify the update
        const newPeer = await sonicIntegrator.peers(CHAIN_EIDS.ARBITRUM);
        const isCorrect = newPeer.toLowerCase() === expectedNewPeer.toLowerCase();
        
        console.log(`\n✅ Verification:`);
        console.log(`   New Peer: ${newPeer}`);
        console.log(`   Correctly Set: ${isCorrect ? '✅ Yes' : '❌ No'}`);

        return { 
            success: true, 
            updated: true, 
            transactionHash: updateTx.hash,
            newPeer: newPeer
        };

    } catch (error: any) {
        console.log(`   ❌ Update failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Run if called directly
if (require.main === module) {
    updateSonicPeer()
        .then((result) => {
            if (result.success) {
                if (result.updated) {
                    console.log(`\n🎉 Sonic Peer Update Complete!`);
                    console.log(`📋 Transaction: ${result.transactionHash}`);
                    console.log(`🔗 New Peer: ${result.newPeer}`);
                } else {
                    console.log(`\n✅ Peer Already Up to Date!`);
                }
            } else {
                console.log(`\n❌ Update Failed: ${result.error}`);
            }
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Update error:", error);
            process.exit(1);
        });
}

export { updateSonicPeer }; 