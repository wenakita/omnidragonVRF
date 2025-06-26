import { ethers } from "hardhat";

async function main() {
    console.log("🔗 Setting Peer Connection: Sonic → New Arbitrum Consumer");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Contract addresses
    const sonicIntegrator = "0x3aB9Bf4C30F5995Ac27f09c487a32e97c87899E4";
    const newArbitrumConsumer = "0xD192343D5E351C983F6613e6d7c5c33f62C0eea4";

    try {
        const integrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            sonicIntegrator
        );

        console.log("✅ Connected to Sonic VRF Integrator");

        // Check current peer
        const arbitrumEid = 30110;
        console.log("\\nChecking current peer for Arbitrum EID", arbitrumEid);
        
        try {
            const currentPeer = await integrator.peers(arbitrumEid);
            console.log("Current peer:", currentPeer);
            
            const expectedPeer = ethers.utils.solidityPack(['address'], [newArbitrumConsumer]);
            console.log("Expected peer:", expectedPeer);
            
            if (currentPeer.toLowerCase() !== expectedPeer.toLowerCase()) {
                console.log("\\n🔄 Setting new peer connection...");
                
                const tx = await integrator.setPeer(arbitrumEid, expectedPeer);
                console.log("TX Hash:", tx.hash);
                
                const receipt = await tx.wait();
                console.log("✅ Peer set successfully! Block:", receipt?.blockNumber);
                
                // Verify the change
                const newPeer = await integrator.peers(arbitrumEid);
                console.log("New peer:", newPeer);
            } else {
                console.log("✅ Peer is already correctly set");
            }
            
        } catch (error: any) {
            console.error("❌ Error setting peer:", error.message);
        }

    } catch (error) {
        console.error("❌ Connection error:", error);
    }
}

main().catch(console.error); 