require('dotenv').config();
const { ethers } = require('ethers');

class UpdatedVRFSystemTest {
    constructor() {
        this.sonicProvider = new ethers.providers.JsonRpcProvider(process.env.SONIC_RPC_URL);
        this.arbitrumProvider = new ethers.providers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
        
        this.sonicVRFIntegrator = process.env.SONIC_VRF_INTEGRATOR;
        this.arbitrumVRFConsumer = process.env.ARBITRUM_VRF_CONSUMER;
    }

    async runUpdatedTests() {
        console.log("🎲 Updated OmniDragon VRF System Test...");

        // Load contract ABI
        const fs = require('fs');
        const path = require('path');
        const artifactPath = path.join(__dirname, '../artifacts/contracts/core/external/chainlink/ChainlinkVRFIntegratorV2_5.sol/ChainlinkVRFIntegratorV2_5.json');
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        
        const sonicContract = new ethers.Contract(this.sonicVRFIntegrator, artifact.abi, this.sonicProvider);

        // Test 1: Basic contract info
        console.log("✅ Contract Owner:", await sonicContract.owner());
        console.log("✅ LayerZero Endpoint:", await sonicContract.endpoint());
        console.log("✅ Request Counter:", (await sonicContract.requestCounter()).toString());
        
        // Test 2: Peer connections
        const arbitrumPeer = await sonicContract.peers(30110);
        console.log("✅ Arbitrum Peer:", arbitrumPeer);
        
        // Test 3: Contract status
        const [balance, isActive] = await sonicContract.getContractStatus();
        console.log("✅ Contract Balance:", ethers.utils.formatEther(balance), "ETH");
        console.log("✅ Contract Active:", isActive);
        
        // Test 4: Quote function (correct signature)
        try {
            const quote = await sonicContract.quote(30110, "0x");
            console.log("✅ VRF Quote:", ethers.utils.formatEther(quote.nativeFee), "ETH");
        } catch (e) {
            console.log("❌ Quote failed:", e.message);
        }
        
        // Test 5: Simple VRF request simulation
        try {
            const simpleQuote = await sonicContract.requestRandomWordsSimple.staticCall(30110);
            console.log("✅ Simple VRF Request Quote:", ethers.utils.formatEther(simpleQuote[0].nativeFee), "ETH");
        } catch (e) {
            console.log("❌ Simple VRF request failed:", e.message);
        }
    }
}

async function main() {
    const tester = new UpdatedVRFSystemTest();
    await tester.runUpdatedTests();
}

if (require.main === module) {
    main().catch(console.error);
}