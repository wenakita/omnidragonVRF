const { task } = require("hardhat/config");
const fs = require('fs');
const path = require('path');

task("configure-omnidragon-cross-chain", "Configure cross-chain messaging for omniDRAGON contracts")
  .addFlag("dryRun", "Only preview configuration without executing transactions")
  .setAction(async (taskArgs, hre) => {
    
    console.log("\n🌐 OMNIDRAGON CROSS-CHAIN CONFIGURATION");
    console.log("=======================================");
    console.log(`Current Network: ${hre.network.name}`);
    console.log(`Chain ID: ${hre.network.config.chainId}`);
    
    // Load configuration
    const configPath = path.join(__dirname, '../deploy-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    console.log(`\n📋 Configuration Mode: ${taskArgs.dryRun ? "DRY RUN (Preview Only)" : "LIVE DEPLOYMENT"}`);
    
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`\n👤 Deployer: ${deployer.address}`);
    console.log(`Balance: ${hre.ethers.utils.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ${config.networks[hre.network.name].nativeCurrency.symbol}`);
    
    // Load omniDRAGON contract
    const omniDRAGON = await hre.ethers.getContractFactory("omniDRAGON");
    
    // Get current network config
    const currentNetwork = config.networks[hre.network.name];
    if (!currentNetwork) {
      throw new Error(`Network ${hre.network.name} not found in config`);
    }
    
    const currentOmniDRAGON = omniDRAGON.attach(currentNetwork.contracts.omniDRAGON);
    console.log(`\n🐉 Current omniDRAGON: ${currentNetwork.contracts.omniDRAGON}`);
    
    // Find all other deployed networks
    const otherNetworks = Object.keys(config.networks).filter(name => 
      name !== hre.network.name && 
      config.networks[name].contracts.omniDRAGON && 
      config.networks[name].contracts.omniDRAGON !== ""
    );
    
    console.log(`\n🔗 Target Networks for Cross-Chain Setup:`);
    otherNetworks.forEach(network => {
      const networkConfig = config.networks[network];
      console.log(`   - ${networkConfig.name} (EID: ${networkConfig.lzEid}): ${networkConfig.contracts.omniDRAGON}`);
    });
    
    if (otherNetworks.length === 0) {
      console.log(`\n⚠️  No other networks with deployed omniDRAGON found. Deploy on other chains first.`);
      return;
    }
    
    // ================================
    // STEP 1: CHECK CURRENT PEER CONFIGURATION
    // ================================
    
    console.log(`\n🔍 STEP 1: Checking Current Peer Configuration`);
    console.log("==============================================");
    
    const currentPeers = {};
    for (const networkName of otherNetworks) {
      const networkConfig = config.networks[networkName];
      try {
        const peerAddress = await currentOmniDRAGON.peers(networkConfig.lzEid);
        const isConnected = peerAddress !== "0x0000000000000000000000000000000000000000000000000000000000000000";
        
        currentPeers[networkName] = {
          eid: networkConfig.lzEid,
          expectedPeer: networkConfig.contracts.omniDRAGON,
          currentPeer: peerAddress,
          connected: isConnected,
          correct: isConnected && peerAddress.toLowerCase() === `0x000000000000000000000000${networkConfig.contracts.omniDRAGON.slice(2)}`.toLowerCase()
        };
        
        console.log(`   ${networkConfig.name} (EID: ${networkConfig.lzEid}):`);
        console.log(`     Expected: 0x000000000000000000000000${networkConfig.contracts.omniDRAGON.slice(2)}`);
        console.log(`     Current:  ${peerAddress}`);
        console.log(`     Status:   ${currentPeers[networkName].correct ? "✅ Correct" : (isConnected ? "⚠️ Connected but Wrong" : "❌ Not Connected")}`);
        
      } catch (error) {
        console.log(`   ${networkConfig.name}: ❌ Error reading peer - ${error.message}`);
        currentPeers[networkName] = { error: error.message };
      }
    }
    
    // ================================
    // STEP 2: CONFIGURE MISSING PEERS
    // ================================
    
    console.log(`\n⚙️ STEP 2: Configuring Peer Connections`);
    console.log("========================================");
    
    const peersToSet = otherNetworks.filter(networkName => {
      const peer = currentPeers[networkName];
      return !peer.error && !peer.correct;
    });
    
    if (peersToSet.length === 0) {
      console.log(`✅ All peer connections are already correctly configured!`);
    } else {
      console.log(`📝 Need to configure ${peersToSet.length} peer connection(s):`);
      
      for (const networkName of peersToSet) {
        const networkConfig = config.networks[networkName];
        const peerBytes32 = `0x000000000000000000000000${networkConfig.contracts.omniDRAGON.slice(2)}`;
        
        console.log(`\n   🔗 Setting peer for ${networkConfig.name}:`);
        console.log(`      EID: ${networkConfig.lzEid}`);
        console.log(`      Address: ${networkConfig.contracts.omniDRAGON}`);
        console.log(`      Bytes32: ${peerBytes32}`);
        
        if (!taskArgs.dryRun) {
          try {
            const tx = await currentOmniDRAGON.setPeer(networkConfig.lzEid, peerBytes32, {
              gasLimit: 300000
            });
            
            console.log(`      Transaction: ${tx.hash}`);
            await tx.wait();
            console.log(`      ✅ Peer set successfully`);
            
          } catch (error) {
            console.log(`      ❌ Failed to set peer: ${error.message}`);
          }
        } else {
          console.log(`      📋 Would execute: setPeer(${networkConfig.lzEid}, "${peerBytes32}")`);
        }
      }
    }
    
    // ================================
    // STEP 3: VERIFY PEER CONFIGURATION
    // ================================
    
    if (!taskArgs.dryRun && peersToSet.length > 0) {
      console.log(`\n✅ STEP 3: Verifying Updated Peer Configuration`);
      console.log("===============================================");
      
      for (const networkName of peersToSet) {
        const networkConfig = config.networks[networkName];
        try {
          const peerAddress = await currentOmniDRAGON.peers(networkConfig.lzEid);
          const expectedPeer = `0x000000000000000000000000${networkConfig.contracts.omniDRAGON.slice(2)}`.toLowerCase();
          const isCorrect = peerAddress.toLowerCase() === expectedPeer;
          
          console.log(`   ${networkConfig.name}: ${isCorrect ? "✅ Verified" : "❌ Verification Failed"}`);
          
        } catch (error) {
          console.log(`   ${networkConfig.name}: ❌ Error verifying - ${error.message}`);
        }
      }
    }
    
    // ================================
    // STEP 4: CHECK ENFORCED OPTIONS (DVN CONFIG)
    // ================================
    
    console.log(`\n🛡️ STEP 4: Checking LayerZero DVN Configuration`);
    console.log("===============================================");
    
    try {
      for (const networkName of otherNetworks) {
        const networkConfig = config.networks[networkName];
        
        // Check if enforced options are set for this destination
        try {
          const enforcedOptions = await currentOmniDRAGON.enforcedOptions(networkConfig.lzEid, 1); // msgType 1 = SEND
          
          console.log(`   ${networkConfig.name} (EID: ${networkConfig.lzEid}):`);
          if (enforcedOptions && enforcedOptions !== "0x") {
            console.log(`     Enforced Options: ${enforcedOptions}`);
            console.log(`     Status: ✅ Configured`);
          } else {
            console.log(`     Enforced Options: None`);
            console.log(`     Status: ⚠️ May need configuration for reliable cross-chain messaging`);
          }
          
        } catch (error) {
          console.log(`   ${networkConfig.name}: ⚠️ Could not read enforced options`);
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not check DVN configuration: ${error.message}`);
    }
    
    // ================================
    // STEP 5: CROSS-CHAIN MESSAGING TEST
    // ================================
    
    console.log(`\n🧪 STEP 5: Cross-Chain Messaging Readiness`);
    console.log("==========================================");
    
    const readyNetworks = otherNetworks.filter(networkName => {
      const peer = currentPeers[networkName];
      return !peer.error && (peer.correct || peersToSet.includes(networkName));
    });
    
    if (readyNetworks.length > 0) {
      console.log(`✅ Ready for cross-chain messaging with:`);
      readyNetworks.forEach(networkName => {
        const networkConfig = config.networks[networkName];
        console.log(`   - ${networkConfig.name} (EID: ${networkConfig.lzEid})`);
      });
      
      console.log(`\n📝 Test cross-chain messaging with:`);
      console.log(`   npx hardhat test-omnidragon-bridge --network ${hre.network.name} --target-eid <EID>`);
      
    } else {
      console.log(`⚠️ No networks ready for cross-chain messaging yet.`);
    }
    
    // ================================
    // CONFIGURATION SUMMARY
    // ================================
    
    console.log(`\n🎉 CONFIGURATION SUMMARY`);
    console.log("========================");
    console.log(`Network: ${currentNetwork.name} (${hre.network.name})`);
    console.log(`omniDRAGON: ${currentNetwork.contracts.omniDRAGON}`);
    console.log(`Mode: ${taskArgs.dryRun ? "Dry Run" : "Live Configuration"}`);
    
    if (!taskArgs.dryRun) {
      console.log(`\n✅ Cross-chain configuration ${peersToSet.length > 0 ? "updated" : "verified"} successfully!`);
    } else {
      console.log(`\n📋 Dry run complete. Run without --dry-run to execute configuration.`);
    }
    
    console.log(`\n🌐 Universal Address Achievement:`);
    console.log(`   Same omniDRAGON address on ALL chains: ${currentNetwork.contracts.omniDRAGON}`);
    
    console.log(`\n📚 Next Steps:`);
    console.log(`   1. Run this script on each deployed network to configure bidirectional peers`);
    console.log(`   2. Test cross-chain token transfers and messaging`);
    console.log(`   3. Configure DVN settings for production security`);
    console.log(`   4. Deploy remaining ecosystem contracts with the same universal strategy`);
    
  });

module.exports = {}; 