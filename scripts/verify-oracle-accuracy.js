const { ethers } = require("hardhat");

const DRAGON_MARKET_ORACLE = "0x5a3429B7a99634ED63F8Af37F2006CE52FD4a2B1";

async function main() {
    console.log("🔍 Verifying Oracle Accuracy");
    console.log("============================");
    console.log(`📍 Oracle: ${DRAGON_MARKET_ORACLE}`);

    try {
        const oracle = await ethers.getContractAt("DragonMarketOracle", DRAGON_MARKET_ORACLE);

        // Get current price
        const [price, timestamp] = await oracle.getLatestPrice();
        const priceFormatted = parseFloat(ethers.utils.formatEther(price));
        
        console.log("\n📊 Current Oracle State:");
        console.log(`  DRAGON Price: ${priceFormatted.toFixed(6)} S`);
        console.log(`  USD Estimate: $${(priceFormatted * 0.05).toFixed(6)}`);
        console.log(`  Last Updated: ${new Date(timestamp * 1000).toLocaleString()}`);

        // Get market data
        const [p, marketScore, liquidityScore, volatilityScore, volumeScore] = 
            await oracle.getDragonMarketData();

        console.log("\n📈 Market Analysis:");
        console.log(`  Market Score: ${marketScore}/10000 (${(marketScore/100).toFixed(1)}%)`);
        console.log(`  Liquidity Score: ${liquidityScore}/10000 (${(liquidityScore/100).toFixed(1)}%)`);
        console.log(`  Volatility Score: ${volatilityScore}/10000 (${(volatilityScore/100).toFixed(1)}%)`);
        console.log(`  Volume Score: ${volumeScore}/10000 (${(volumeScore/100).toFixed(1)}%)`);

        // Get circuit breaker status
        const [active, maxDev, currentDev] = await oracle.getCircuitBreakerStatus();
        console.log("\n🔒 Circuit Breaker:");
        console.log(`  Active: ${active ? 'YES' : 'NO'}`);
        console.log(`  Max Deviation: ${maxDev/100}%`);
        console.log(`  Current Deviation: ${currentDev/100}%`);

        // Check freshness
        const isFresh = await oracle.isFresh();
        const dataAge = Math.round((Date.now() / 1000) - timestamp);
        console.log(`  Data Fresh: ${isFresh ? 'YES' : 'NO'}`);
        console.log(`  Data Age: ${dataAge} seconds`);

        // Get oracle info
        const [native, quote, decimals] = await oracle.getOracleInfo();
        console.log("\n⚙️ Oracle Configuration:");
        console.log(`  Native Symbol: ${native}`);
        console.log(`  Quote Symbol: ${quote}`);
        console.log(`  Decimals: ${decimals}`);

        // Get source weights
        const [chainlink, api3, pyth, band] = await oracle.getSourceWeights();
        console.log("\n⚖️ Source Weights:");
        console.log(`  Chainlink: ${chainlink/100}%`);
        console.log(`  API3: ${api3/100}%`);
        console.log(`  Pyth: ${pyth/100}%`);
        console.log(`  Band: ${band/100}%`);

        // Calculate market impact for test trade
        const testTrade = ethers.utils.parseEther("1000");
        const impact = await oracle.calculateMarketImpact(testTrade);
        console.log(`\n📊 Market Impact (1000 DRAGON): ${impact/100}%`);

        // Get liquidity depth ratio
        const depthRatio = await oracle.getLiquidityDepthRatio();
        console.log(`💧 Liquidity Depth Ratio: ${depthRatio/100}%`);

        console.log("\n✅ Oracle Verification Complete!");
        console.log("================================");

        // Assess overall health
        let healthScore = 0;
        if (isFresh) healthScore += 25;
        if (!active) healthScore += 25; // Circuit breaker not active is good
        if (marketScore > 5000) healthScore += 25;
        if (dataAge < 3600) healthScore += 25; // Less than 1 hour old

        console.log(`\n🏥 Oracle Health Score: ${healthScore}/100`);
        
        if (healthScore >= 75) {
            console.log("✅ Oracle is in excellent condition");
        } else if (healthScore >= 50) {
            console.log("⚠️ Oracle is in good condition but could be improved");
        } else {
            console.log("❌ Oracle needs attention");
        }

        return {
            price: priceFormatted,
            priceUSD: priceFormatted * 0.05,
            marketScore: marketScore.toString(),
            healthScore: healthScore,
            fresh: isFresh,
            dataAge: dataAge
        };

    } catch (error) {
        console.error("❌ Verification failed:", error.message);
        throw error;
    }
}

main()
    .then((result) => {
        console.log("\n📋 Verification Result:", JSON.stringify(result, null, 2));
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Fatal error:", error.message);
        process.exit(1);
    }); 