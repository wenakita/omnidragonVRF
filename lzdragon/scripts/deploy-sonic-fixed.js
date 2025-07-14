const { ethers } = require("hardhat");

async function main() {
    console.log(`\n--- Deploying Fixed OmniDRAGON on Sonic ---`);
    
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);
    
    const registryAddress = "0x69B029B7EF2468c2B546556022be2DD66cd20777";
    const factoryAddress = "0xAA28020DDA6b954D16208eccF873D79AC6533833";
    const salt = "0x9f010b008dece704b9b0846eb4b3cc0e28fdaebe4cceb74a0ac1744147605743";
    
    try {
        // Get factory contract
        const factory = await ethers.getContractAt("CREATE2FactoryWithOwnership", factoryAddress);
        
        // Get contract factory
        const DragonFactory = await ethers.getContractFactory("omniDRAGON");
        
        // Constructor arguments - same as before
        const constructorArgs = ethers.utils.defaultAbiCoder.encode(
            ["string", "string", "address", "address", "address"],
            ["Dragon", "DRAGON", registryAddress, registryAddress, deployer.address]
        );
        
        // Create deployment bytecode
        const deploymentBytecode = DragonFactory.bytecode + constructorArgs.slice(2);
        
        // Calculate expected address
        const computedAddress = ethers.utils.getCreate2Address(
            factoryAddress,
            salt,
            ethers.utils.keccak256(deploymentBytecode)
        );
        
        console.log(`Expected address: ${computedAddress}`);
        
        // Check if already deployed
        const existingCode = await ethers.provider.getCode(computedAddress);
        if (existingCode !== '0x') {
            console.log(`✅ Contract already exists at ${computedAddress}`);
            
            // Test the existing contract
            const dragon = await ethers.getContractAt("omniDRAGON", computedAddress);
            const name = await dragon.name();
            const symbol = await dragon.symbol();
            const owner = await dragon.owner();
            const totalSupply = await dragon.totalSupply();
            
            console.log(`Name: ${name}`);
            console.log(`Symbol: ${symbol}`);
            console.log(`Owner: ${owner}`);
            console.log(`Total Supply: ${ethers.utils.formatEther(totalSupply)} DRAGON`);
            
            return;
        }
        
        // Deploy
        console.log("\\n--- Deploying with fixed constructor ---");
        
        const gasPrice = await ethers.provider.getGasPrice();
        const gasLimit = 8000000; // 8M gas limit
        
        const tx = await factory.deploy(
            deploymentBytecode,
            salt,
            "omniDRAGON",
            {
                gasLimit: gasLimit,
                maxFeePerGas: gasPrice.mul(2),
                maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
            }
        );
        
        console.log(`✅ Transaction sent: ${tx.hash}`);
        console.log("⏳ Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        console.log(`Gas used: ${receipt.gasUsed.toLocaleString()}`);
        
        // Verify deployment
        const deployedCode = await ethers.provider.getCode(computedAddress);
        if (deployedCode !== '0x') {
            console.log(`\\n✅ Contract deployed successfully at ${computedAddress}`);
            
            // Test contract
            const dragon = await ethers.getContractAt("omniDRAGON", computedAddress);
            const name = await dragon.name();
            const symbol = await dragon.symbol();
            const owner = await dragon.owner();
            const totalSupply = await dragon.totalSupply();
            
            console.log(`Name: ${name}`);
            console.log(`Symbol: ${symbol}`);
            console.log(`Owner: ${owner}`);
            console.log(`Total Supply: ${ethers.utils.formatEther(totalSupply)} DRAGON`);
            
            // Now register with FeeM
            console.log(`\\n--- Registering with FeeM ---`);
            
            try {
                const feemTx = await dragon.registerWithFeeM({
                    gasLimit: 200000
                });
                
                console.log(`✅ FeeM registration sent: ${feemTx.hash}`);
                const feemReceipt = await feemTx.wait();
                
                if (feemReceipt.status === 1) {
                    console.log(`✅ FeeM registration successful!`);
                    console.log(`Gas used: ${feemReceipt.gasUsed.toLocaleString()}`);
                } else {
                    console.log(`❌ FeeM registration failed`);
                }
                
            } catch (feemError) {
                console.log(`⚠️  FeeM registration failed: ${feemError.message.split('\\n')[0]}`);
                console.log(`Contract deployed successfully, but FeeM registration can be done manually later`);
            }
            
        } else {
            console.log(`❌ Contract not found at expected address`);
        }
        
    } catch (error) {
        console.error(`❌ Deployment failed:`, error.message.split('\\n')[0]);
    }
}

main().catch(console.error); 