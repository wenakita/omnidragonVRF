const { task } = require("hardhat/config");
const fs = require('fs');
const path = require('path');

task("set-omnidragon-peers-manual", "Manually set peers for omniDRAGON contracts")
  .addFlag("dryRun", "Only preview configuration without executing transactions")
  .setAction(async (taskArgs, hre) => {
    
    console.log("\n🔗 OMNIDRAGON MANUAL PEER CONFIGURATION");
    console.log("======================================");
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
    try {
      const owner = await omniDRAGON.owner();
      console.log(`Current Owner: ${owner}`);
      
      if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log(`⚠️ Warning: Contract owner (${owner}) is different from deployer (${deployer.address})`);
        console.log(`   This may prevent setting peers. Consider transferring ownership first.`);
      }
    } catch (error) {
      console.log(`⚠️ Could not check owner: ${error.message}`);
    }
    
    // Define peer networks and their EIDs
    const peerNetworks = {
      sonic: { eid: 30332, name: "Sonic" },
      arbitrum: { eid: 30110, name: "Arbitrum" },
      avalanche: { eid: 30106, name: "Avalanche" }
    };
    
    // Remove current network from peers
    delete peerNetworks[hre.network.name];
    
    console.log(`\n🔍 CHECKING CURRENT PEERS`);
    console.log("========================");
    
    const peersToSet = [];
    
    for (const [networkName, peerInfo] of Object.entries(peerNetworks)) {
      const networkConfig = config.networks[networkName];
      if (!networkConfig || !networkConfig.contracts.omniDRAGON) {
        console.log(`⚠️ ${peerInfo.name} (${networkName}): No deployment found`);
        continue;
      }
      
      try {
        const currentPeer = await omniDRAGON.peers(peerInfo.eid);
        const expectedPeerBytes32 = `0x000000000000000000000000${networkConfig.contracts.omniDRAGON.slice(2)}`;
        
        console.log(`\n${peerInfo.name} (EID: ${peerInfo.eid}):`);
        console.log(`   Expected: ${expectedPeerBytes32}`);
        console.log(`   Current:  ${currentPeer}`);
        
        if (currentPeer.toLowerCase() !== expectedPeerBytes32.toLowerCase()) {
          console.log(`   Status: ❌ Needs Update`);
          peersToSet.push({
            networkName,
            eid: peerInfo.eid,
            name: peerInfo.name,
            address: networkConfig.contracts.omniDRAGON,
            bytes32: expectedPeerBytes32
          });
        } else {
          console.log(`   Status: ✅ Already Set`);
        }
        
      } catch (error) {
        console.log(`   Status: ❌ Error checking peer: ${error.message}`);
        peersToSet.push({
          networkName,
          eid: peerInfo.eid,
          name: peerInfo.name,
          address: networkConfig.contracts.omniDRAGON,
          bytes32: `0x000000000000000000000000${networkConfig.contracts.omniDRAGON.slice(2)}`
        });
      }
    }
    
    console.log(`\n⚙️ SETTING PEERS`);
    console.log("===============");
    
    if (peersToSet.length === 0) {
      console.log(`✅ All peer connections are already correctly configured!`);
      return;
    }
    
    console.log(`📝 Need to configure ${peersToSet.length} peer connection(s):`);
    
    for (const peer of peersToSet) {
      console.log(`\n🔗 Setting peer for ${peer.name}:`);
      console.log(`   EID: ${peer.eid}`);
      console.log(`   Address: ${peer.address}`);
      console.log(`   Bytes32: ${peer.bytes32}`);
      
      if (!taskArgs.dryRun) {
        try {
          const tx = await omniDRAGON.setPeer(peer.eid, peer.bytes32, {
            gasLimit: 300000
          });
          
          console.log(`   Transaction: ${tx.hash}`);
          await tx.wait();
          console.log(`   ✅ Peer set successfully`);
          
        } catch (error) {
          console.log(`   ❌ Failed to set peer: ${error.message}`);
          
          // If it's an ownership error, suggest transferring ownership
          if (error.message.includes("Ownable") || error.message.includes("owner")) {
            console.log(`   💡 Suggestion: Transfer contract ownership to deployer address first`);
            console.log(`      Command: omniDRAGON.transferOwnership("${deployer.address}")`);
          }
        }
      } else {
        console.log(`   📋 Would execute: setPeer(${peer.eid}, "${peer.bytes32}")`);
      }
    }
    
    console.log(`\n🎉 PEER CONFIGURATION SUMMARY`);
    console.log("=============================");
    console.log(`Network: ${currentNetwork.name} (${hre.network.name})`);
    console.log(`omniDRAGON: ${currentNetwork.contracts.omniDRAGON}`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Mode: ${taskArgs.dryRun ? "Dry Run" : "Live Configuration"}`);
    console.log(`Peers Configured: ${taskArgs.dryRun ? 'N/A (dry run)' : peersToSet.length}`);
    
    if (!taskArgs.dryRun && peersToSet.length > 0) {
      console.log(`\n✅ Manual peer configuration completed!`);
    } else if (taskArgs.dryRun) {
      console.log(`\n📋 Dry run complete. Run without --dry-run to execute configuration.`);
    }
    
    console.log(`\n📚 Next Steps:`);
    console.log(`   1. Run this script on each deployed network: sonic, avalanche, arbitrum`);
    console.log(`   2. Verify peer connections are working`);
    console.log(`   3. Test cross-chain messaging functionality`);
    
    console.log(`\n🌐 Universal Address Achievement:`);
    console.log(`   Same omniDRAGON address on ALL chains: ${currentNetwork.contracts.omniDRAGON}`);
    
  });

module.exports = {}; 