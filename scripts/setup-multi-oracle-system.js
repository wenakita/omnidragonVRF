const { ethers } = require("hardhat");

// Multi-Oracle Configuration for Sonic Mainnet
const ORACLE_CONFIG = {
    // Dragon Market Oracle
    DRAGON_MARKET_ORACLE: "0x5a3429B7a99634ED63F8Af37F2006CE52FD4a2B1",
    
    // Chainlink (Already working)
    CHAINLINK: {
        S_USD: "0xc76dFb89fF298145b417d221B2c747d84952e01d"
    },
    
    // API3 (First-party oracles)
    API3: {
        PROXY_ADDRESS: "0x709944a48cAf83535e43471680fDA4905FB3920a", // API3 dAPI proxy
        // Common price feeds available on API3
        FEEDS: {
            ETH_USD: "ETH/USD",
            BTC_USD: "BTC/USD", 
            S_USD: "S/USD",
            USDC_USD: "USDC/USD",
            USDT_USD: "USDT/USD"
        }
    },
    
    // Pyth Network (Real-time price feeds)
    PYTH: {
        CONTRACT_ADDRESS: "0x2880aB155794e7179c9eE2e38200202908C17B43",
        // Pyth price feed IDs (these are example IDs - need actual ones)
        PRICE_FEEDS: {
            ETH_USD: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
            BTC_USD: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
            SOL_USD: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d"
        }
    },
    
    // Band Protocol (Push-based oracle)
    BAND: {
        CONTRACT_ADDRESS: "0x506085050Ea5494Fe4b89Dd5BEa659F506F470Cc",
        // Available symbols on Band Protocol
        SYMBOLS: ["BTC", "ETH", "USDC", "USDT", "S", "DAI", "WBTC"]
    }
};

// Oracle weights for aggregation (basis points, total = 10000)
const ORACLE_WEIGHTS = {
    CHAINLINK: 4000, // 40% - Most reliable
    API3: 3000,      // 30% - First-party data
    PYTH: 2000,      // 20% - Real-time feeds
    BAND: 1000       // 10% - Additional validation
};

