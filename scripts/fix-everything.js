const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class OmniDragonSystemFixer {
    constructor() {
        this.fixes = [];
    }

    async runAllFixes() {
        console.log("🔧 OmniDragon System Auto-Fix Starting...\n");

        await this.fixCompilation();
        await this.fixEnvironment();
        await this.fixDeploymentStructure();
        await this.fixPackageScripts();
        
        this.generateFixReport();
    }

    async fixCompilation() {
        console.log("📋 Fixing Compilation Issues...");
        
        return new Promise((resolve) => {
            exec('npx hardhat clean && npx hardhat compile', (error, stdout, stderr) => {
                if (error) {
                    this.addFix("Compilation", "ATTEMPTED", `Cleaned and recompiled - some errors may remain: ${error.message}`, "Check contract syntax manually");
                } else {
                    this.addFix("Compilation", "FIXED", "Clean compilation successful");
                }
                resolve();
            });
        });
    }

    async fixEnvironment() {
        console.log("🔧 Fixing Environment Configuration...");

        // Create a backup of current .env
        if (fs.existsSync('.env')) {
            fs.copyFileSync('.env', '.env.backup');
            this.addFix("Environment", "FIXED", "Created .env backup");
        }

        // Update .env with missing variables
        const envUpdates = this.getEnvironmentUpdates();
        
        let envContent = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
        
        for (const [key, value] of Object.entries(envUpdates)) {
            if (!envContent.includes(key + '=')) {
                envContent += `\n${key}=${value}`;
                this.addFix("Environment", "FIXED", `Added ${key} to .env`);
            }
        }

        fs.writeFileSync('.env', envContent);
    }

    getEnvironmentUpdates() {
        return {
            // Network RPCs
            'SONIC_RPC_URL': 'https://rpc.soniclabs.com',
            'ARBITRUM_RPC_URL': 'https://arb1.arbitrum.io/rpc',
            'AVALANCHE_RPC_URL': 'https://rpc.ankr.com/avalanche',
            'BASE_RPC_URL': 'https://mainnet.base.org',
            'ETHEREUM_RPC_URL': 'https://eth.llamarpc.com',
            
            // LayerZero EIDs
            'SONIC_EID': '30332',
            'ARBITRUM_EID': '30110',
            'AVALANCHE_EID': '30106',
            'BASE_EID': '30184',
            'ETHEREUM_EID': '30101',
            
            // LayerZero Endpoints
            'SONIC_LZ_ENDPOINT': '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B',
            'ARBITRUM_LZ_ENDPOINT': '0x4f570268bF295F3A5B23b30b7717Fb8d0DcB1b8e',
            'AVALANCHE_LZ_ENDPOINT': '0x1a44076050125825900e736c501f859c50fE728c',
            'BASE_LZ_ENDPOINT': '0x1a44076050125825900e736c501f859c50fE728c',
            'ETHEREUM_LZ_ENDPOINT': '0x1a44076050125825900e736c501f859c50fE728c',
            
            // Current deployment addresses (from your deployment file)
            'SONIC_VRF_INTEGRATOR': '0x1cD88Fd477a951954de27dC77Db0E41814B222a7',
            'ARBITRUM_VRF_CONSUMER': '0x1aFF9b2bCDe8a9c29d598c40558a23b61be78551',
            'SONIC_OMNIDRAGON_TOKEN': '0xaD9f37aC24AeE7e1d167e98234C7B9939cBe998F',
            'SONIC_CREATE2_FACTORY': '0xAA28020DDA6b954D16208eccF873D79AC6533833',
            
            // Chainlink VRF Configuration
            'SONIC_CHAINLINK_VRF_COORDINATOR': '0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e',
            'ARBITRUM_CHAINLINK_VRF_COORDINATOR': '0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e',
            'SONIC_CHAINLINK_VRF_KEY_HASH': '0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409',
            'ARBITRUM_CHAINLINK_VRF_KEY_HASH': '0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409',
            'SONIC_CHAINLINK_VRF_SUBSCRIPTION_ID': '1',
            'ARBITRUM_CHAINLINK_VRF_SUBSCRIPTION_ID': '1',
            
            // Development settings
            'NODE_ENV': 'development',
            'DEBUG': 'true',
            'GAS_PRICE_MULTIPLIER': '1.2',
            'GAS_LIMIT_MULTIPLIER': '1.3'
        };
    }

    async fixDeploymentStructure() {
        console.log("📄 Fixing Deployment Structure...");

        // Ensure deployment directories exist
        const deploymentDirs = ['deployments/sonic', 'deployments/arbitrum', 'deployments/avalanche', 'deployments/base', 'deployments/ethereum'];
        
        for (const dir of deploymentDirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                this.addFix("Deployment", "FIXED", `Created directory: ${dir}`);
            }
        }

        // Create/update hardhat.config.ts with proper network configuration
        await this.updateHardhatConfig();
    }

    async updateHardhatConfig() {
        const hardhatConfigPath = 'hardhat.config.ts';
        
        if (!fs.existsSync(hardhatConfigPath)) {
            this.addFix("Config", "FAILED", "hardhat.config.ts not found", "Create hardhat.config.ts manually");
            return;
        }

        // Read current config
        let config = fs.readFileSync(hardhatConfigPath, 'utf8');
        
        // Check if networks are properly configured
        if (!config.includes('sonic:') || !config.includes('arbitrum:')) {
            this.addFix("Config", "WARNING", "Network configurations may need manual review", "Check hardhat.config.ts networks section");
        } else {
            this.addFix("Config", "PASS", "Hardhat config appears properly structured");
        }
    }

    async fixPackageScripts() {
        console.log("📦 Fixing Package Scripts...");

        const packageJsonPath = 'package.json';
        if (!fs.existsSync(packageJsonPath)) {
            this.addFix("Scripts", "FAILED", "package.json not found");
            return;
        }

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Add useful scripts if missing
        const requiredScripts = {
            'compile': 'npx hardhat compile',
            'clean': 'npx hardhat clean',
            'test': 'npx hardhat test',
            'deploy:sonic': 'npx hardhat run scripts/deploy-sonic.js --network sonic',
            'deploy:arbitrum': 'npx hardhat run scripts/deploy-arbitrum.js --network arbitrum',
            'check:system': 'node scripts/quick-system-check.js',
            'fix:system': 'node scripts/fix-everything.js',
            'test:vrf': 'npx hardhat run scripts/test-vrf-system.js'
        };

        let scriptsAdded = 0;
        for (const [scriptName, scriptCommand] of Object.entries(requiredScripts)) {
            if (!packageJson.scripts[scriptName]) {
                packageJson.scripts[scriptName] = scriptCommand;
                scriptsAdded++;
            }
        }

        if (scriptsAdded > 0) {
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            this.addFix("Scripts", "FIXED", `Added ${scriptsAdded} npm scripts`);
        } else {
            this.addFix("Scripts", "PASS", "All required scripts are present");
        }
    }

    addFix(category, status, message, action = null) {
        this.fixes.push({ category, status, message, action });
    }

    generateFixReport() {
        console.log("\n" + "=".repeat(80));
        console.log("🔧 OMNIDRAGON SYSTEM FIX REPORT");
        console.log("=".repeat(80));

        const categories = [...new Set(this.fixes.map(f => f.category))];
        
        for (const category of categories) {
            console.log(`\n🔹 ${category.toUpperCase()}`);
            console.log("-".repeat(40));

            const categoryFixes = this.fixes.filter(f => f.category === category);
            for (const fix of categoryFixes) {
                const icon = fix.status === 'FIXED' ? '✅' : fix.status === 'PASS' ? '✅' : fix.status === 'ATTEMPTED' ? '⚠️' : '❌';
                console.log(`${icon} ${fix.message}`);
                if (fix.action && fix.status !== 'FIXED' && fix.status !== 'PASS') {
                    console.log(`   🔧 Action needed: ${fix.action}`);
                }
            }
        }

        // Summary
        const fixed = this.fixes.filter(f => f.status === 'FIXED' || f.status === 'PASS').length;
        const attempted = this.fixes.filter(f => f.status === 'ATTEMPTED').length;
        const failed = this.fixes.filter(f => f.status === 'FAILED').length;

        console.log("\n" + "=".repeat(80));
        console.log("📈 FIX SUMMARY");
        console.log("=".repeat(80));
        console.log(`✅ Fixed/Good: ${fixed}`);
        console.log(`⚠️  Attempted: ${attempted}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📊 Total: ${this.fixes.length}`);

        console.log("\n🚀 NEXT STEPS:");
        console.log("1. Review any failed fixes above");
        console.log("2. Update .env with your actual private keys and API keys");
        console.log("3. Run: npm run check:system");
        console.log("4. Test compilation: npm run compile");
        console.log("5. Test VRF system: npm run test:vrf");

        if (failed === 0) {
            console.log("\n🎉 AUTO-FIX COMPLETED! Your system should be much more stable now.");
        } else {
            console.log("\n⚠️  Some issues require manual attention. Check failed items above.");
        }

        console.log("=".repeat(80));
    }
}

async function main() {
    const fixer = new OmniDragonSystemFixer();
    await fixer.runAllFixes();
}

if (require.main === module) {
    main().catch((error) => {
        console.error("❌ System fix failed:", error);
        process.exitCode = 1;
    });
}

module.exports = { OmniDragonSystemFixer }; 