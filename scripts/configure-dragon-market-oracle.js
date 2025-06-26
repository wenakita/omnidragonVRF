const { ethers } = require("hardhat");

// Deployed contract addresses
const DRAGON_MARKET_ORACLE = "0x5a3429B7a99634ED63F8Af37F2006CE52FD4a2B1";

async function main() {
    console.log("🔧 Configuring DragonMarketOracle");
    console.log("=================================");
    console.log(`📍 Oracle Address: ${DRAGON_MARKET_ORACLE}`);

    const [deployer] = await ethers.getSigners();
    console.log("👤 Configuring with:", deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(await deployer.getBalance()), "S");

    try {
        // Connect to the oracle
        const oracle = await ethers.getContractAt("DragonMarketOracle", DRAGON_MARKET_ORACLE);

        // ============ STEP 1: Basic Configuration ============
        console.log("\n1️⃣ Setting up basic configuration...");

        // Set initial price (1 DRAGON = 0.1 S)
        const initialPrice = ethers.utils.parseEther("0.1"); // 0.1 S per DRAGON
        console.log("💰 Setting initial price to 0.1 S per DRAGON...");
        const setPriceTx = await oracle.updatePrice(initialPrice, {
            gasLimit: 200000
        });
        await setPriceTx.wait();
        console.log("✅ Initial price set");

        // Set price bounds (0.001 to 100 S per DRAGON)
        const minPrice = ethers.utils.parseEther("0.001"); // 0.001 S minimum
        const maxPrice = ethers.utils.parseEther("100");   // 100 S maximum
        console.log("📊 Setting price bounds (0.001 - 100 S)...");
        const setBoundsTx = await oracle.setPriceBounds(minPrice, maxPrice, {
            gasLimit: 200000
        });
        await setBoundsTx.wait();
        console.log("✅ Price bounds set");

        // Set maximum price deviation (20% = 2000 basis points)
        console.log("⚠️ Setting maximum price deviation to 20%...");
        const setDeviationTx = await oracle.setMaxPriceDeviation(2000, {
            gasLimit: 200000
        });
        await setDeviationTx.wait();
        console.log("✅ Price deviation limit set");

        // ============ STEP 2: Oracle Source Weights ============
        console.log("\n2️⃣ Configuring oracle source weights...");

        // Set balanced weights for different oracle sources
        // Chainlink: 50%, API3: 25%, Pyth: 15%, Band: 10%
        console.log("⚖️ Setting oracle source weights...");
        const setWeightsTx = await oracle.setSourceWeights(
            5000, // Chainlink: 50%
            2500, // API3: 25%
            1500, // Pyth: 15%
            1000, // Band: 10%
            { gasLimit: 200000 }
        );
        await setWeightsTx.wait();
        console.log("✅ Oracle source weights configured");

        // ============ STEP 3: Market Analysis Scores ============
        console.log("\n3️⃣ Setting initial market analysis scores...");

        // Set reasonable initial market conditions
        // Market Score: 7500 (75% - good conditions)
        // Liquidity Score: 6000 (60% - moderate liquidity)
        // Volatility Score: 7000 (70% - moderate volatility)
        // Volume Score: 5000 (50% - moderate volume)
        console.log("📈 Setting market analysis scores...");
        const setAnalysisTx = await oracle.updateMarketAnalysis(
            7500, // Market score: 75%
            6000, // Liquidity score: 60%
            7000, // Volatility score: 70%
            5000, // Volume score: 50%
            { gasLimit: 200000 }
        );
        await setAnalysisTx.wait();
        console.log("✅ Market analysis scores set");

        // ============ STEP 4: Verification ============
        console.log("\n4️⃣ Verifying configuration...");

        // Get current price
        const [currentPrice, timestamp] = await oracle.getLatestPrice();
        console.log(`💰 Current Price: ${ethers.utils.formatEther(currentPrice)} S per DRAGON`);
        console.log(`🕐 Last Updated: ${new Date(timestamp * 1000).toLocaleString()}`);

        // Get market conditions
        const marketConditions = await oracle.getMarketConditions();
        console.log(`📊 Market Conditions Score: ${marketConditions}/10000 (${(marketConditions/100).toFixed(1)}%)`);

        // Get comprehensive market data
        const [price, marketScore, liquidityScore, volatilityScore, volumeScore, lastUpdate] = 
            await oracle.getDragonMarketData();
        
        console.log("\n📋 Market Analysis Summary:");
        console.log(`  Price: ${ethers.utils.formatEther(price)} S per DRAGON`);
        console.log(`  Market Score: ${marketScore}/10000 (${(marketScore/100).toFixed(1)}%)`);
        console.log(`  Liquidity Score: ${liquidityScore}/10000 (${(liquidityScore/100).toFixed(1)}%)`);
        console.log(`  Volatility Score: ${volatilityScore}/10000 (${(volatilityScore/100).toFixed(1)}%)`);
        console.log(`  Volume Score: ${volumeScore}/10000 (${(volumeScore/100).toFixed(1)}%)`);

        // Get oracle source weights
        const [chainlinkWeight, api3Weight, pythWeight, bandWeight] = await oracle.getSourceWeights();
        console.log("\n⚖️ Oracle Source Weights:");
        console.log(`  Chainlink: ${chainlinkWeight/100}%`);
        console.log(`  API3: ${api3Weight/100}%`);
        console.log(`  Pyth: ${pythWeight/100}%`);
        console.log(`  Band: ${bandWeight/100}%`);

        // Get circuit breaker status
        const [cbActive, maxDeviation, currentDeviation] = await oracle.getCircuitBreakerStatus();
        console.log("\n🔒 Circuit Breaker Status:");
        console.log(`  Active: ${cbActive ? 'YES' : 'NO'}`);
        console.log(`  Max Deviation: ${maxDeviation/100}%`);
        console.log(`  Current Deviation: ${currentDeviation/100}%`);

        // Check if oracle is fresh
        const isFresh = await oracle.isFresh();
        console.log(`  Data Fresh: ${isFresh ? 'YES' : 'NO'}`);

        // Get liquidity data
        const [totalTVL, mainPoolTVL, dragonBalance, wrappedNativeBalance] = 
            await oracle.getLiquidityData();
        
        console.log("\n💧 Liquidity Data:");
        console.log(`  Total TVL: ${ethers.utils.formatEther(totalTVL)} S`);
        console.log(`  Main Pool TVL: ${ethers.utils.formatEther(mainPoolTVL)} S`);
        console.log(`  Dragon Balance: ${ethers.utils.formatEther(dragonBalance)} DRAGON`);
        console.log(`  Wrapped Native Balance: ${ethers.utils.formatEther(wrappedNativeBalance)} S`);

        // Test market impact calculation
        const testTradeSize = ethers.utils.parseEther("1000"); // 1000 DRAGON trade
        const marketImpact = await oracle.calculateMarketImpact(testTradeSize);
        console.log(`\n📊 Market Impact for 1000 DRAGON trade: ${marketImpact/100}%`);

        // Get liquidity depth ratio
        const depthRatio = await oracle.getLiquidityDepthRatio();
        console.log(`💧 Liquidity Depth Ratio: ${depthRatio/100}%`);

        console.log("\n🎉 DragonMarketOracle Configuration Complete!");
        console.log("===========================================");
        
        console.log("\n🚀 Oracle is now ready for:");
        console.log("  ✅ Price feeds for DRAGON token");
        console.log("  ✅ Market condition analysis");
        console.log("  ✅ Liquidity monitoring");
        console.log("  ✅ Trade impact calculations");
        console.log("  ✅ Circuit breaker protection");

        console.log("\n🔧 Next steps:");
        console.log("  1. Integrate with DEX contracts");
        console.log("  2. Set up automated price updates");
        console.log("  3. Configure external oracle feeds");
        console.log("  4. Monitor market conditions");

        return {
            oracle: DRAGON_MARKET_ORACLE,
            initialPrice: ethers.utils.formatEther(currentPrice),
            marketScore: marketScore.toString(),
            configured: true
        };

    } catch (error) {
        console.error("\n❌ Configuration failed:");
        console.error("Error:", error.message);
        if (error.transaction) {
            console.error("TX Hash:", error.transaction.hash);
        }
        if (error.reason) {
            console.error("Reason:", error.reason);
        }
        throw error;
    }
}

main()
    .then((result) => {
        console.log("\n✅ Configuration completed successfully!");
        console.log("Result:", JSON.stringify(result, null, 2));
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Fatal error:", error.message);
        process.exit(1);
    }); 