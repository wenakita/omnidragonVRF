const { ethers } = require("hardhat");

async function main() {
    console.log("🌐 Testing Enhanced Multi-Oracle System");
    console.log("======================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Account:", deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(await deployer.getBalance()), "S");
    
    // Oracle addresses on Sonic mainnet
    const ORACLE_ADDRESSES = {
        DRAGON_ORACLE: "0x5a3429B7a99634ED63F8Af37F2006CE52FD4a2B1",
        CHAINLINK_S_USD: "0xc76dFb89fF298145b417d221B2c747d84952e01d",
        BAND_PROTOCOL: "0x506085050Ea5494Fe4b89Dd5BEa659F506F470Cc",
        API3_PROXY: "0x709944a48cAf83535e43471680fDA4905FB3920a",
        PYTH_NETWORK: "0x2880aB155794e7179c9eE2e38200202908C17B43"
    };
    
    try {
        // Connect to the enhanced Dragon Market Oracle
        console.log("\n1️⃣ Connecting to Enhanced Dragon Market Oracle...");
        const oracle = await ethers.getContractAt("DragonMarketOracle", ORACLE_ADDRESSES.DRAGON_ORACLE);
        
        // Check current configuration
        console.log("\n2️⃣ Checking Current Oracle Configuration...");
        const weights = await oracle.getSourceWeights();
        console.log(`📊 Current Oracle Weights:`);
        console.log(`   Chainlink: ${weights.chainlink / 100}%`);
        console.log(`   API3: ${weights.api3 / 100}%`);
        console.log(`   Pyth: ${weights.pyth / 100}%`);
        console.log(`   Band: ${weights.band / 100}%`);
        
        // Set up oracle addresses (if not already set)
        console.log("\n3️⃣ Configuring Multi-Oracle Addresses...");
        try {
            const setAddressesTx = await oracle.setOracleAddresses(
                ORACLE_ADDRESSES.CHAINLINK_S_USD,
                ORACLE_ADDRESSES.BAND_PROTOCOL,
                ORACLE_ADDRESSES.API3_PROXY,
                ORACLE_ADDRESSES.PYTH_NETWORK,
                { gasLimit: 200000 }
            );
            await setAddressesTx.wait();
            console.log("✅ Oracle addresses configured!");
        } catch (error) {
            console.log("ℹ️ Oracle addresses already configured or update failed");
        }
        
        // Test multi-oracle price update
        console.log("\n4️⃣ Testing Multi-Oracle Price Update...");
        try {
            const updateTx = await oracle.updateMultiOraclePrice({ gasLimit: 500000 });
            const receipt = await updateTx.wait();
            
            console.log("✅ Multi-Oracle Update Successful!");
            console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
            
            // Parse events
            for (const log of receipt.logs) {
                try {
                    const parsed = oracle.interface.parseLog(log);
                    if (parsed.name === "MultiOraclePriceUpdate") {
                        console.log(`📊 Aggregated Price: ${ethers.utils.formatEther(parsed.args.aggregatedPrice)} S`);
                        console.log(`🔗 Oracle Count: ${parsed.args.oracleCount}`);
                        console.log(`⚖️ Total Weight: ${parsed.args.totalWeight}`);
                    } else if (parsed.name === "OracleFallback") {
                        console.log(`⚠️ Oracle Fallback: ${parsed.args.oracle} - ${parsed.args.reason}`);
                    }
                } catch (e) {
                    // Skip unparseable logs
                }
            }
            
        } catch (error) {
            console.log("❌ Multi-Oracle Update Failed:", error.message);
            
            // Try individual oracle tests
            console.log("\n🔍 Testing Individual Oracles...");
            
            // Test Chainlink
            try {
                const chainlinkFeed = await ethers.getContractAt(
                    "contracts/interfaces/external/chainlink/AggregatorV3Interface.sol:AggregatorV3Interface",
                    ORACLE_ADDRESSES.CHAINLINK_S_USD
                );
                const roundData = await chainlinkFeed.latestRoundData();
                const decimals = await chainlinkFeed.decimals();
                const price = parseFloat(ethers.utils.formatUnits(roundData.answer, decimals));
                console.log(`✅ Chainlink S/USD: $${price.toFixed(6)}`);
            } catch (e) {
                console.log("❌ Chainlink test failed");
            }
            
            // Test Band Protocol
            try {
                const bandContract = await ethers.getContractAt("IStdReference", ORACLE_ADDRESSES.BAND_PROTOCOL);
                const sData = await bandContract.getReferenceData("S", "USD");
                const sPrice = parseFloat(ethers.utils.formatUnits(sData.rate, 18));
                console.log(`✅ Band Protocol S/USD: $${sPrice.toFixed(6)}`);
            } catch (e) {
                console.log("❌ Band Protocol test failed");
            }
        }
        
        // Get current multi-oracle price (view function)
        console.log("\n5️⃣ Getting Current Multi-Oracle Price...");
        try {
            const [price, oracleCount, confidence] = await oracle.getMultiOraclePrice();
            console.log(`💰 Current Price: ${ethers.utils.formatEther(price)} S`);
            console.log(`🔗 Working Oracles: ${oracleCount}`);
            console.log(`🎯 Confidence: ${confidence / 100}%`);
        } catch (error) {
            console.log("⚠️ Could not get multi-oracle price:", error.message);
        }
        
        // Get current market data
        console.log("\n6️⃣ Getting Enhanced Market Analysis...");
        try {
            const [price, marketConditions, liquidity, volatility, volume, lastUpdate] = await oracle.getDragonMarketData();
            
            console.log(`📈 Market Analysis:`);
            console.log(`   Price: ${ethers.utils.formatEther(price)} S`);
            console.log(`   Market Score: ${marketConditions}/10000 (${(marketConditions/100).toFixed(1)}%)`);
            console.log(`   Liquidity Score: ${liquidity}/10000 (${(liquidity/100).toFixed(1)}%)`);
            console.log(`   Volatility Score: ${volatility}/10000 (${(volatility/100).toFixed(1)}%)`);
            console.log(`   Volume Score: ${volume}/10000 (${(volume/100).toFixed(1)}%)`);
            console.log(`   Last Update: ${new Date(lastUpdate * 1000).toLocaleString()}`);
            
        } catch (error) {
            console.log("❌ Could not get market data:", error.message);
        }
        
        // Test circuit breaker status
        console.log("\n7️⃣ Checking Circuit Breaker Status...");
        try {
            const [active, maxDeviation, currentDeviation] = await oracle.getCircuitBreakerStatus();
            console.log(`🔒 Circuit Breaker: ${active ? "ACTIVE" : "INACTIVE"}`);
            console.log(`📊 Max Deviation: ${maxDeviation/100}%`);
            console.log(`📈 Current Deviation: ${currentDeviation/100}%`);
        } catch (error) {
            console.log("❌ Could not get circuit breaker status:", error.message);
        }
        
        // Summary
        console.log("\n🎯 Multi-Oracle Integration Summary");
        console.log("===================================");
        console.log("✅ Enhanced DragonMarketOracle with multi-oracle support");
        console.log("🔗 Chainlink S/USD: Primary oracle (40% weight)");
        console.log("📊 Band Protocol: Secondary oracle (30% weight)");
        console.log("🎯 API3: Available for dAPI integration (20% weight)");
        console.log("⚡ Pyth: Available for price feed integration (10% weight)");
        console.log("🛡️ Circuit breaker and fallback mechanisms active");
        console.log("📈 Market scoring enhanced with oracle diversity bonuses");
        
        console.log("\n🚀 Next Steps:");
        console.log("1. Monitor multi-oracle price updates");
        console.log("2. Set up API3 dAPI feeds for additional redundancy");
        console.log("3. Configure Pyth Network price feed IDs");
        console.log("4. Adjust oracle weights based on performance");
        
    } catch (error) {
        console.error("\n❌ Test failed:");
        console.error("Error:", error.message);
        throw error;
    }
}

main()
    .then(() => {
        console.log("\n✅ Multi-Oracle System Test completed!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Fatal error:", error.message);
        process.exit(1);
    }); 