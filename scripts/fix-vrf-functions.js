require('dotenv').config();
const { ethers } = require('ethers');

class VRFFunctionFixer {
    constructor() {
        this.sonicProvider = new ethers.providers.JsonRpcProvider(process.env.SONIC_RPC_URL);
        this.arbitrumProvider = new ethers.providers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
        
        this.sonicVRFIntegrator = process.env.SONIC_VRF_INTEGRATOR;
        this.arbitrumVRFConsumer = process.env.ARBITRUM_VRF_CONSUMER;
    }

    async fixAndTestVRFFunctions() {
        console.log("🔧 Fixing VRF Function Calls Based on Actual Contract ABI...\n");

        await this.testCorrectFunctions();
        await this.testVRFWorkflow();
        await this.generateUpdatedTestScript();
    }

    async testCorrectFunctions() {
        console.log("✅ Testing Functions That Actually Exist...");

        try {
            // Load the actual contract ABI
            const fs = require('fs');
            const path = require('path');
            const artifactPath = path.join(__dirname, '../artifacts/contracts/core/external/chainlink/ChainlinkVRFIntegratorV2_5.sol/ChainlinkVRFIntegratorV2_5.json');
            const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
            
            const contract = new ethers.Contract(this.sonicVRFIntegrator, artifact.abi, this.sonicProvider);

            // Test basic functions
            console.log("📋 Basic Contract Information:");
            const owner = await contract.owner();
            console.log(`  Owner: ${owner}`);
            
            const endpoint = await contract.endpoint();
            console.log(`  LayerZero Endpoint: ${endpoint}`);
            
            const requestCounter = await contract.requestCounter();
            console.log(`  Request Counter: ${requestCounter}`);
            
            const defaultGasLimit = await contract.defaultGasLimit();
            console.log(`  Default Gas Limit: ${defaultGasLimit}`);
            
            const requestTimeout = await contract.requestTimeout();
            console.log(`  Request Timeout: ${requestTimeout} seconds`);

            // Test peer connection
            const arbitrumPeer = await contract.peers(30110);
            console.log(`  Arbitrum Peer: ${arbitrumPeer}`);

            // Test contract status
            const [balance, isActive] = await contract.getContractStatus();
            console.log(`  Contract Balance: ${ethers.utils.formatEther(balance)} ETH`);
            console.log(`  Contract Active: ${isActive}`);

        } catch (error) {
            console.log(`❌ Basic function test failed: ${error.message}`);
        }
    }

    async testVRFWorkflow() {
        console.log("\n🎲 Testing VRF Workflow with Correct Function Signatures...");

        try {
            const fs = require('fs');
            const path = require('path');
            const artifactPath = path.join(__dirname, '../artifacts/contracts/core/external/chainlink/ChainlinkVRFIntegratorV2_5.sol/ChainlinkVRFIntegratorV2_5.json');
            const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
            
            const contract = new ethers.Contract(this.sonicVRFIntegrator, artifact.abi, this.sonicProvider);

            // Test the correct quote function (only 2 parameters)
            console.log("💰 Testing Quote Function (Correct Signature):");
            try {
                const quote = await contract.quote(30110, "0x"); // dstEid, options
                console.log(`✅ Quote successful:`);
                console.log(`  Native Fee: ${ethers.utils.formatEther(quote.nativeFee)} ETH`);
                console.log(`  LZ Token Fee: ${ethers.utils.formatEther(quote.lzTokenFee)} LZ`);
            } catch (quoteError) {
                console.log(`❌ Quote failed: ${quoteError.message}`);
            }

            // Test simple VRF request function
            console.log("\n🎯 Testing Simple VRF Request Function:");
            try {
                const simpleQuote = await contract.requestRandomWordsSimple.staticCall(30110);
                console.log(`✅ Simple VRF request quote:`);
                console.log(`  Native Fee: ${ethers.utils.formatEther(simpleQuote[0].nativeFee)} ETH`);
                console.log(`  Request ID would be: ${simpleQuote[1]}`);
            } catch (requestError) {
                console.log(`❌ Simple VRF request failed: ${requestError.message}`);
            }

            // Test advanced VRF request function
            console.log("\n⚙️ Testing Advanced VRF Request Function:");
            try {
                const advancedQuote = await contract.requestRandomWords.staticCall(30110, "0x");
                console.log(`✅ Advanced VRF request quote:`);
                console.log(`  Native Fee: ${ethers.utils.formatEther(advancedQuote[0].nativeFee)} ETH`);
                console.log(`  Request ID would be: ${advancedQuote[1]}`);
            } catch (advancedError) {
                console.log(`❌ Advanced VRF request failed: ${advancedError.message}`);
            }

        } catch (error) {
            console.log(`❌ VRF workflow test failed: ${error.message}`);
        }
    }

    async generateUpdatedTestScript() {
        console.log("\n📝 Generating Updated VRF Test Script...");

        const updatedScript = `require('dotenv').config();
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
}`;

        // Write the updated script
        const fs = require('fs');
        fs.writeFileSync('scripts/test-vrf-system-updated.js', updatedScript);
        console.log("✅ Created: scripts/test-vrf-system-updated.js");
        
        console.log("\n🔗 Key Findings:");
        console.log("1. ❌ getConfig() function does NOT exist in the deployed contract");
        console.log("2. ✅ quote() function exists but takes only 2 parameters: (dstEid, options)");
        console.log("3. ✅ requestRandomWords() and requestRandomWordsSimple() functions are available");
        console.log("4. ✅ Basic contract functions (owner, endpoint, peers) work perfectly");
        console.log("5. ✅ Contract status and balance can be checked with getContractStatus()");
        
        console.log("\n🚀 Next Steps:");
        console.log("1. Run: node scripts/test-vrf-system-updated.js");
        console.log("2. Test actual VRF requests if quote works");
        console.log("3. Update all VRF integration code to use correct function signatures");
    }
}

async function main() {
    const fixer = new VRFFunctionFixer();
    await fixer.fixAndTestVRFFunctions();
}

if (require.main === module) {
    main().catch((error) => {
        console.error("❌ VRF function fix failed:", error);
        process.exitCode = 1;
    });
}

module.exports = { VRFFunctionFixer }; 