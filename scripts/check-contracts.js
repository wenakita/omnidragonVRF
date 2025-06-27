const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking VRF Contract Addresses...");
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);
    
    const deploymentAddress = "0x5949156D5dD762aB15c1FEd4dE90B8a8CAF60746"; // From deployment file
    const currentAddress = "0x3bAc0b3C348425992224c8FafEeFc3aF6205755e";   // Currently using
    
    console.log(`\n📋 Checking deployment file address: ${deploymentAddress}`);
    console.log(`📋 Checking current working address: ${currentAddress}`);
    
    // Check if both addresses have code
    const deploymentCode = await ethers.provider.getCode(deploymentAddress);
    const currentCode = await ethers.provider.getCode(currentAddress);
    
    console.log(`\n🔍 Deployment address has code: ${deploymentCode !== "0x" ? "YES" : "NO"} (${deploymentCode.length} bytes)`);
    console.log(`🔍 Current address has code: ${currentCode !== "0x" ? "YES" : "NO"} (${currentCode.length} bytes)`);
    
    // Check ownership of both contracts
    if (deploymentCode !== "0x") {
        try {
            const deploymentContract = await ethers.getContractAt("ChainlinkVRFIntegratorV2_5", deploymentAddress);
            const deploymentOwner = await deploymentContract.owner();
            console.log(`📋 Deployment contract owner: ${deploymentOwner}`);
            console.log(`📋 Is deployment owned by us: ${deploymentOwner.toLowerCase() === signer.address.toLowerCase()}`);
        } catch (error) {
            console.log(`❌ Error checking deployment contract: ${error.message}`);
        }
    }
    
    if (currentCode !== "0x") {
        try {
            const currentContract = await ethers.getContractAt("ChainlinkVRFIntegratorV2_5", currentAddress);
            const currentOwner = await currentContract.owner();
            const currentBalance = await ethers.provider.getBalance(currentAddress);
            console.log(`📋 Current contract owner: ${currentOwner}`);
            console.log(`📋 Is current owned by us: ${currentOwner.toLowerCase() === signer.address.toLowerCase()}`);
            console.log(`📋 Current contract balance: ${ethers.utils.formatEther(currentBalance)} S`);
        } catch (error) {
            console.log(`❌ Error checking current contract: ${error.message}`);
        }
    }
    
    console.log(`\n💡 Recommendation:`);
    if (currentCode !== "0x") {
        console.log(`✅ Use current address: ${currentAddress}`);
        console.log(`   - This is the contract we've been configuring`);
        console.log(`   - It has funds and proper setup`);
        console.log(`   - Update the deployment file to match this address`);
    } else if (deploymentCode !== "0x") {
        console.log(`✅ Use deployment address: ${deploymentAddress}`);
        console.log(`   - Update LayerZero config to use this address`);
    } else {
        console.log(`❌ Neither address has a valid contract`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 