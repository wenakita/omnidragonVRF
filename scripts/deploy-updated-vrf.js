const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying Updated ChainlinkVRFIntegratorV2_5 with setConfig function...");
    
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Deploying from: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} S`);
    
    // LayerZero Sonic Endpoint
    const SONIC_ENDPOINT = "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B";
    
    console.log("\\n📡 Deploying ChainlinkVRFIntegratorV2_5...");
    
    const VRFFactory = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
    
    const gasPrice = await ethers.provider.getGasPrice();
    const adjustedGasPrice = gasPrice.mul(110).div(100); // 10% increase
    
    console.log(`⛽ Gas price: ${ethers.utils.formatUnits(adjustedGasPrice, "gwei")} gwei`);
    
    const vrfContract = await VRFFactory.deploy(
        SONIC_ENDPOINT,
        deployer.address,
        {
            gasPrice: adjustedGasPrice,
            gasLimit: 3000000
        }
    );
    
    console.log(`📤 Transaction sent: ${vrfContract.deployTransaction.hash}`);
    console.log(`⏳ Waiting for deployment...`);
    
    await vrfContract.deployed();
    
    console.log(`\\n✅ ChainlinkVRFIntegratorV2_5 deployed!`);
    console.log(`📍 Address: ${vrfContract.address}`);
    console.log(`🔗 SonicScan: https://sonicscan.org/address/${vrfContract.address}`);
    
    // Verify the contract has the setConfig function
    console.log("\\n🔍 Verifying setConfig function exists...");
    try {
        // Check if the function exists by calling the interface
        const hasSetConfig = vrfContract.interface.getFunction("setConfig");
        console.log(`✅ setConfig function found: ${hasSetConfig.name}`);
    } catch (error) {
        console.log(`❌ setConfig function not found: ${error.message}`);
    }
    
    // Auto-verify on SonicScan
    console.log("\\n🔍 Auto-verifying contract...");
    try {
        await run("verify:verify", {
            address: vrfContract.address,
            constructorArguments: [SONIC_ENDPOINT, deployer.address],
        });
        console.log("✅ Contract verified on SonicScan!");
    } catch (error) {
        console.log(`⚠️  Verification failed: ${error.message}`);
        console.log("You can verify manually later.");
    }
    
    console.log("\\n🎯 Deployment Summary:");
    console.log(`📍 ChainlinkVRFIntegratorV2_5: ${vrfContract.address}`);
    console.log(`🔗 Transaction: https://sonicscan.org/tx/${vrfContract.deployTransaction.hash}`);
    
    console.log("\\n✅ Ready for LayerZero configuration!");
    console.log("Next steps:");
    console.log("1. Fund the contract with ETH");
    console.log("2. Set peer connection to Arbitrum consumer");
    console.log("3. Run LayerZero wiring to configure DVNs");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 