const { task } = require("hardhat/config");

task("verify-chain-registry", "Verify OmniDragonChainRegistry on all networks")
  .setAction(async (taskArgs, hre) => {
    const networks = ['sonic', 'arbitrum', 'avalanche'];
    const contractAddress = "0x567eB27f7EA8c69988e30B045987Ad58A597685C";
    
    console.log("🔍 Verifying OmniDragonChainRegistry on all networks...\n");
    
    for (const networkName of networks) {
      console.log(`📋 Verifying on ${networkName}...`);
      
      try {
        // Switch to the network
        hre.changeNetwork(networkName);
        
        // Verify the contract
        await hre.run("verify:verify", {
          address: contractAddress,
          constructorArguments: [
            // These would be the constructor arguments used during deployment
            // We'll need to get these from the actual deployment
            "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B", // placeholder endpoint (example)
            "0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830", // feeMAddress (Sonic FeeM)
            "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F"  // initial owner
          ],
          contract: "contracts/core/config/OmniDragonChainRegistry.sol:OmniDragonChainRegistry"
        });
        
        console.log(`✅ ${networkName}: Successfully verified!`);
        
        // Get the explorer URL
        const config = hre.config.networks[networkName];
        const explorerUrl = getExplorerUrl(networkName);
        console.log(`🔗 ${networkName}: ${explorerUrl}/address/${contractAddress}#code\n`);
        
      } catch (error) {
        console.log(`❌ ${networkName}: Verification failed`);
        console.log(`Error: ${error.message}\n`);
      }
    }
    
    console.log("🎉 Chain Registry verification process completed!");
  });

function getExplorerUrl(network) {
  const explorers = {
    sonic: "https://sonicscan.org",
    arbitrum: "https://arbiscan.io", 
    avalanche: "https://snowtrace.io"
  };
  return explorers[network];
}

module.exports = {}; 