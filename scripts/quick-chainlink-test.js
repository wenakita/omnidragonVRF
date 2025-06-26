const { ethers } = require("hardhat");

async function main() {
    console.log("⚡ Quick Chainlink S/USD Integration Test");
    console.log("=========================================");
    
    // Contract addresses
    const DRAGON_MARKET_ORACLE = "0x5a3429B7a99634ED63F8Af37F2006CE52FD4a2B1";
    const S_USD_FEED = "0xc76dFb89fF298145b417d221B2c747d84952e01d";
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Account:", deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(await deployer.getBalance()), "S");
    
    try {
        // 1. Test S/USD Chainlink Feed
        console.log("\n1️⃣ Testing S/USD Chainlink Feed...");
        const priceFeed = await ethers.getContractAt(
            "contracts/interfaces/external/chainlink/AggregatorV3Interface.sol:AggregatorV3Interface", 
            S_USD_FEED
        );
        
        const roundData = await priceFeed.latestRoundData();
        const decimals = await priceFeed.decimals();
        const sUsdPrice = parseFloat(ethers.utils.formatUnits(roundData.answer, decimals));
        
        console.log(`✅ S/USD Price: $${sUsdPrice.toFixed(6)}`);
        console.log(`📅 Updated: ${new Date(roundData.updatedAt.toNumber() * 1000).toLocaleString()}`);
        
        // 2. Connect to Dragon Market Oracle
        console.log("\n2️⃣ Connecting to Dragon Market Oracle...");
        const oracle = await ethers.getContractAt("DragonMarketOracle", DRAGON_MARKET_ORACLE);
        
        // Get current oracle data
        const [currentPrice, timestamp] = await oracle.getLatestPrice();
        const currentPriceFormatted = parseFloat(ethers.utils.formatEther(currentPrice));
        
        console.log(`🐉 Current DRAGON Price: ${currentPriceFormatted.toFixed(6)} S`);
        console.log(`💵 USD Equivalent: $${(currentPriceFormatted * sUsdPrice).toFixed(6)}`);
        console.log(`📅 Oracle Updated: ${new Date(timestamp * 1000).toLocaleString()}`);
        
        // 3. Calculate new DRAGON price using Chainlink S/USD data
        console.log("\n3️⃣ Calculating DRAGON price with Chainlink data...");
        
        // Base DRAGON price calculation (this is where you'd implement your pricing logic)
        const baseDragonPriceUSD = 0.002; // $0.002 base price
        const dragonPriceInS = baseDragonPriceUSD / sUsdPrice;
        const dragonPriceWei = ethers.utils.parseEther(dragonPriceInS.toFixed(18));
        
        console.log(`💡 Calculated DRAGON Price: ${dragonPriceInS.toFixed(6)} S`);
        console.log(`💵 USD Value: $${baseDragonPriceUSD.toFixed(6)}`);
        
        // 4. Test oracle update (if owner)
        console.log("\n4️⃣ Testing oracle update capability...");
        
        try {
            const owner = await oracle.owner();
            console.log(`🔑 Oracle Owner: ${owner}`);
            console.log(`👤 Your Address: ${deployer.address}`);
            
            if (owner.toLowerCase() === deployer.address.toLowerCase()) {
                console.log("✅ You are the oracle owner - can update prices");
                
                // Update with Chainlink-derived price
                console.log("🔄 Updating oracle with Chainlink-derived price...");
                const updateTx = await oracle.updatePrice(dragonPriceWei, {
                    gasLimit: 200000
                });
                await updateTx.wait();
                
                console.log("✅ Oracle updated successfully!");
                
                // Verify the update
                const [newPrice, newTimestamp] = await oracle.getLatestPrice();
                const newPriceFormatted = parseFloat(ethers.utils.formatEther(newPrice));
                
                console.log(`🎉 New DRAGON Price: ${newPriceFormatted.toFixed(6)} S`);
                console.log(`💵 New USD Value: $${(newPriceFormatted * sUsdPrice).toFixed(6)}`);
                
            } else {
                console.log("ℹ️ You are not the oracle owner - read-only access");
            }
        } catch (error) {
            console.log("⚠️ Could not check oracle ownership:", error.message);
        }
        
        // 5. Summary
        console.log("\n📊 Integration Summary:");
        console.log("======================");
        console.log(`🔗 S/USD Feed: ${S_USD_FEED} ✅`);
        console.log(`🐉 Dragon Oracle: ${DRAGON_MARKET_ORACLE} ✅`);
        console.log(`💰 S Token Price: $${sUsdPrice.toFixed(6)}`);
        console.log(`🎯 DRAGON Price: ${dragonPriceInS.toFixed(6)} S`);
        console.log(`💵 DRAGON USD Value: $${(dragonPriceInS * sUsdPrice).toFixed(6)}`);
        
        console.log("\n🎉 Chainlink Integration Test Complete!");
        
        return {
            sUsdPrice,
            dragonPriceInS,
            dragonPriceUSD: dragonPriceInS * sUsdPrice,
            chainlinkWorking: true,
            oracleConnected: true
        };
        
    } catch (error) {
        console.error("\n❌ Integration test failed:");
        console.error("Error:", error.message);
        throw error;
    }
}

main()
    .then((result) => {
        console.log("\n✅ Test completed successfully!");
        if (result) {
            console.log("Results:", JSON.stringify(result, null, 2));
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Test failed:", error.message);
        process.exit(1);
    }); 