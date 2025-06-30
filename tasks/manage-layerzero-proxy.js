const { task } = require("hardhat/config");

task("manage-layerzero-proxy", "Manage OmniDragonLayerZeroProxy contract")
  .addParam("action", "Action to perform: status, propose, execute, cancel, pause, unpause")
  .addOptionalParam("proxyAddress", "Address of the LayerZero proxy contract")
  .addOptionalParam("newEndpoint", "New endpoint address (for propose action)")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    
    console.log(`\n🔧 Managing OmniDragonLayerZeroProxy on ${network.name}...`);
    
    // Get proxy address
    let proxyAddress = taskArgs.proxyAddress;
    
    if (!proxyAddress) {
      // Try to load from deployment file
      const fs = require('fs');
      const path = require('path');
      
      const deploymentFile = path.join(__dirname, '..', 'deployments', network.name, 'OmniDragonLayerZeroProxy.json');
      
      if (fs.existsSync(deploymentFile)) {
        const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
        proxyAddress = deploymentInfo.contractAddress;
        console.log(`📂 Loaded proxy address from deployment file: ${proxyAddress}`);
      } else {
        throw new Error(`Proxy address not provided and no deployment file found at ${deploymentFile}`);
      }
    }
    
    // Validate proxy address
    if (!ethers.utils.isAddress(proxyAddress)) {
      throw new Error(`Invalid proxy address: ${proxyAddress}`);
    }
    
    // Get contract instance
    const [signer] = await ethers.getSigners();
    const proxy = await ethers.getContractAt("OmniDragonLayerZeroProxy", proxyAddress, signer);
    
    console.log(`📋 Proxy Contract: ${proxyAddress}`);
    console.log(`🔑 Signer: ${signer.address}`);
    
    try {
      switch (taskArgs.action.toLowerCase()) {
        case 'status':
          await getProxyStatus(proxy);
          break;
          
        case 'propose':
          if (!taskArgs.newEndpoint) {
            throw new Error("newEndpoint parameter required for propose action");
          }
          await proposeEndpointChange(proxy, taskArgs.newEndpoint);
          break;
          
        case 'execute':
          await executeEndpointChange(proxy);
          break;
          
        case 'cancel':
          await cancelEndpointChange(proxy);
          break;
          
        case 'pause':
          await setEmergencyPause(proxy, true);
          break;
          
        case 'unpause':
          await setEmergencyPause(proxy, false);
          break;
          
        default:
          throw new Error(`Unknown action: ${taskArgs.action}. Available actions: status, propose, execute, cancel, pause, unpause`);
      }
      
    } catch (error) {
      console.error(`\n❌ Action failed:`, error.message);
      throw error;
    }
  });

