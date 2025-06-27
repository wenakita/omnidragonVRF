require('dotenv').config();
const { ethers } = require('ethers');

class ContractFunctionDebugger {
    constructor() {
        this.sonicProvider = new ethers.providers.JsonRpcProvider(process.env.SONIC_RPC_URL);
        this.arbitrumProvider = new ethers.providers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
        
        this.sonicVRFIntegrator = process.env.SONIC_VRF_INTEGRATOR;
        this.arbitrumVRFConsumer = process.env.ARBITRUM_VRF_CONSUMER;
    }

    async debugAllContracts() {
        console.log("🔍 Debugging Contract Function Issues...\n");

        await this.debugContractBytecode();
        await this.debugFunctionSignatures();
        await this.testAlternativeFunctions();
        await this.debugWithHardhatConsole();
    }

    async debugContractBytecode() {
        console.log("📄 Checking Contract Bytecode...");

        try {
            // Check Sonic VRF Integrator
            const sonicCode = await this.sonicProvider.getCode(this.sonicVRFIntegrator);
            console.log(`✅ Sonic VRF Integrator bytecode length: ${sonicCode.length} characters`);
            
            if (sonicCode.length < 100) {
                console.log("❌ WARNING: Bytecode seems too short - contract may not be properly deployed");
            }

            // Check Arbitrum VRF Consumer
            const arbitrumCode = await this.arbitrumProvider.getCode(this.arbitrumVRFConsumer);
            console.log(`✅ Arbitrum VRF Consumer bytecode length: ${arbitrumCode.length} characters`);
            
            if (arbitrumCode.length < 100) {
                console.log("❌ WARNING: Bytecode seems too short - contract may not be properly deployed");
            }

        } catch (error) {
            console.log(`❌ Bytecode check failed: ${error.message}`);
        }
    }

    async debugFunctionSignatures() {
        console.log("\n🔧 Testing Different Function Signatures...");

        const alternativeSignatures = [
            // Different possible getConfig signatures
            "function getConfig() external view returns (address, bytes32, uint64, uint16, uint32, uint32)",
            "function getConfig() external view returns (tuple(address coordinator, bytes32 keyHash, uint64 subscriptionId, uint16 requestConfirmations, uint32 callbackGasLimit, uint32 numWords))",
            "function vrfConfig() external view returns (address, bytes32, uint64, uint16, uint32, uint32)",
            "function config() external view returns (address, bytes32, uint64, uint16, uint32, uint32)",
            
            // Basic functions that should exist
            "function owner() external view returns (address)",
            "function endpoint() external view returns (address)",
            
            // LayerZero functions
            "function peers(uint32) external view returns (bytes32)",
            
            // Alternative quote signatures
            "function quote(uint32, bytes, bytes, bool) external view returns (uint256, uint256)",
            "function estimateFee(uint32, bytes, bytes, bool) external view returns (uint256, uint256)"
        ];

        for (const signature of alternativeSignatures) {
            await this.testFunctionSignature(signature);
        }
    }

    async testFunctionSignature(signature) {
        try {
            const contract = new ethers.Contract(this.sonicVRFIntegrator, [signature], this.sonicProvider);
            const functionName = signature.match(/function (\w+)/)[1];
            
            console.log(`🔍 Testing: ${functionName}()`);
            
            if (functionName === 'getConfig' || functionName === 'vrfConfig' || functionName === 'config') {
                const result = await contract[functionName]();
                console.log(`✅ ${functionName}() SUCCESS:`, result);
            } else if (functionName === 'owner' || functionName === 'endpoint') {
                const result = await contract[functionName]();
                console.log(`✅ ${functionName}() SUCCESS: ${result}`);
            } else if (functionName === 'peers') {
                const result = await contract[functionName](30110); // Arbitrum EID
                console.log(`✅ ${functionName}() SUCCESS: ${result}`);
            } else if (functionName === 'quote' || functionName === 'estimateFee') {
                const result = await contract[functionName](30110, "0x1234", "0x", false);
                console.log(`✅ ${functionName}() SUCCESS: ${ethers.utils.formatEther(result[0])} ETH`);
            }
            
        } catch (error) {
            const functionName = signature.match(/function (\w+)/)[1];
            console.log(`❌ ${functionName}() FAILED: ${error.message.split('\n')[0]}`);
        }
    }

