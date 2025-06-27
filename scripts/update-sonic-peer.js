const { ethers } = require("hardhat");

async function main() {
    console.log("🔄 Updating Sonic VRF Peer Address...\n");

    // Contract addresses
    const SONIC_VRF_ADDRESS = "0x3bAc0b3C348425992224c8FafEeFc3aF6205755e";
    const CORRECT_ARBITRUM_ADDRESS = "0x6E11334470dF61D62383892Bd8e57a3a655718C8";
    const ARBITRUM_EID = 30110;

    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);

    // Connect to Sonic VRF contract
    const VRFContract = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
    const sonicContract = VRFContract.attach(SONIC_VRF_ADDRESS);

    console.log("📋 Current Configuration:");
    const currentPeer = await sonicContract.peers(ARBITRUM_EID);
    console.log(`   Current peer: ${currentPeer}`);
    console.log(`   Should be: 0x${CORRECT_ARBITRUM_ADDRESS.toLowerCase().slice(2).padStart(64, '0')}`);

    // Convert address to bytes32 format
    const correctPeerBytes32 = ethers.utils.hexZeroPad(CORRECT_ARBITRUM_ADDRESS, 32);
    console.log(`   Correct peer (bytes32): ${correctPeerBytes32}`);

    if (currentPeer.toLowerCase() !== correctPeerBytes32.toLowerCase()) {
        console.log("\n🔧 Updating peer address...");
        
        try {
            const setPeerTx = await sonicContract.setPeer(ARBITRUM_EID, correctPeerBytes32, {
                gasLimit: 150000,
                gasPrice: ethers.utils.parseUnits("5", "gwei")
            });
            console.log(`   Transaction: ${setPeerTx.hash}`);
            
            const receipt = await setPeerTx.wait();
            console.log(`   ✅ Peer updated in block ${receipt.blockNumber}`);
            
            // Verify the update
            const newPeer = await sonicContract.peers(ARBITRUM_EID);
            console.log(`   New peer: ${newPeer}`);
            
            if (newPeer.toLowerCase() === correctPeerBytes32.toLowerCase()) {
                console.log("   ✅ Peer address successfully updated!");
            } else {
                console.log("   ❌ Peer address update failed!");
            }
            
        } catch (error) {
            console.error(`   ❌ Failed to update peer: ${error.message}`);
        }
    } else {
        console.log("   ✅ Peer address is already correct!");
    }

    console.log("\n🎯 Summary:");
    console.log(`   Sonic VRF: ${SONIC_VRF_ADDRESS}`);
    console.log(`   Arbitrum Consumer: ${CORRECT_ARBITRUM_ADDRESS}`);
    console.log(`   Arbitrum EID: ${ARBITRUM_EID}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 