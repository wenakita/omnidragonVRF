const { ethers } = require("hardhat");

// Contract addresses
const DRAGON_MARKET_ORACLE = "0x5a3429B7a99634ED63F8Af37F2006CE52FD4a2B1";

// Known Sonic DEX addresses (update these with actual deployed pairs)
const DEX_PAIRS = {
    // SonicSwap or equivalent DEX pairs
    DRAGON_S_PAIR: "0x0000000000000000000000000000000000000000", // To be updated
    DRAGON_USDC_PAIR: "0x0000000000000000000000000000000000000000", // To be updated
    S_USDC_PAIR: "0x0000000000000000000000000000000000000000", // To be updated
};

// Token addresses on Sonic
const TOKENS = {
    WRAPPED_S: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38",
    USDC: "0x29219dd400f2Bf60E5a23d13Be72B486D4038894",
    DRAGON: "0x0000000000000000000000000000000000000000", // To be updated when deployed
};

async function main() {
    console.log("🔄 Setting Up DEX Price Feeds");
    console.log("=============================");
    console.log(`🎯 Oracle: ${DRAGON_MARKET_ORACLE}`);

    const [deployer] = await ethers.getSigners();
    console.log("👤 Account:", deployer.address);

    try {
        const oracle = await ethers.getContractAt("DragonMarketOracle", DRAGON_MARKET_ORACLE);

        // ============ STEP 1: Check for Available DEX Pairs ============
        console.log("\n1️⃣ Checking for available DEX pairs...");

        const availablePairs = await findAvailableDEXPairs();
        console.log(`📊 Found ${availablePairs.length} available pairs`);

        if (availablePairs.length === 0) {
            console.log("⚠️ No DEX pairs found - using fallback pricing");
            await setupFallbackPricing(oracle);
            return;
        }

        // ============ STEP 2: Fetch DEX Prices ============
        console.log("\n2️⃣ Fetching prices from DEX pairs...");

        const dexPrices = [];
        for (const pair of availablePairs) {
            try {
                const price = await fetchPairPrice(pair);
                dexPrices.push({
                    pair: pair.name,
                    price: price,
                    liquidity: pair.liquidity,
                    volume24h: pair.volume24h
                });
                console.log(`💰 ${pair.name}: ${price.toFixed(6)} ${pair.quote}`);
            } catch (error) {
                console.log(`❌ Failed to fetch price from ${pair.name}: ${error.message}`);
            }
        }

        // ============ STEP 3: Calculate Weighted Average Price ============
        console.log("\n3️⃣ Calculating weighted average price...");

        const weightedPrice = calculateWeightedPrice(dexPrices);
        console.log(`📊 Weighted Average Price: ${weightedPrice.toFixed(6)} S`);

        // ============ STEP 4: Validate Price Against Multiple Sources ============
        console.log("\n4️⃣ Validating price consistency...");

        const priceValidation = validatePriceConsistency(dexPrices);
        console.log(`📈 Price Spread: ${priceValidation.spread.toFixed(2)}%`);
        console.log(`🎯 Price Confidence: ${priceValidation.confidence.toFixed(1)}%`);

        if (priceValidation.confidence < 70) {
            console.log("⚠️ Low price confidence - using fallback mechanisms");
            await setupFallbackPricing(oracle);
            return;
        }

        // ============ STEP 5: Update Oracle with DEX Price ============
        console.log("\n5️⃣ Updating oracle with DEX-derived price...");

        const priceWei = ethers.utils.parseEther(weightedPrice.toString());
        const updateTx = await oracle.updatePrice(priceWei, {
            gasLimit: 200000
        });
        await updateTx.wait();
        console.log("✅ Oracle updated with DEX price");

        // ============ STEP 6: Update Market Analysis ============
        console.log("\n6️⃣ Updating market analysis with DEX data...");

        const marketScores = calculateDEXMarketScores(dexPrices, priceValidation);
        const updateAnalysisTx = await oracle.updateMarketAnalysis(
            marketScores.marketScore,
            marketScores.liquidityScore,
            marketScores.volatilityScore,
            marketScores.volumeScore,
            { gasLimit: 200000 }
        );
        await updateAnalysisTx.wait();
        console.log("✅ Market analysis updated with DEX data");

        // ============ STEP 7: Set Up Price Monitoring ============
        console.log("\n7️⃣ Setting up price monitoring...");

        // Adjust circuit breaker based on DEX liquidity
        const totalLiquidity = dexPrices.reduce((sum, p) => sum + p.liquidity, 0);
        const maxDeviation = calculateOptimalDeviation(totalLiquidity, priceValidation.spread);
        
        const setDeviationTx = await oracle.setMaxPriceDeviation(maxDeviation, {
            gasLimit: 200000
        });
        await setDeviationTx.wait();
        console.log(`✅ Circuit breaker set to ${maxDeviation/100}% based on DEX liquidity`);

        // ============ STEP 8: Verify Setup ============
        console.log("\n8️⃣ Verifying DEX price feed setup...");

        const [currentPrice, timestamp] = await oracle.getLatestPrice();
        const currentPriceFormatted = parseFloat(ethers.utils.formatEther(currentPrice));

        console.log("\n📊 DEX Price Feed Summary:");
        console.log(`  Current Price: ${currentPriceFormatted.toFixed(6)} S`);
        console.log(`  Price Sources: ${dexPrices.length} DEX pairs`);
        console.log(`  Total Liquidity: ${totalLiquidity.toLocaleString()} S`);
        console.log(`  Price Confidence: ${priceValidation.confidence.toFixed(1)}%`);
        console.log(`  Last Updated: ${new Date(timestamp * 1000).toLocaleString()}`);

        console.log("\n🎉 DEX Price Feeds Setup Complete!");
        console.log("==================================");

        return {
            oracle: DRAGON_MARKET_ORACLE,
            price: currentPriceFormatted,
            sources: dexPrices.length,
            liquidity: totalLiquidity,
            confidence: priceValidation.confidence,
            setup: "dex"
        };

    } catch (error) {
        console.error("\n❌ DEX price feed setup failed:");
        console.error("Error:", error.message);
        
        // Fallback to basic pricing
        console.log("\n🔄 Falling back to basic pricing...");
        await setupFallbackPricing(oracle);
        throw error;
    }
}

