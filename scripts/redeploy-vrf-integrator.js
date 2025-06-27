const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 REDEPLOYING ChainlinkVRFIntegratorV2_5 CONTRACT");
    console.log("==================================================");
    
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deploying from: ${deployer.address}`);
    
    // Check deployer balance
    const balance = await deployer.getBalance();
    console.log(`💰 Deployer balance: ${ethers.utils.formatEther(balance)} ETH`);
    
    if (balance.lt(ethers.utils.parseEther("0.1"))) {
        console.log("⚠️  Warning: Low balance, deployment might fail");
    }
    
    // Sonic LayerZero endpoint
    const SONIC_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";
    
    console.log(`\n📋 Deployment Parameters:`);
    console.log(`   LayerZero Endpoint: ${SONIC_ENDPOINT}`);
    console.log(`   Owner: ${deployer.address}`);
    
    // Deploy the contract
    console.log(`\n🔨 Deploying ChainlinkVRFIntegratorV2_5...`);
    
    const ChainlinkVRFIntegratorV2_5 = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
    
    const contract = await ChainlinkVRFIntegratorV2_5.deploy(
        SONIC_ENDPOINT,
        deployer.address,
        {
            gasLimit: 5000000, // Set explicit gas limit
            gasPrice: ethers.utils.parseUnits("100", "gwei") // 100 gwei
        }
    );
    
    console.log(`⏳ Deployment transaction sent: ${contract.deployTransaction.hash}`);
    console.log(`⏳ Waiting for deployment confirmation...`);
    
    await contract.deployed();
    
    console.log(`\n✅ CONTRACT DEPLOYED SUCCESSFULLY!`);
    console.log(`📍 New Contract Address: ${contract.address}`);
    console.log(`🔗 Transaction Hash: ${contract.deployTransaction.hash}`);
    console.log(`⛽ Gas Used: ${contract.deployTransaction.gasLimit?.toString()}`);
    
    // Verify contract functions
    console.log(`\n🔍 Verifying contract functions...`);
    
    try {
        const owner = await contract.owner();
        console.log(`👤 Owner: ${owner}`);
        
        const endpoint = await contract.endpoint();
        console.log(`🔗 Endpoint: ${endpoint}`);
        
        const requestCounter = await contract.requestCounter();
        console.log(`📊 Request Counter: ${requestCounter.toString()}`);
        
        const defaultGasLimit = await contract.defaultGasLimit();
        console.log(`⛽ Default Gas Limit: ${defaultGasLimit.toString()}`);
        
    } catch (error) {
        console.log(`❌ Contract verification failed: ${error.message}`);
    }
    
    // Attempt immediate verification on SonicScan
    console.log(`\n🔍 Attempting contract verification on SonicScan...`);
    
    try {
        await run("verify:verify", {
            address: contract.address,
            constructorArguments: [SONIC_ENDPOINT, deployer.address],
            contract: "contracts/core/external/chainlink/ChainlinkVRFIntegratorV2_5.sol:ChainlinkVRFIntegratorV2_5"
        });
        
        console.log(`✅ Contract verification submitted successfully!`);
        
    } catch (error) {
        console.log(`⚠️  Verification submission failed: ${error.message}`);
        console.log(`💡 You can verify manually later using:`);
        console.log(`   npx hardhat verify --network sonic ${contract.address} "${SONIC_ENDPOINT}" "${deployer.address}"`);
    }
    
    console.log(`\n📋 DEPLOYMENT SUMMARY:`);
    console.log(`   Old Contract: 0xC8A27A512AC32B3d63803821e121233f1E05Dc34`);
    console.log(`   New Contract: ${contract.address}`);
    console.log(`   Network: Sonic (Chain ID: 146)`);
    console.log(`   LayerZero EID: 30332`);
    
    console.log(`\n📝 NEXT STEPS:`);
    console.log(`1. Update your system to use the new contract address: ${contract.address}`);
    console.log(`2. Set up LayerZero peers (if not already configured)`);
    console.log(`3. Fund the contract with ETH for cross-chain operations`);
    console.log(`4. Test the VRF functionality`);
    
    console.log(`\n🔗 View on SonicScan: https://sonicscan.org/address/${contract.address}`);
    
    // Save deployment info
    const deploymentInfo = {
        contractName: "ChainlinkVRFIntegratorV2_5",
        address: contract.address,
        network: "sonic",
        chainId: 146,
        deployedAt: new Date().toISOString(),
        deploymentTx: contract.deployTransaction.hash,
        deployer: deployer.address,
        constructorArgs: [SONIC_ENDPOINT, deployer.address],
        gasUsed: contract.deployTransaction.gasLimit?.toString(),
        oldContract: "0xC8A27A512AC32B3d63803821e121233f1E05Dc34"
    };
    
    const fs = require('fs');
    fs.writeFileSync('deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
    console.log(`💾 Deployment info saved to deployment-info.json`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 