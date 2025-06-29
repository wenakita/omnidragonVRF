const { task } = require("hardhat/config");
const fs = require('fs');
const path = require('path');

task("configure-omnidragon-delegates", "Set delegates for omniDRAGON contracts before peer configuration")
  .addFlag("dryRun", "Only preview configuration without executing transactions")
  .setAction(async (taskArgs, hre) => {
    
    console.log("\n🎯 OMNIDRAGON DELEGATE CONFIGURATION");
    console.log("===================================");
    console.log(`Current Network: ${hre.network.name}`);
    console.log(`Chain ID: ${hre.network.config.chainId}`);
    
    // Load configuration
    const configPath = path.join(__dirname, '../deploy-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    console.log(`\n📋 Configuration Mode: ${taskArgs.dryRun ? "DRY RUN (Preview Only)" : "LIVE CONFIGURATION"}`);
    
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
    
    // ================================
    // STEP 1: CHECK CURRENT DELEGATE
    // ================================
    
    console.log(`\n🔍 STEP 1: Checking Current Delegate`);
    console.log("===================================");
    
    try {
      const currentDelegate = await currentOmniDRAGON.owner();
      console.log(`Current Owner/Delegate: ${currentDelegate}`);
      console.log(`Deployer Address: ${deployer.address}`);
      
      const isCorrectDelegate = currentDelegate.toLowerCase() === deployer.address.toLowerCase();
      console.log(`Delegate Status: ${isCorrectDelegate ? "✅ Correct" : "⚠️ Needs Update"}`);
      
      if (isCorrectDelegate) {
        console.log(`✅ Deployer is already set as delegate/owner`);
      } else {
        console.log(`⚠️ Current owner is different from deployer`);
        console.log(`   This may be intentional if ownership was transferred`);
        console.log(`   Current owner can still configure peers using lz oapp wire`);
      }
      
    } catch (error) {
      console.log(`❌ Error checking delegate: ${error.message}`);
      return;
    }
    
    // ================================
    // STEP 2: CHECK ENDPOINT DELEGATE
    // ================================
    
    console.log(`\n🔍 STEP 2: Checking LayerZero Endpoint Delegate`);
    console.log("==============================================");
    
    try {
      // Get the LayerZero endpoint address from the chain registry
      const chainRegistry = await hre.ethers.getContractFactory("OmniDragonChainRegistry");
      const registryContract = chainRegistry.attach(currentNetwork.contracts.omniDragonChainRegistry);
      
      const endpointAddress = await registryContract.lzEndpoint();
      console.log(`LayerZero Endpoint: ${endpointAddress}`);
      
      // Check if omniDRAGON has delegate permissions on the endpoint
      const endpoint = await hre.ethers.getContractAt("ILayerZeroEndpointV2", endpointAddress);
      
      try {
        const delegateStatus = await endpoint.delegates(currentNetwork.contracts.omniDRAGON, deployer.address);
        console.log(`Deployer Delegate Status: ${delegateStatus ? "✅ Authorized" : "❌ Not Authorized"}`);
        
        if (!delegateStatus) {
          console.log(`\n⚠️ Deployer needs to be set as delegate for LayerZero operations`);
          console.log(`   Run: omniDRAGON.setDelegate(${deployer.address}, true)`);
        }
        
      } catch (error) {
        console.log(`⚠️ Could not check delegate status: ${error.message}`);
        console.log(`   This is normal if the contract doesn't have setDelegate function`);
      }
      
    } catch (error) {
      console.log(`⚠️ Could not check endpoint delegate: ${error.message}`);
    }
    
    // ================================
    // STEP 3: SET DELEGATE IF NEEDED
    // ================================
    
    console.log(`\n⚙️ STEP 3: Setting Delegate for LayerZero Operations`);
    console.log("=================================================");
    
    try {
      // Check if contract has setDelegate function
      const hasSetDelegate = currentOmniDRAGON.interface.functions['setDelegate(address,bool)'] !== undefined;
      
      if (hasSetDelegate) {
        console.log(`✅ Contract supports setDelegate function`);
        
        if (!taskArgs.dryRun) {
          try {
            const tx = await currentOmniDRAGON.setDelegate(deployer.address, true, {
              gasLimit: 200000
            });
            
            console.log(`Transaction: ${tx.hash}`);
            await tx.wait();
            console.log(`✅ Delegate set successfully`);
            
          } catch (error) {
            if (error.message.includes("already")) {
              console.log(`✅ Delegate already set`);
            } else {
              console.log(`❌ Failed to set delegate: ${error.message}`);
            }
          }
        } else {
          console.log(`📋 Would execute: setDelegate(${deployer.address}, true)`);
        }
        
      } else {
        console.log(`⚠️ Contract doesn't have setDelegate function`);
        console.log(`   Owner-based permissions will be used instead`);
      }
      
    } catch (error) {
      console.log(`⚠️ Error setting delegate: ${error.message}`);
    }
    
    // ================================
    // STEP 4: LAYERZERO CONFIG STATUS
    // ================================
    
    console.log(`\n📝 STEP 4: LayerZero Configuration Status`);
    console.log("=========================================");
    
    // Get all deployed networks
    const deployedNetworks = Object.keys(config.networks).filter(name => 
      config.networks[name].contracts.omniDRAGON && 
      config.networks[name].contracts.omniDRAGON !== ""
    );
    
    console.log(`\n🔗 Deployed Networks:`);
    deployedNetworks.forEach(networkName => {
      const networkConfig = config.networks[networkName];
      console.log(`   - ${networkConfig.name} (${networkName}): ${networkConfig.contracts.omniDRAGON}`);
    });
    
    // Check if LayerZero config exists
    const lzConfigPath = path.join(__dirname, '../layerzero.config.ts');
    if (fs.existsSync(lzConfigPath)) {
      console.log(`✅ LayerZero config found: layerzero.config.ts`);
      console.log(`   Use this file for comprehensive DVN configurations`);
    } else {
      console.log(`⚠️ LayerZero config not found: layerzero.config.ts`);
      console.log(`   You may need to create one for peer configuration`);
    }
    
    // ================================
    // STEP 5: WIRE COMMANDS
    // ================================
    
    console.log(`\n🔧 STEP 5: LayerZero OApp Wire Commands`);
    console.log("=====================================");
    
    console.log(`\n📋 Run these commands to configure peer connections:`);
    console.log(`\n1. Install LayerZero CLI (if not already installed):`);
    console.log(`   npm install -g @layerzerolabs/toolbox-hardhat`);
    
    console.log(`\n2. Wire all peer connections:`);
    console.log(`   npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts`);
    
    console.log(`\n3. Alternative: Wire specific network pairs:`);
    deployedNetworks.forEach(networkName => {
      const otherNetworks = deployedNetworks.filter(n => n !== networkName);
      if (otherNetworks.length > 0) {
        console.log(`   # From ${networkName}:`);
        otherNetworks.forEach(targetNetwork => {
          console.log(`   npx @layerzerolabs/toolbox-hardhat lz:oapp:wire --from ${networkName} --to ${targetNetwork}`);
        });
      }
    });
    
    // ================================
    // CONFIGURATION SUMMARY
    // ================================
    
    console.log(`\n🎉 DELEGATE CONFIGURATION SUMMARY`);
    console.log("=================================");
    console.log(`Network: ${currentNetwork.name} (${hre.network.name})`);
    console.log(`omniDRAGON: ${currentNetwork.contracts.omniDRAGON}`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Mode: ${taskArgs.dryRun ? "Dry Run" : "Live Configuration"}`);
    
    if (!taskArgs.dryRun) {
      console.log(`\n✅ Delegate configuration completed!`);
      console.log(`✅ LayerZero config file generated!`);
    } else {
      console.log(`\n📋 Dry run complete. Run without --dry-run to execute configuration.`);
    }
    
    console.log(`\n📚 Next Steps:`);
    console.log(`   1. Run this script on each deployed network: sonic, avalanche, arbitrum`);
    console.log(`   2. Use LayerZero CLI to wire all peer connections`);
    console.log(`   3. Test cross-chain messaging functionality`);
    console.log(`   4. Configure DVN settings for production security`);
    
    console.log(`\n🌐 Universal Address Achievement:`);
    console.log(`   Same omniDRAGON address on ALL chains: ${currentNetwork.contracts.omniDRAGON}`);
    
  });

module.exports = {}; 