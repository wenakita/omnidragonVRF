import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking Oracle Contract Status");
  console.log("═".repeat(40));
  
  const oracleAddress = "0xA528C33a16088817CDAf38F7d81aEb2fAeC6fE06";
  console.log(`📍 Oracle: ${oracleAddress}`);
  
  try {
    // Check if contract exists
    const provider = ethers.provider;
    const code = await provider.getCode(oracleAddress);
    
    if (code === "0x") {
      console.log("❌ Contract does not exist at this address");
      return;
    }
    
    console.log("✅ Contract exists");
    console.log(`   Code size: ${code.length} bytes`);
    
    // Try to connect to the contract
    try {
      const oracle = await ethers.getContractAt("DragonMarketOracle", oracleAddress);
      console.log("✅ Contract interface matches");
      
      // Try the most basic calls first
      console.log("\n📊 BASIC CONFIGURATION:");
      
      try {
        const owner = await oracle.owner();
        console.log(`   Owner: ${owner}`);
      } catch (e) {
        console.log(`   Owner: ❌ Error reading`);
      }
      
      try {
        const nativeSymbol = await oracle.nativeSymbol();
        console.log(`   Native Symbol: ${nativeSymbol}`);
      } catch (e) {
        console.log(`   Native Symbol: ❌ Error reading`);
      }
      
      try {
        const quoteSymbol = await oracle.quoteSymbol();
        console.log(`   Quote Symbol: ${quoteSymbol}`);
      } catch (e) {
        console.log(`   Quote Symbol: ❌ Error reading`);
      }
      
      // Check if it has the new dynamic functions
      console.log("\n🎯 FUNCTION AVAILABILITY:");
      
      // Check if getDynamicPythWeight exists
      try {
        const dynamicWeight = await oracle.getDynamicPythWeight();
        console.log(`   getDynamicPythWeight(): ✅ Available (${dynamicWeight.toString()})`);
      } catch (e: any) {
        if (e.message.includes("function does not exist")) {
          console.log(`   getDynamicPythWeight(): ❌ Not available (old version)`);
        } else {
          console.log(`   getDynamicPythWeight(): ⚠️  Error: ${e.message}`);
        }
      }
      
      // Check if verifyWeightIntegrity exists
      try {
        const [isValid, totalWeight] = await oracle.verifyWeightIntegrity();
        console.log(`   verifyWeightIntegrity(): ✅ Available (Valid: ${isValid}, Total: ${totalWeight})`);
      } catch (e: any) {
        if (e.message.includes("function does not exist")) {
          console.log(`   verifyWeightIntegrity(): ❌ Not available (old version)`);
        } else {
          console.log(`   verifyWeightIntegrity(): ⚠️  Error: ${e.message}`);
        }
      }
      
      console.log("\n🔍 ANALYSIS:");
      console.log("   The contract exists but may be:");
      console.log("   • An older version without dynamic weight functions");
      console.log("   • Missing proper oracle feed configuration");
      console.log("   • Having network connectivity issues with external feeds");
      
    } catch (error: any) {
      console.log(`❌ Contract interface error: ${error.message}`);
      console.log("   This might not be a DragonMarketOracle contract");
    }
    
  } catch (error: any) {
    console.log(`❌ Error checking contract: ${error.message}`);
  }
}

main().catch(console.error); 