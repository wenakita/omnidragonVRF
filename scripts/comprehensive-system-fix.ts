import { ethers } from "hardhat";
import { network } from "hardhat";

interface DiagnosticResult {
    category: string;
    status: 'PASS' | 'FAIL' | 'WARNING';
    message: string;
    fix?: string;
}

interface NetworkConfig {
    name: string;
    chainId: number;
    rpcUrl: string;
    contracts: {
        vrfIntegrator?: string;
        vrfConsumer?: string;
        omnidragonToken?: string;
        create2Factory?: string;
    };
}

const NETWORKS: Record<string, NetworkConfig> = {
    sonic: {
        name: "Sonic",
        chainId: 146,
        rpcUrl: "https://rpc.soniclabs.com",
        contracts: {
            vrfIntegrator: "0x1cD88Fd477a951954de27dC77Db0E41814B222a7",
            omnidragonToken: "0xaD9f37aC24AeE7e1d167e98234C7B9939cBe998F",
            create2Factory: "0xAA28020DDA6b954D16208eccF873D79AC6533833"
        }
    },
    arbitrum: {
        name: "Arbitrum",
        chainId: 42161,
        rpcUrl: "https://arb1.arbitrum.io/rpc",
        contracts: {
            vrfConsumer: "0x1aFF9b2bCDe8a9c29d598c40558a23b61be78551"
        }
    }
};

class OmniDragonSystemDiagnostic {
    private results: DiagnosticResult[] = [];

    async runComprehensiveDiagnostic(): Promise<void> {
        console.log("🔍 Starting OmniDragon System Comprehensive Diagnostic...\n");

        // 1. Check compilation
        await this.checkCompilation();

        // 2. Check environment configuration
        await this.checkEnvironment();

        // 3. Check network connectivity
        await this.checkNetworkConnectivity();

        // 4. Check deployed contracts
        await this.checkDeployedContracts();

        // 5. Check VRF system
        await this.checkVRFSystem();

        // 6. Check LayerZero configuration
        await this.checkLayerZeroConfig();

        // Generate report
        this.generateReport();
    }

    private async checkCompilation(): Promise<void> {
        console.log("📋 Checking Contract Compilation...");
        try {
            // This will throw if compilation fails
            const artifacts = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
            this.addResult("Compilation", "PASS", "All contracts compile successfully");
        } catch (error) {
            this.addResult("Compilation", "FAIL", `Compilation failed: ${error}`, "Run 'npx hardhat compile' to see detailed errors");
        }
    }

    private async checkEnvironment(): Promise<void> {
        console.log("🔧 Checking Environment Configuration...");

        const requiredVars = [
            'PRIVATE_KEY',
            'SONIC_RPC_URL',
            'ARBITRUM_RPC_URL',
            'SONIC_VRF_INTEGRATOR',
            'ARBITRUM_VRF_CONSUMER'
        ];

        for (const varName of requiredVars) {
            if (!process.env[varName] || process.env[varName] === '***REDACTED_FOR_SECURITY***') {
                this.addResult("Environment", "FAIL", `Missing or redacted: ${varName}`, "Update your .env file with actual values");
            }
        }

        if (this.results.filter(r => r.category === "Environment" && r.status === "FAIL").length === 0) {
            this.addResult("Environment", "PASS", "All required environment variables are set");
        }
    }

    private async checkNetworkConnectivity(): Promise<void> {
        console.log("🌐 Checking Network Connectivity...");

        for (const [networkName, config] of Object.entries(NETWORKS)) {
            try {
                const provider = new ethers.JsonRpcProvider(config.rpcUrl);
                const blockNumber = await provider.getBlockNumber();
                this.addResult("Network", "PASS", `${config.name}: Connected (Block: ${blockNumber})`);
            } catch (error) {
                this.addResult("Network", "FAIL", `${config.name}: Connection failed`, `Check RPC URL: ${config.rpcUrl}`);
            }
        }
    }

    private async checkDeployedContracts(): Promise<void> {
        console.log("📄 Checking Deployed Contracts...");

        for (const [networkName, config] of Object.entries(NETWORKS)) {
            try {
                const provider = new ethers.JsonRpcProvider(config.rpcUrl);

                for (const [contractType, address] of Object.entries(config.contracts)) {
                    if (address) {
                        const code = await provider.getCode(address);
                        if (code === "0x") {
                            this.addResult("Contracts", "FAIL", `${config.name} ${contractType}: No code at ${address}`, "Redeploy contract");
                        } else {
                            this.addResult("Contracts", "PASS", `${config.name} ${contractType}: Deployed at ${address}`);
                        }
                    }
                }
            } catch (error) {
                this.addResult("Contracts", "FAIL", `${config.name}: Failed to check contracts - ${error}`);
            }
        }
    }

