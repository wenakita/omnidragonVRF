const { task } = require("hardhat/config");

task("manual-verify-chain-registry", "Manually verify OmniDragonChainRegistry with different constructor args")
  .addParam("targetNetwork", "Network to verify on", "sonic")
  .setAction(async (taskArgs, hre) => {
    const contractAddress = "0x567eB27f7EA8c69988e30B045987Ad58A597685C";
    const networkName = taskArgs.targetNetwork;
    
    console.log(`🔍 Attempting manual verification of OmniDragonChainRegistry on ${networkName}...`);
    console.log(`📍 Contract Address: ${contractAddress}\n`);
    
    // Different possible constructor argument combinations
    const possibleConstructorArgs = [
      // Option 1: Standard LayerZero endpoints
      [
        "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B", // Sonic LZ endpoint
        "0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830", // Sonic FeeM
        "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F"  // Owner
      ],
      // Option 2: Arbitrum LZ endpoint (if deployed from Arbitrum)
      [
        "0x1a44076050125825900e736c501f859c50fE728c", // Arbitrum LZ endpoint
        "0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830", // Sonic FeeM
        "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F"  // Owner
      ],
      // Option 3: Zero address as placeholder
      [
        "0x0000000000000000000000000000000000000000", // Zero address placeholder
        "0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830", // Sonic FeeM
        "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F"  // Owner
      ],
      // Option 4: Different FeeM address
      [
        "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B", // Sonic LZ endpoint
        "0x0000000000000000000000000000000000000000", // Zero FeeM
        "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F"  // Owner
      ]
    ];
    
    for (let i = 0; i < possibleConstructorArgs.length; i++) {
      const args = possibleConstructorArgs[i];
      console.log(`🔄 Attempt ${i + 1}: Testing constructor args:`);
      console.log(`   _placeholderEndpoint: ${args[0]}`);
      console.log(`   _feeMAddress: ${args[1]}`);
      console.log(`   _initialOwner: ${args[2]}`);
      
      try {
        await hre.run("verify:verify", {
          address: contractAddress,
          constructorArguments: args,
          contract: "contracts/core/config/OmniDragonChainRegistry.sol:OmniDragonChainRegistry"
        });
        
        console.log(`✅ SUCCESS! Verified with constructor args set ${i + 1}`);
        console.log(`🔗 View at: ${getExplorerUrl(networkName)}/address/${contractAddress}#code\n`);
        return;
        
      } catch (error) {
        console.log(`❌ Failed with args set ${i + 1}: ${error.message.split('\n')[0]}\n`);
      }
    }
    
    console.log("❌ All verification attempts failed. The contract may have been:");
    console.log("   - Deployed with different compiler settings");
    console.log("   - Deployed from a different version of the source code");
    console.log("   - Deployed with constructor args not in our test set");
    console.log("   - Deployed using a different contract altogether");
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