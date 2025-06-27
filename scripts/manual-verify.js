const axios = require('axios');
const fs = require('fs');
const { ethers } = require('hardhat');

async function main() {
    console.log("🔧 MANUAL SONICSCAN VERIFICATION");
    console.log("=================================");
    
    const CONTRACT_ADDRESS = "0xC8A27A512AC32B3d63803821e121233f1E05Dc34";
    const API_KEY = process.env.SONICSCAN_API_KEY || "YW21H25FAP339T8GK8HBXYA87BZETH9DCU";
    const API_URL = "https://api.sonicscan.org/api";
    
    // Create flattened source if it doesn't exist
    let sourceCode;
    try {
        sourceCode = fs.readFileSync('./flattened-vrf-for-verification.sol', 'utf8');
        console.log("✅ Using existing flattened source");
    } catch (error) {
        console.log("📄 Creating flattened source...");
        const { execSync } = require('child_process');
        execSync('npx hardhat flatten contracts/core/external/chainlink/ChainlinkVRFIntegratorV2_5.sol > flattened-vrf-for-verification.sol');
        sourceCode = fs.readFileSync('./flattened-vrf-for-verification.sol', 'utf8');
        console.log("✅ Flattened source created");
    }
    
    // Constructor arguments
    const constructorArgs = [
        "0x6EDCE65403992e310A62460808c4b910D972f10f", // LayerZero endpoint
        "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F"  // Owner
    ];
    
    // Encode constructor arguments
    const abiCoder = new ethers.utils.AbiCoder();
    const encodedArgs = abiCoder.encode(['address', 'address'], constructorArgs);
    
    console.log(`📍 Contract: ${CONTRACT_ADDRESS}`);
    console.log(`📋 Constructor Args: ${constructorArgs.join(', ')}`);
    console.log(`📋 Encoded Args: ${encodedArgs}`);
    
    // Try different compiler versions and settings
    const compilerConfigs = [
        {
            version: 'v0.8.22+commit.4fc1097e',
            optimizationUsed: '1',
            runs: '200',
            description: 'v0.8.22 with 200 runs'
        },
        {
            version: 'v0.8.22+commit.4fc1097e',
            optimizationUsed: '1',
            runs: '800',
            description: 'v0.8.22 with 800 runs'
        },
        {
            version: 'v0.8.20+commit.a1b79de6',
            optimizationUsed: '1',
            runs: '200',
            description: 'v0.8.20 with 200 runs'
        },
        {
            version: 'v0.8.20+commit.a1b79de6',
            optimizationUsed: '1',
            runs: '800',
            description: 'v0.8.20 with 800 runs'
        }
    ];
    
    for (const config of compilerConfigs) {
        console.log(`\n🚀 Trying ${config.description}...`);
        
        const verificationData = {
            apikey: API_KEY,
            module: 'contract',
            action: 'verifysourcecode',
            contractaddress: CONTRACT_ADDRESS,
            sourceCode: sourceCode,
            codeformat: 'solidity-single-file',
            contractname: 'ChainlinkVRFIntegratorV2_5',
            compilerversion: config.version,
            optimizationUsed: config.optimizationUsed,
            runs: config.runs,
            constructorArguements: encodedArgs.substring(2), // Remove 0x
            licenseType: '3' // MIT License
        };
        
        try {
            const response = await axios.post(API_URL, new URLSearchParams(verificationData), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 30000
            });
            
            console.log(`📊 Response Status: ${response.data.status}`);
            console.log(`📊 Response Message: ${response.data.message}`);
            console.log(`📊 Response Result: ${response.data.result}`);
            
            if (response.data.status === '1') {
                console.log(`✅ Verification submitted successfully!`);
                console.log(`🔍 GUID: ${response.data.result}`);
                
                // Check verification status
                await checkVerificationStatus(response.data.result, API_KEY, API_URL);
                break;
            } else {
                console.log(`❌ Verification failed: ${response.data.message || response.data.result}`);
            }
            
        } catch (error) {
            console.log(`❌ API error: ${error.message}`);
            if (error.response) {
                console.log(`📊 Response data:`, error.response.data);
            }
        }
        
        // Wait a bit between attempts
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n🔗 Check result: https://sonicscan.org/address/${CONTRACT_ADDRESS}#code`);
}

async function checkVerificationStatus(guid, apiKey, apiUrl) {
    console.log(`\n⏳ Checking verification status...`);
    
    for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        try {
            const statusResponse = await axios.get(apiUrl, {
                params: {
                    apikey: apiKey,
                    module: 'contract',
                    action: 'checkverifystatus',
                    guid: guid
                }
            });
            
            console.log(`📊 Status Check ${i + 1}: ${statusResponse.data.result}`);
            
            if (statusResponse.data.result === 'Pass - Verified') {
                console.log(`✅ Verification completed successfully!`);
                return;
            } else if (statusResponse.data.result.includes('Fail')) {
                console.log(`❌ Verification failed: ${statusResponse.data.result}`);
                return;
            }
            
        } catch (error) {
            console.log(`❌ Status check error: ${error.message}`);
        }
    }
    
    console.log(`⏰ Verification status check timed out. Please check manually.`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 