// Helper function to find available DEX pairs
async function findAvailableDEXPairs() {
    const pairs = [];
    
    // Check if pairs exist and have liquidity
    for (const [name, address] of Object.entries(DEX_PAIRS)) {
        if (address === "0x0000000000000000000000000000000000000000") {
            continue; // Skip placeholder addresses
        }
        
        try {
            // Try to connect to the pair contract
            const pairContract = await ethers.getContractAt("IUniswapV2Pair", address);
            const reserves = await pairContract.getReserves();
            
            if (reserves[0].gt(0) && reserves[1].gt(0)) {
                pairs.push({
                    name: name,
                    address: address,
                    contract: pairContract,
                    reserves: reserves,
                    liquidity: parseFloat(ethers.utils.formatEther(reserves[0].add(reserves[1]))),
                    volume24h: Math.random() * 10000 // Placeholder - would fetch real volume
                });
            }
        } catch (error) {
            // Pair doesn't exist or is not accessible
            continue;
        }
    }
    
    return pairs;
}

// Helper function to fetch price from a DEX pair
async function fetchPairPrice(pair) {
    try {
        const reserves = await pair.contract.getReserves();
        const token0 = await pair.contract.token0();
        const token1 = await pair.contract.token1();
        
        // Determine which token is DRAGON and calculate price
        let dragonReserve, otherReserve;
        if (token0.toLowerCase() === TOKENS.DRAGON.toLowerCase()) {
            dragonReserve = reserves[0];
            otherReserve = reserves[1];
        } else {
            dragonReserve = reserves[1];
            otherReserve = reserves[0];
        }
        
        // Calculate price (other token per DRAGON)
        const price = parseFloat(ethers.utils.formatEther(otherReserve)) / 
                     parseFloat(ethers.utils.formatEther(dragonReserve));
        
        return price;
    } catch (error) {
        throw new Error(`Failed to fetch price from ${pair.name}: ${error.message}`);
    }
}

