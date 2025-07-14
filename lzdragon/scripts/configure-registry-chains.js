const { ethers } = require("hardhat");

/**
 * Script to configure the OmniDragonHybridRegistry with chain-specific wrapped native tokens
 * This demonstrates the new wrapped native symbol functionality
 */

// Chain configurations with wrapped native info
const CHAIN_CONFIGS = {
    146: {  // Sonic
        name: "Sonic",
        wrappedNativeToken: "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38", // WS (example)
        wrappedNativeSymbol: "WS"
    },
    42161: { // Arbitrum
        name: "Arbitrum",
        wrappedNativeToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
        wrappedNativeSymbol: "WETH"
    },
    43114: { // Avalanche
        name: "Avalanche", 
        wrappedNativeToken: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
        wrappedNativeSymbol: "WAVAX"
    },
    250: { // Fantom
        name: "Fantom",
        wrappedNativeToken: "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83", // WFTM
        wrappedNativeSymbol: "WFTM"
    },
    137: { // Polygon
        name: "Polygon",
        wrappedNativeToken: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
        wrappedNativeSymbol: "WMATIC"
    },
    56: { // BSC
        name: "BNB Chain",
        wrappedNativeToken: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
        wrappedNativeSymbol: "WBNB"
    },
    1: { // Ethereum
        name: "Ethereum",
        wrappedNativeToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
        wrappedNativeSymbol: "WETH"
    }
};

async function main() {
    const [signer] = await ethers.getSigners();
    console.log("Configuring registry with account:", signer.address);

    // Get current network
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;
    console.log(`Current network: ${chainId}`);

    // Get registry address - you'll need to update this with your deployed registry address
    const registryAddress = process.env.REGISTRY_ADDRESS || "YOUR_REGISTRY_ADDRESS_HERE";
    
    if (registryAddress === "YOUR_REGISTRY_ADDRESS_HERE") {
        console.error("❌ Please set REGISTRY_ADDRESS environment variable or update the script");
        process.exit(1);
    }

    // Connect to registry
    const registryFactory = await ethers.getContractFactory("OmniDragonHybridRegistry");
    const registry = registryFactory.attach(registryAddress);

    console.log("\n🔧 Configuring supported chains with wrapped native symbols...");

    // Register each chain configuration
    for (const [chainIdStr, config] of Object.entries(CHAIN_CONFIGS)) {
        const targetChainId = parseInt(chainIdStr);
        
        try {
            console.log(`\n📋 Registering ${config.name} (Chain ID: ${targetChainId})`);
            console.log(`   Wrapped Native: ${config.wrappedNativeToken} (${config.wrappedNativeSymbol})`);
            
            // Check if chain is already registered
            try {
                const existingConfig = await registry.getChainConfig(targetChainId);
                if (existingConfig.chainId == targetChainId) {
                    console.log(`   ⚠️  Chain ${targetChainId} already registered, updating...`);
                    
                    // Update existing chain
                    const tx = await registry.updateChain(
                        targetChainId,
                        config.wrappedNativeToken,
                        config.wrappedNativeSymbol,
                        ethers.constants.AddressZero, // lottery manager - not set yet
                        ethers.constants.AddressZero, // randomness provider - not set yet
                        ethers.constants.AddressZero, // price oracle - not set yet
                        ethers.constants.AddressZero, // vrf consumer - not set yet
                        ethers.constants.AddressZero, // dragon token - not set yet
                        ethers.constants.AddressZero  // jackpot vault - not set yet
                    );
                    
                    await tx.wait();
                    console.log(`   ✅ Updated ${config.name} configuration`);
                    continue;
                }
            } catch (e) {
                // Chain not registered yet, continue with registration
            }
            
            // Register new chain
            const tx = await registry.registerChain(
                targetChainId,
                config.name,
                config.wrappedNativeToken,
                config.wrappedNativeSymbol,
                ethers.constants.AddressZero, // lottery manager - not set yet
                ethers.constants.AddressZero, // randomness provider - not set yet
                ethers.constants.AddressZero, // price oracle - not set yet
                ethers.constants.AddressZero, // vrf consumer - not set yet
                ethers.constants.AddressZero, // dragon token - not set yet
                ethers.constants.AddressZero  // jackpot vault - not set yet
            );
            
            await tx.wait();
            console.log(`   ✅ Registered ${config.name} successfully`);
            
        } catch (error) {
            console.error(`   ❌ Failed to register ${config.name}:`, error.message);
        }
    }

    console.log("\n🔍 Verifying chain configurations...");
    
    // Verify configurations
    for (const [chainIdStr, config] of Object.entries(CHAIN_CONFIGS)) {
        const targetChainId = parseInt(chainIdStr);
        
        try {
            const wrappedNativeInfo = await registry.getWrappedNativeInfo(targetChainId);
            const symbol = await registry.getWrappedNativeSymbol(targetChainId);
            
            console.log(`✅ ${config.name} (${targetChainId}):`);
            console.log(`   Address: ${wrappedNativeInfo.tokenAddress}`);
            console.log(`   Symbol: ${symbol}`);
            
            if (symbol !== config.wrappedNativeSymbol) {
                console.log(`   ⚠️  Symbol mismatch! Expected: ${config.wrappedNativeSymbol}, Got: ${symbol}`);
            }
            
        } catch (error) {
            console.error(`❌ Failed to verify ${config.name}:`, error.message);
        }
    }

    console.log("\n🎉 Registry configuration complete!");
    console.log("\n📋 Next steps:");
    console.log("1. Deploy omniDRAGON tokens on each chain");
    console.log("2. Update registry with deployed token addresses");
    console.log("3. Configure lottery managers and other ecosystem contracts");
    console.log("4. The omniDRAGON contracts will automatically use the correct wrapped native symbols!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Configuration failed:", error);
        process.exit(1);
    }); 