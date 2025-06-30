const { task } = require("hardhat/config");

task("deploy-layerzero-proxy", "Deploy OmniDragonLayerZeroProxy contract")
  .addOptionalParam("initialEndpoint", "Initial LayerZero endpoint address")
  .addOptionalParam("owner", "Owner address")
  .addOptionalParam("emergencyPauser", "Emergency pauser address")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    
    console.log(`\n🚀 Deploying OmniDragonLayerZeroProxy on ${network.name}...`);
    
    // Get network configuration
    const networkConfig = {
      sonic: {
        defaultEndpoint: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B",
        chainId: 146
      },
      arbitrum: {
        defaultEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
        chainId: 42161
      },
      avalanche: {
        defaultEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
        chainId: 43114
      }
    };
    
    const config = networkConfig[network.name];
    if (!config) {
      throw new Error(`Unsupported network: ${network.name}`);
    }
    
    // Get deployment parameters
    const [deployer] = await ethers.getSigners();
    const initialEndpoint = taskArgs.initialEndpoint || config.defaultEndpoint;
    const owner = taskArgs.owner || deployer.address;
    const emergencyPauser = taskArgs.emergencyPauser || deployer.address;
    
    console.log(`📋 Deployment Configuration:`);
    console.log(`   Network: ${network.name} (${config.chainId})`);
    console.log(`   Deployer: ${deployer.address}`);
    console.log(`   Initial Endpoint: ${initialEndpoint}`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Emergency Pauser: ${emergencyPauser}`);
    
    // Validate addresses
    if (!ethers.utils.isAddress(initialEndpoint)) {
      throw new Error(`Invalid initial endpoint address: ${initialEndpoint}`);
    }
    if (!ethers.utils.isAddress(owner)) {
      throw new Error(`Invalid owner address: ${owner}`);
    }
    if (!ethers.utils.isAddress(emergencyPauser)) {
      throw new Error(`Invalid emergency pauser address: ${emergencyPauser}`);
    }
    
    try {
      // Deploy the proxy contract
      console.log(`\n📦 Deploying contract...`);
      
      const OmniDragonLayerZeroProxy = await ethers.getContractFactory("OmniDragonLayerZeroProxy");
      const proxy = await OmniDragonLayerZeroProxy.deploy(
        initialEndpoint,
        owner,
        emergencyPauser
      );
      
      await proxy.deployed();
      
      console.log(`✅ OmniDragonLayerZeroProxy deployed to: ${proxy.address}`);
      
      // Verify deployment
      console.log(`\n🔍 Verifying deployment...`);
      
      const currentEndpoint = await proxy.currentEndpoint();
      const proxyOwner = await proxy.owner();
      const proxyEmergencyPauser = await proxy.emergencyPauser();
      const isOperational = await proxy.isEndpointOperational();
      
      console.log(`   Current Endpoint: ${currentEndpoint}`);
      console.log(`   Owner: ${proxyOwner}`);
      console.log(`   Emergency Pauser: ${proxyEmergencyPauser}`);
      console.log(`   Is Operational: ${isOperational}`);
      
      // Verify endpoint is correct
      if (currentEndpoint.toLowerCase() !== initialEndpoint.toLowerCase()) {
        throw new Error(`Endpoint mismatch: expected ${initialEndpoint}, got ${currentEndpoint}`);
      }
      
      // Get deployment info
      const deploymentInfo = {
        network: network.name,
        chainId: config.chainId,
        contractAddress: proxy.address,
        initialEndpoint: currentEndpoint,
        owner: proxyOwner,
        emergencyPauser: proxyEmergencyPauser,
        deploymentBlock: proxy.deployTransaction.blockNumber,
        deploymentTx: proxy.deployTransaction.hash,
        timestamp: new Date().toISOString()
      };
      
      // Save deployment info
      const fs = require('fs');
      const path = require('path');
      
      const deploymentsDir = path.join(__dirname, '..', 'deployments', network.name);
      if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
      }
      
      const deploymentFile = path.join(deploymentsDir, 'OmniDragonLayerZeroProxy.json');
      fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
      
      console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);
      
      // Display usage instructions
      console.log(`\n📖 Usage Instructions:`);
      console.log(`\n1. To propose an endpoint change:`);
      console.log(`   await proxy.proposeEndpointChange("NEW_ENDPOINT_ADDRESS");`);
      
      console.log(`\n2. To execute endpoint change (after 48 hours):`);
      console.log(`   await proxy.executeEndpointChange();`);
      
      console.log(`\n3. To cancel pending change:`);
      console.log(`   await proxy.cancelEndpointChange();`);
      
      console.log(`\n4. To get current endpoint:`);
      console.log(`   await proxy.getEndpoint();`);
      
      console.log(`\n5. To check proxy status:`);
      console.log(`   await proxy.getProxyStatus();`);
      
      console.log(`\n6. Emergency pause (if needed):`);
      console.log(`   await proxy.setEmergencyPause(true);`);
      
      // Contract verification on block explorer
      if (network.name !== 'hardhat' && network.name !== 'localhost') {
        console.log(`\n🔗 To verify on block explorer, run:`);
        console.log(`npx hardhat verify --network ${network.name} ${proxy.address} "${initialEndpoint}" "${owner}" "${emergencyPauser}"`);
      }
      
      return {
        address: proxy.address,
        deploymentInfo
      };
      
    } catch (error) {
      console.error(`\n❌ Deployment failed:`, error.message);
      throw error;
    }
  });

module.exports = {}; 