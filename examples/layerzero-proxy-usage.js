const { ethers } = require("hardhat");

/**
 * LayerZero Proxy Usage Examples
 * 
 * This script demonstrates how to interact with the OmniDragonLayerZeroProxy contracts
 * deployed across Sonic, Arbitrum, and Avalanche networks.
 */

// Deployed proxy addresses
const PROXY_ADDRESSES = {
  sonic: "0x6Fa6abF394d4f827988FBAD17CadFb506b83c3e8",
  arbitrum: "0x90017f1f8F76877f465EC621ff8c1516534F481C",
  avalanche: "0x8426c64944e3eaF9B56AA20F5f72752EF5A51C88"
};

// LayerZero V2 endpoints
const LAYERZERO_ENDPOINTS = {
  sonic: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B",
  arbitrum: "0x1a44076050125825900e736c501f859c50fE728c",
  avalanche: "0x1a44076050125825900e736c501f859c50fE728c"
};

async function main() {
  console.log("🔧 LayerZero Proxy Usage Examples\n");

  // Example 1: Get proxy contract instance
  console.log("📋 Example 1: Getting Proxy Contract Instance");
  const proxyAddress = PROXY_ADDRESSES.sonic;
  const proxy = await ethers.getContractAt("OmniDragonLayerZeroProxy", proxyAddress);
  console.log(`✅ Connected to proxy at: ${proxyAddress}\n`);

  // Example 2: Check current status
  console.log("📊 Example 2: Checking Current Status");
  try {
    const currentEndpoint = await proxy.getEndpoint();
    const owner = await proxy.owner();
    const emergencyPauser = await proxy.emergencyPauser();
    const isPaused = await proxy.paused();
    const isOperational = await proxy.isOperational();
    
    console.log(`Current Endpoint: ${currentEndpoint}`);
    console.log(`Owner: ${owner}`);
    console.log(`Emergency Pauser: ${emergencyPauser}`);
    console.log(`Is Paused: ${isPaused}`);
    console.log(`Is Operational: ${isOperational}\n`);
  } catch (error) {
    console.log(`❌ Error checking status: ${error.message}\n`);
  }

  // Example 3: Get proxy status (comprehensive)
  console.log("🔍 Example 3: Getting Comprehensive Proxy Status");
  try {
    const status = await proxy.getProxyStatus();
    console.log("Proxy Status:", {
      currentEndpoint: status.currentEndpoint,
      isOperational: status.isOperational,
      isPaused: status.isPaused,
      owner: status.owner,
      emergencyPauser: status.emergencyPauser,
      lastChangeTimestamp: new Date(status.lastChangeTimestamp * 1000).toISOString(),
      timelockDelay: status.timelockDelay.toString() + " seconds"
    });
    console.log();
  } catch (error) {
    console.log(`❌ Error getting proxy status: ${error.message}\n`);
  }

  // Example 4: Check for pending changes
  console.log("⏳ Example 4: Checking for Pending Changes");
  try {
    const hasPendingChange = await proxy.hasPendingEndpointChange();
    console.log(`Has Pending Change: ${hasPendingChange}`);
    
    if (hasPendingChange) {
      const pendingEndpoint = await proxy.pendingEndpoint();
      const proposalTime = await proxy.pendingEndpointTimestamp();
      console.log(`Pending Endpoint: ${pendingEndpoint}`);
      console.log(`Proposal Time: ${new Date(proposalTime * 1000).toISOString()}`);
    }
    console.log();
  } catch (error) {
    console.log(`❌ Error checking pending changes: ${error.message}\n`);
  }

  // Example 5: Demonstrate endpoint change proposal (READ-ONLY)
  console.log("💡 Example 5: Endpoint Change Process (Demonstration)");
  console.log("To propose an endpoint change:");
  console.log(`await proxy.proposeEndpointChange("0xNEW_ENDPOINT_ADDRESS");`);
  console.log();
  console.log("To execute after 48 hours:");
  console.log(`await proxy.executeEndpointChange();`);
  console.log();
  console.log("To cancel pending change:");
  console.log(`await proxy.cancelEndpointChange();`);
  console.log();

  // Example 6: Emergency controls demonstration
  console.log("🚨 Example 6: Emergency Controls (Demonstration)");
  console.log("To pause proxy (emergency only):");
  console.log(`await proxy.setEmergencyPause(true);`);
  console.log();
  console.log("To unpause proxy:");
  console.log(`await proxy.setEmergencyPause(false);`);
  console.log();

  // Example 7: Integration with omniDRAGON
  console.log("🐉 Example 7: Integration with omniDRAGON Token");
  console.log("When deploying omniDRAGON, use proxy address as LayerZero endpoint:");
  console.log();
  console.log("// Solidity example:");
  console.log(`// omniDRAGON token = new omniDRAGON(`);
  console.log(`//     "${proxyAddress}", // LayerZero endpoint (proxy)`);
  console.log(`//     owner`);
  console.log(`// );`);
  console.log();

  // Example 8: Multi-network deployment
  console.log("🌐 Example 8: Multi-Network Deployment Addresses");
  console.log("Use these proxy addresses as LayerZero endpoints:");
  Object.entries(PROXY_ADDRESSES).forEach(([network, address]) => {
    console.log(`${network.toUpperCase()}: ${address}`);
  });
  console.log();

  // Example 9: Verification commands
  console.log("✅ Example 9: Block Explorer Verification");
  console.log("Sonic:");
  console.log(`npx hardhat verify --network sonic ${PROXY_ADDRESSES.sonic} "${LAYERZERO_ENDPOINTS.sonic}" "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F" "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F"`);
  console.log();
  console.log("Arbitrum:");
  console.log(`npx hardhat verify --network arbitrum ${PROXY_ADDRESSES.arbitrum} "${LAYERZERO_ENDPOINTS.arbitrum}" "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F" "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F"`);
  console.log();
  console.log("Avalanche:");
  console.log(`npx hardhat verify --network avalanche ${PROXY_ADDRESSES.avalanche} "${LAYERZERO_ENDPOINTS.avalanche}" "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F" "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F"`);
  console.log();

  console.log("🎉 LayerZero Proxy Usage Examples Complete!");
  console.log("📚 For more details, see LAYERZERO_ENDPOINT_CONFIGURATION.md");
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}

module.exports = {
  PROXY_ADDRESSES,
  LAYERZERO_ENDPOINTS,
  main
}; 