const { task, types } = require("hardhat/config");

task("fund-lottery-manager", "Fund lottery manager with ETH for VRF payments")
  .addOptionalParam("lotteryManager", "Address of lottery manager", "0x8b38c5B1ba18c51a4483121f8250e2D165ed1e8f")
  .addOptionalParam("amount", "Amount of ETH to send", "0.5")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log("💰 Funding Lottery Manager for VRF");
    console.log("==================================");
    console.log("Network:", hre.network.name);
    console.log("Deployer:", deployer.address);
    console.log("Lottery Manager:", taskArgs.lotteryManager);
    console.log("Amount:", taskArgs.amount, "ETH");
    console.log();
    
    const amountWei = ethers.utils.parseEther(taskArgs.amount);
    
    // Check deployer balance
    const balance = await deployer.getBalance();
    console.log("Deployer balance:", ethers.utils.formatEther(balance), "ETH");
    
    if (balance.lte(amountWei)) {
      throw new Error("Insufficient balance to fund lottery manager");
    }
    
    // Send ETH to lottery manager
    console.log("Sending", taskArgs.amount, "ETH to lottery manager...");
    const tx = await deployer.sendTransaction({
      to: taskArgs.lotteryManager,
      value: amountWei
    });
    
    await tx.wait();
    console.log("✅ Transaction hash:", tx.hash);
    
    // Check new balance
    const newBalance = await ethers.provider.getBalance(taskArgs.lotteryManager);
    console.log("✅ Lottery manager balance:", ethers.utils.formatEther(newBalance), "ETH");
    
    console.log("\n🎉 Funding Complete!");
    console.log("✅ Lottery manager funded for VRF requests");
    console.log("✅ Ready to process lottery entries!");
  });

module.exports = {}; 