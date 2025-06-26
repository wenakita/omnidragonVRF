const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 Setting Up API3 dAPI Integration");
    console.log("===================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Account:", deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(await deployer.getBalance()), "S");
    
    // API3 Configuration for Sonic (based on Fantom docs)
    const API3_CONFIG = {
        // API3 Market URL for configuration
        MARKET_URL: "https://market.api3.org",
        
        // Known API3 proxy address on Sonic (to be configured)
        PROXY_ADDRESS: "0x709944a48cAf83535e43471680fDA4905FB3920a",
        
        // Available dAPIs that might be configured
        AVAILABLE_DAPIS: [
            "ETH/USD",
            "BTC/USD", 
            "S/USD",    // Sonic native token
            "USDC/USD",
            "USDT/USD"
        ],
        
        // Configuration options (deviation threshold and heartbeat)
        CONFIGURATIONS: [
            { deviation: "0.25%", heartbeat: "24 hours" },
            { deviation: "0.5%", heartbeat: "24 hours" },
            { deviation: "1%", heartbeat: "24 hours" },
            { deviation: "5%", heartbeat: "24 hours" }
        ]
    };
    
    console.log("\n📋 API3 dAPI Setup Guide");
    console.log("========================");
    
    console.log("🔗 **Step 1: Access API3 Market**");
    console.log(`   Visit: ${API3_CONFIG.MARKET_URL}`);
    console.log("   Filter by: Sonic (if available) or Fantom Opera");
    console.log("   Search for: S/USD, ETH/USD, or BTC/USD");
    
    console.log("\n⚙️ **Step 2: Configure dAPI**");
    console.log("   Available configurations:");
    API3_CONFIG.CONFIGURATIONS.forEach((config, index) => {
        console.log(`   ${index + 1}. Deviation: ${config.deviation}, Heartbeat: ${config.heartbeat}`);
    });
    console.log("   Recommended: 1% deviation, 24 hours heartbeat for production");
    
    console.log("\n💳 **Step 3: Purchase Subscription**");
    console.log("   • Select your desired dAPI (e.g., S/USD)");
    console.log("   • Choose configuration (1% deviation recommended)");
    console.log("   • Purchase subscription with your wallet");
    console.log("   • Note the subscription duration and cost");
    
    console.log("\n🔧 **Step 4: Get Proxy Address**");
    console.log("   • After purchase, click 'Integrate' button");
    console.log("   • Copy the deployed proxy contract address");
    console.log("   • This address will be used in your oracle integration");
    
    // Test current API3 proxy (if configured)
    console.log("\n🧪 Testing Current API3 Proxy...");
    try {
        // Try to connect using Chainlink-compatible interface
        const api3Proxy = await ethers.getContractAt(
            "contracts/interfaces/external/chainlink/AggregatorV3Interface.sol:AggregatorV3Interface",
            API3_CONFIG.PROXY_ADDRESS
        );
        
        console.log(`✅ Connected to API3 proxy: ${API3_CONFIG.PROXY_ADDRESS}`);
        
        try {
            const roundData = await api3Proxy.latestRoundData();
            const decimals = await api3Proxy.decimals();
            const description = await api3Proxy.description();
            
            const price = parseFloat(ethers.utils.formatUnits(roundData.answer, decimals));
            const age = Math.floor((Date.now() / 1000) - roundData.updatedAt.toNumber());
            
            console.log("📊 API3 dAPI Data:");
            console.log(`   Description: ${description}`);
            console.log(`   Price: $${price.toFixed(6)}`);
            console.log(`   Last Update: ${age} seconds ago`);
            console.log(`   Decimals: ${decimals}`);
            console.log("✅ API3 dAPI is working and ready for integration!");
            
        } catch (dataError) {
            console.log("⚠️ API3 proxy exists but no active dAPI configured");
            console.log("   This is expected if you haven't purchased a subscription yet");
            console.log("   Follow the steps above to configure your dAPI");
        }
        
    } catch (error) {
        console.log("❌ Could not connect to API3 proxy");
        console.log("   Error:", error.message);
        console.log("   This might indicate the proxy address needs to be updated");
    }
    
    // Create example integration contract
    console.log("\n📝 Example API3 Integration Contract");
    console.log("====================================");
    
    const exampleContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@api3/contracts/api3-server-v1/proxies/interfaces/IProxy.sol";

