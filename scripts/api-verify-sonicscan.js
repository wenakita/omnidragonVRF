const axios = require('axios');
const fs = require('fs');
const { ethers } = require('hardhat');

async function main() {
    console.log("🔧 API VERIFICATION ON SONICSCAN");
    console.log("=================================");
    
    const CONTRACT_ADDRESS = "0xC8A27A512AC32B3d63803821e121233f1E05Dc34";
    const API_KEY = process.env.SONICSCAN_API_KEY || "YW21H25FAP339T8GK8HBXYA87BZETH9DCU";
    const API_URL = "https://api.sonicscan.org/api";
    
    console.log(`📍 Contract: ${CONTRACT_ADDRESS}`);
    console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...`);
    
    // Read the flattened source code
    let sourceCode;
    try {
        sourceCode = fs.readFileSync('./flattened-vrf.sol', 'utf8');
        console.log(`✅ Source code loaded: ${(sourceCode.length / 1024).toFixed(2)} KB`);
    } catch (error) {
        console.log(`❌ Failed to read flattened source: ${error.message}`);
        console.log(`📋 Creating flattened source...`);
        return;
    }
    
    // Generate constructor arguments
    const abiCoder = new ethers.utils.AbiCoder();
    const constructorArgs = abiCoder.encode(
        ['address', 'address'],
        [
            '0x6EDCE65403992e310A62460808c4b910D972f10f', // LayerZero endpoint
            '0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F'  // Owner
        ]
    );
    
    console.log(`📋 Constructor args: ${constructorArgs}`);
    
    // Prepare verification data
    const verificationData = {
        apikey: API_KEY,
        module: 'contract',
        action: 'verifysourcecode',
        contractaddress: CONTRACT_ADDRESS,
        sourceCode: sourceCode,
        codeformat: 'solidity-single-file',
        contractname: 'ChainlinkVRFIntegratorV2_5',
        compilerversion: 'v0.8.22+commit.4fc1097e',
        optimizationUsed: '1',
        runs: '200',
        constructorArguements: constructorArgs.substring(2), // Remove 0x prefix
        licenseType: '3' // MIT License
    };
    
    console.log(`\n🚀 Submitting verification to SonicScan API...`);
    
    try {
        const response = await axios.post(API_URL, new URLSearchParams(verificationData), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 30000
        });
        
        console.log(`📤 API Response Status: ${response.status}`);
        console.log(`📋 Response Data:`, response.data);
        
        if (response.data.status === '1') {
            const guid = response.data.result;
            console.log(`✅ Verification submitted successfully!`);
            console.log(`🔍 GUID: ${guid}`);
            
            // Check verification status
            console.log(`\n⏳ Checking verification status...`);
            await checkVerificationStatus(API_URL, API_KEY, guid);
            
        } else {
            console.log(`❌ Verification failed: ${response.data.message}`);
            console.log(`📋 Result: ${response.data.result}`);
        }
        
    } catch (error) {
        console.log(`❌ API request failed: ${error.message}`);
        if (error.response) {
            console.log(`📋 Response status: ${error.response.status}`);
            console.log(`📋 Response data:`, error.response.data);
        }
    }
    
    console.log(`\n🔗 Check status manually: https://sonicscan.org/address/${CONTRACT_ADDRESS}#code`);
}

async function checkVerificationStatus(apiUrl, apiKey, guid) {
    const maxAttempts = 10;
    const delay = 3000; // 3 seconds
    
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const statusResponse = await axios.get(apiUrl, {
                params: {
                    apikey: apiKey,
                    module: 'contract',
                    action: 'checkverifystatus',
                    guid: guid
                }
            });
            
            console.log(`📊 Status check ${i + 1}/${maxAttempts}: ${statusResponse.data.result}`);
            
            if (statusResponse.data.status === '1') {
                console.log(`✅ Verification completed successfully!`);
                console.log(`🎉 Contract is now verified on SonicScan!`);
                return;
            } else if (statusResponse.data.result === 'Fail - Unable to verify') {
                console.log(`❌ Verification failed: ${statusResponse.data.result}`);
                return;
            }
            
            // Wait before next check
            if (i < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
        } catch (error) {
            console.log(`❌ Status check error: ${error.message}`);
        }
    }
    
    console.log(`⏰ Verification status check timed out. Check manually on SonicScan.`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 