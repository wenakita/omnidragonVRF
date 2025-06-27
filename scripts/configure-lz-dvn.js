require('dotenv').config();
const { ethers } = require('ethers');

class LayerZeroDVNConfigurator {
    constructor() {
        this.sonicProvider = new ethers.providers.JsonRpcProvider(process.env.SONIC_RPC_URL);
        this.arbitrumProvider = new ethers.providers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
        
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.sonicProvider);
        
        this.sonicVRFIntegrator = process.env.SONIC_VRF_INTEGRATOR;
        this.arbitrumVRFConsumer = process.env.ARBITRUM_VRF_CONSUMER;
        
        // LayerZero configuration
        this.lzConfig = {
            sonic: {
                eid: 30332,
                endpoint: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B",
                // Working DVN addresses for Sonic
                dvns: [
                    "0x8ddB1b7Ea0C3d5126B5Fa62b3E9FE9c3dCf9B8D2", // LayerZero DVN
                    "0x282b3386571f7f794450d5789911a9804fa346b4", // Alternative DVN
                ]
            },
            arbitrum: {
                eid: 30110,
                endpoint: "0x1a44076050125825900e736c501f859c50fE728c",
                // Working DVN addresses for Arbitrum
                dvns: [
                    "0x2f55c492897526677c5b68fb199ea31e2c126416", // LayerZero DVN
                    "0x589dEDbD617e0CBcB916A9223F4d1300c294236b", // Alternative DVN
                ]
            }
        };
    }

    async configureDVN() {
        console.log("🔧 LayerZero DVN Configuration using OApp Wire Pattern\n");

        await this.checkCurrentConfiguration();
        await this.setupDVNConfiguration();
        await this.testConfiguredDVN();
        await this.generateWireCommands();
    }

    async checkCurrentConfiguration() {
        console.log("📊 Checking Current DVN Configuration...");

        try {
            const fs = require('fs');
            const path = require('path');
            const artifactPath = path.join(__dirname, '../artifacts/contracts/core/external/chainlink/ChainlinkVRFIntegratorV2_5.sol/ChainlinkVRFIntegratorV2_5.json');
            const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
            
            const contract = new ethers.Contract(this.sonicVRFIntegrator, artifact.abi, this.sonicProvider);

            console.log("🔍 Current Contract Status:");
            console.log(`  Contract: ${this.sonicVRFIntegrator}`);
            console.log(`  Owner: ${await contract.owner()}`);
            console.log(`  Endpoint: ${await contract.endpoint()}`);
            
            // Check enforced options
            try {
                const enforcedOptions = await contract.enforcedOptions(30110, 1);
                console.log(`  Enforced Options: ${enforcedOptions}`);
            } catch (e) {
                console.log(`  Enforced Options: Not set or failed to read`);
            }

            // Check peer connection
            const peer = await contract.peers(30110);
            console.log(`  Arbitrum Peer: ${peer}`);

        } catch (error) {
            console.log(`❌ Configuration check failed: ${error.message}`);
        }
    }

    async setupDVNConfiguration() {
        console.log("\n🛠️  Setting up DVN Configuration...");

        try {
            const fs = require('fs');
            const path = require('path');
            const artifactPath = path.join(__dirname, '../artifacts/contracts/core/external/chainlink/ChainlinkVRFIntegratorV2_5.sol/ChainlinkVRFIntegratorV2_5.json');
            const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
            
            const contract = new ethers.Contract(this.sonicVRFIntegrator, artifact.abi, this.wallet);

            // Method 1: Set enforced options for proper DVN configuration
            console.log("📝 Method 1: Setting Enforced Options...");
            
            const enforcedOptions = [
                {
                    eid: 30110, // Arbitrum
                    msgType: 1,
                    options: "0x0003010011020000000000000000000000000000000000000000000000000000000493e0" // Gas options
                }
            ];

            try {
                const tx1 = await contract.setEnforcedOptions(enforcedOptions);
                console.log(`  ✅ SetEnforcedOptions TX: ${tx1.hash}`);
                await tx1.wait();
                console.log(`  ✅ Enforced options configured`);
            } catch (error) {
                console.log(`  ❌ SetEnforcedOptions failed: ${error.message}`);
            }

            // Method 2: Set delegate if needed
            console.log("\n📝 Method 2: Setting Delegate...");
            try {
                const currentOwner = await contract.owner();
                const tx2 = await contract.setDelegate(currentOwner);
                console.log(`  ✅ SetDelegate TX: ${tx2.hash}`);
                await tx2.wait();
                console.log(`  ✅ Delegate set to owner`);
            } catch (error) {
                console.log(`  ❌ SetDelegate failed: ${error.message}`);
            }

            // Method 3: Register with LayerZero if registerMe function exists
            console.log("\n📝 Method 3: Registering with LayerZero...");
            try {
                const tx3 = await contract.registerMe();
                console.log(`  ✅ RegisterMe TX: ${tx3.hash}`);
                await tx3.wait();
                console.log(`  ✅ Registered with LayerZero`);
            } catch (error) {
                console.log(`  ❌ RegisterMe failed: ${error.message}`);
            }

        } catch (error) {
            console.log(`❌ DVN setup failed: ${error.message}`);
        }
    }

    async testConfiguredDVN() {
        console.log("\n🧪 Testing Configured DVN...");

        try {
            const fs = require('fs');
            const path = require('path');
            const artifactPath = path.join(__dirname, '../artifacts/contracts/core/external/chainlink/ChainlinkVRFIntegratorV2_5.sol/ChainlinkVRFIntegratorV2_5.json');
            const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
            
            const contract = new ethers.Contract(this.sonicVRFIntegrator, artifact.abi, this.sonicProvider);

            // Test quote function after configuration
            console.log("💰 Testing Quote Function After Configuration:");
            
            const optionsToTest = [
                "0x",
                "0x0003010011020000000000000000000000000000000000000000000000000000000493e0"
            ];

            for (const options of optionsToTest) {
                try {
                    console.log(`  Testing with options: ${options}`);
                    const quote = await contract.quote(30110, options);
                    console.log(`  ✅ SUCCESS! Quote: ${ethers.utils.formatEther(quote.nativeFee)} ETH`);
                    console.log(`  🎯 DVN Configuration Fixed!`);
                    return { success: true, workingOptions: options, quote };
                } catch (error) {
                    console.log(`  ❌ Still failing: ${error.message.split('\n')[0]}`);
                }
            }

            console.log("⚠️  Quote still failing after configuration. May need more time or different approach.");
            return { success: false };

        } catch (error) {
            console.log(`❌ DVN test failed: ${error.message}`);
            return { error };
        }
    }

    async generateWireCommands() {
        console.log("\n📋 LayerZero OApp Wire Commands for Manual Configuration:");
        
        console.log("\n🔧 If automated configuration didn't work, use these manual commands:");
        
        console.log("\n1. 📦 Install LayerZero CLI (if not already installed):");
        console.log("   npm install -g @layerzerolabs/toolbox-hardhat");
        
        console.log("\n2. 🔗 Wire the OApp connections:");
        console.log("   npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts");
        
        console.log("\n3. 📝 Create layerzero.config.ts file:");
        const configContent = `import { EndpointId } from '@layerzerolabs/lz-definitions'

const sonicContract = {
    eid: EndpointId.SONIC_MAINNET,
    contractName: 'ChainlinkVRFIntegratorV2_5',
}

const arbitrumContract = {
    eid: EndpointId.ARBITRUM_V2_MAINNET,
    contractName: 'OmniDragonVRFConsumerV2_5',
}

export default {
    contracts: [
        {
            contract: sonicContract,
        },
        {
            contract: arbitrumContract,
        },
    ],
    connections: [
        {
            from: sonicContract,
            to: arbitrumContract,
        },
        {
            from: arbitrumContract,
            to: sonicContract,
        },
    ],
}`;

        console.log(configContent);

        console.log("\n4. 🛠️  Alternative Manual DVN Configuration:");
        console.log("   # Set DVN configuration directly");
        console.log(`   npx hardhat lz:oapp:config:set --config-type dvn --target-eid 30110 --dvn ${this.lzConfig.arbitrum.dvns[0]}`);
        
        console.log("\n5. 🔍 Check DVN Status:");
        console.log("   npx hardhat lz:oapp:config:get --config-type dvn --target-eid 30110");
        
        console.log("\n6. 🧪 Test Connection:");
        console.log("   npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts --dry-run");

        console.log("\n📖 Documentation:");
        console.log("   https://docs.layerzero.network/v2/developers/evm/oapp/overview");
        console.log("   https://docs.layerzero.network/v2/developers/evm/tooling/cli");

        // Generate the config file
        const fs = require('fs');
        fs.writeFileSync('layerzero.config.ts', configContent);
        console.log("\n✅ Created layerzero.config.ts file");
    }

    async generateHardhatTask() {
        console.log("\n📝 Generating Hardhat Task for DVN Configuration...");

        const taskContent = `import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("configure-dvn", "Configure LayerZero DVN for VRF contracts")
    .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
        const { ethers } = hre;
        
        console.log("🔧 Configuring LayerZero DVN...");
        
        // Get contract
        const contract = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            "${this.sonicVRFIntegrator}"
        );
        
        // Set enforced options
        const enforcedOptions = [{
            eid: 30110,
            msgType: 1,
            options: "0x0003010011020000000000000000000000000000000000000000000000000000000493e0"
        }];
        
        const tx1 = await contract.setEnforcedOptions(enforcedOptions);
        console.log("✅ Enforced options set:", tx1.hash);
        
        // Set delegate
        const [signer] = await ethers.getSigners();
        const tx2 = await contract.setDelegate(signer.address);
        console.log("✅ Delegate set:", tx2.hash);
        
        console.log("🎯 DVN Configuration complete!");
    });`;

        const fs = require('fs');
        fs.writeFileSync('tasks/configure-dvn.ts', taskContent);
        console.log("✅ Created tasks/configure-dvn.ts");
        
        console.log("\n🚀 Run with: npx hardhat configure-dvn --network sonic");
    }
}

async function main() {
    const configurator = new LayerZeroDVNConfigurator();
    await configurator.configureDVN();
    await configurator.generateHardhatTask();
}

if (require.main === module) {
    main().catch((error) => {
        console.error("❌ DVN configuration failed:", error);
        process.exitCode = 1;
    });
}

module.exports = { LayerZeroDVNConfigurator }; 