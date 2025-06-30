const { task } = require("hardhat/config");

task("test-jackpot-interface", "Test jackpot vault interface")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    
    console.log(`\n🔍 Testing Jackpot Vault Interface on ${network.name}`);
    
    const vaultAddress = "0xABa4df84B208ecedac2EcEcc988648d2847Ec310";
    
    try {
      // Try different contract interfaces
      console.log("\n1. Testing with DragonJackpotVault...");
      try {
        const vault1 = await ethers.getContractAt("DragonJackpotVault", vaultAddress);
        console.log(`✅ DragonJackpotVault loaded`);
        
        // Test getJackpotBalance()
        try {
          const balance = await vault1.getJackpotBalance();
          console.log(`✅ getJackpotBalance(): ${ethers.utils.formatEther(balance)} tokens`);
        } catch (error) {
          console.log(`❌ getJackpotBalance(): ${error.message}`);
        }
        
        // Test wrappedNativeToken
        try {
          const wnt = await vault1.wrappedNativeToken();
          console.log(`✅ wrappedNativeToken(): ${wnt}`);
        } catch (error) {
          console.log(`❌ wrappedNativeToken(): ${error.message}`);
        }
        
        // Test jackpotBalances mapping
        try {
          const wsToken = "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38"; // Wrapped S
          const balance = await vault1.jackpotBalances(wsToken);
          console.log(`✅ jackpotBalances(${wsToken}): ${ethers.utils.formatEther(balance)} tokens`);
        } catch (error) {
          console.log(`❌ jackpotBalances(): ${error.message}`);
        }
        
      } catch (error) {
        console.log(`❌ DragonJackpotVault: ${error.message}`);
      }
      
      console.log("\n2. Testing with interface...");
      try {
        const vault2 = await ethers.getContractAt("contracts/interfaces/lottery/IDragonJackpotVault.sol:IDragonJackpotVault", vaultAddress);
        console.log(`✅ IDragonJackpotVault loaded`);
        
        const balance = await vault2.getJackpotBalance();
        console.log(`✅ Interface getJackpotBalance(): ${ethers.utils.formatEther(balance)} tokens`);
      } catch (error) {
        console.log(`❌ IDragonJackpotVault: ${error.message}`);
      }
      
      console.log("\n3. Testing raw contract call...");
      try {
        const provider = ethers.provider;
        const iface = new ethers.utils.Interface([
          "function getJackpotBalance() external view returns (uint256)",
          "function wrappedNativeToken() external view returns (address)",
          "function jackpotBalances(address) external view returns (uint256)"
        ]);
        
        // Test getJackpotBalance
        try {
          const data = iface.encodeFunctionData("getJackpotBalance", []);
          const result = await provider.call({ to: vaultAddress, data });
          const decoded = iface.decodeFunctionResult("getJackpotBalance", result);
          console.log(`✅ Raw getJackpotBalance(): ${ethers.utils.formatEther(decoded[0])} tokens`);
        } catch (error) {
          console.log(`❌ Raw getJackpotBalance(): ${error.message}`);
        }
        
        // Test wrappedNativeToken
        try {
          const data = iface.encodeFunctionData("wrappedNativeToken", []);
          const result = await provider.call({ to: vaultAddress, data });
          const decoded = iface.decodeFunctionResult("wrappedNativeToken", result);
          console.log(`✅ Raw wrappedNativeToken(): ${decoded[0]}`);
        } catch (error) {
          console.log(`❌ Raw wrappedNativeToken(): ${error.message}`);
        }
        
      } catch (error) {
        console.log(`❌ Raw contract call: ${error.message}`);
      }
      
    } catch (error) {
      console.error(`❌ Test failed:`, error.message);
    }
  }); 