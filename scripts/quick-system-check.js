const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class OmniDragonQuickCheck {
    constructor() {
        this.results = [];
    }

    async runAllChecks() {
        console.log("🔍 OmniDragon System Quick Check Starting...\n");

        await this.checkCompilation();
        await this.checkEnvironment();
        await this.checkDeploymentFiles();
        await this.checkNetworkAccess();
        
        this.generateReport();
    }

    async checkCompilation() {
        console.log("📋 Checking Compilation...");
        
        return new Promise((resolve) => {
            exec('npx hardhat compile', (error, stdout, stderr) => {
                if (error) {
                    this.addResult("Compilation", "FAIL", `Compilation failed: ${error.message}`, "Fix contract syntax errors");
                } else if (stderr && stderr.includes('Error')) {
                    this.addResult("Compilation", "FAIL", `Compilation errors in stderr`, "Check compilation output");
                } else {
                    this.addResult("Compilation", "PASS", "All contracts compile successfully");
                }
                resolve();
            });
        });
    }

    async checkEnvironment() {
        console.log("🔧 Checking Environment...");

        const requiredVars = [
            'PRIVATE_KEY',
            'SONIC_RPC_URL', 
            'ARBITRUM_RPC_URL',
            'SONIC_VRF_INTEGRATOR',
            'ARBITRUM_VRF_CONSUMER'
        ];

        let missingVars = [];
        let redactedVars = [];

        for (const varName of requiredVars) {
            if (!process.env[varName]) {
                missingVars.push(varName);
            } else if (process.env[varName] === '***REDACTED_FOR_SECURITY***') {
                redactedVars.push(varName);
            }
        }

        if (missingVars.length > 0) {
            this.addResult("Environment", "FAIL", `Missing variables: ${missingVars.join(', ')}`, "Add missing variables to .env");
        }

        if (redactedVars.length > 0) {
            this.addResult("Environment", "WARNING", `Redacted variables: ${redactedVars.join(', ')}`, "Replace with actual values for operation");
        }

        if (missingVars.length === 0 && redactedVars.length === 0) {
            this.addResult("Environment", "PASS", "All required environment variables are set");
        }
    }

    async checkDeploymentFiles() {
        console.log("📄 Checking Deployment Files...");

        const deploymentPaths = [
            'deployments/sonic',
            'deployments/arbitrum',
            'deployments/DEPLOYMENT_ADDRESSES.md'
        ];

        for (const deployPath of deploymentPaths) {
            if (fs.existsSync(deployPath)) {
                this.addResult("Deployments", "PASS", `Found: ${deployPath}`);
            } else {
                this.addResult("Deployments", "WARNING", `Missing: ${deployPath}`, "Deploy contracts to this network");
            }
        }

        // Check for key contract addresses
        const keyContracts = {
            'SONIC_VRF_INTEGRATOR': process.env.SONIC_VRF_INTEGRATOR,
            'ARBITRUM_VRF_CONSUMER': process.env.ARBITRUM_VRF_CONSUMER,
            'SONIC_OMNIDRAGON_TOKEN': process.env.SONIC_OMNIDRAGON_TOKEN
        };

        for (const [name, address] of Object.entries(keyContracts)) {
            if (address && address !== '***REDACTED_FOR_SECURITY***') {
                this.addResult("Contracts", "PASS", `${name}: ${address}`);
            } else {
                this.addResult("Contracts", "WARNING", `${name}: Not configured`, "Deploy or configure this contract");
            }
        }
    }

    async checkNetworkAccess() {
        console.log("🌐 Checking Network Access...");

        const networks = [
            { name: 'Sonic', rpc: process.env.SONIC_RPC_URL },
            { name: 'Arbitrum', rpc: process.env.ARBITRUM_RPC_URL }
        ];

        for (const network of networks) {
            if (!network.rpc || network.rpc === '***REDACTED_FOR_SECURITY***') {
                this.addResult("Network", "FAIL", `${network.name}: No RPC URL configured`, "Add RPC URL to .env");
                continue;
            }

            try {
                // Simple curl test
                await this.testRPC(network.name, network.rpc);
            } catch (error) {
                this.addResult("Network", "FAIL", `${network.name}: RPC test failed`, "Check RPC URL and connectivity");
            }
        }
    }

    async testRPC(networkName, rpcUrl) {
        return new Promise((resolve, reject) => {
            const curlCommand = `curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' ${rpcUrl}`;
            
            exec(curlCommand, (error, stdout, stderr) => {
                if (error) {
                    this.addResult("Network", "FAIL", `${networkName}: Connection failed`, "Check RPC URL");
                    reject(error);
                } else {
                    try {
                        const response = JSON.parse(stdout);
                        if (response.result) {
                            const blockNumber = parseInt(response.result, 16);
                            this.addResult("Network", "PASS", `${networkName}: Connected (Block: ${blockNumber})`);
                            resolve();
                        } else {
                            this.addResult("Network", "FAIL", `${networkName}: Invalid response`, "Check RPC URL");
                            reject(new Error("Invalid response"));
                        }
                    } catch (parseError) {
                        this.addResult("Network", "FAIL", `${networkName}: Response parse error`, "Check RPC URL");
                        reject(parseError);
                    }
                }
            });
        });
    }

    addResult(category, status, message, fix = null) {
        this.results.push({ category, status, message, fix });
    }

    generateReport() {
        console.log("\n" + "=".repeat(80));
        console.log("📊 OMNIDRAGON QUICK CHECK REPORT");
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
            console.log("\n🎉 SYSTEM LOOKS GOOD! Most components are operational.");
            if (warnings > 0) {
                console.log("⚠️  Address warnings above for full functionality.");
            }
        } else {
            console.log("\n🔧 CRITICAL ISSUES DETECTED. Fix failed items before proceeding.");
        }

        console.log("\n🔗 NEXT STEPS:");
        console.log("1. Fix any FAILED items above");
        console.log("2. Run: npm run compile");
        console.log("3. Test VRF system with: npx ts-node scripts/test-vrf-system.js");
        console.log("4. Deploy missing contracts if needed");

        console.log("=".repeat(80));
    }
}

async function main() {
    const checker = new OmniDragonQuickCheck();
    await checker.runAllChecks();
}

if (require.main === module) {
    main().catch((error) => {
        console.error("❌ Quick check failed:", error);
        process.exitCode = 1;
    });
}

module.exports = { OmniDragonQuickCheck }; 