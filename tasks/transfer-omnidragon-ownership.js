const { task } = require("hardhat/config");
const fs = require('fs');
const path = require('path');

task("transfer-omnidragon-ownership", "Transfer omniDRAGON ownership to deployer address")
  .addFlag("dryRun", "Only preview without executing transactions")
  .setAction(async (taskArgs, hre) => {
    
    console.log("\n👑 OMNIDRAGON OWNERSHIP TRANSFER");
    console.log("================================");
    console.log(`Current Network: ${hre.network.name}`);
    console.log(`Chain ID: ${hre.network.config.chainId}`);
    
    // Load configuration
    const configPath = path.join(__dirname, '../deploy-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const currentNetwork = config.networks[hre.network.name];
    
    if (!currentNetwork || !currentNetwork.contracts.omniDRAGON) {
      throw new Error(`omniDRAGON not deployed on ${hre.network.name}`);
    }
    
    console.log(`\n📋 Configuration Mode: ${taskArgs.dryRun ? "DRY RUN" : "LIVE EXECUTION"}`);
    
    // Get deployer
    const [deployer] = await hre.ethers.getSigners();
    console.log(`\n👤 Deployer: ${deployer.address}`);
    console.log(`Balance: ${hre.ethers.utils.formatEther(await deployer.getBalance())} ${currentNetwork.nativeSymbol || 'ETH'}`);
    
    // Get omniDRAGON contract
    const omniDRAGON = await hre.ethers.getContractAt("omniDRAGON", currentNetwork.contracts.omniDRAGON);
    console.log(`\n🐉 omniDRAGON Contract: ${currentNetwork.contracts.omniDRAGON}`);
    
    // Check current owner
    let currentOwner;
    try {
      currentOwner = await omniDRAGON.owner();
      console.log(`\n🔍 Current Owner: ${currentOwner}`);
      
      if (currentOwner.toLowerCase() === deployer.address.toLowerCase()) {
        console.log(`✅ Deployer is already the owner!`);
        return;
      }
      
      console.log(`Target Owner: ${deployer.address}`);
      
    } catch (error) {
      console.log(`❌ Could not check owner: ${error.message}`);
      return;
    }
    
    // Check if current owner is the special LayerZero delegate
    const specialLzDelegate = "0x0000000000000000000000000000000000000003";
    if (currentOwner.toLowerCase() === specialLzDelegate.toLowerCase()) {
      console.log(`\n⚠️ Current owner is LayerZero delegate: ${specialLzDelegate}`);
      console.log(`   This is a special address used in LayerZero deployments`);
      console.log(`   Attempting to transfer ownership...`);
    }
    
    // Attempt ownership transfer
    console.log(`\n⚙️ OWNERSHIP TRANSFER ATTEMPT`);
    console.log("=============================");
    
    if (!taskArgs.dryRun) {
      try {
        // First, let's check if the contract has a transferOwnership function
        const hasTransferOwnership = omniDRAGON.interface.functions['transferOwnership(address)'] !== undefined;
        
        if (!hasTransferOwnership) {
          console.log(`❌ Contract does not have transferOwnership function`);
          return;
        }
        
        console.log(`📝 Executing transferOwnership(${deployer.address})...`);
        
        // Try to call transferOwnership from the deployer
        const tx = await omniDRAGON.transferOwnership(deployer.address, {
          gasLimit: 200000
        });
        
        console.log(`Transaction Hash: ${tx.hash}`);
        console.log(`⏳ Waiting for confirmation...`);
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        
        // Verify the ownership transfer
        const newOwner = await omniDRAGON.owner();
        console.log(`\n🔍 New Owner: ${newOwner}`);
        
        if (newOwner.toLowerCase() === deployer.address.toLowerCase()) {
          console.log(`✅ Ownership successfully transferred to deployer!`);
        } else {
          console.log(`⚠️ Ownership transfer may have failed. New owner: ${newOwner}`);
        }
        
      } catch (error) {
        console.log(`❌ Ownership transfer failed: ${error.message}`);
        
        // Analyze the error
        if (error.message.includes("Ownable")) {
          console.log(`\n💡 Analysis: This appears to be an Ownable access control error`);
          console.log(`   The current owner (${currentOwner}) may not allow transfers`);
          console.log(`   Or the deployer may not have permission to initiate the transfer`);
        }
        
        if (error.message.includes("revert")) {
          console.log(`\n💡 Analysis: Transaction reverted`);
          console.log(`   The special LayerZero delegate address may not support ownership transfers`);
          console.log(`   This could be intentional for the universal address deployment pattern`);
        }
        
        console.log(`\n🔧 Alternative Approaches:`);
        console.log(`   1. Check if the contract has a different ownership mechanism`);
        console.log(`   2. Use LayerZero's delegate system for peer configuration`);
        console.log(`   3. Contact the original deployer if this was deployed by someone else`);
        console.log(`   4. Check if there's a timelock or multi-sig requirement`);
        
        return false;
      }
    } else {
      console.log(`📋 Would execute: transferOwnership("${deployer.address}")`);
      console.log(`   From: ${currentOwner}`);
      console.log(`   To: ${deployer.address}`);
    }
    
    console.log(`\n🎉 OWNERSHIP TRANSFER SUMMARY`);
    console.log("=============================");
    console.log(`Network: ${currentNetwork.name} (${hre.network.name})`);
    console.log(`omniDRAGON: ${currentNetwork.contracts.omniDRAGON}`);
    console.log(`Original Owner: ${currentOwner}`);
    console.log(`Target Owner: ${deployer.address}`);
    console.log(`Mode: ${taskArgs.dryRun ? "Dry Run" : "Live Execution"}`);
    
    if (!taskArgs.dryRun) {
      console.log(`\n✅ Ownership transfer completed!`);
      console.log(`\n📚 Next Steps:`);
      console.log(`   1. Run this script on each network: sonic, avalanche, arbitrum`);
      console.log(`   2. After ownership transfer, run: npx hardhat set-omnidragon-peers-manual --network ${hre.network.name}`);
      console.log(`   3. Verify peer connections are working`);
    } else {
      console.log(`\n📋 Dry run complete. Run without --dry-run to execute transfer.`);
    }
    
  });

module.exports = {}; 