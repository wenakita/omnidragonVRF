import { ethers } from "hardhat";

async function main() {
    console.log("💰 Funding Sonic Integrator via fundContract()");
    console.log("=" .repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);
    console.log("💰 Deployer Balance:", ethers.utils.formatEther(await deployer.getBalance()), "S");

    const integratorAddress = "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84";
    
    // Connect to Sonic VRF Integrator
    const integrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        integratorAddress
    );

    console.log("✅ Connected to Sonic Integrator");

    // Check current balance
    const currentBalance = await deployer.provider!.getBalance(integratorAddress);
    console.log("💰 Current Balance:", ethers.utils.formatEther(currentBalance), "S");

    // Try using the fundContract function
    console.log("\n💡 Using fundContract() function...");
    try {
        const tx = await integrator.fundContract({
            value: ethers.utils.parseEther("0.01"),
            gasLimit: 100000
        });
        
        console.log("⏳ Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed!");
        console.log("📦 Block:", receipt.blockNumber);
        console.log("⛽ Gas used:", receipt.gasUsed.toString());
        
        // Check new balance
        const newBalance = await deployer.provider!.getBalance(integratorAddress);
        console.log("💰 New Balance:", ethers.utils.formatEther(newBalance), "S");
        
        // Parse events
        for (const log of receipt.logs) {
            try {
                const parsed = integrator.interface.parseLog(log);
                console.log(`📝 Event: ${parsed.name}`);
                if (parsed.name === "ContractFunded") {
                    console.log(`   Funder: ${parsed.args.funder}`);
                    console.log(`   Amount: ${ethers.utils.formatEther(parsed.args.amount)} S`);
                    console.log(`   Balance: ${ethers.utils.formatEther(parsed.args.balance)} S`);
                }
            } catch (parseError) {
                // Skip unparseable logs
            }
        }
        
        console.log("\n🎯 Funding successful!");
        return { success: true, newBalance: ethers.utils.formatEther(newBalance) };
        
    } catch (error: any) {
        console.log("❌ Funding failed:", error.message);
        
        // Check if it's a gas estimation error
        if (error.message.includes("gas")) {
            console.log("💡 Trying with higher gas limit...");
            try {
                const tx = await integrator.fundContract({
                    value: ethers.utils.parseEther("0.01"),
                    gasLimit: 200000
                });
                
                console.log("⏳ Transaction sent:", tx.hash);
                const receipt = await tx.wait();
                console.log("✅ Transaction confirmed!");
                
                const newBalance = await deployer.provider!.getBalance(integratorAddress);
                console.log("💰 New Balance:", ethers.utils.formatEther(newBalance), "S");
                
                return { success: true, newBalance: ethers.utils.formatEther(newBalance) };
                
            } catch (retryError: any) {
                console.log("❌ Retry also failed:", retryError.message);
                return { success: false, error: retryError.message };
            }
        }
        
        return { success: false, error: error.message };
    }
}

main()
    .then((result) => {
        if (result?.success) {
            console.log("\n✅ Contract funded successfully!");
            console.log("🎲 Ready for VRF testing!");
        } else {
            console.log("\n❌ Funding failed");
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Unexpected error:", error);
        process.exit(1);
    }); 