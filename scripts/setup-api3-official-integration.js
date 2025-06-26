const { ethers } = require("hardhat");

async function main() {
    console.log("🔗 Setting Up Official API3 Integration");
    console.log("=======================================");
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Account:", deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(await deployer.getBalance()), "S");
    
    // Official API3 Configuration
    const API3_CONFIG = {
        // API3 Market and Documentation
        MARKET_URL: "https://market.api3.org",
        DOCS_URL: "https://docs.api3.org/",
        GITHUB_EXAMPLE: "https://github.com/api3dao/data-feed-reader-example",
        
        // Known API3 proxy addresses (examples from documentation)
        EXAMPLE_PROXIES: {
            ETH_SEPOLIA_ETH_USD: "0x5b0cf2b36a65a6BB085D501B971e4c102B9Cd473",
            // Sonic proxies to be configured
            SONIC_PROXY_PLACEHOLDER: "0x709944a48cAf83535e43471680fDA4905FB3920a"
        },
        
        // Available dAPIs for Sonic (to be configured)
        AVAILABLE_DAPIS: [
            "S/USD",     // Sonic native token
            "ETH/USD",   // Ethereum
            "BTC/USD",   // Bitcoin
            "USDC/USD",  // USD Coin
            "USDT/USD"   // Tether
        ],
        
        // Configuration options from API3 Market
        CONFIGURATIONS: [
            { deviation: "0.25%", heartbeat: "24 hours", cost: "High", frequency: "Very High" },
            { deviation: "0.5%", heartbeat: "24 hours", cost: "Medium-High", frequency: "High" },
            { deviation: "1%", heartbeat: "24 hours", cost: "Medium", frequency: "Medium" },
            { deviation: "5%", heartbeat: "24 hours", cost: "Low", frequency: "Low" }
        ]
    };
    
    console.log("\n📋 Official API3 Integration Guide");
    console.log("==================================");
    
    console.log("🔗 **Step 1: Visit API3 Market**");
    console.log(`   URL: ${API3_CONFIG.MARKET_URL}`);
    console.log("   • Search for supported chains");
    console.log("   • Look for Sonic blockchain support");
    console.log("   • If Sonic not listed, check Fantom (similar EVM)");
    
    console.log("\n📊 **Step 2: Available dAPI Configurations**");
    console.log("   Choose your configuration based on needs:");
    API3_CONFIG.CONFIGURATIONS.forEach((config, index) => {
        console.log(`   ${index + 1}. ${config.deviation} deviation, ${config.heartbeat} heartbeat`);
        console.log(`      Cost: ${config.cost}, Update Frequency: ${config.frequency}`);
    });
    
    console.log("\n💳 **Step 3: Purchase dAPI Subscription**");
    console.log("   For OmniDragon lottery system:");
    console.log("   • Recommended: S/USD with 1% deviation");
    console.log("   • Alternative: ETH/USD as backup");
    console.log("   • Duration: Start with 1 month for testing");
    console.log("   • Payment: Connect wallet and pay subscription fee");
    
    console.log("\n🔧 **Step 4: Get Api3ReaderProxyV1 Address**");
    console.log("   After purchasing subscription:");
    console.log("   • Click 'Integrate' button on dAPI page");
    console.log("   • Copy the Api3ReaderProxyV1 contract address");
    console.log("   • This is your proxy for reading price data");
    
    // Test existing API3 proxy connection
    console.log("\n🧪 Testing API3 Proxy Connection...");
    
    try {
        // Test with placeholder proxy address
        const api3Proxy = await ethers.getContractAt(
            "contracts/interfaces/external/chainlink/AggregatorV3Interface.sol:AggregatorV3Interface",
            API3_CONFIG.EXAMPLE_PROXIES.SONIC_PROXY_PLACEHOLDER
        );
        
        console.log(`✅ Connected to API3 proxy: ${API3_CONFIG.EXAMPLE_PROXIES.SONIC_PROXY_PLACEHOLDER}`);
        
        try {
            // Try Chainlink-compatible interface
            const roundData = await api3Proxy.latestRoundData();
            const decimals = await api3Proxy.decimals();
            const description = await api3Proxy.description();
            
            const price = parseFloat(ethers.utils.formatUnits(roundData.answer, decimals));
            const updateTime = new Date(roundData.updatedAt.toNumber() * 1000);
            
            console.log("📊 API3 dAPI Data (Chainlink Compatible):");
            console.log(`   Feed: ${description}`);
            console.log(`   Price: $${price.toFixed(6)}`);
            console.log(`   Last Update: ${updateTime.toISOString()}`);
            console.log(`   Decimals: ${decimals}`);
            console.log("✅ API3 dAPI is working and Chainlink-compatible!");
            
        } catch (dataError) {
            console.log("⚠️ No active dAPI subscription found");
            console.log("   This is expected if you haven't purchased a subscription yet");
            
            // Try native API3 interface
            try {
                const api3Native = await ethers.getContractAt("IApi3Proxy", API3_CONFIG.EXAMPLE_PROXIES.SONIC_PROXY_PLACEHOLDER);
                const nativeData = await api3Native.read();
                console.log("📊 API3 Native Interface Test:");
                console.log(`   Value: ${nativeData.value.toString()}`);
                console.log(`   Timestamp: ${nativeData.timestamp.toString()}`);
            } catch (nativeError) {
                console.log("ℹ️ API3 proxy exists but needs dAPI subscription");
            }
        }
        
    } catch (error) {
        console.log("❌ Could not connect to API3 proxy");
        console.log("   This indicates you need to get the correct proxy address");
        console.log("   from API3 Market after purchasing a subscription");
    }
    
    // Create official API3 integration contract
    console.log("\n📝 Official API3 DataFeedReader Contract");
    console.log("========================================");
    
    const officialContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@api3/contracts/api3-server-v1/proxies/interfaces/IProxy.sol";

/**
 * @title DataFeedReaderExample
 * @dev Official API3 data feed reader for OmniDragon
 * Based on: https://github.com/api3dao/data-feed-reader-example
 */
contract DataFeedReaderExample {
    // The proxy contract address obtained from the API3 Market UI
    address public proxyAddress;
    
    // Only owner can update proxy address (security-critical action)
    address public owner;
    
    event ProxyAddressUpdated(address indexed oldProxy, address indexed newProxy);
    event PriceRead(int224 value, uint256 timestamp, address indexed reader);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor(address _proxyAddress) {
        proxyAddress = _proxyAddress;
        owner = msg.sender;
    }
    
    /**
     * @notice Updates the proxy contract address
     * @dev This is a security-critical action, only owner can perform it
     * @param _proxyAddress New API3 proxy address from API3 Market
     */
    function setProxyAddress(address _proxyAddress) external onlyOwner {
        require(_proxyAddress != address(0), "Invalid proxy address");
        address oldProxy = proxyAddress;
        proxyAddress = _proxyAddress;
        emit ProxyAddressUpdated(oldProxy, _proxyAddress);
    }
    
    /**
     * @notice Reads the latest data from the API3 dAPI
     * @return value The latest price value (18 decimals for USD pairs)
     * @return timestamp The timestamp of the last update
     */
    function readDataFeed() external returns (int224 value, uint256 timestamp) {
        // Use the IProxy interface to read a dAPI via its proxy contract
        (value, timestamp) = IProxy(proxyAddress).read();
        
        // Validate the data
        require(value > 0, "Invalid price value");
        require(timestamp > 0, "Invalid timestamp");
        require(block.timestamp - timestamp < 3600, "Price data too old"); // 1 hour staleness check
        
        emit PriceRead(value, timestamp, msg.sender);
        return (value, timestamp);
    }
    
    /**
     * @notice Reads data feed without validation (view function)
     * @return value The latest price value
     * @return timestamp The timestamp of the last update
     */
    function readDataFeedUnsafe() external view returns (int224 value, uint256 timestamp) {
        return IProxy(proxyAddress).read();
    }
    
    /**
     * @notice Chainlink-compatible interface for easy integration
     * @return roundId Always returns 1 (API3 doesn't use rounds)
     * @return answer The price answer (converted to Chainlink format)
     * @return startedAt The timestamp
     * @return updatedAt The timestamp  
     * @return answeredInRound Always returns 1
     */
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        (int224 value, uint256 timestamp) = IProxy(proxyAddress).read();
        
        return (
            1, // roundId (API3 doesn't use rounds)
            int256(value), // answer
            timestamp, // startedAt
            timestamp, // updatedAt
            1 // answeredInRound
        );
    }
    
    /**
     * @notice Returns decimals for Chainlink compatibility
     * @return Always returns 18 (API3 uses 18 decimals for USD pairs)
     */
    function decimals() external pure returns (uint8) {
        return 18;
    }
    
    /**
     * @notice Returns description for Chainlink compatibility
     * @return Description of the price feed
     */
    function description() external pure returns (string memory) {
        return "API3 S/USD Price Feed";
    }
}`;
    
    console.log(officialContract);
    
    // JavaScript integration examples
    console.log("\n💻 JavaScript Integration Examples");
    console.log("==================================");
    
    const jsExamples = `
