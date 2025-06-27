const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🎯 DEFINITIVE SONICSCAN VERIFICATION");
    console.log("====================================");
    
    const CONTRACT_ADDRESS = "0xC8A27A512AC32B3d63803821e121233f1E05Dc34";
    
    // Get the exact artifact that was used for deployment
    const artifact = require("../artifacts/contracts/core/external/chainlink/ChainlinkVRFIntegratorV2_5.sol/ChainlinkVRFIntegratorV2_5.json");
    
    console.log(`📍 Contract: ${CONTRACT_ADDRESS}`);
    console.log(`📋 Contract Name: ${artifact.contractName}`);
    console.log(`📁 Source: ${artifact.sourceName}`);
    
    // Get the deployed bytecode from the network
    const deployedBytecode = await ethers.provider.getCode(CONTRACT_ADDRESS);
    console.log(`📦 Deployed bytecode length: ${deployedBytecode.length} chars`);
    
    // Compare with artifact bytecode
    const artifactBytecode = "0x" + artifact.deployedBytecode.object;
    console.log(`📦 Artifact bytecode length: ${artifactBytecode.length} chars`);
    
    // Check if they match
    const bytecodeMatch = deployedBytecode.toLowerCase() === artifactBytecode.toLowerCase();
    console.log(`🔍 Bytecode match: ${bytecodeMatch ? '✅ YES' : '❌ NO'}`);
    
    if (!bytecodeMatch) {
        console.log(`⚠️  Bytecode mismatch detected!`);
        console.log(`   This explains why verification is failing.`);
        console.log(`   The contract was likely compiled with different settings.`);
        
        // Let's check if it's just metadata differences
        const deployedNoMetadata = deployedBytecode.substring(0, deployedBytecode.length - 100);
        const artifactNoMetadata = artifactBytecode.substring(0, artifactBytecode.length - 100);
        
        if (deployedNoMetadata === artifactNoMetadata) {
            console.log(`🔍 Core bytecode matches (only metadata differs)`);
        } else {
            console.log(`❌ Core bytecode also differs`);
        }
    }
    
    // Get exact constructor arguments used in deployment
    const [deployer] = await ethers.getSigners();
    const constructorArgs = [
        "0x6EDCE65403992e310A62460808c4b910D972f10f", // LayerZero endpoint
        deployer.address // Owner
    ];
    
    console.log(`\n📋 Constructor Arguments:`);
    console.log(`   Endpoint: ${constructorArgs[0]}`);
    console.log(`   Owner: ${constructorArgs[1]}`);
    
    // Try verification with the exact artifact settings
    console.log(`\n🚀 Attempting verification with artifact settings...`);
    
    try {
        // Use hardhat's run command to verify
        await run("verify:verify", {
            address: CONTRACT_ADDRESS,
            constructorArguments: constructorArgs,
            contract: "contracts/core/external/chainlink/ChainlinkVRFIntegratorV2_5.sol:ChainlinkVRFIntegratorV2_5"
        });
        
        console.log(`✅ Verification successful!`);
        
    } catch (error) {
        console.log(`❌ Hardhat verification failed: ${error.message}`);
        
        // Try manual API verification
        console.log(`\n🔧 Trying manual API verification...`);
        await tryManualVerification(CONTRACT_ADDRESS, constructorArgs);
    }
    
    console.log(`\n🔗 Check result: https://sonicscan.org/address/${CONTRACT_ADDRESS}#code`);
}

async function tryManualVerification(contractAddress, constructorArgs) {
    const axios = require('axios');
    
    // Read the flattened source
    let sourceCode;
    try {
        sourceCode = fs.readFileSync('./flattened-vrf.sol', 'utf8');
    } catch (error) {
        console.log(`❌ No flattened source found. Creating...`);
        
        // Create flattened source
        const { execSync } = require('child_process');
        execSync('npx hardhat flatten contracts/core/external/chainlink/ChainlinkVRFIntegratorV2_5.sol > flattened-vrf.sol');
        sourceCode = fs.readFileSync('./flattened-vrf.sol', 'utf8');
    }
    
    // Encode constructor arguments
    const abiCoder = new ethers.utils.AbiCoder();
    const encodedArgs = abiCoder.encode(['address', 'address'], constructorArgs);
    
    const API_KEY = process.env.SONICSCAN_API_KEY || "YW21H25FAP339T8GK8HBXYA87BZETH9DCU";
    const API_URL = "https://api.sonicscan.org/api";
    
    const verificationData = {
        apikey: API_KEY,
        module: 'contract',
        action: 'verifysourcecode',
        contractaddress: contractAddress,
        sourceCode: sourceCode,
        codeformat: 'solidity-single-file',
        contractname: 'ChainlinkVRFIntegratorV2_5',
        compilerversion: 'v0.8.22+commit.4fc1097e',
        optimizationUsed: '1',
        runs: '200',
        constructorArguements: encodedArgs.substring(2), // Remove 0x
        licenseType: '3'
    };
    
    try {
        const response = await axios.post(API_URL, new URLSearchParams(verificationData), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 30000
        });
        
        if (response.data.status === '1') {
            console.log(`✅ Manual verification submitted: ${response.data.result}`);
        } else {
            console.log(`❌ Manual verification failed: ${response.data.message}`);
        }
        
    } catch (error) {
        console.log(`❌ API error: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 