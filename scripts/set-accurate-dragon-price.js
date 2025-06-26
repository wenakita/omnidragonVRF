const { ethers } = require("hardhat");

const DRAGON_MARKET_ORACLE = "0x5a3429B7a99634ED63F8Af37F2006CE52FD4a2B1";

async function main() {
    console.log("💰 Setting Accurate DRAGON Price");
    console.log("================================");

    const [deployer] = await ethers.getSigners();
    console.log("👤 Account:", deployer.address);

    const oracle = await ethers.getContractAt("DragonMarketOracle", DRAGON_MARKET_ORACLE);

    // Set a realistic DRAGON price: 0.002 S per DRAGON
    // This translates to approximately $0.0001 USD per DRAGON (assuming S ≈ $0.05)
    const dragonPrice = "0.002"; // 0.002 S per DRAGON
    const priceWei = ethers.utils.parseEther(dragonPrice);

    console.log(`🐉 Setting DRAGON price to: ${dragonPrice} S per DRAGON`);
    console.log(`💵 Estimated USD value: $${(parseFloat(dragonPrice) * 0.05).toFixed(6)} per DRAGON`);

    // Update the price
    const tx = await oracle.updatePrice(priceWei, { gasLimit: 200000 });
    await tx.wait();

    console.log("✅ Price updated successfully!");

    // Verify the update
    const [currentPrice, timestamp] = await oracle.getLatestPrice();
    const currentPriceFormatted = ethers.utils.formatEther(currentPrice);

    console.log("\n📊 Verification:");
    console.log(`  Current Price: ${currentPriceFormatted} S per DRAGON`);
    console.log(`  USD Estimate: $${(parseFloat(currentPriceFormatted) * 0.05).toFixed(6)}`);
    console.log(`  Updated: ${new Date(timestamp * 1000).toLocaleString()}`);

    // Update market scores to reflect good conditions
    console.log("\n📈 Updating market analysis...");
    const updateAnalysisTx = await oracle.updateMarketAnalysis(
        7500, // 75% market score
        6500, // 65% liquidity score  
        7000, // 70% volatility score
        5500, // 55% volume score
        { gasLimit: 200000 }
    );
    await updateAnalysisTx.wait();

    console.log("✅ Market analysis updated!");
    console.log("\n🎉 Oracle now has accurate DRAGON pricing!");
}

main().catch(console.error); 