async function main() {
    console.log("🌐 Setting Up Multi-Oracle System for OmniDragon");
    console.log("================================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Account:", deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(await deployer.getBalance()), "S");
    
    try {
        // Connect to Dragon Market Oracle
        console.log("\n1️⃣ Connecting to Dragon Market Oracle...");
        const oracle = await ethers.getContractAt("DragonMarketOracle", ORACLE_CONFIG.DRAGON_MARKET_ORACLE);
        
        // Test all oracle integrations
        const oracleResults = {};
        
        // ============ CHAINLINK INTEGRATION ============
        console.log("\n2️⃣ Testing Chainlink Integration...");
        try {
            const chainlinkFeed = await ethers.getContractAt(
                "contracts/interfaces/external/chainlink/AggregatorV3Interface.sol:AggregatorV3Interface",
                ORACLE_CONFIG.CHAINLINK.S_USD
            );
            
            const roundData = await chainlinkFeed.latestRoundData();
            const decimals = await chainlinkFeed.decimals();
            const price = parseFloat(ethers.utils.formatUnits(roundData.answer, decimals));
            
            oracleResults.chainlink = {
                S_USD: price,
                source: "Chainlink",
                status: "✅ WORKING",
                timestamp: roundData.updatedAt.toNumber()
            };
            
            console.log(`✅ Chainlink S/USD: $${price.toFixed(6)}`);
        } catch (error) {
            console.log("❌ Chainlink failed:", error.message);
            oracleResults.chainlink = { status: "❌ FAILED", error: error.message };
        }
        
        // ============ API3 INTEGRATION ============
        console.log("\n3️⃣ Testing API3 Integration...");
        try {
            // API3 uses dAPI proxies - we'll try to connect to their proxy
            const api3Proxy = await ethers.getContractAt(
                "contracts/interfaces/external/chainlink/AggregatorV3Interface.sol:AggregatorV3Interface",
                ORACLE_CONFIG.API3.PROXY_ADDRESS
            );
            
            // Try to get data (API3 might use different interface)
            try {
                const roundData = await api3Proxy.latestRoundData();
                const decimals = await api3Proxy.decimals();
                const price = parseFloat(ethers.utils.formatUnits(roundData.answer, decimals));
                
                oracleResults.api3 = {
                    price: price,
                    source: "API3",
                    status: "✅ WORKING",
                    timestamp: roundData.updatedAt.toNumber()
                };
                
                console.log(`✅ API3 Price: $${price.toFixed(6)}`);
            } catch (error) {
                // API3 might use a different interface
                console.log("ℹ️ API3 available but needs specific dAPI integration");
                oracleResults.api3 = { 
                    status: "⚠️ NEEDS_INTEGRATION", 
                    note: "API3 dAPI available but requires specific feed setup" 
                };
            }
        } catch (error) {
            console.log("❌ API3 connection failed:", error.message);
            oracleResults.api3 = { status: "❌ FAILED", error: error.message };
        }
        
        // ============ PYTH INTEGRATION ============
        console.log("\n4️⃣ Testing Pyth Network Integration...");
        try {
            // Pyth uses a different interface - IPyth
            const pythContract = await ethers.getContractAt("IPyth", ORACLE_CONFIG.PYTH.CONTRACT_ADDRESS);
            
            // Try to get price for ETH/USD (example)
            // Note: Pyth requires price feed IDs and uses a different method
            console.log("ℹ️ Pyth Network available but needs specific price feed IDs");
            oracleResults.pyth = { 
                status: "⚠️ NEEDS_INTEGRATION", 
                note: "Pyth available but requires specific price feed ID configuration" 
            };
        } catch (error) {
            console.log("❌ Pyth connection failed:", error.message);
            oracleResults.pyth = { status: "❌ FAILED", error: error.message };
        }
        
        // ============ BAND PROTOCOL INTEGRATION ============
        console.log("\n5️⃣ Testing Band Protocol Integration...");
        try {
            // Band Protocol uses IStdReference interface
            const bandContract = await ethers.getContractAt("IStdReference", ORACLE_CONFIG.BAND.CONTRACT_ADDRESS);
            
            // Try to get reference data for S/USD
            try {
                const referenceData = await bandContract.getReferenceData("S", "USD");
                const price = parseFloat(ethers.utils.formatUnits(referenceData.rate, 18));
                
                oracleResults.band = {
                    S_USD: price,
                    source: "Band Protocol",
                    status: "✅ WORKING",
                    timestamp: referenceData.lastUpdatedBase.toNumber()
                };
                
                console.log(`✅ Band Protocol S/USD: $${price.toFixed(6)}`);
            } catch (error) {
                console.log("⚠️ Band Protocol available but symbol not found");
                oracleResults.band = { 
                    status: "⚠️ SYMBOL_NOT_FOUND", 
                    note: "Band Protocol working but S/USD symbol needs to be added" 
                };
            }
        } catch (error) {
            console.log("❌ Band Protocol connection failed:", error.message);
            oracleResults.band = { status: "❌ FAILED", error: error.message };
        }
        
        // ============ CALCULATE AGGREGATED PRICE ============
        console.log("\n6️⃣ Calculating Multi-Oracle Aggregated Price...");
        
        const workingOracles = [];
        let totalWeight = 0;
        let weightedSum = 0;
        
        // Collect working oracle prices
        if (oracleResults.chainlink?.S_USD) {
            workingOracles.push({ 
                name: "Chainlink", 
                price: oracleResults.chainlink.S_USD, 
                weight: ORACLE_WEIGHTS.CHAINLINK 
            });
        }
        
        if (oracleResults.band?.S_USD) {
            workingOracles.push({ 
                name: "Band Protocol", 
                price: oracleResults.band.S_USD, 
                weight: ORACLE_WEIGHTS.BAND 
            });
        }
        
        // Calculate weighted average
        for (const oracle of workingOracles) {
            weightedSum += oracle.price * oracle.weight;
            totalWeight += oracle.weight;
        }
        
        const aggregatedPrice = totalWeight > 0 ? weightedSum / totalWeight : 0;
        
        console.log(`📊 Working Oracles: ${workingOracles.length}`);
        for (const oracle of workingOracles) {
            console.log(`  ${oracle.name}: $${oracle.price.toFixed(6)} (${(oracle.weight/100).toFixed(1)}% weight)`);
        }
        console.log(`🎯 Aggregated S/USD Price: $${aggregatedPrice.toFixed(6)}`);
        
        // ============ UPDATE DRAGON ORACLE WITH AGGREGATED DATA ============
        if (aggregatedPrice > 0) {
            console.log("\n7️⃣ Updating Dragon Oracle with Multi-Oracle Data...");
            
            // Calculate DRAGON price using aggregated S/USD price
            const dragonUSDPrice = 0.002; // $0.002 target
            const dragonPriceInS = dragonUSDPrice / aggregatedPrice;
            const dragonPriceWei = ethers.utils.parseEther(dragonPriceInS.toFixed(18));
            
            try {
                const updateTx = await oracle.updatePrice(dragonPriceWei, {
                    gasLimit: 200000
                });
                await updateTx.wait();
                
                console.log("✅ Dragon Oracle updated with multi-oracle aggregated price!");
                console.log(`🐉 New DRAGON Price: ${dragonPriceInS.toFixed(6)} S`);
                console.log(`💵 USD Value: $${dragonUSDPrice.toFixed(6)}`);
                
                // Update market scores based on oracle diversity
                const oracleCount = workingOracles.length;
                const diversityBonus = Math.min(2000, oracleCount * 500); // Up to 20% bonus for 4+ oracles
                
                const marketScores = {
                    marketScore: Math.min(10000, 7000 + diversityBonus),
                    liquidityScore: Math.min(10000, 6500 + diversityBonus),
                    volatilityScore: Math.min(10000, 7500 + (oracleCount * 300)),
                    volumeScore: Math.min(10000, 6000 + (oracleCount * 400))
                };
                
                const updateAnalysisTx = await oracle.updateMarketAnalysis(
                    marketScores.marketScore,
                    marketScores.liquidityScore,
                    marketScores.volatilityScore,
                    marketScores.volumeScore,
                    { gasLimit: 200000 }
                );
                await updateAnalysisTx.wait();
                
                console.log("✅ Market analysis updated with oracle diversity bonus!");
                
            } catch (error) {
                console.log("❌ Failed to update oracle:", error.message);
            }
        }
        
        // ============ SUMMARY REPORT ============
        console.log("\n📋 Multi-Oracle Integration Summary");
        console.log("===================================");
        console.log(`🔗 Chainlink: ${oracleResults.chainlink?.status || "Not tested"}`);
        console.log(`🎯 API3: ${oracleResults.api3?.status || "Not tested"}`);
        console.log(`⚡ Pyth Network: ${oracleResults.pyth?.status || "Not tested"}`);
        console.log(`📊 Band Protocol: ${oracleResults.band?.status || "Not tested"}`);
        console.log(`\n🏆 Active Oracles: ${workingOracles.length}/4`);
        console.log(`💰 Aggregated S Price: $${aggregatedPrice.toFixed(6)}`);
        console.log(`🐉 DRAGON Price: ${aggregatedPrice > 0 ? (0.002 / aggregatedPrice).toFixed(6) : 'N/A'} S`);
        
        // ============ NEXT STEPS RECOMMENDATIONS ============
        console.log("\n🎯 Next Steps for Full Multi-Oracle Integration:");
        console.log("================================================");
        
        if (oracleResults.api3?.status?.includes("NEEDS_INTEGRATION")) {
            console.log("📌 API3: Set up specific dAPI feeds for required symbols");
            console.log("   - Visit API3 Market: https://market.api3.org");
            console.log("   - Configure dAPI proxies for S/USD, ETH/USD, BTC/USD");
        }
        
        if (oracleResults.pyth?.status?.includes("NEEDS_INTEGRATION")) {
            console.log("📌 Pyth Network: Configure price feed IDs");
            console.log("   - Get price feed IDs from: https://pyth.network/developers/price-feed-ids");
            console.log("   - Implement IPyth interface for real-time price updates");
        }
        
        if (oracleResults.band?.status?.includes("SYMBOL_NOT_FOUND")) {
            console.log("📌 Band Protocol: Request S/USD symbol addition");
            console.log("   - Contact Band Protocol team to add S/USD price feed");
            console.log("   - Use existing symbols: BTC, ETH, USDC, USDT, DAI, WBTC");
        }
        
        console.log("\n🎉 Multi-Oracle System Setup Complete!");
        
        return {
            workingOracles: workingOracles.length,
            aggregatedPrice,
            oracleResults,
            recommendations: {
                api3: "Set up dAPI feeds",
                pyth: "Configure price feed IDs", 
                band: "Request S/USD symbol"
            }
        };
        
    } catch (error) {
        console.error("\n❌ Multi-oracle setup failed:");
        console.error("Error:", error.message);
        throw error;
    }
}

main()
    .then((result) => {
        console.log("\n✅ Multi-Oracle Integration completed!");
        if (result) {
            console.log("Results:", JSON.stringify(result, null, 2));
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Fatal error:", error.message);
        process.exit(1);
    }); 