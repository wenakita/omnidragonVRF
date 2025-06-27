const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 Setting up new VRF contract...");
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);
    
    const NEW_VRF_CONTRACT = "0xC8A27A512AC32B3d63803821e121233f1E05Dc34";
    const ARBITRUM_CONSUMER = "0x6E11334470dF61D62383892Bd8e57a3a655718C8";
    const ARBITRUM_EID = 30110;
    
    console.log(`📡 New VRF Contract: ${NEW_VRF_CONTRACT}`);
    console.log(`📡 Arbitrum Consumer: ${ARBITRUM_CONSUMER}`);
    
    // Get the contract
    const vrfContract = await ethers.getContractAt("ChainlinkVRFIntegratorV2_5", NEW_VRF_CONTRACT);
    
    console.log("\\n💰 Step 1: Funding contract with 1 ETH...");
    const fundTx = await signer.sendTransaction({
        to: NEW_VRF_CONTRACT,
        value: ethers.utils.parseEther("1.0"),
        gasLimit: 21000
    });
    
    console.log(`📤 Fund transaction: ${fundTx.hash}`);
    await fundTx.wait();
    console.log("✅ Contract funded successfully!");
    
    // Check balance
    const balance = await ethers.provider.getBalance(NEW_VRF_CONTRACT);
    console.log(`💰 Contract balance: ${ethers.utils.formatEther(balance)} S`);
    
    console.log("\\n🔗 Step 2: Setting peer connection to Arbitrum...");
    
    // Convert Arbitrum consumer address to bytes32
    const peerBytes32 = ethers.utils.hexZeroPad(ARBITRUM_CONSUMER, 32);
    console.log(`📋 Peer as bytes32: ${peerBytes32}`);
    
    const setPeerTx = await vrfContract.setPeer(ARBITRUM_EID, peerBytes32, {
        gasLimit: 200000
    });
    
    console.log(`📤 SetPeer transaction: ${setPeerTx.hash}`);
    await setPeerTx.wait();
    console.log("✅ Peer connection set successfully!");
    
    // Verify peer connection
    const peer = await vrfContract.peers(ARBITRUM_EID);
    console.log(`🔍 Verified peer: ${peer}`);
    
    console.log("\\n🎯 Setup completed!");
    console.log(`📍 Contract Address: ${NEW_VRF_CONTRACT}`);
    console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} S`);
    console.log(`🔗 Peer Set: ${peer === peerBytes32 ? '✅' : '❌'}`);
    
    console.log("\\n🚀 Ready for LayerZero wiring!");
    console.log("Run: npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 