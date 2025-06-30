const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying omniDRAGON using OmniDragonDeployerV2...");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");

    // Contract addresses
    const OMNI_DRAGON_DEPLOYER = "0xDb24adBeCF6aAD00C8bb34b7828EC1dd095c2e2C";
    const CHAIN_REGISTRY = "0x567eB27f7EA8c69988e30B045987Ad58A597685C";
    const LZ_PROXY = "0x6Fa6abF394d4f827988FBAD17CadFb506b83c3e8";
    
    // Delegate (user's address)
    const delegate = deployer.address;
    
    console.log("OmniDragon Deployer:", OMNI_DRAGON_DEPLOYER);
    console.log("Chain Registry:", CHAIN_REGISTRY);
    console.log("LZ Proxy:", LZ_PROXY);
    console.log("Delegate:", delegate);
    
    try {
        // Get the contract factory
        const omniDRAGON = await ethers.getContractFactory("omniDRAGON");
        
        // Prepare constructor arguments (none needed for simplified version)
        const constructorArgs = [];
        
        console.log("\n📦 Getting contract bytecode...");
        const bytecode = omniDRAGON.bytecode;
        console.log("Bytecode length:", bytecode.length);
        
        // Generate salt for CREATE2
        const salt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("omniDRAGON_v2"));
        console.log("Salt:", salt);
        
        // Get the OmniDragonDeployerV2 interface
        const deployerContract = await ethers.getContractAt(
            [
                "function deployContract(bytes calldata bytecode, bytes32 salt, string calldata name) external returns (address)",
                "function getDeployedAddress(bytes calldata bytecode, bytes32 salt) external view returns (address)"
            ],
            OMNI_DRAGON_DEPLOYER
        );
        
        // Predict the deployment address
        const predictedAddress = await deployerContract.getDeployedAddress(bytecode, salt);
        console.log("Predicted address:", predictedAddress);
        
        // Check if already deployed
        const code = await ethers.provider.getCode(predictedAddress);
        if (code !== "0x") {
            console.log("⚠️  Contract already exists at predicted address");
            console.log("Using existing contract at:", predictedAddress);
            
            // Attach to existing contract
            const existingContract = omniDRAGON.attach(predictedAddress);
            
            // Check if initialized
            const initialized = await existingContract.initialized();
            console.log("Initialized:", initialized);
            
            if (!initialized) {
                console.log("\n🔧 Initializing existing contract...");
                const initTx = await existingContract.initialize(
                    LZ_PROXY,
                    delegate,
                    ethers.utils.parseEther("6942000") // 6.942M tokens
                );
                await initTx.wait();
                console.log("✅ Contract initialized");
            }
            
            return;
        }
        
        // Deploy using OmniDragonDeployerV2
        console.log("\n🏗️  Deploying using OmniDragonDeployerV2...");
        
        const deployTx = await deployerContract.deployContract(
            bytecode,
            salt,
            "omniDRAGON_Simple",
            {
                gasLimit: 6000000
            }
        );
        
        const receipt = await deployTx.wait();
        console.log("✅ Deployment transaction confirmed");
        console.log("Gas used:", receipt.gasUsed.toString());
        
        // Attach to deployed contract
        const deployedContract = omniDRAGON.attach(predictedAddress);
        
        // Initialize the contract
        console.log("\n🔧 Initializing contract...");
        const initTx = await deployedContract.initialize(
            LZ_PROXY,
            delegate,
            ethers.utils.parseEther("6942000") // 6.942M tokens
        );
        await initTx.wait();
        console.log("✅ Contract initialized");
        
        // Set core addresses
        console.log("\n⚙️  Setting core addresses...");
        const setCoreAddressesTx = await deployedContract.setCoreAddresses(
            "0x0000000000000000000000000000000000000000", // jackpotVault (set later)
            "0x0000000000000000000000000000000000000000", // revenueDistributor (set later)
            "0x56eAb9e1f775d0f43cf831d719439e0bF6748234"  // lotteryManager
        );
        await setCoreAddressesTx.wait();
        console.log("✅ Core addresses set");
        
        // Verify deployment
        console.log("\n🔍 Verifying deployment...");
        const name = await deployedContract.name();
        const symbol = await deployedContract.symbol();
        const totalSupply = await deployedContract.totalSupply();
        const owner = await deployedContract.owner();
        const balance = await deployedContract.balanceOf(delegate);
        
        console.log("Name:", name);
        console.log("Symbol:", symbol);
        console.log("Total Supply:", ethers.utils.formatEther(totalSupply));
        console.log("Owner:", owner);
        console.log("Delegate Balance:", ethers.utils.formatEther(balance));
        
        console.log("\n🎉 Deployment complete!");
        console.log("Contract Address:", predictedAddress);
        console.log("Deployer Used:", OMNI_DRAGON_DEPLOYER);
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
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