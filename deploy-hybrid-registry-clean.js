const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");

  // CREATE2 factory address
  const create2Factory = "0xAA28020DDA6b954D16208eccF873D79AC6533833";
  
  // Get the contract factory
  const HybridRegistry = await ethers.getContractFactory("HybridRegistry");
  
  // Sonic LayerZero endpoint
  const lzEndpoint = "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B";
  
  // Encode constructor arguments
  const constructorArgs = ethers.utils.defaultAbiCoder.encode(
    ["address"],
    [lzEndpoint]
  );
  
  // Get bytecode with constructor
  const bytecode = HybridRegistry.bytecode + constructorArgs.slice(2);
  
  // Salt to achieve consistent address 0xf0e415c9A10374513DE392C6b866bf6EDDB76204
  const salt = "0x268c4bc23954199cadb072b44f23204bb3d7eaffb5402d09dcf512ca378ba1af";
  
  // Predict the address
  const predictedAddress = ethers.utils.getCreate2Address(
    create2Factory,
    salt,
    ethers.utils.keccak256(bytecode)
  );
  
  console.log("Predicted address:", predictedAddress);
  
  // Deploy using CREATE2
  const factory = await ethers.getContractAt("ICreate2Factory", create2Factory);
  
  console.log("Deploying HybridRegistry...");
  const tx = await factory.deploy(bytecode, salt);
  await tx.wait();
  
  console.log("HybridRegistry deployed to:", predictedAddress);
  console.log("Transaction hash:", tx.hash);
  
  // Get the deployed contract
  const hybridRegistry = await ethers.getContractAt("HybridRegistry", predictedAddress);
  
  // Verify deployment
  console.log("Verifying deployment...");
  const owner = await hybridRegistry.owner();
  console.log("Contract owner:", owner);
  
  console.log("✅ Deployment complete!");
  console.log("HybridRegistry address:", predictedAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 