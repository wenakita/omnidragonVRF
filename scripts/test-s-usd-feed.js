const { ethers } = require("hardhat");

async function main() {
    console.log("🔗 Testing S/USD Chainlink Price Feed on Sonic");
    console.log("===============================================");
    
    // S/USD price feed address from Chainlink data feeds
    const S_USD_FEED = "0xc76dFb89fF298145b417d221B2c747d84952e01d";
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Account:", deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(await deployer.getBalance()), "S");
    
    try {
        // Connect to the Chainlink price feed
        console.log(`\n📊 Connecting to S/USD feed: ${S_USD_FEED}`);
        
        const priceFeed = await ethers.getContractAt("contracts/interfaces/external/chainlink/AggregatorV3Interface.sol:AggregatorV3Interface", S_USD_FEED);
        
        // Get the latest price data
        console.log("📈 Fetching latest price data...");
        const roundData = await priceFeed.latestRoundData();
        
        // Get feed metadata
        const decimals = await priceFeed.decimals();
        const description = await priceFeed.description();
        
        // Format the price
        const price = parseFloat(ethers.utils.formatUnits(roundData.answer, decimals));
        const updatedAt = new Date(roundData.updatedAt.toNumber() * 1000);
        
        console.log("\n✅ S/USD Price Feed Data:");
        console.log(`  📝 Description: ${description}`);
        console.log(`  💰 Current Price: $${price.toFixed(6)}`);
        console.log(`  🔢 Decimals: ${decimals}`);
        console.log(`  🆔 Round ID: ${roundData.roundId.toString()}`);
        console.log(`  📅 Last Updated: ${updatedAt.toLocaleString()}`);
        console.log(`  ⏰ Data Age: ${Math.floor((Date.now() - updatedAt.getTime()) / 1000)} seconds`);
        
        // Validate data freshness
        const dataAge = Math.floor((Date.now() - updatedAt.getTime()) / 1000);
        if (dataAge < 3600) {
            console.log("  ✅ Data is fresh (< 1 hour old)");
        } else {
            console.log("  ⚠️ Data is stale (> 1 hour old)");
        }
        
        // Validate price is reasonable
        if (price > 0 && price < 10) {
            console.log("  ✅ Price is within reasonable range");
        } else {
            console.log("  ⚠️ Price seems unusual");
        }
        
        console.log("\n🎉 S/USD Chainlink Price Feed Test Complete!");
        
        return {
            address: S_USD_FEED,
            price: price,
            decimals: decimals,
            description: description,
            dataAge: dataAge,
            working: true
        };
        
    } catch (error) {
        console.error("\n❌ Failed to connect to S/USD price feed:");
        console.error("Error:", error.message);
        
        // Check if it's a network connectivity issue
        if (error.message.includes("network") || error.message.includes("connection")) {
            console.log("\n💡 Possible solutions:");
            console.log("  1. Check your Sonic network connection");
            console.log("  2. Verify the RPC endpoint is working");
            console.log("  3. Ensure the contract address is correct");
        }
        
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 