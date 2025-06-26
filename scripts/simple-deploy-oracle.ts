import { ethers } from "hardhat";

async function main() {
  console.log("Starting deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await deployer.getBalance();
  console.log("Balance:", ethers.utils.formatEther(balance));
  
  // Oracle addresses from .env
  const chainlinkFeed = "0xc76dFb89fF298145b417d221B2c747d84952e01d";
  const bandFeed = "0x506085050Ea5494Fe4b89Dd5BEa659F506F470Cc";
  const api3Feed = "0x709944a48cAf83535e43471680fDA4905FB3920a";
  const pythFeed = "0x2880aB155794e7179c9eE2e38200202908C17B43";
  
  console.log("Deploying DragonMarketOracle...");
  
  const Oracle = await ethers.getContractFactory("DragonMarketOracle");
  const oracle = await Oracle.deploy(
    "S",
    "USD", 
    chainlinkFeed,
    bandFeed,
    api3Feed,
    pythFeed
  );
  
  console.log("Waiting for deployment...");
  await oracle.deployed();
  
  console.log("DragonMarketOracle deployed to:", oracle.address);
  console.log("Transaction hash:", oracle.deployTransaction.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 