async function getProxyStatus(proxy) {
  console.log(`\n📊 Getting proxy status...`);
  
  try {
    // Get basic status
    const [endpoint, paused, pendingChange, timeToChange] = await proxy.getProxyStatus();
    const owner = await proxy.owner();
    const emergencyPauser = await proxy.emergencyPauser();
    const lastChangeTimestamp = await proxy.lastEndpointChangeTimestamp();
    
    console.log(`\n🔍 Current Status:`);
    console.log(`   Current Endpoint: ${endpoint}`);
    console.log(`   Is Paused: ${paused}`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Emergency Pauser: ${emergencyPauser}`);
    console.log(`   Last Change: ${new Date(lastChangeTimestamp.toNumber() * 1000).toISOString()}`);
    
    // Check if endpoint is operational
    const isOperational = await proxy.isEndpointOperational();
    console.log(`   Is Operational: ${isOperational}`);
    
    // Get pending change details
    if (pendingChange) {
      const [newEndpoint, effectiveTimestamp, isPending] = await proxy.getPendingEndpointChange();
      const effectiveDate = new Date(effectiveTimestamp.toNumber() * 1000);
      
      console.log(`\n⏳ Pending Endpoint Change:`);
      console.log(`   New Endpoint: ${newEndpoint}`);
      console.log(`   Effective Time: ${effectiveDate.toISOString()}`);
      console.log(`   Time Remaining: ${timeToChange.toNumber()} seconds`);
      console.log(`   Can Execute: ${timeToChange.toNumber() === 0 ? 'Yes' : 'No'}`);
    } else {
      console.log(`\n✅ No pending endpoint changes`);
    }
    
    // Network-specific endpoint validation
    const networkEndpoints = {
      sonic: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B",
      arbitrum: "0x1a44076050125825900e736c501f859c50fE728c",
      avalanche: "0x1a44076050125825900e736c501f859c50fE728c"
    };
    
    const expectedEndpoint = networkEndpoints[hre.network.name];
    if (expectedEndpoint && endpoint.toLowerCase() === expectedEndpoint.toLowerCase()) {
      console.log(`\n✅ Endpoint matches expected for ${hre.network.name}`);
    } else if (expectedEndpoint) {
      console.log(`\n⚠️  Endpoint differs from expected for ${hre.network.name}`);
      console.log(`   Expected: ${expectedEndpoint}`);
      console.log(`   Current:  ${endpoint}`);
    }
    
  } catch (error) {
    console.error(`Failed to get proxy status:`, error.message);
    throw error;
  }
}

async function proposeEndpointChange(proxy, newEndpoint) {
  console.log(`\n📝 Proposing endpoint change to: ${newEndpoint}`);
  
  // Validate new endpoint address
  if (!ethers.utils.isAddress(newEndpoint)) {
    throw new Error(`Invalid endpoint address: ${newEndpoint}`);
  }
  
  try {
    // Check current endpoint
    const currentEndpoint = await proxy.currentEndpoint();
    console.log(`   Current Endpoint: ${currentEndpoint}`);
    console.log(`   New Endpoint: ${newEndpoint}`);
    
    if (currentEndpoint.toLowerCase() === newEndpoint.toLowerCase()) {
      throw new Error("New endpoint is the same as current endpoint");
    }
    
    // Check for existing pending change
    const [, , isPending] = await proxy.getPendingEndpointChange();
    if (isPending) {
      console.log(`⚠️  Warning: There is already a pending endpoint change. This will replace it.`);
    }
    
    // Propose the change
    const tx = await proxy.proposeEndpointChange(newEndpoint);
    console.log(`📤 Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Endpoint change proposed successfully!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    
    // Get the effective timestamp
    const [, effectiveTimestamp] = await proxy.getPendingEndpointChange();
    const effectiveDate = new Date(effectiveTimestamp.toNumber() * 1000);
    
    console.log(`\n⏰ Change will be effective after: ${effectiveDate.toISOString()}`);
    console.log(`   (48 hours from now)`);
    
  } catch (error) {
    console.error(`Failed to propose endpoint change:`, error.message);
    throw error;
  }
}

async function executeEndpointChange(proxy) {
  console.log(`\n⚡ Executing pending endpoint change...`);
  
  try {
    // Check if there's a pending change
    const [newEndpoint, effectiveTimestamp, isPending] = await proxy.getPendingEndpointChange();
    
    if (!isPending) {
      throw new Error("No pending endpoint change to execute");
    }
    
    // Check if timelock has passed
    const currentTime = Math.floor(Date.now() / 1000);
    const effectiveTime = effectiveTimestamp.toNumber();
    
    if (currentTime < effectiveTime) {
      const timeRemaining = effectiveTime - currentTime;
      const hoursRemaining = Math.ceil(timeRemaining / 3600);
      throw new Error(`Timelock not met. ${hoursRemaining} hours remaining.`);
    }
    
    console.log(`   New Endpoint: ${newEndpoint}`);
    console.log(`   Effective Time: ${new Date(effectiveTime * 1000).toISOString()}`);
    
    // Execute the change
    const tx = await proxy.executeEndpointChange();
    console.log(`📤 Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Endpoint change executed successfully!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    
    // Verify the change
    const currentEndpoint = await proxy.currentEndpoint();
    console.log(`\n🔍 Verification:`);
    console.log(`   New Current Endpoint: ${currentEndpoint}`);
    
  } catch (error) {
    console.error(`Failed to execute endpoint change:`, error.message);
    throw error;
  }
}

async function cancelEndpointChange(proxy) {
  console.log(`\n❌ Cancelling pending endpoint change...`);
  
  try {
    // Check if there's a pending change
    const [newEndpoint, , isPending] = await proxy.getPendingEndpointChange();
    
    if (!isPending) {
      throw new Error("No pending endpoint change to cancel");
    }
    
    console.log(`   Cancelling change to: ${newEndpoint}`);
    
    // Cancel the change
    const tx = await proxy.cancelEndpointChange();
    console.log(`📤 Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Endpoint change cancelled successfully!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    
  } catch (error) {
    console.error(`Failed to cancel endpoint change:`, error.message);
    throw error;
  }
}

async function setEmergencyPause(proxy, paused) {
  const action = paused ? 'Pausing' : 'Unpausing';
  console.log(`\n🚨 ${action} proxy...`);
  
  try {
    // Check current pause status
    const currentlyPaused = await proxy.emergencyPaused();
    
    if (currentlyPaused === paused) {
      console.log(`⚠️  Proxy is already ${paused ? 'paused' : 'unpaused'}`);
      return;
    }
    
    // Set emergency pause
    const tx = await proxy.setEmergencyPause(paused);
    console.log(`📤 Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Proxy ${paused ? 'paused' : 'unpaused'} successfully!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    
    // Verify the change
    const isOperational = await proxy.isEndpointOperational();
    console.log(`\n🔍 Verification:`);
    console.log(`   Is Operational: ${isOperational}`);
    
  } catch (error) {
    console.error(`Failed to ${paused ? 'pause' : 'unpause'} proxy:`, error.message);
    throw error;
  }
}

module.exports = {}; 