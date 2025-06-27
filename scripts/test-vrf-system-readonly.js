require('dotenv').config();
const { ethers } = require('ethers');

class VRFSystemReadOnlyTest {
    constructor() {
        this.results = [];
        
        // Initialize providers
        this.sonicProvider = new ethers.providers.JsonRpcProvider(process.env.SONIC_RPC_URL);
        this.arbitrumProvider = new ethers.providers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
        
        // Contract addresses
        this.sonicVRFIntegrator = process.env.SONIC_VRF_INTEGRATOR;
        this.arbitrumVRFConsumer = process.env.ARBITRUM_VRF_CONSUMER;
    }

    async runReadOnlyTests() {
        console.log("🎲 OmniDragon VRF System Read-Only Test Starting...\n");

        await this.testNetworkConnectivity();
        await this.testContractDeployments();
        await this.testVRFIntegratorConfig();
        await this.testVRFConsumerConfig();
        await this.testLayerZeroPeers();
        await this.testVRFQuote();
        
        this.generateReport();
    }

    async testNetworkConnectivity() {
        console.log("🌐 Testing Network Connectivity...");

        try {
            const sonicBlock = await this.sonicProvider.getBlockNumber();
            this.addResult("Network", "PASS", `Sonic: Connected (Block: ${sonicBlock})`);
        } catch (error) {
            this.addResult("Network", "FAIL", `Sonic: Connection failed - ${error.message}`);
        }

        try {
            const arbitrumBlock = await this.arbitrumProvider.getBlockNumber();
            this.addResult("Network", "PASS", `Arbitrum: Connected (Block: ${arbitrumBlock})`);
        } catch (error) {
            this.addResult("Network", "FAIL", `Arbitrum: Connection failed - ${error.message}`);
        }
    }

    async testContractDeployments() {
        console.log("📄 Testing Contract Deployments...");

        // Test Sonic VRF Integrator
        try {
            const sonicCode = await this.sonicProvider.getCode(this.sonicVRFIntegrator);
            if (sonicCode === "0x") {
                this.addResult("Contracts", "FAIL", "Sonic VRF Integrator: No code at address");
            } else {
                this.addResult("Contracts", "PASS", `Sonic VRF Integrator: Deployed at ${this.sonicVRFIntegrator}`);
            }
        } catch (error) {
            this.addResult("Contracts", "FAIL", `Sonic VRF Integrator: Check failed - ${error.message}`);
        }

        // Test Arbitrum VRF Consumer
        try {
            const arbitrumCode = await this.arbitrumProvider.getCode(this.arbitrumVRFConsumer);
            if (arbitrumCode === "0x") {
                this.addResult("Contracts", "FAIL", "Arbitrum VRF Consumer: No code at address");
            } else {
                this.addResult("Contracts", "PASS", `Arbitrum VRF Consumer: Deployed at ${this.arbitrumVRFConsumer}`);
            }
        } catch (error) {
            this.addResult("Contracts", "FAIL", `Arbitrum VRF Consumer: Check failed - ${error.message}`);
        }
    }

    async testVRFIntegratorConfig() {
        console.log("⚙️ Testing VRF Integrator Configuration...");

        try {
            const integratorContract = new ethers.Contract(
                this.sonicVRFIntegrator,
                [
                    "function getConfig() external view returns (address coordinator, bytes32 keyHash, uint64 subscriptionId, uint16 requestConfirmations, uint32 callbackGasLimit, uint32 numWords)",
                    "function owner() external view returns (address)"
                ],
                this.sonicProvider
            );

            const config = await integratorContract.getConfig();
            this.addResult("VRF Config", "PASS", `VRF Coordinator: ${config[0]}`);
            this.addResult("VRF Config", "PASS", `Key Hash: ${config[1]}`);
            this.addResult("VRF Config", "PASS", `Subscription ID: ${config[2]}`);
            this.addResult("VRF Config", "PASS", `Confirmations: ${config[3]}`);
            this.addResult("VRF Config", "PASS", `Callback Gas: ${config[4]}`);
            this.addResult("VRF Config", "PASS", `Num Words: ${config[5]}`);

            const owner = await integratorContract.owner();
            this.addResult("VRF Config", "PASS", `Owner: ${owner}`);

        } catch (error) {
            this.addResult("VRF Config", "FAIL", `VRF Integrator config check failed: ${error.message}`);
        }
    }

    async testVRFConsumerConfig() {
        console.log("🔧 Testing VRF Consumer Configuration...");

        try {
            const consumerContract = new ethers.Contract(
                this.arbitrumVRFConsumer,
                [
                    "function getConfig() external view returns (address coordinator, bytes32 keyHash, uint64 subscriptionId, uint16 requestConfirmations, uint32 callbackGasLimit, uint32 numWords)",
                    "function owner() external view returns (address)"
                ],
                this.arbitrumProvider
            );

            const config = await consumerContract.getConfig();
            this.addResult("Consumer Config", "PASS", `VRF Coordinator: ${config[0]}`);
            this.addResult("Consumer Config", "PASS", `Key Hash: ${config[1]}`);
            this.addResult("Consumer Config", "PASS", `Subscription ID: ${config[2]}`);

            const owner = await consumerContract.owner();
            this.addResult("Consumer Config", "PASS", `Owner: ${owner}`);

        } catch (error) {
            this.addResult("Consumer Config", "FAIL", `VRF Consumer config check failed: ${error.message}`);
        }
    }

