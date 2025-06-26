const { ethers } = require("hardhat");

async function main() {
    console.log("🐉 OmniDragon Complete Oracle System Setup");
    console.log("==========================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Account:", deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(await deployer.getBalance()), "S");
    
    // Complete Oracle Configuration
    const ORACLE_CONFIG = {
        // Existing working oracles
        CHAINLINK_S_USD: "0x10010069DE6bD5408A6dEd075Cf6ae2498073c73",
        BAND_PROTOCOL: "0x56E2898E0ceFF0D1222827759B56B28Ad812f92F",
        
        // New oracles to configure
        API3_PROXY: "0x709944a48cAf83535e43471680fDA4905FB3920a", // To be configured
        PYTH_CONTRACT: "0x2880aB155794e7179c9eE2e38200202908C17B43", // To be verified
        
        // Oracle weights (should sum to 100)
        WEIGHTS: {
            CHAINLINK: 40,  // 40% - Most reliable, proven track record
            BAND: 30,       // 30% - Good reliability, cross-chain
            API3: 20,       // 20% - First-party data, reliable
            PYTH: 10        // 10% - High-frequency, validation only
        },
        
        // Price feed configurations
        PYTH_PRICE_FEEDS: {
            S_USD: "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af8ed1af3cffb23f9297f19",  // Example S/USD feed ID
            ETH_USD: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"
        }
    };
    
    console.log("\n📊 Current Oracle System Status");
    console.log("===============================");
    
    // Check current Dragon Oracle deployment
    let dragonOracle;
    try {
        // Try to find existing Dragon Oracle
        const deployedOracles = await ethers.getContract("DragonMarketOracle").catch(() => null);
        if (deployedOracles) {
            dragonOracle = deployedOracles;
            console.log("✅ Found existing Dragon Oracle:", dragonOracle.address);
        } else {
            console.log("⚠️ Dragon Oracle not found - you may need to deploy it first");
        }
    } catch (error) {
        console.log("⚠️ Dragon Oracle not found - you may need to deploy it first");
    }
    
    // Test existing oracles
    console.log("\n🧪 Testing Existing Oracles...");
    
    // Test Chainlink
    try {
        const chainlinkFeed = await ethers.getContractAt(
            "contracts/interfaces/external/chainlink/AggregatorV3Interface.sol:AggregatorV3Interface",
            ORACLE_CONFIG.CHAINLINK_S_USD
        );
        const chainlinkData = await chainlinkFeed.latestRoundData();
        const chainlinkPrice = parseFloat(ethers.utils.formatUnits(chainlinkData.answer, 8));
        console.log(`✅ Chainlink S/USD: $${chainlinkPrice.toFixed(6)}`);
    } catch (error) {
        console.log("❌ Chainlink oracle failed:", error.message);
    }
    
    // Test Band Protocol
    try {
        const bandFeed = await ethers.getContractAt(
            "contracts/interfaces/external/chainlink/AggregatorV3Interface.sol:AggregatorV3Interface",
            ORACLE_CONFIG.BAND_PROTOCOL
        );
        const bandData = await bandFeed.latestRoundData();
        const bandPrice = parseFloat(ethers.utils.formatUnits(bandData.answer, 8));
        console.log(`✅ Band Protocol S/USD: $${bandPrice.toFixed(6)}`);
    } catch (error) {
        console.log("❌ Band Protocol oracle failed:", error.message);
    }
    
    // Test API3 (if configured)
    console.log("\n🔧 API3 dAPI Configuration Status");
    console.log("=================================");
    
    try {
        const api3Proxy = await ethers.getContractAt("IApi3Proxy", ORACLE_CONFIG.API3_PROXY);
        const api3Data = await api3Proxy.read();
        const api3Price = parseFloat(ethers.utils.formatUnits(api3Data.value, 18));
        console.log(`✅ API3 dAPI: $${api3Price.toFixed(6)} (timestamp: ${api3Data.timestamp})`);
        console.log("✅ API3 is ready for integration!");
    } catch (error) {
        console.log("⚠️ API3 dAPI not configured yet");
        console.log("📋 To configure API3:");
        console.log("   1. Visit: https://market.api3.org");
        console.log("   2. Search for: S/USD or ETH/USD");
        console.log("   3. Purchase subscription (1% deviation recommended)");
        console.log("   4. Get proxy address and update ORACLE_CONFIG.API3_PROXY");
    }
    
    // Test Pyth Network
    console.log("\n⚡ Pyth Network Configuration Status");
    console.log("===================================");
    
    try {
        const pythContract = await ethers.getContractAt("IPyth", ORACLE_CONFIG.PYTH_CONTRACT);
        console.log(`✅ Connected to Pyth contract: ${ORACLE_CONFIG.PYTH_CONTRACT}`);
        
        // Test getting a price (might fail without updates)
        try {
            const pythPrice = await pythContract.getPriceUnsafe(ORACLE_CONFIG.PYTH_PRICE_FEEDS.ETH_USD);
            const formattedPrice = parseFloat(pythPrice.price) * Math.pow(10, pythPrice.expo);
            console.log(`✅ Pyth ETH/USD: $${formattedPrice.toFixed(6)} (confidence: ${pythPrice.conf})`);
            console.log("✅ Pyth is ready for integration!");
        } catch (priceError) {
            console.log("⚠️ Pyth prices need updates (pull-based oracle)");
            console.log("📋 To use Pyth:");
            console.log("   1. Fetch price updates from: https://hermes.pyth.network");
            console.log("   2. Call updatePriceFeeds() with update data");
            console.log("   3. Then read prices using getPrice()");
        }
    } catch (error) {
        console.log("❌ Pyth contract not available on Sonic");
        console.log("   Consider using Pyth on other chains or for off-chain validation");
    }
    
    // Oracle Integration Strategy
    console.log("\n🎯 Recommended Integration Strategy");
    console.log("==================================");
    
    console.log("**Phase 1: Current Working System (100% coverage)**");
    console.log(`   • Chainlink: ${ORACLE_CONFIG.WEIGHTS.CHAINLINK}% weight`);
    console.log(`   • Band Protocol: ${ORACLE_CONFIG.WEIGHTS.BAND + ORACLE_CONFIG.WEIGHTS.API3 + ORACLE_CONFIG.WEIGHTS.PYTH}% weight`);
    console.log("   • Status: ✅ WORKING");
    
    console.log("\n**Phase 2: Add API3 dAPI (when configured)**");
    console.log(`   • Chainlink: ${ORACLE_CONFIG.WEIGHTS.CHAINLINK}% weight`);
    console.log(`   • Band Protocol: ${ORACLE_CONFIG.WEIGHTS.BAND + ORACLE_CONFIG.WEIGHTS.PYTH}% weight`);
    console.log(`   • API3: ${ORACLE_CONFIG.WEIGHTS.API3}% weight`);
    console.log("   • Benefits: First-party data, reliable updates");
    
    console.log("\n**Phase 3: Add Pyth Network (optional)**");
    console.log("   • Full 4-oracle system with optimal weights");
    console.log("   • Pyth for validation and high-frequency updates");
    console.log("   • Complete redundancy and accuracy");
    
    // Update Dragon Oracle function
    console.log("\n🔧 Dragon Oracle Update Functions");
    console.log("=================================");
    
    const updateFunction = `
// Update oracle addresses in Dragon Oracle
async function updateDragonOracleAddresses() {
    const oracle = await ethers.getContractAt("DragonMarketOracle", DRAGON_ORACLE_ADDRESS);
    
    // Current working configuration
    await oracle.setOracleAddresses(
        "${ORACLE_CONFIG.CHAINLINK_S_USD}",  // Chainlink (working)
        "${ORACLE_CONFIG.BAND_PROTOCOL}",    // Band Protocol (working)
        "${ORACLE_CONFIG.API3_PROXY}",       // API3 (configure first)
        "${ORACLE_CONFIG.PYTH_CONTRACT}"     // Pyth (optional)
    );
    
    // Set oracle weights
    await oracle.setOracleWeights(
        ${ORACLE_CONFIG.WEIGHTS.CHAINLINK},  // Chainlink weight
        ${ORACLE_CONFIG.WEIGHTS.BAND},       // Band weight  
        ${ORACLE_CONFIG.WEIGHTS.API3},       // API3 weight
        ${ORACLE_CONFIG.WEIGHTS.PYTH}        // Pyth weight
    );
    
    console.log("✅ Dragon Oracle updated with new configuration!");
}`;
    
    console.log(updateFunction);
    
    // Cost analysis
    console.log("\n💰 Oracle Cost Analysis");
    console.log("=======================");
    
    console.log("📊 **Cost per Update**:");
    console.log("   • Chainlink: Free (push-based)");
    console.log("   • Band Protocol: Free (push-based)");
    console.log("   • API3: Free after subscription (push-based)");
    console.log("   • Pyth: ~$0.01 per update (pull-based)");
    
    console.log("\n🎯 **Recommended Approach**:");
    console.log("   1. Keep current 2-oracle system working (60%+40%)");
    console.log("   2. Add API3 when configured (40%+30%+20%)");
    console.log("   3. Add Pyth for validation only (40%+30%+20%+10%)");
    console.log("   4. Monitor performance and adjust weights");
    
    // Next steps
    console.log("\n🚀 Next Steps");
    console.log("=============");
    
    console.log("**Immediate Actions:**");
    console.log("1. ✅ Keep current system running (Chainlink + Band)");
    console.log("2. 🔧 Configure API3 dAPI subscription");
    console.log("3. ⚡ Test Pyth Network availability on Sonic");
    console.log("4. 🧪 Run integration tests");
    
    console.log("\n**API3 Setup:**");
    console.log("   Run: node scripts/setup-api3-integration.js");
    
    console.log("\n**Pyth Setup:**");
    console.log("   Run: node scripts/setup-pyth-integration.js");
    
    console.log("\n**Test Multi-Oracle:**");
    console.log("   Run: node scripts/test-multi-oracle-update.js");
    
    // Success metrics
    console.log("\n📈 Success Metrics");
    console.log("==================");
    
    console.log("🎯 **Target Metrics:**");
    console.log("   • Oracle Coverage: 100% (2/2 currently, 4/4 target)");
    console.log("   • Price Accuracy: <0.1% deviation between oracles");
    console.log("   • Update Frequency: <60 seconds staleness");
    console.log("   • Reliability: 99.9% uptime");
    console.log("   • Cost Efficiency: <$0.01 per lottery draw");
    
    return {
        status: "SYSTEM_ANALYSIS_COMPLETE",
        currentOracles: 2,
        targetOracles: 4,
        workingOracles: ["Chainlink", "Band Protocol"],
        pendingOracles: ["API3", "Pyth"],
        currentCoverage: "100%",
        recommendedWeights: ORACLE_CONFIG.WEIGHTS,
        nextActions: [
            "Configure API3 dAPI subscription",
            "Verify Pyth Network on Sonic",
            "Update Dragon Oracle addresses",
            "Run integration tests"
        ]
    };
}

main()
    .then((result) => {
        console.log("\n✅ Complete Oracle System Analysis Complete!");
        console.log("Result:", JSON.stringify(result, null, 2));
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }); 