    async testAlternativeFunctions() {
        console.log("\n🧪 Testing Alternative Function Names...");

        // Test common alternative function names
        const alternativeFunctions = [
            { name: "getVRFConfig", sig: "function getVRFConfig() external view returns (address, bytes32, uint64, uint16, uint32, uint32)" },
            { name: "chainlinkConfig", sig: "function chainlinkConfig() external view returns (address, bytes32, uint64, uint16, uint32, uint32)" },
            { name: "vrfCoordinator", sig: "function vrfCoordinator() external view returns (address)" },
            { name: "keyHash", sig: "function keyHash() external view returns (bytes32)" },
            { name: "subscriptionId", sig: "function subscriptionId() external view returns (uint64)" },
            { name: "callbackGasLimit", sig: "function callbackGasLimit() external view returns (uint32)" },
            { name: "numWords", sig: "function numWords() external view returns (uint32)" },
            { name: "requestConfirmations", sig: "function requestConfirmations() external view returns (uint16)" }
        ];

        for (const func of alternativeFunctions) {
            try {
                const contract = new ethers.Contract(this.sonicVRFIntegrator, [func.sig], this.sonicProvider);
                const result = await contract[func.name]();
                console.log(`✅ ${func.name}(): ${result}`);
            } catch (error) {
                console.log(`❌ ${func.name}(): Not found or failed`);
            }
        }
    }

    async debugWithHardhatConsole() {
        console.log("\n💻 Hardhat Console Commands for Manual Testing:");
        console.log("Run these commands in 'npx hardhat console --network sonic':");
        console.log("");
        console.log(`const contract = await ethers.getContractAt("ChainlinkVRFIntegratorV2_5", "${this.sonicVRFIntegrator}");`);
        console.log("await contract.owner();");
        console.log("await contract.endpoint();");
        console.log("await contract.peers(30110);");
        console.log("");
        console.log("// Try different config function names:");
        console.log("await contract.getConfig();");
        console.log("await contract.vrfConfig();");
        console.log("await contract.config();");
        console.log("");
        console.log("// Check if contract has the functions we expect:");
        console.log("console.log(Object.getOwnPropertyNames(contract.functions));");
    }

    async checkContractABI() {
        console.log("\n📋 Checking Contract ABI from Artifacts...");
        
        try {
            // Try to load the contract ABI from artifacts
            const fs = require('fs');
            const path = require('path');
            
            const artifactPath = path.join(__dirname, '../artifacts/contracts/core/external/chainlink/ChainlinkVRFIntegratorV2_5.sol/ChainlinkVRFIntegratorV2_5.json');
            
            if (fs.existsSync(artifactPath)) {
                const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
                console.log("✅ Found contract artifact");
                
                console.log("\n📝 Available Functions:");
                const functions = artifact.abi.filter(item => item.type === 'function');
                functions.forEach(func => {
                    const inputs = func.inputs.map(input => `${input.type} ${input.name}`).join(', ');
                    const outputs = func.outputs ? func.outputs.map(output => output.type).join(', ') : 'void';
                    console.log(`  ${func.name}(${inputs}) -> ${outputs}`);
                });
                
                // Test with the actual ABI
                await this.testWithActualABI(artifact.abi);
                
            } else {
                console.log("❌ Contract artifact not found at expected path");
                console.log(`   Expected: ${artifactPath}`);
            }
            
        } catch (error) {
            console.log(`❌ ABI check failed: ${error.message}`);
        }
    }

    async testWithActualABI(abi) {
        console.log("\n🎯 Testing with Actual Contract ABI...");
        
        try {
            const contract = new ethers.Contract(this.sonicVRFIntegrator, abi, this.sonicProvider);
            
            // Test basic functions
            try {
                const owner = await contract.owner();
                console.log(`✅ owner(): ${owner}`);
            } catch (e) {
                console.log(`❌ owner(): ${e.message.split('\n')[0]}`);
            }
            
            try {
                const endpoint = await contract.endpoint();
                console.log(`✅ endpoint(): ${endpoint}`);
            } catch (e) {
                console.log(`❌ endpoint(): ${e.message.split('\n')[0]}`);
            }
            
            // Test config function
            try {
                const config = await contract.getConfig();
                console.log(`✅ getConfig(): Success`);
                console.log(`   Coordinator: ${config[0]}`);
                console.log(`   Key Hash: ${config[1]}`);
                console.log(`   Subscription ID: ${config[2]}`);
            } catch (e) {
                console.log(`❌ getConfig(): ${e.message.split('\n')[0]}`);
            }
            
            // Test quote function
            try {
                const quote = await contract.quote(30110, "0x1234", "0x", false);
                console.log(`✅ quote(): ${ethers.utils.formatEther(quote[0])} ETH`);
            } catch (e) {
                console.log(`❌ quote(): ${e.message.split('\n')[0]}`);
            }
            
        } catch (error) {
            console.log(`❌ ABI test failed: ${error.message}`);
        }
    }
}

async function main() {
    const contractDebugger = new ContractFunctionDebugger();
    await contractDebugger.debugAllContracts();
    await contractDebugger.checkContractABI();
}

if (require.main === module) {
    main().catch((error) => {
        console.error("❌ Contract debugging failed:", error);
        process.exitCode = 1;
    });
}

module.exports = { ContractFunctionDebugger }; 