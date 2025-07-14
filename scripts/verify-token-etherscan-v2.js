// Etherscan V2 API Token Verification Script
// Based on the new V2 API migration guide and user's environment variables

const fetch = require('node-fetch');
const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
    // Token address to verify
    const tokenAddress = '0x6999c894f6ee7b59b0271245f27b6c371d08d777';
    const registryAddress = '0x69637BfD5D2b851D870d9E0E38B5b73FaF950777';
    
    // Chain configurations with API keys and RPC endpoints
    const chains = [
        { 
            id: 146, 
            name: 'Sonic',
            apiKey: process.env.SONICSCAN_API_KEY,
            rpcUrl: process.env.SONIC_RPC_URL,
            directAPI: 'https://api.sonicscan.org/api',
            explorer: 'https://sonicscan.org'
        },
        { 
            id: 42161, 
            name: 'Arbitrum',
            apiKey: process.env.ARBISCAN_API_KEY,
            rpcUrl: process.env.ARBITRUM_RPC_URL,
            directAPI: 'https://api.arbiscan.io/api',
            explorer: 'https://arbiscan.io'
        },
        { 
            id: 43114, 
            name: 'Avalanche',
            apiKey: process.env.SNOWSCAN_API_KEY,
            rpcUrl: process.env.AVALANCHE_RPC_URL,
            directAPI: 'https://api.snowscan.xyz/api',
            explorer: 'https://snowscan.xyz'
        }
    ];

    console.log('🔍 Verifying omniDRAGON token using Etherscan V2 API...\n');
    
    // Check API keys and RPC URLs
    console.log('🔑 Configuration Status:');
    chains.forEach(chain => {
        console.log(`   ${chain.name}:`);
        console.log(`     API Key: ${chain.apiKey ? '✅ Set' : '❌ Missing'}`);
        console.log(`     RPC URL: ${chain.rpcUrl ? '✅ Set' : '❌ Missing'}`);
    });
    console.log();
    
    const results = [];
    
    for (const chain of chains) {
        console.log(`📡 Checking ${chain.name} (Chain ID: ${chain.id})...`);
        
        const apiKey = chain.apiKey || process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';
        const result = {
            chain: chain.name,
            chainId: chain.id,
            success: false,
            contractExists: false,
            verified: false,
            tokenDetails: {},
            error: null
        };
        
        try {
            // Method 1: Direct RPC call to verify contract existence and get token details
            if (chain.rpcUrl) {
                console.log(`   🔗 Using RPC: ${chain.rpcUrl}`);
                
                const provider = new ethers.providers.JsonRpcProvider(chain.rpcUrl);
                const network = await provider.getNetwork();
                console.log(`   ✅ Connected to chain ${network.chainId}`);
                
                // Check if contract exists
                const code = await provider.getCode(tokenAddress);
                if (code !== '0x') {
                    result.contractExists = true;
                    console.log(`   ✅ Contract exists (bytecode length: ${code.length})`);
                    
                    // Get token details via RPC
                    const tokenABI = [
                        'function name() view returns (string)',
                        'function symbol() view returns (string)',
                        'function decimals() view returns (uint8)',
                        'function totalSupply() view returns (uint256)',
                        'function balanceOf(address) view returns (uint256)',
                        'function owner() view returns (address)'
                    ];
                    
                    const contract = new ethers.Contract(tokenAddress, tokenABI, provider);
                    
                    try {
                        const [name, symbol, decimals, totalSupply] = await Promise.all([
                            contract.name().catch(() => 'N/A'),
                            contract.symbol().catch(() => 'N/A'),
                            contract.decimals().catch(() => 0),
                            contract.totalSupply().catch(() => '0')
                        ]);
                        
                        const registryBalance = await contract.balanceOf(registryAddress).catch(() => '0');
                        const owner = await contract.owner().catch(() => 'N/A');
                        
                        result.tokenDetails = {
                            name,
                            symbol,
                            decimals: decimals.toString(),
                            totalSupply: totalSupply.toString(),
                            totalSupplyFormatted: ethers.utils.formatEther(totalSupply),
                            owner,
                            registryBalance: registryBalance.toString(),
                            registryBalanceFormatted: ethers.utils.formatEther(registryBalance)
                        };
                        
                        console.log(`   📛 Name: ${name}`);
                        console.log(`   🏷️  Symbol: ${symbol}`);
                        console.log(`   📊 Decimals: ${decimals}`);
                        console.log(`   📈 Total Supply: ${ethers.utils.formatEther(totalSupply)} ${symbol}`);
                        console.log(`   👑 Owner: ${owner}`);
                        console.log(`   💰 Registry Balance: ${ethers.utils.formatEther(registryBalance)} ${symbol}`);
                        
                        result.success = true;
                        
                    } catch (error) {
                        console.log(`   ⚠️  Error reading token details: ${error.message}`);
                    }
                } else {
                    console.log(`   ❌ No contract deployed at ${tokenAddress}`);
                }
            }
            
            // Method 2: Direct Chain API
            if (chain.directAPI) {
                console.log(`   🌐 Using direct API: ${chain.directAPI}`);
                
                // Check contract verification
                const sourceQuery = await fetch(`${chain.directAPI}?module=contract&action=getsourcecode&address=${tokenAddress}&apikey=${apiKey}`);
                const sourceResponse = await sourceQuery.json();
                
                if (sourceResponse.status === '1' && sourceResponse.result?.[0]?.SourceCode) {
                    result.verified = true;
                    console.log(`   ✅ Contract verified on ${chain.name}`);
                    console.log(`   📄 Contract Name: ${sourceResponse.result[0].ContractName}`);
                    console.log(`   🔧 Compiler: ${sourceResponse.result[0].CompilerVersion}`);
                } else {
                    console.log(`   ⚠️  Contract not verified on ${chain.name}`);
                }
                
                // Get token info via API
                const tokenInfoQuery = await fetch(`${chain.directAPI}?module=token&action=tokeninfo&contractaddress=${tokenAddress}&apikey=${apiKey}`);
                const tokenInfoResponse = await tokenInfoQuery.json();
                
                if (tokenInfoResponse.status === '1' && tokenInfoResponse.result) {
                    const info = tokenInfoResponse.result;
                    console.log(`   📊 API Token Info:`);
                    console.log(`     Name: ${info.tokenName || 'N/A'}`);
                    console.log(`     Symbol: ${info.tokenSymbol || 'N/A'}`);
                    console.log(`     Decimals: ${info.divisor || 'N/A'}`);
                    console.log(`     Total Supply: ${info.totalSupply || 'N/A'}`);
                }
            }
            
            // Method 3: Etherscan V2 API (fallback)
            console.log(`   🔄 Trying Etherscan V2 API...`);
            
            // Check if contract exists via V2 API
            const codeQuery = await fetch(`https://api.etherscan.io/v2/api?chainid=${chain.id}&module=proxy&action=eth_getCode&address=${tokenAddress}&tag=latest&apikey=${apiKey}`);
            const codeResponse = await codeQuery.json();
            
            if (codeResponse.result && codeResponse.result !== '0x') {
                console.log(`   ✅ Contract exists via V2 API (bytecode length: ${codeResponse.result.length})`);
                
                // Get contract verification status
                const v2SourceQuery = await fetch(`https://api.etherscan.io/v2/api?chainid=${chain.id}&module=contract&action=getsourcecode&address=${tokenAddress}&apikey=${apiKey}`);
                const v2SourceResponse = await v2SourceQuery.json();
                
                if (v2SourceResponse.status === '1' && v2SourceResponse.result?.[0]?.SourceCode) {
                    result.verified = true;
                    console.log(`   ✅ Contract verified via Etherscan V2 API`);
                    console.log(`   📄 Contract Name: ${v2SourceResponse.result[0].ContractName}`);
                } else {
                    console.log(`   ⚠️  Contract not verified via V2 API`);
                }
                
                // Get token balance via V2 API
                const v2BalanceQuery = await fetch(`https://api.etherscan.io/v2/api?chainid=${chain.id}&module=account&action=tokenbalance&contractaddress=${tokenAddress}&address=${registryAddress}&tag=latest&apikey=${apiKey}`);
                const v2BalanceResponse = await v2BalanceQuery.json();
                
                if (v2BalanceResponse.status === '1' && v2BalanceResponse.result) {
                    const balance = parseInt(v2BalanceResponse.result) / Math.pow(10, 18);
                    console.log(`   💰 Registry Balance (V2): ${balance.toLocaleString()} DRAGON`);
                }
            } else {
                console.log(`   ❌ No contract found via V2 API`);
            }
            
            // Explorer link
            console.log(`   🔗 Explorer: ${chain.explorer}/token/${tokenAddress}`);
            
        } catch (error) {
            console.error(`   ❌ Error checking ${chain.name}:`, error.message);
            result.error = error.message;
        }
        
        results.push(result);
        console.log(); // Empty line for readability
    }
    
    // Generate Summary
    console.log('📊 VERIFICATION SUMMARY');
    console.log('=======================');
    
    const successCount = results.filter(r => r.success).length;
    const verifiedCount = results.filter(r => r.verified).length;
    const existsCount = results.filter(r => r.contractExists).length;
    
    console.log(`✅ Contracts deployed: ${existsCount}/${results.length}`);
    console.log(`✅ Successfully queried: ${successCount}/${results.length}`);
    console.log(`✅ Verified contracts: ${verifiedCount}/${results.length}`);
    console.log();
    
    console.log('📋 Direct Explorer Links:');
    results.forEach(result => {
        const status = result.contractExists ? '✅' : '❌';
        const verified = result.verified ? '(Verified)' : '(Not Verified)';
        console.log(`   ${status} ${result.chain}: ${chains.find(c => c.name === result.chain).explorer}/token/${tokenAddress} ${verified}`);
    });
    
    console.log();
    console.log('🌐 API Methods Used:');
    console.log('• Direct RPC calls (primary)');
    console.log('• Chain-specific APIs (secondary)');
    console.log('• Etherscan V2 API (fallback)');
    console.log();
    
    console.log('🎯 Token Information:');
    console.log('=====================');
    console.log(`Token Address: ${tokenAddress}`);
    console.log(`Registry Address: ${registryAddress}`);
    console.log();
    
    // Display token details for each chain
    results.forEach(result => {
        if (result.success && result.tokenDetails) {
            console.log(`${result.chain} Token Details:`);
            console.log(`  Name: ${result.tokenDetails.name}`);
            console.log(`  Symbol: ${result.tokenDetails.symbol}`);
            console.log(`  Decimals: ${result.tokenDetails.decimals}`);
            console.log(`  Total Supply: ${result.tokenDetails.totalSupplyFormatted} ${result.tokenDetails.symbol}`);
            console.log(`  Owner: ${result.tokenDetails.owner}`);
            console.log(`  Registry Balance: ${result.tokenDetails.registryBalanceFormatted} ${result.tokenDetails.symbol}`);
            console.log();
        }
    });
    
    // Save results to file
    const fs = require('fs');
    const reportData = {
        timestamp: new Date().toISOString(),
        tokenAddress,
        registryAddress,
        results: results
    };
    
    fs.writeFileSync('token-verification-report-v2.json', JSON.stringify(reportData, null, 2));
    console.log('📄 Detailed report saved to: token-verification-report-v2.json');
}

// Run the verification
main().catch(console.error); 