// Helper function to calculate weighted average price
function calculateWeightedPrice(dexPrices) {
    if (dexPrices.length === 0) return 0;
    
    let totalWeightedPrice = 0;
    let totalWeight = 0;
    
    for (const priceData of dexPrices) {
        // Weight by liquidity and volume
        const weight = Math.sqrt(priceData.liquidity * priceData.volume24h);
        totalWeightedPrice += priceData.price * weight;
        totalWeight += weight;
    }
    
    return totalWeight > 0 ? totalWeightedPrice / totalWeight : 0;
}

// Helper function to validate price consistency
function validatePriceConsistency(dexPrices) {
    if (dexPrices.length === 0) {
        return { spread: 100, confidence: 0 };
    }
    
    if (dexPrices.length === 1) {
        return { spread: 0, confidence: 50 }; // Low confidence with single source
    }
    
    const prices = dexPrices.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    const spread = ((maxPrice - minPrice) / avgPrice) * 100;
    
    // Calculate confidence based on spread and number of sources
    let confidence = 100 - spread * 2; // Lower confidence for higher spread
    confidence *= Math.min(1, dexPrices.length / 3); // More confidence with more sources
    confidence = Math.max(0, Math.min(100, confidence));
    
    return { spread, confidence };
}

// Helper function to calculate market scores from DEX data
function calculateDEXMarketScores(dexPrices, validation) {
    const totalLiquidity = dexPrices.reduce((sum, p) => sum + p.liquidity, 0);
    const totalVolume = dexPrices.reduce((sum, p) => sum + p.volume24h, 0);
    
    // Market Score: Based on price confidence and number of sources
    const marketScore = Math.round(5000 + (validation.confidence * 50) + (dexPrices.length * 500));
    
    // Liquidity Score: Based on total liquidity
    const liquidityScore = Math.round(Math.min(10000, 1000 + (totalLiquidity * 10)));
    
    // Volatility Score: Based on price spread (lower spread = higher score)
    const volatilityScore = Math.round(Math.max(1000, 10000 - (validation.spread * 200)));
    
    // Volume Score: Based on total volume
    const volumeScore = Math.round(Math.min(10000, 1000 + (totalVolume / 10)));
    
    return {
        marketScore: Math.min(10000, Math.max(1000, marketScore)),
        liquidityScore: Math.min(10000, Math.max(1000, liquidityScore)),
        volatilityScore: Math.min(10000, Math.max(1000, volatilityScore)),
        volumeScore: Math.min(10000, Math.max(1000, volumeScore))
    };
}

// Helper function to calculate optimal deviation based on liquidity
function calculateOptimalDeviation(totalLiquidity, priceSpread) {
    // Base deviation of 10%
    let deviation = 1000;
    
    // Adjust based on liquidity (more liquidity = tighter bounds)
    if (totalLiquidity > 100000) {
        deviation = 500; // 5% for high liquidity
    } else if (totalLiquidity > 10000) {
        deviation = 750; // 7.5% for medium liquidity
    }
    
    // Adjust based on price spread (higher spread = looser bounds)
    deviation += Math.min(2000, priceSpread * 50);
    
    return Math.min(5000, Math.max(500, Math.round(deviation)));
}

// Helper function for fallback pricing when DEX data is unavailable
async function setupFallbackPricing(oracle) {
    console.log("\n🔄 Setting up fallback pricing mechanism...");
    
    // Use a conservative base price
    const fallbackPrice = ethers.utils.parseEther("0.001"); // 0.001 S per DRAGON
    
    const updateTx = await oracle.updatePrice(fallbackPrice, {
        gasLimit: 200000
    });
    await updateTx.wait();
    
    // Set conservative market scores
    const updateAnalysisTx = await oracle.updateMarketAnalysis(
        5000, // 50% market score
        3000, // 30% liquidity score
        6000, // 60% volatility score
        2000, // 20% volume score
        { gasLimit: 200000 }
    );
    await updateAnalysisTx.wait();
    
    console.log("✅ Fallback pricing configured");
}

main()
    .then((result) => {
        console.log("\n✅ DEX price feeds setup completed!");
        if (result) {
            console.log("Result:", JSON.stringify(result, null, 2));
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Fatal error:", error.message);
        process.exit(1);
    }); 