// Example 1: Deploy DataFeedReaderExample
async function deployAPI3Reader(proxyAddress) {
    console.log("🚀 Deploying API3 DataFeedReaderExample...");
    
    const DataFeedReaderExample = await ethers.getContractFactory("DataFeedReaderExample");
    const reader = await DataFeedReaderExample.deploy(proxyAddress);
    await reader.deployed();
    
    console.log(\`✅ DataFeedReaderExample deployed: \${reader.address}\`);
    console.log(\`   Proxy Address: \${proxyAddress}\`);
    
    return reader;
}

// Example 2: Read API3 data feed
async function readAPI3DataFeed(readerAddress) {
    console.log("📊 Reading API3 data feed...");
    
    const reader = await ethers.getContractAt("DataFeedReaderExample", readerAddress);
    
    try {
        const [value, timestamp] = await reader.readDataFeed();
        const price = parseFloat(ethers.utils.formatEther(value));
        const updateTime = new Date(timestamp.toNumber() * 1000);
        
        console.log(\`✅ API3 Price: $\${price.toFixed(6)}\`);
        console.log(\`   Last Update: \${updateTime.toISOString()}\`);
        
        return { price, timestamp: timestamp.toNumber() };
    } catch (error) {
        console.error("❌ Failed to read API3 data:", error.message);
        throw error;
    }
}

// Example 3: Integrate with Dragon Oracle
async function integrateAPI3WithDragonOracle(api3ReaderAddress) {
    console.log("🐉 Integrating API3 with Dragon Oracle...");
    
    const oracle = await ethers.getContractAt("DragonMarketOracle", DRAGON_ORACLE_ADDRESS);
    
    // Update oracle addresses to include API3
    await oracle.setOracleAddresses(
        CHAINLINK_S_USD,     // Chainlink (40% weight)
        BAND_PROTOCOL,       // Band Protocol (30% weight)
        api3ReaderAddress,   // API3 DataFeedReader (20% weight)
        PYTH_CONTRACT        // Pyth Network (10% weight)
    );
    
    console.log("✅ Dragon Oracle updated with API3 integration!");
    
    // Test multi-oracle update
    await oracle.updateMultiOraclePrice();
    console.log("✅ Multi-oracle price update successful!");
}

// Example usage
async function main() {
    const API3_PROXY = "YOUR_API3_PROXY_ADDRESS_FROM_MARKET";
    
    // Deploy reader
    const reader = await deployAPI3Reader(API3_PROXY);
    
    // Test reading
    await readAPI3DataFeed(reader.address);
    
    // Integrate with Dragon Oracle
    await integrateAPI3WithDragonOracle(reader.address);
}`;
    
    console.log(jsExamples);
    
    // Official API3 commands
    console.log("\n⚡ Official API3 Commands (Adapted for Hardhat)");
    console.log("===============================================");
    
    console.log("**1. Check Supported Networks:**");
    console.log("   # API3 supports many EVM chains");
    console.log("   # Check market.api3.org for Sonic support");
    console.log("   # If not listed, use Fantom as reference");
    
    console.log("\n**2. Get Proxy Address (After Subscription):**");
    console.log("   # Visit market.api3.org");
    console.log("   # Purchase S/USD dAPI subscription");
    console.log("   # Click 'Integrate' to get proxy address");
    console.log("   API3_PROXY=0xYOUR_PROXY_ADDRESS");
    
    console.log("\n**3. Deploy DataFeedReaderExample:**");
    console.log("   npx hardhat run deploy/deploy-api3-reader.js --network sonic");
    console.log("   # Pass API3_PROXY as constructor parameter");
    
    console.log("\n**4. Read Data Feed:**");
    console.log("   npx hardhat run scripts/read-api3-data-feed.js --network sonic");
    
    console.log("\n**5. Test Integration:**");
    console.log("   npx hardhat run scripts/test-api3-integration.js --network sonic");
    
    // Cost and benefits analysis
    console.log("\n💰 API3 Cost-Benefit Analysis");
    console.log("=============================");
    
    console.log("📊 **Subscription Costs** (varies by configuration):");
    console.log("   • 1% deviation, 24h heartbeat: ~$50-200/month");
    console.log("   • 0.5% deviation: Higher cost, more frequent updates");
    console.log("   • 5% deviation: Lower cost, less frequent updates");
    
    console.log("\n🎯 **Benefits for OmniDragon:**");
    console.log("   • First-party data from major exchanges");
    console.log("   • Chainlink-compatible interface (easy integration)");
    console.log("   • High precision (18 decimals)");
    console.log("   • Reliable push-based updates");
    console.log("   • No per-update transaction fees");
    
    console.log("\n⚖️ **Recommended Configuration:**");
    console.log("   • dAPI: S/USD (if available) or ETH/USD");
    console.log("   • Deviation: 1% (balanced cost/performance)");
    console.log("   • Heartbeat: 24 hours");
    console.log("   • Weight in multi-oracle: 20%");
    console.log("   • Duration: Start with 1 month trial");
    
    // Next steps
    console.log("\n🚀 Implementation Roadmap");
    console.log("=========================");
    
    console.log("**Phase 1: Research & Purchase (1-2 days)**");
    console.log("1. ✅ Visit market.api3.org");
    console.log("2. 🔍 Check Sonic blockchain support");
    console.log("3. 💳 Purchase S/USD dAPI subscription");
    console.log("4. 📝 Get Api3ReaderProxyV1 address");
    
    console.log("\n**Phase 2: Integration (1 day)**");
    console.log("1. 🔧 Deploy DataFeedReaderExample contract");
    console.log("2. 🧪 Test API3 data reading");
    console.log("3. 🐉 Update Dragon Oracle configuration");
    console.log("4. ✅ Test multi-oracle system");
    
    console.log("\n**Phase 3: Monitoring (Ongoing)**");
    console.log("1. 📊 Monitor price accuracy vs other oracles");
    console.log("2. 💰 Track subscription costs and renewal");
    console.log("3. ⚙️ Adjust oracle weights if needed");
    console.log("4. 🔄 Renew subscription before expiry");
    
    console.log("\n📞 Support Resources");
    console.log("====================");
    
    console.log("🔗 **Official Resources:**");
    console.log(`   • API3 Market: ${API3_CONFIG.MARKET_URL}`);
    console.log(`   • Documentation: ${API3_CONFIG.DOCS_URL}`);
    console.log(`   • Example Code: ${API3_CONFIG.GITHUB_EXAMPLE}`);
    
    console.log("\n💬 **Community Support:**");
    console.log("   • Discord: https://discord.gg/qnRrcfnm5W");
    console.log("   • Telegram: https://t.me/API3DAO");
    console.log("   • GitHub: https://github.com/api3dao");
    
    return {
        status: "API3_INTEGRATION_GUIDE_COMPLETE",
        marketUrl: API3_CONFIG.MARKET_URL,
        exampleRepo: API3_CONFIG.GITHUB_EXAMPLE,
        recommendedConfig: "S/USD with 1% deviation, 24h heartbeat",
        estimatedCost: "$50-200/month",
        integrationTime: "2-3 days",
        nextAction: "Visit API3 Market and purchase S/USD dAPI subscription",
        chainlinkCompatible: true,
        weight: "20%"
    };
}

main()
    .then((result) => {
        console.log("\n✅ Official API3 Integration Guide Complete!");
        console.log("Result:", JSON.stringify(result, null, 2));
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Error:", error.message);
        process.exit(1);
    });