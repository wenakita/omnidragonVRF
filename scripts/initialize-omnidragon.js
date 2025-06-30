const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Initializing deployed omniDRAGON contract...");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");

    // Contract addresses
    const OMNIDRAGON_ADDRESS = "0x2521f093D012beCDC16336c301A895fbad4DDbC5";
    const LZ_PROXY = "0x6Fa6abF394d4f827988FBAD17CadFb506b83c3e8";
    const LOTTERY_MANAGER = "0x56eAb9e1f775d0f43cf831d719439e0bF6748234";
    
    // Delegate (user's address)
    const delegate = deployer.address;
    
    console.log("omniDRAGON Address:", OMNIDRAGON_ADDRESS);
    console.log("LZ Proxy:", LZ_PROXY);
    console.log("Delegate:", delegate);
    
    try {
        // Get the contract factory and attach to deployed contract
        const omniDRAGON = await ethers.getContractFactory("omniDRAGON");
        const contract = omniDRAGON.attach(OMNIDRAGON_ADDRESS);
        
        // Check if already initialized
        console.log("\n📋 Checking current status...");
        const initialized = await contract.initialized();
        console.log("Already initialized:", initialized);
        
        if (initialized) {
            console.log("✅ Contract is already initialized");
            
            // Show current info
            const owner = await contract.owner();
            const totalSupply = await contract.totalSupply();
            console.log("Owner:", owner);
            console.log("Total Supply:", ethers.utils.formatEther(totalSupply));
            
        } else {
            // Initialize the contract
            console.log("\n🔧 Initializing contract...");
            
            const initTx = await contract.initialize(
                LZ_PROXY,
                delegate,
                ethers.utils.parseEther("6942000"), // 6.942M initial supply
                {
                    gasLimit: 500000
                }
            );
            
            console.log("Transaction sent:", initTx.hash);
            const receipt = await initTx.wait();
            console.log("✅ Contract initialized successfully");
            console.log("Gas used:", receipt.gasUsed.toString());
        }
        
        // Set core addresses
        console.log("\n🔗 Setting core addresses...");
        
        const coreAddressesTx = await contract.setCoreAddresses(
            "0x0000000000000000000000000000000000000000", // Jackpot vault - set later
            "0x0000000000000000000000000000000000000000", // Revenue distributor - set later
            LOTTERY_MANAGER, // Lottery manager
            {
                gasLimit: 200000
            }
        );
        
        console.log("Transaction sent:", coreAddressesTx.hash);
        await coreAddressesTx.wait();
        console.log("✅ Core addresses set successfully");
        
        // Verify final status
        console.log("\n📊 Final Contract Info:");
        const owner = await contract.owner();
        const totalSupply = await contract.totalSupply();
        const ownerBalance = await contract.balanceOf(owner);
        const isInit = await contract.initialized();
        
        console.log("Contract Address:", OMNIDRAGON_ADDRESS);
        console.log("Initialized:", isInit);
        console.log("Owner:", owner);
        console.log("Total Supply:", ethers.utils.formatEther(totalSupply));
        console.log("Owner Balance:", ethers.utils.formatEther(ownerBalance));
        
        console.log("\n🎉 omniDRAGON setup completed!");
        console.log("\n📋 Next steps:");
        console.log("1. Update lottery manager to authorize this new omniDRAGON");
        console.log("2. Set proper jackpot vault and revenue distributor addresses");
        console.log("3. Configure any liquidity pairs when ready");
        
    } catch (error) {
        console.error("❌ Initialization failed:", error);
        console.error("Error details:", error.message);
        
        if (error.reason) {
            console.error("Reason:", error.reason);
        }
        
        if (error.data) {
            console.error("Data:", error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 