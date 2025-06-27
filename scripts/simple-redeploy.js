const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 SIMPLE REDEPLOY - ChainlinkVRFIntegratorV2_5");
    console.log("===============================================");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    const balance = await deployer.getBalance();
    console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} ETH`);
    
    // Contract parameters
    const SONIC_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";
    
    console.log(`\n🔨 Deploying contract...`);
    console.log(`   Endpoint: ${SONIC_ENDPOINT}`);
    console.log(`   Owner: ${deployer.address}`);
    
    const ContractFactory = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
    
    const contract = await ContractFactory.deploy(
        SONIC_ENDPOINT,
        deployer.address
    );
    
    console.log(`⏳ TX Hash: ${contract.deployTransaction.hash}`);
    console.log(`⏳ Waiting for confirmation...`);
    
    await contract.deployed();
    
    console.log(`\n✅ DEPLOYED SUCCESSFULLY!`);
    console.log(`📍 New Address: ${contract.address}`);
    console.log(`🔗 Old Address: 0xC8A27A512AC32B3d63803821e121233f1E05Dc34`);
    
    // Quick test
    try {
        const owner = await contract.owner();
        console.log(`👤 Owner check: ${owner === deployer.address ? '✅' : '❌'}`);
    } catch (e) {
        console.log(`❌ Owner check failed: ${e.message}`);
    }
    
    console.log(`\n🔗 SonicScan: https://sonicscan.org/address/${contract.address}`);
    console.log(`\n💡 Next: Update your system to use ${contract.address}`);
}

main().catch(console.error); 