    async testLayerZeroPeers() {
        console.log("🔗 Testing LayerZero Peer Connections...");

        try {
            // Check Sonic -> Arbitrum peer
            const sonicContract = new ethers.Contract(
                this.sonicVRFIntegrator,
                ["function peers(uint32 eid) external view returns (bytes32)"],
                this.sonicProvider
            );

            const sonicPeer = await sonicContract.peers(30110); // Arbitrum EID
            if (sonicPeer !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
                this.addResult("LayerZero", "PASS", "Sonic -> Arbitrum peer configured");
            } else {
                this.addResult("LayerZero", "FAIL", "Sonic -> Arbitrum peer not configured");
            }

            // Check Arbitrum -> Sonic peer
            const arbitrumContract = new ethers.Contract(
                this.arbitrumVRFConsumer,
                ["function peers(uint32 eid) external view returns (bytes32)"],
                this.arbitrumProvider
            );

            const arbitrumPeer = await arbitrumContract.peers(30332); // Sonic EID
            if (arbitrumPeer !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
                this.addResult("LayerZero", "PASS", "Arbitrum -> Sonic peer configured");
            } else {
                this.addResult("LayerZero", "FAIL", "Arbitrum -> Sonic peer not configured");
            }

        } catch (error) {
            this.addResult("LayerZero", "FAIL", `LayerZero peer check failed: ${error.message}`);
        }
    }

    async testVRFQuote() {
        console.log("💰 Testing VRF Quote Function...");

        try {
            const integratorContract = new ethers.Contract(
                this.sonicVRFIntegrator,
                [
                    "function quote(uint32 dstEid, bytes calldata message, bytes calldata options, bool payInLzToken) external view returns (uint256 nativeFee, uint256 lzTokenFee)"
                ],
                this.sonicProvider
            );

            const quote = await integratorContract.quote(
                30110, // Arbitrum EID
                "0x1234", // dummy message
                "0x", // no options
                false // pay in native
            );

            const feeEth = ethers.utils.formatEther(quote[0]);
            this.addResult("VRF Quote", "PASS", `Quote successful: ${feeEth} ETH`);

            if (parseFloat(feeEth) > 0) {
                this.addResult("VRF Quote", "PASS", "Quote returned reasonable fee");
            } else {
                this.addResult("VRF Quote", "WARNING", "Quote returned zero fee - check configuration");
            }

        } catch (error) {
            this.addResult("VRF Quote", "FAIL", `VRF quote failed: ${error.message}`);
        }
    }

    addResult(category, status, message) {
        this.results.push({ category, status, message });
    }

    generateReport() {
        console.log("\n" + "=".repeat(80));
        console.log("🎲 OMNIDRAGON VRF SYSTEM TEST REPORT");
        console.log("=".repeat(80));

        const categories = [...new Set(this.results.map(r => r.category))];
        
        for (const category of categories) {
            console.log(`\n🔹 ${category.toUpperCase()}`);
            console.log("-".repeat(40));

            const categoryResults = this.results.filter(r => r.category === category);
            for (const result of categoryResults) {
                const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
                console.log(`${icon} ${result.message}`);
            }
        }

        // Summary
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const warnings = this.results.filter(r => r.status === 'WARNING').length;

        console.log("\n" + "=".repeat(80));
        console.log("📈 VRF SYSTEM SUMMARY");
        console.log("=".repeat(80));
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`⚠️  Warnings: ${warnings}`);
        console.log(`📊 Total: ${this.results.length}`);

        if (failed === 0) {
            console.log("\n🎉 VRF SYSTEM IS OPERATIONAL!");
            console.log("🚀 Ready for VRF requests and cross-chain operations!");
        } else if (failed <= 2) {
            console.log("\n⚠️  VRF SYSTEM MOSTLY OPERATIONAL with minor issues.");
            console.log("🔧 Address failed items for full functionality.");
        } else {
            console.log("\n❌ VRF SYSTEM HAS CRITICAL ISSUES.");
            console.log("🛠️  Fix failed items before using in production.");
        }

        console.log("\n🔗 NEXT STEPS:");
        if (failed === 0) {
            console.log("1. System is ready for testing VRF requests");
            console.log("2. Deploy lottery contracts if needed");
            console.log("3. Test end-to-end VRF flow");
        } else {
            console.log("1. Fix failed configuration items");
            console.log("2. Ensure LayerZero peers are properly set");
            console.log("3. Verify contract deployments");
            console.log("4. Re-run this test");
        }

        console.log("=".repeat(80));
    }
}

async function main() {
    const tester = new VRFSystemReadOnlyTest();
    await tester.runReadOnlyTests();
}

if (require.main === module) {
    main().catch((error) => {
        console.error("❌ VRF system test failed:", error);
        process.exitCode = 1;
    });
}

module.exports = { VRFSystemReadOnlyTest }; 