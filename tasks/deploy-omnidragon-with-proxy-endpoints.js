const { task } = require("hardhat/config");

task("deploy-omnidragon-with-proxy-endpoints", "Deploy omniDRAGON using LayerZero proxy endpoints")
  .addOptionalParam("delegate", "Delegate address", "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F")
  .addOptionalParam("gaslimit", "Gas limit for deployment", "8000000")
  .addOptionalParam("useUniversal", "Use universal deployer for same address across chains", "true")
  .setAction(async (taskArgs, hre) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log(`\n🚀 Deploying omniDRAGON with LayerZero Proxy Endpoints on ${network.name}`);
    console.log(`📍 Deployer: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} ETH`);
    
    // LayerZero Proxy Addresses (our configurable endpoints)
    const LAYERZERO_PROXY_ADDRESSES = {
      sonic: "0x6Fa6abF394d4f827988FBAD17CadFb506b83c3e8",
      arbitrum: "0x90017f1f8F76877f465EC621ff8c1516534F481C",
      avalanche: "0x8426c64944e3eaF9B56AA20F5f72752EF5A51C88"
    };
    
    // Network configuration
    const networkConfig = {
      sonic: { chainId: 146, layerZeroEndpoint: LAYERZERO_PROXY_ADDRESSES.sonic },
      arbitrum: { chainId: 42161, layerZeroEndpoint: LAYERZERO_PROXY_ADDRESSES.arbitrum },
      avalanche: { chainId: 43114, layerZeroEndpoint: LAYERZERO_PROXY_ADDRESSES.avalanche }
    };
    
    const currentNetwork = networkConfig[network.name];
    if (!currentNetwork) {
      throw new Error(`Network ${network.name} not supported. Supported networks: sonic, arbitrum, avalanche`);
    }
    
    const lzEndpoint = currentNetwork.layerZeroEndpoint;
    const delegate = taskArgs.delegate;
    const useUniversal = taskArgs.useUniversal === "true";
    
    console.log(`🔗 LayerZero Endpoint (Proxy): ${lzEndpoint}`);
    console.log(`👤 Delegate: ${delegate}`);
    console.log(`🌍 Universal Deployment: ${useUniversal}`);
    
    try {
      let deployedAddress;
      let deployTx;
      let receipt;
      
      if (useUniversal) {
        // Deploy using universal deployer for same address across chains
        console.log(`\n📡 Deploying via Universal Deployer...`);
        
        // Load deployment configuration for CREATE2 factory
        const deployConfig = require("../deploy-config.json");
        const networkDeployConfig = deployConfig.networks[network.name];
        
        if (!networkDeployConfig) {
          throw new Error(`Network ${network.name} not found in deploy-config.json`);
        }
        
        const create2FactoryAddress = networkDeployConfig.contracts.create2Factory;
        console.log(`🏭 CREATE2 Factory: ${create2FactoryAddress}`);
        
        // Get the universal deployer address
        const DeployerFactory = await ethers.getContractFactory("OmniDragonDeployerV2");
        const CREATE2Factory = await ethers.getContractFactory("CREATE2FactoryWithOwnership");
        const create2Factory = CREATE2Factory.attach(create2FactoryAddress);
        
        // Calculate universal deployer address
        const DEPLOYER_SALT = ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes("OMNIDRAGON_DEPLOYER_UNIVERSAL_V1")
        );
        
        const deployerConstructorArgs = [create2FactoryAddress];
        const deployerDeploymentData = DeployerFactory.getDeployTransaction(...deployerConstructorArgs).data;
        const deployerBytecodeHash = ethers.utils.keccak256(deployerDeploymentData);
        const universalDeployerAddress = await create2Factory.computeAddress(DEPLOYER_SALT, deployerBytecodeHash);
        
        console.log(`🚀 Universal Deployer: ${universalDeployerAddress}`);
        
        // Check if deployer exists
        const deployerCode = await ethers.provider.getCode(universalDeployerAddress);
        if (deployerCode === "0x") {
          throw new Error(`Universal deployer not deployed on ${network.name}. Deploy it first with: npx hardhat deploy-omnidragon-deployer-universal --network ${network.name}`);
        }
        
        // Attach to the universal deployer
        const universalDeployer = DeployerFactory.attach(universalDeployerAddress);
        
        // Predict omniDRAGON address using proxy endpoint
        const predictedAddress = await universalDeployer.predictOmniDRAGONAddress(lzEndpoint, delegate);
        console.log(`🔮 Predicted omniDRAGON Address: ${predictedAddress}`);
        
        // Check if already deployed
        const existingCode = await ethers.provider.getCode(predictedAddress);
        if (existingCode !== "0x") {
          console.log(`✅ omniDRAGON already deployed at: ${predictedAddress}`);
          
          // Verify it works
          const omniDRAGONFactory = await ethers.getContractFactory("omniDRAGON");
          const existingOmniDRAGON = omniDRAGONFactory.attach(predictedAddress);
          
          try {
            const name = await existingOmniDRAGON.name();
            const symbol = await existingOmniDRAGON.symbol();
            const owner = await existingOmniDRAGON.owner();
            const endpoint = await existingOmniDRAGON.getLayerZeroEndpoint();
            
            console.log(`✅ Existing omniDRAGON verified:`);
            console.log(`   Name: ${name}`);
            console.log(`   Symbol: ${symbol}`);
            console.log(`   Owner: ${owner}`);
            console.log(`   LayerZero Endpoint: ${endpoint}`);
            
            return predictedAddress;
          } catch (error) {
            console.log(`⚠️  Could not verify existing contract: ${error.message}`);
          }
        }
        
        // Deploy omniDRAGON via universal deployer
        console.log(`📡 Deploying omniDRAGON via universal deployer...`);
        
        const gasLimit = parseInt(taskArgs.gaslimit);
        console.log(`⛽ Gas Limit: ${gasLimit.toLocaleString()}`);
        
        deployTx = await universalDeployer.deployOmniDRAGON(lzEndpoint, delegate, {
          gasLimit: gasLimit
        });
        
        console.log(`⏳ Deployment transaction: ${deployTx.hash}`);
        receipt = await deployTx.wait();
        
        // Get the deployed address from the event
        const deployedEvent = receipt.events?.find(e => e.event === "UniversalContractDeployed");
        deployedAddress = deployedEvent?.args?.contractAddress || predictedAddress;
        
      } else {
        // Direct deployment (different addresses on each chain)
        console.log(`\n📡 Direct Deployment...`);
        
        const omniDRAGONFactory = await ethers.getContractFactory("omniDRAGON");
        
        const gasLimit = parseInt(taskArgs.gaslimit);
        console.log(`⛽ Gas Limit: ${gasLimit.toLocaleString()}`);
        
        const omniDRAGON = await omniDRAGONFactory.deploy(
          lzEndpoint,
          delegate,
          {
            gasLimit: gasLimit
          }
        );
        
        deployTx = omniDRAGON.deployTransaction;
        console.log(`⏳ Deployment transaction: ${deployTx.hash}`);
        
        receipt = await omniDRAGON.deployed();
        deployedAddress = omniDRAGON.address;
      }
      
      console.log(`✅ omniDRAGON deployed to: ${deployedAddress}`);
      console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
      
      // Verify the deployment
      const omniDRAGONFactory = await ethers.getContractFactory("omniDRAGON");
      const deployedOmniDRAGON = omniDRAGONFactory.attach(deployedAddress);
      
      try {
        const name = await deployedOmniDRAGON.name();
        const symbol = await deployedOmniDRAGON.symbol();
        const owner = await deployedOmniDRAGON.owner();
        const endpoint = await deployedOmniDRAGON.getLayerZeroEndpoint();
        const isEndpointSet = await deployedOmniDRAGON.isLayerZeroEndpointSet();
        
        console.log(`\n🧪 Deployment Verification:`);
        console.log(`   Name: ${name}`);
        console.log(`   Symbol: ${symbol}`);
        console.log(`   Owner: ${owner}`);
        console.log(`   Delegate: ${delegate}`);
        console.log(`   LayerZero Endpoint: ${endpoint}`);
        console.log(`   Endpoint Set: ${isEndpointSet}`);
        
        if (owner.toLowerCase() === delegate.toLowerCase()) {
          console.log(`✅ Owner matches delegate!`);
        } else {
          console.log(`⚠️  Owner doesn't match delegate`);
        }
        
        if (endpoint.toLowerCase() === lzEndpoint.toLowerCase()) {
          console.log(`✅ LayerZero endpoint matches proxy address!`);
        } else {
          console.log(`⚠️  LayerZero endpoint doesn't match proxy address`);
        }
      } catch (error) {
        console.log(`⚠️  Could not verify deployment: ${error.message}`);
      }
      
      console.log(`\n📊 Deployment Summary:`);
      console.log(`   Contract: omniDRAGON`);
      console.log(`   Address: ${deployedAddress}`);
      console.log(`   Network: ${network.name} (Chain ID: ${currentNetwork.chainId})`);
      console.log(`   LayerZero Proxy: ${lzEndpoint}`);
      console.log(`   Delegate: ${delegate}`);
      console.log(`   Universal: ${useUniversal}`);
      
      if (useUniversal) {
        console.log(`\n🌍 This address should be the same on ALL chains:`);
        console.log(`   - Sonic (146): ${deployedAddress}`);
        console.log(`   - Arbitrum (42161): ${deployedAddress}`);
        console.log(`   - Avalanche (43114): ${deployedAddress}`);
      }
      
      console.log(`\n🎯 LayerZero Proxy Benefits:`);
      console.log(`   ✅ Configurable endpoints (48-hour timelock)`);
      console.log(`   ✅ Emergency pause capability`);
      console.log(`   ✅ No contract redeployment needed for endpoint changes`);
      console.log(`   ✅ Full LayerZero V2 compatibility`);
      
      console.log(`\n🔧 Proxy Management:`);
      console.log(`   Status: npx hardhat manage-layerzero-proxy --action status --network ${network.name}`);
      console.log(`   Change: npx hardhat manage-layerzero-proxy --action propose --new-endpoint "0xNEW_ENDPOINT" --network ${network.name}`);
      
      console.log(`\n🎉 omniDRAGON with LayerZero Proxy deployment completed successfully!`);
      
      // Save deployment info
      const deploymentInfo = {
        contractName: "omniDRAGON",
        address: deployedAddress,
        network: network.name,
        chainId: currentNetwork.chainId,
        deployer: deployer.address,
        layerZeroProxy: lzEndpoint,
        delegate: delegate,
        isUniversal: useUniversal,
        deployedAt: new Date().toISOString(),
        transactionHash: deployTx.hash,
        gasUsed: receipt.gasUsed.toString(),
        proxyBenefits: [
          "Configurable endpoints with 48-hour timelock",
          "Emergency pause capability",
          "No redeployment needed for endpoint changes",
          "Full LayerZero V2 compatibility"
        ]
      };
      
      // Save to file
      const fs = require('fs');
      const path = require('path');
      const deploymentDir = path.join(__dirname, '..', 'deployments', network.name);
      
      if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
      }
      
      const deploymentFile = path.join(deploymentDir, 'omniDRAGON_with_proxy.json');
      fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
      
      console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);
      
      return deployedAddress;
      
    } catch (error) {
      console.error(`❌ Deployment failed:`, error.message);
      
      if (error.message.includes("omniDRAGON already deployed")) {
        console.log(`\n💡 omniDRAGON is already deployed on this chain.`);
      } else if (error.message.includes("insufficient funds")) {
        console.log(`\n💡 Insufficient funds. Please add more ETH to your deployer wallet.`);
      } else if (error.message.includes("Universal deployer not deployed")) {
        console.log(`\n💡 Deploy the universal deployer first with:`);
        console.log(`   npx hardhat deploy-omnidragon-deployer-universal --network ${network.name}`);
      }
      
      throw error;
    }
  });

module.exports = {}; 