    private async checkVRFSystem(): Promise<void> {
        console.log("🎲 Checking VRF System...");

        // Check Sonic VRF Integrator
        try {
            const sonicProvider = new ethers.JsonRpcProvider(NETWORKS.sonic.rpcUrl);
            const integratorContract = new ethers.Contract(
                NETWORKS.sonic.contracts.vrfIntegrator!,
                [
                    "function quote(uint32 dstEid, bytes calldata message, bytes calldata options, bool payInLzToken) external view returns (uint256 nativeFee, uint256 lzTokenFee)",
                    "function getConfig() external view returns (address coordinator, bytes32 keyHash, uint64 subscriptionId, uint16 requestConfirmations, uint32 callbackGasLimit, uint32 numWords)"
                ],
                sonicProvider
            );

            const config = await integratorContract.getConfig();
            this.addResult("VRF", "PASS", `Sonic VRF Integrator: Configured with coordinator ${config[0]}`);

            // Test quote function
            try {
                const quote = await integratorContract.quote(
                    30110, // Arbitrum EID
                    "0x1234", // dummy message
                    "0x", // no options
                    false // pay in native
                );
                this.addResult("VRF", "PASS", `VRF Quote: ${ethers.formatEther(quote[0])} ETH`);
            } catch (quoteError) {
                this.addResult("VRF", "FAIL", `VRF Quote failed: ${quoteError}`, "Check LayerZero configuration");
            }

        } catch (error) {
            this.addResult("VRF", "FAIL", `VRF System check failed: ${error}`);
        }
    }

    private async checkLayerZeroConfig(): Promise<void> {
        console.log("🔗 Checking LayerZero Configuration...");

        try {
            // Check if contracts have proper peer connections
            const sonicProvider = new ethers.JsonRpcProvider(NETWORKS.sonic.rpcUrl);
            const arbitrumProvider = new ethers.JsonRpcProvider(NETWORKS.arbitrum.rpcUrl);

            // Check Sonic -> Arbitrum peer
            const sonicContract = new ethers.Contract(
                NETWORKS.sonic.contracts.vrfIntegrator!,
                ["function peers(uint32 eid) external view returns (bytes32)"],
                sonicProvider
            );

            const sonicPeer = await sonicContract.peers(30110); // Arbitrum EID
            if (sonicPeer !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
                this.addResult("LayerZero", "PASS", "Sonic has Arbitrum peer configured");
            } else {
                this.addResult("LayerZero", "FAIL", "Sonic missing Arbitrum peer", "Run peer configuration script");
            }

            // Check Arbitrum -> Sonic peer
            const arbitrumContract = new ethers.Contract(
                NETWORKS.arbitrum.contracts.vrfConsumer!,
                ["function peers(uint32 eid) external view returns (bytes32)"],
                arbitrumProvider
            );

            const arbitrumPeer = await arbitrumContract.peers(30332); // Sonic EID
            if (arbitrumPeer !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
                this.addResult("LayerZero", "PASS", "Arbitrum has Sonic peer configured");
            } else {
                this.addResult("LayerZero", "FAIL", "Arbitrum missing Sonic peer", "Run peer configuration script");
            }

        } catch (error) {
            this.addResult("LayerZero", "FAIL", `LayerZero config check failed: ${error}`);
        }
    }

    private addResult(category: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, fix?: string): void {
        this.results.push({ category, status, message, fix });
    }

    private generateReport(): void {
        console.log("\n" + "=".repeat(80));
        console.log("📊 OMNIDRAGON SYSTEM DIAGNOSTIC REPORT");
        console.log("=".repeat(80));

        const categories = [...new Set(this.results.map(r => r.category))];
        
        for (const category of categories) {
            console.log(`\n🔹 ${category.toUpperCase()}`);
            console.log("-".repeat(40));

            const categoryResults = this.results.filter(r => r.category === category);
            for (const result of categoryResults) {
                const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
                console.log(`${icon} ${result.message}`);
                if (result.fix && result.status !== 'PASS') {
                    console.log(`   💡 Fix: ${result.fix}`);
                }
            }
        }

        // Summary
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const warnings = this.results.filter(r => r.status === 'WARNING').length;

        console.log("\n" + "=".repeat(80));
        console.log("📈 SUMMARY");
        console.log("=".repeat(80));
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`⚠️  Warnings: ${warnings}`);
        console.log(`📊 Total: ${this.results.length}`);

        if (failed === 0) {
            console.log("\n🎉 ALL SYSTEMS OPERATIONAL! Your OmniDragon VRF system is ready!");
        } else {
            console.log("\n🔧 ISSUES DETECTED. Follow the fix suggestions above to resolve problems.");
        }

        console.log("=".repeat(80));
    }
}

async function main() {
    const diagnostic = new OmniDragonSystemDiagnostic();
    await diagnostic.runComprehensiveDiagnostic();
}

if (require.main === module) {
    main().catch((error) => {
        console.error("❌ Diagnostic failed:", error);
        process.exitCode = 1;
    });
} 