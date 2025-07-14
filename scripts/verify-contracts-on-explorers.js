// Contract Verification Script for omniDRAGON
// Verifies the deployed omniDRAGON contract on Sonicscan, Arbiscan, and Snowscan

const { run } = require('hardhat');
const fetch = require('node-fetch');
require('dotenv').config();

// Contract details
const CONTRACT_ADDRESS = '0x6999c894f6ee7b59b0271245f27b6c371d08d777';
const CONTRACT_NAME = 'contracts/core/tokens/omniDRAGON.sol:omniDRAGON';

// Constructor parameters (same on all chains)
const CONSTRUCTOR_ARGS = [
    'Dragon',                                           // _name
    'DRAGON',                                          // _symbol  
    '0x69637BfD5D2b851D870d9E0E38B5b73FaF950777',     // _delegate
    '0x69637BfD5D2b851D870d9E0E38B5b73FaF950777',     // _registry
    '0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F'      // _owner
];

// Chain configurations
const CHAINS = {
    sonic: {
        name: 'Sonic',
        chainId: 146,
        networkName: 'sonic',
        apiKey: process.env.SONICSCAN_API_KEY,
        explorerUrl: 'https://sonicscan.org',
        apiUrl: 'https://api.sonicscan.org/api'
    },
    arbitrum: {
        name: 'Arbitrum',
        chainId: 42161,
        networkName: 'arbitrumOne',
        apiKey: process.env.ARBISCAN_API_KEY,
        explorerUrl: 'https://arbiscan.io',
        apiUrl: 'https://api.arbiscan.io/api'
    },
    avalanche: {
        name: 'Avalanche',
        chainId: 43114,
        networkName: 'avalanche',
        apiKey: process.env.SNOWSCAN_API_KEY,
        explorerUrl: 'https://snowscan.xyz',
        apiUrl: 'https://api.snowscan.xyz/api'
    }
};

async function verifyWithHardhat(chainName, chainConfig) {
    console.log(`\n🔨 Attempting Hardhat verification on ${chainConfig.name}...`);
    
    try {
        await run('verify:verify', {
            address: CONTRACT_ADDRESS,
            constructorArguments: CONSTRUCTOR_ARGS,
            contract: CONTRACT_NAME,
            network: chainConfig.networkName
        });
        
        console.log(`✅ ${chainConfig.name} verification successful via Hardhat`);
        return true;
    } catch (error) {
        console.log(`❌ ${chainConfig.name} Hardhat verification failed: ${error.message}`);
        return false;
    }
}

