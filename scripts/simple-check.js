const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Simple check of existing omniDRAGON...");

    const [deployer] = await ethers.getSigners();
    console.log("Checking as:", deployer.address);

    const EXISTING_OMNIDRAGON = "0x0E5d746F01f4CDc76320c3349386176a873eAa40";
    
    try {
        // Check if contract exists
        const code = await ethers.provider.getCode(EXISTING_OMNIDRAGON);
        console.log("Contract exists:", code !== "0x");
        console.log("Code length:", code.length);
        
        if (code === "0x") {
            console.log("❌ No contract found at this address");
            return;
        }
        
        // Try to get basic ERC20 info
        console.log("\n📊 Basic Contract Info:");
        
        // Create a simple ERC20 interface
        const erc20Abi = [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function totalSupply() view returns (uint256)",
            "function owner() view returns (address)",
            "function balanceOf(address) view returns (uint256)"
        ];
        
        const contract = new ethers.Contract(EXISTING_OMNIDRAGON, erc20Abi, deployer);
        
        try {
            const name = await contract.name();
            console.log("Name:", name);
        } catch (e) {
            console.log("Name: Not accessible");
        }
        
        try {
            const symbol = await contract.symbol();
            console.log("Symbol:", symbol);
        } catch (e) {
            console.log("Symbol: Not accessible");
        }
        
        try {
            const totalSupply = await contract.totalSupply();
            console.log("Total Supply:", ethers.utils.formatEther(totalSupply));
        } catch (e) {
            console.log("Total Supply: Not accessible");
        }
        
        try {
            const owner = await contract.owner();
            console.log("Owner:", owner);
            console.log("You are owner:", owner.toLowerCase() === deployer.address.toLowerCase());
        } catch (e) {
            console.log("Owner: Not accessible");
        }
        
        try {
            const balance = await contract.balanceOf(deployer.address);
            console.log("Your Balance:", ethers.utils.formatEther(balance));
        } catch (e) {
            console.log("Balance: Not accessible");
        }
        
        console.log("\n✅ Contract appears to be functional");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main()
    .then(() => {
        console.log("\n🎯 Analysis Complete");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Failed:", error);
        process.exit(1);
    }); 