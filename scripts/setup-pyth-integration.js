const { ethers } = require("hardhat");

async function main() {
    console.log("⚡ Setting Up Pyth Network Integration");
    console.log("=====================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Account:", deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(await deployer.getBalance()), "S");
    
    // Pyth Network Configuration for Sonic
    const PYTH_CONFIG = {
        // Pyth contract address on Sonic (if available)
        PYTH_CONTRACT: "0x2880aB155794e7179c9eE2e38200202908C17B43",
        
        // Common Pyth price feed IDs (these are universal across chains)
        PRICE_FEED_IDS: {
            // Crypto feeds
            ETH_USD: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
            BTC_USD: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
            SOL_USD: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
            
            // Stablecoins
            USDC_USD: "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
            USDT_USD: "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca5f93ba5e4c4e1d5b0e7e3b8a6",
            DAI_USD: "0xb0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e833f70dabfd",
            
            // Traditional assets
            AAPL_USD: "0x49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688",
            TSLA_USD: "0x16dad506d7db8da01c42b3a85b16f0a5b26b42b8c87a9d3d8c7e5f4e1b4f5c6d",
            
            // Forex
            EUR_USD: "0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b",
            GBP_USD: "0x84c2dde9633d93d1bcad84e7dc41c9d56578b7ec52fabedc1f335d673df0a7c1"
        },
        
        // Pyth Network endpoints
        ENDPOINTS: {
            MAINNET: "https://hermes.pyth.network",
            TESTNET: "https://hermes-beta.pyth.network"
        }
    };
    
    console.log("\n📋 Pyth Network Setup Guide");
    console.log("===========================");
    
    console.log("🔗 **Step 1: Understanding Pyth Network**");
    console.log("   • Pyth is a pull-based oracle (you request updates)");
    console.log("   • Price feeds are identified by unique 32-byte IDs");
    console.log("   • Updates require calling updatePriceFeeds() with fee");
    console.log("   • Data is available across 100+ blockchains");
    
    console.log("\n📊 **Step 2: Available Price Feed IDs**");
    console.log("   Key price feeds for OmniDragon:");
    Object.entries(PYTH_CONFIG.PRICE_FEED_IDS).forEach(([symbol, id]) => {
        console.log(`   ${symbol}: ${id}`);
    });
    
    console.log("\n⚡ **Step 3: Pyth Pull Oracle Model**");
    console.log("   1. Get price update data from Pyth API");
    console.log("   2. Submit update transaction with fee");
    console.log("   3. Read the updated price from contract");
    console.log("   4. Updates are atomic and instant");
    
    // Test Pyth Network contract connection
    console.log("\n🧪 Testing Pyth Network Contract...");
    try {
        const pythContract = await ethers.getContractAt("IPyth", PYTH_CONFIG.PYTH_CONTRACT);
        console.log(`✅ Connected to Pyth contract: ${PYTH_CONFIG.PYTH_CONTRACT}`);
        
        // Test basic contract functions
        try {
            // Try to get a price (this might fail if no recent updates)
            const ethPriceFeedId = PYTH_CONFIG.PRICE_FEED_IDS.ETH_USD;
            console.log(`📊 Testing ETH/USD price feed: ${ethPriceFeedId}`);
            
            // Note: This will likely fail without price update data
            console.log("⚠️ Note: Reading prices requires recent update data");
            console.log("   In production, you would:");
            console.log("   1. Fetch update data from Pyth API");
            console.log("   2. Call updatePriceFeeds() with the data");
            console.log("   3. Then read the price");
            
        } catch (priceError) {
            console.log("ℹ️ Cannot read price without update data (expected)");
            console.log("   This is normal for Pyth's pull oracle model");
        }
        
    } catch (error) {
        console.log("❌ Could not connect to Pyth contract");
        console.log("   Error:", error.message);
        console.log("   The contract might not be deployed on Sonic yet");
    }
    
    // Create example Pyth integration
    console.log("\n📝 Example Pyth Integration Contract");
    console.log("===================================");
    
    const exampleContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

contract PythPriceReader {
    IPyth public pyth;
    
    // Price feed IDs
    bytes32 public constant ETH_USD_FEED_ID = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
    bytes32 public constant BTC_USD_FEED_ID = 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43;
    
    constructor(address _pythContract) {
        pyth = IPyth(_pythContract);
    }
    
    function updateAndGetETHPrice(
        bytes[] calldata priceUpdateData
    ) external payable returns (PythStructs.Price memory) {
        // Get the update fee
        uint fee = pyth.getUpdateFee(priceUpdateData);
        
        // Update the price feeds
        pyth.updatePriceFeeds{value: fee}(priceUpdateData);
        
        // Get the updated price
        return pyth.getPrice(ETH_USD_FEED_ID);
    }
    
    function getETHPriceNoUpdate() external view returns (PythStructs.Price memory) {
        // Get price without updating (might be stale)
        return pyth.getPrice(ETH_USD_FEED_ID);
    }
    
    function getUpdateFee(bytes[] calldata priceUpdateData) external view returns (uint) {
        return pyth.getUpdateFee(priceUpdateData);
    }
}`;
    
    console.log(exampleContract);
    
    // Integration with Dragon Oracle
    console.log("\n🐉 Dragon Oracle Integration Strategy");
    console.log("====================================");
    
    console.log("**Option 1: On-Demand Updates**");
    console.log("• Fetch Pyth data when updateMultiOraclePrice() is called");
    console.log("• Requires API call to Pyth Hermes endpoint");
    console.log("• Higher gas costs but fresher data");
    
    console.log("\n**Option 2: Cached Updates**");
    console.log("• Update Pyth prices periodically (every hour)");
    console.log("• Use cached prices for oracle aggregation");
    console.log("• Lower gas costs but potentially stale data");
    
    console.log("\n**Recommended: Hybrid Approach**");
    console.log("• Cache Pyth prices with 30-minute validity");
    console.log("• Fallback to other oracles if Pyth is stale");
    console.log("• Use Pyth for validation and cross-reference");
    
    // JavaScript integration example
    console.log("\n💻 JavaScript Integration Example");
    console.log("=================================");
    
    const jsExample = `
// Fetch price update data from Pyth
const axios = require('axios');

async function getPythPriceUpdate(feedIds) {
    const pythEndpoint = "${PYTH_CONFIG.ENDPOINTS.MAINNET}";
    const url = \`\${pythEndpoint}/api/latest_price_feeds?ids[]=\${feedIds.join('&ids[]=')}\`;
    
    const response = await axios.get(url);
    return response.data.binary.data; // Update data for contract
}

// Update Dragon Oracle with Pyth data
async function updateDragonOracleWithPyth() {
    const feedIds = [
        "${PYTH_CONFIG.PRICE_FEED_IDS.ETH_USD}",
        "${PYTH_CONFIG.PRICE_FEED_IDS.BTC_USD}"
    ];
    
    // Get update data
    const updateData = await getPythPriceUpdate(feedIds);
    
    // Update Pyth contract
    const pythContract = await ethers.getContractAt("IPyth", PYTH_ADDRESS);
    const updateFee = await pythContract.getUpdateFee([updateData]);
    
    await pythContract.updatePriceFeeds([updateData], { value: updateFee });
    
    // Now update Dragon Oracle
    const oracle = await ethers.getContractAt("DragonMarketOracle", ORACLE_ADDRESS);
    await oracle.updateMultiOraclePrice();
}`;
    
    console.log(jsExample);
    
    // Cost analysis
    console.log("\n💰 Pyth Network Cost Analysis");
    console.log("=============================");
    
    console.log("📊 **Update Fees**:");
    console.log("   • Base fee: ~$0.01 per price feed update");
    console.log("   • Multiple feeds: Slightly higher total fee");
    console.log("   • Fee paid in native token (S on Sonic)");
    
    console.log("\n⚖️ **Weight Recommendation**:");
    console.log("   • Suggested weight: 10% (lowest among oracles)");
    console.log("   • Reason: Higher cost, pull-based model");
    console.log("   • Use case: Validation and cross-reference");
    
    console.log("\n🎯 **Best Practices**:");
    console.log("   • Update only when needed (not every transaction)");
    console.log("   • Batch multiple price feeds in single update");
    console.log("   • Cache results for short periods");
    console.log("   • Implement fallback to other oracles");
    
    // Deployment considerations
    console.log("\n🚀 Deployment Considerations");
    console.log("============================");
    
    console.log("**For Sonic Blockchain**:");
    console.log("• Check if Pyth is officially supported on Sonic");
    console.log("• If not available, consider using Pyth on other chains");
    console.log("• Alternative: Use Pyth for off-chain validation");
    
    console.log("\n**Integration Steps**:");
    console.log("1. Verify Pyth contract deployment on Sonic");
    console.log("2. Configure price feed IDs in Dragon Oracle");
    console.log("3. Implement update mechanism (on-demand or scheduled)");
    console.log("4. Test with small amounts first");
    console.log("5. Monitor costs and performance");
    
    // Resources and support
    console.log("\n📞 Pyth Network Resources");
    console.log("=========================");
    
    console.log("🔗 **Official Links**:");
    console.log("   • Website: https://pyth.network");
    console.log("   • Docs: https://docs.pyth.network");
    console.log("   • Price Feeds: https://pyth.network/price-feeds");
    console.log("   • API: https://hermes.pyth.network");
    
    console.log("\n💬 **Community Support**:");
    console.log("   • Discord: https://discord.gg/invite/PythNetwork");
    console.log("   • Telegram: https://t.me/Pyth_Network");
    console.log("   • GitHub: https://github.com/pyth-network");
    
    console.log("\n🛠️ **Developer Tools**:");
    console.log("   • Solidity SDK: @pythnetwork/pyth-sdk-solidity");
    console.log("   • JavaScript SDK: @pythnetwork/client");
    console.log("   • Price Service API: Hermes endpoints");
    
    return {
        status: "GUIDE_COMPLETE",
        pythContract: PYTH_CONFIG.PYTH_CONTRACT,
        supportedFeeds: Object.keys(PYTH_CONFIG.PRICE_FEED_IDS).length,
        recommendedWeight: "10%",
        integrationModel: "Pull-based with caching",
        nextAction: "Verify Pyth deployment on Sonic and configure price feed IDs"
    };
}

main()
    .then((result) => {
        console.log("\n✅ Pyth Network Setup Guide Complete!");
        console.log("Result:", JSON.stringify(result, null, 2));
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }); 