async function verifyWithAPI(chainName, chainConfig) {
    console.log(`\n🌐 Attempting API verification on ${chainConfig.name}...`);
    
    if (!chainConfig.apiKey) {
        console.log(`❌ No API key available for ${chainConfig.name}`);
        return false;
    }
    
    try {
        // Get contract source code
        const fs = require('fs');
        const path = require('path');
        
        // Read the main contract file
        const contractPath = path.join(__dirname, '..', 'contracts', 'core', 'tokens', 'omniDRAGON.sol');
        const sourceCode = fs.readFileSync(contractPath, 'utf8');
        
        // Prepare verification payload
        const formData = new URLSearchParams();
        formData.append('apikey', chainConfig.apiKey);
        formData.append('module', 'contract');
        formData.append('action', 'verifysourcecode');
        formData.append('contractaddress', CONTRACT_ADDRESS);
        formData.append('sourceCode', sourceCode);
        formData.append('codeformat', 'solidity-single-file');
        formData.append('contractname', 'omniDRAGON');
        formData.append('compilerversion', 'v0.8.20+commit.a1b79de6');
        formData.append('optimizationUsed', '1');
        formData.append('runs', '200');
        formData.append('constructorArguements', encodeConstructorArgs(CONSTRUCTOR_ARGS));
        
        const response = await fetch(chainConfig.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (result.status === '1') {
            console.log(`✅ ${chainConfig.name} verification submitted successfully`);
            console.log(`📋 Verification GUID: ${result.result}`);
            
            // Check verification status
            await checkVerificationStatus(chainConfig, result.result);
            return true;
        } else {
            console.log(`❌ ${chainConfig.name} verification failed: ${result.message}`);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ ${chainConfig.name} API verification failed: ${error.message}`);
        return false;
    }
}

async function checkVerificationStatus(chainConfig, guid) {
    console.log(`🔍 Checking verification status for ${chainConfig.name}...`);
    
    for (let i = 0; i < 10; i++) {
        try {
            const response = await fetch(
                `${chainConfig.apiUrl}?module=contract&action=checkverifystatus&guid=${guid}&apikey=${chainConfig.apiKey}`
            );
            
            const result = await response.json();
            
            if (result.status === '1') {
                console.log(`✅ ${chainConfig.name} verification completed successfully!`);
                return true;
            } else if (result.result === 'Fail - Unable to verify') {
                console.log(`❌ ${chainConfig.name} verification failed: ${result.result}`);
                return false;
            } else {
                console.log(`⏳ ${chainConfig.name} verification in progress: ${result.result}`);
                await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds
            }
        } catch (error) {
            console.log(`⚠️  Error checking verification status: ${error.message}`);
        }
    }
    
    console.log(`⏰ ${chainConfig.name} verification status check timed out`);
    return false;
}

function encodeConstructorArgs(args) {
    const { ethers } = require('ethers');
    
    // Define the constructor parameter types
    const types = [
        'string',  // _name
        'string',  // _symbol
        'address', // _delegate
        'address', // _registry
        'address'  // _owner
    ];
    
    try {
        const encoded = ethers.utils.defaultAbiCoder.encode(types, args);
        return encoded.slice(2); // Remove '0x' prefix
    } catch (error) {
        console.log(`❌ Error encoding constructor args: ${error.message}`);
        return '';
    }
}

async function verifyContract(chainName, chainConfig) {
    console.log(`\n🔍 Verifying contract on ${chainConfig.name}...`);
    console.log(`📋 Contract: ${CONTRACT_ADDRESS}`);
    console.log(`🔗 Explorer: ${chainConfig.explorerUrl}/address/${CONTRACT_ADDRESS}`);
    
    // Try Hardhat verification first
    const hardhatSuccess = await verifyWithHardhat(chainName, chainConfig);
    
    if (hardhatSuccess) {
        return true;
    }
    
    // If Hardhat fails, try API verification
    const apiSuccess = await verifyWithAPI(chainName, chainConfig);
    
    return apiSuccess;
}

async function main() {
    console.log('🚀 Starting omniDRAGON Contract Verification...\n');
    
    console.log('📊 Verification Details:');
    console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
    console.log(`Contract Name: ${CONTRACT_NAME}`);
    console.log(`Solidity Version: 0.8.20`);
    console.log(`Optimizer: Enabled (200 runs)`);
    console.log(`Constructor Args: ${CONSTRUCTOR_ARGS.join(', ')}`);
    console.log();
    
    const results = [];
    
    // Verify on each chain
    for (const [chainKey, chainConfig] of Object.entries(CHAINS)) {
        const success = await verifyContract(chainKey, chainConfig);
        results.push({
            chain: chainConfig.name,
            success: success,
            explorerUrl: `${chainConfig.explorerUrl}/address/${CONTRACT_ADDRESS}`
        });
    }
    
    // Summary
    console.log('\n📊 VERIFICATION SUMMARY');
    console.log('=======================');
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`✅ Successfully verified: ${successCount}/${totalCount} chains`);
    console.log();
    
    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.chain}: ${result.explorerUrl}`);
    });
    
    console.log();
    
    if (successCount === totalCount) {
        console.log('🎉 All contracts verified successfully!');
    } else {
        console.log('⚠️  Some contracts failed verification. You may need to verify manually.');
        console.log('💡 Manual verification steps:');
        console.log('1. Visit the explorer URL for failed chains');
        console.log('2. Go to the "Contract" tab');
        console.log('3. Click "Verify and Publish"');
        console.log('4. Use the contract details shown above');
    }
    
    // Save results
    const fs = require('fs');
    const reportData = {
        timestamp: new Date().toISOString(),
        contractAddress: CONTRACT_ADDRESS,
        constructorArgs: CONSTRUCTOR_ARGS,
        results: results
    };
    
    fs.writeFileSync('contract-verification-results.json', JSON.stringify(reportData, null, 2));
    console.log('\n📄 Verification report saved to: contract-verification-results.json');
}

// Run the verification
main().catch(console.error); 