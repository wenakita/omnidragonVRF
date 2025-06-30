const { task, types } = require("hardhat/config");

task("deploy-jackpot-contracts-multi", "Deploy both jackpot contracts on multiple networks")
  .addOptionalParam("networks", "Comma-separated list of networks", "arbitrum,avalanche")
  .addOptionalParam("verify", "Verify contracts on block explorer", true, types.boolean)
  .setAction(async (taskArgs, hre) => {
    const networks = taskArgs.networks.split(',').map(n => n.trim());
    const results = {};

    console.log("🚀 Multi-Network Jackpot Contracts Deployment");
    console.log("📋 Target Networks:", networks.join(', '));
    console.log("🔍 Verification:", taskArgs.verify ? "Enabled" : "Disabled");
    console.log("=".repeat(60));

    for (const network of networks) {
      console.log(`\n🌐 Deploying on ${network.toUpperCase()}...`);
      console.log("-".repeat(40));

      try {
        // Change network context
        hre.changeNetwork(network);
        
        // Deploy DragonJackpotVault
        console.log("1️⃣ Deploying DragonJackpotVault...");
        const vaultResult = await hre.run("deploy-jackpot-vault", {
          verify: taskArgs.verify
        });

        // Deploy DragonJackpotDistributor
        console.log("\n2️⃣ Deploying DragonJackpotDistributor...");
        const distributorResult = await hre.run("deploy-jackpot-distributor", {
          verify: taskArgs.verify
        });

        results[network] = {
          success: true,
          contracts: {
            DragonJackpotVault: {
              address: vaultResult.address,
              deploymentMethod: vaultResult.deploymentMethod
            },
            DragonJackpotDistributor: {
              address: distributorResult.address,
              deploymentMethod: distributorResult.deploymentMethod
            }
          }
        };

        console.log(`✅ ${network.toUpperCase()} deployment completed!`);
        console.log(`   DragonJackpotVault: ${vaultResult.address}`);
        console.log(`   DragonJackpotDistributor: ${distributorResult.address}`);

      } catch (error) {
        console.error(`❌ ${network.toUpperCase()} deployment failed:`, error.message);
        results[network] = {
          success: false,
          error: error.message
        };
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));

    const successful = Object.keys(results).filter(n => results[n].success);
    const failed = Object.keys(results).filter(n => !results[n].success);

    console.log(`✅ Successful: ${successful.length}/${networks.length}`);
    console.log(`❌ Failed: ${failed.length}/${networks.length}`);

    if (successful.length > 0) {
      console.log("\n🎯 SUCCESSFUL DEPLOYMENTS:");
      successful.forEach(network => {
        const result = results[network];
        console.log(`\n📍 ${network.toUpperCase()}:`);
        console.log(`   DragonJackpotVault: ${result.contracts.DragonJackpotVault.address}`);
        console.log(`   DragonJackpotDistributor: ${result.contracts.DragonJackpotDistributor.address}`);
        console.log(`   Method: ${result.contracts.DragonJackpotVault.deploymentMethod}`);
      });
    }

    if (failed.length > 0) {
      console.log("\n❌ FAILED DEPLOYMENTS:");
      failed.forEach(network => {
        console.log(`   ${network.toUpperCase()}: ${results[network].error}`);
      });
    }

    // Check for universal addresses
    if (successful.length > 1) {
      console.log("\n🔍 UNIVERSAL ADDRESS CHECK:");
      const vaultAddresses = successful.map(n => results[n].contracts.DragonJackpotVault.address);
      const distributorAddresses = successful.map(n => results[n].contracts.DragonJackpotDistributor.address);
      
      const vaultUniversal = vaultAddresses.every(addr => addr === vaultAddresses[0]);
      const distributorUniversal = distributorAddresses.every(addr => addr === distributorAddresses[0]);
      
      console.log(`   DragonJackpotVault: ${vaultUniversal ? '✅ Universal' : '❌ Different addresses'}`);
      console.log(`   DragonJackpotDistributor: ${distributorUniversal ? '✅ Universal' : '❌ Different addresses'}`);
      
      if (vaultUniversal && distributorUniversal) {
        console.log("\n🎉 SUCCESS: All contracts deployed with universal addresses!");
      }
    }

    return results;
  }); 