contract API3DataReader {
    address public api3ProxyAddress;
    
    constructor(address _proxyAddress) {
        api3ProxyAddress = _proxyAddress;
    }
    
    function readAPI3Price() external view returns (int224 value, uint256 timestamp) {
        // Read from API3 dAPI using IProxy interface
        (value, timestamp) = IProxy(api3ProxyAddress).read();
        
        // Validate the data
        require(value > 0, "Invalid price data");
        require(timestamp > 0, "Invalid timestamp");
        
        return (value, timestamp);
    }
    
    function updateProxyAddress(address _newProxy) external {
        api3ProxyAddress = _newProxy;
    }
}`;
    
    console.log(exampleContract);
    
    // Integration instructions for Dragon Oracle
    console.log("\n🐉 Dragon Oracle Integration");
    console.log("============================");
    
    console.log("Once you have a working API3 dAPI, update your Dragon Oracle:");
    console.log("1. Get the proxy address from API3 Market");
    console.log("2. Call setOracleAddresses() with the new API3 proxy");
    console.log("3. Test the multi-oracle price update");
    console.log("4. Monitor the oracle performance");
    
    const integrationExample = `
// Example integration call
const oracle = await ethers.getContractAt("DragonMarketOracle", DRAGON_ORACLE_ADDRESS);

await oracle.setOracleAddresses(
    CHAINLINK_S_USD,     // Already working
    BAND_PROTOCOL,       // Already working  
    API3_PROXY_ADDRESS,  // Your new API3 proxy
    PYTH_NETWORK         // To be configured
);

// Test multi-oracle update
await oracle.updateMultiOraclePrice();
`;
    
    console.log(integrationExample);
    
    // Pricing and costs
    console.log("\n💰 API3 dAPI Pricing Information");
    console.log("================================");
    
    console.log("📊 **Typical Costs** (varies by configuration):");
    console.log("   • 0.25% deviation: Higher cost, more frequent updates");
    console.log("   • 1% deviation: Balanced cost and performance");
    console.log("   • 5% deviation: Lower cost, less frequent updates");
    console.log("   • Heartbeat: 24 hours standard");
    
    console.log("\n🎯 **Recommended for OmniDragon**:");
    console.log("   • dAPI: S/USD (for Sonic native token pricing)");
    console.log("   • Configuration: 1% deviation, 24h heartbeat");
    console.log("   • Weight: 20% in multi-oracle system");
    console.log("   • Benefits: First-party data, reliable updates");
    
    // Next steps
    console.log("\n🚀 Next Steps");
    console.log("=============");
    
    console.log("1. **Visit API3 Market**: Go to market.api3.org");
    console.log("2. **Find Sonic Support**: Look for Sonic or use Fantom as reference");
    console.log("3. **Configure S/USD dAPI**: Purchase subscription for S/USD feed");
    console.log("4. **Get Proxy Address**: Copy the proxy address after purchase");
    console.log("5. **Update Dragon Oracle**: Use setOracleAddresses() function");
    console.log("6. **Test Integration**: Run updateMultiOraclePrice()");
    console.log("7. **Monitor Performance**: Track oracle reliability and accuracy");
    
    console.log("\n📞 **Support Channels**:");
    console.log("   • API3 Discord: https://discord.gg/qnRrcfnm5W");
    console.log("   • API3 Docs: https://docs.api3.org/");
    console.log("   • API3 GitHub: https://github.com/api3dao");
    
    return {
        status: "GUIDE_COMPLETE",
        proxyAddress: API3_CONFIG.PROXY_ADDRESS,
        marketUrl: API3_CONFIG.MARKET_URL,
        recommendedConfig: "1% deviation, 24h heartbeat",
        nextAction: "Visit API3 Market to purchase S/USD dAPI subscription"
    };
}

main()
    .then((result) => {
        console.log("\n✅ API3 Setup Guide Complete!");
        console.log("Result:", JSON.stringify(result, null, 2));
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }); 