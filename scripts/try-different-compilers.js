const axios = require('axios');
const fs = require('fs');

// Simple ABI encoder for constructor arguments
function encodeConstructorArgs() {
    const endpoint = "0x6EDCE65403992e310A62460808c4b910D972f10f";
    const owner = "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F";
    
    const endpointPadded = endpoint.slice(2).toLowerCase().padStart(64, '0');
    const ownerPadded = owner.slice(2).toLowerCase().padStart(64, '0');
    
    return endpointPadded + ownerPadded;
}

async function tryVerification(compilerVersion, runs) {
    console.log(`🔧 Trying compiler: ${compilerVersion} with ${runs} runs`);
    
    const CONTRACT_ADDRESS = "0xC8A27A512AC32B3d63803821e121233f1E05Dc34";
    const API_KEY = process.env.SONICSCAN_API_KEY || "YW21H25FAP339T8GK8HBXYA87BZETH9DCU";
    const API_URL = "https://api.sonicscan.org/api";
    
    // Read the flattened source code
    let sourceCode;
    try {
        sourceCode = fs.readFileSync('./flattened-vrf.sol', 'utf8');
    } catch (error) {
        console.log(`❌ Failed to read flattened source: ${error.message}`);
        return false;
    }
    
    const constructorArgs = encodeConstructorArgs();
    
    const verificationData = {
        apikey: API_KEY,
        module: 'contract',
        action: 'verifysourcecode',
        contractaddress: CONTRACT_ADDRESS,
        sourceCode: sourceCode,
        codeformat: 'solidity-single-file',
        contractname: 'ChainlinkVRFIntegratorV2_5',
        compilerversion: compilerVersion,
        optimizationUsed: '1',
        runs: runs.toString(),
        constructorArguements: constructorArgs,
        licenseType: '3'
    };
    
    try {
        const response = await axios.post(API_URL, new URLSearchParams(verificationData), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 30000
        });
        
        if (response.data.status === '1') {
            const guid = response.data.result;
            console.log(`   ✅ Submitted with GUID: ${guid}`);
            
            // Wait a bit then check status
            await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
            
            const statusResponse = await axios.get(API_URL, {
                params: {
                    apikey: API_KEY,
                    module: 'contract',
                    action: 'checkverifystatus',
                    guid: guid
                }
            });
            
            console.log(`   📊 Status: ${statusResponse.data.result}`);
            
            if (statusResponse.data.result === 'Pass - Verified') {
                console.log(`🎉 SUCCESS! Contract verified with ${compilerVersion} and ${runs} runs!`);
                return true;
            } else if (statusResponse.data.result.includes('Fail')) {
                console.log(`   ❌ Failed: ${statusResponse.data.result}`);
                return false;
            } else {
                console.log(`   ⏳ Still processing...`);
                return false;
            }
        } else {
            console.log(`   ❌ Submission failed: ${response.data.message}`);
            return false;
        }
        
    } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log("🔍 TRYING DIFFERENT COMPILER VERSIONS");
    console.log("=====================================");
    
    // Common Solidity 0.8.22 versions
    const compilerVersions = [
        'v0.8.22+commit.4fc1097e',  // Latest 0.8.22
        'v0.8.22+commit.c3b6c39e',  // Alternative
        'v0.8.22+commit.87f61d96',  // Another version
        'v0.8.20+commit.a1b79de6',  // Fallback to 0.8.20
        'v0.8.21+commit.d9974bed',  // 0.8.21 option
    ];
    
    const optimizationRuns = [200, 800, 1000]; // Try different optimization runs
    
    for (const version of compilerVersions) {
        for (const runs of optimizationRuns) {
            console.log(`\n🔧 Testing ${version} with ${runs} optimization runs...`);
            
            const success = await tryVerification(version, runs);
            if (success) {
                console.log(`\n🎯 VERIFICATION SUCCESSFUL!`);
                console.log(`✅ Compiler: ${version}`);
                console.log(`✅ Optimization runs: ${runs}`);
                console.log(`🔗 Check: https://sonicscan.org/address/0xC8A27A512AC32B3d63803821e121233f1E05Dc34#code`);
                return;
            }
            
            // Wait between attempts to avoid rate limiting
            console.log(`   ⏰ Waiting 15 seconds before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, 15000));
        }
    }
    
    console.log(`\n❌ All verification attempts failed.`);
    console.log(`📋 Manual verification may be required with exact deployment settings.`);
}

main().catch(console.error); 