const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 ANALYZING CONTRACT 0xC8A27A512AC32B3d63803821e121233f1E05Dc34");
    console.log("=====================================================");
    
    const CONTRACT_ADDRESS = "0xC8A27A512AC32B3d63803821e121233f1E05Dc34";
    
    // Get basic contract info
    const code = await ethers.provider.getCode(CONTRACT_ADDRESS);
    console.log(`📦 Contract bytecode length: ${code.length} characters`);
    console.log(`📦 Contract exists: ${code !== '0x' ? '✅ YES' : '❌ NO'}`);
    
    if (code === '0x') {
        console.log("❌ No contract found at this address!");
        return;
    }
    
    // Try to interact with the contract
    try {
        // Try with ChainlinkVRFIntegratorV2_5 ABI
        const contract = await ethers.getContractAt("ChainlinkVRFIntegratorV2_5", CONTRACT_ADDRESS);
        
        console.log("\n📋 Contract Function Analysis:");
        
        try {
            const owner = await contract.owner();
            console.log(`👤 Owner: ${owner}`);
        } catch (e) {
            console.log(`❌ Owner call failed: ${e.message}`);
        }
        
        try {
            const endpoint = await contract.endpoint();
            console.log(`🔗 Endpoint: ${endpoint}`);
        } catch (e) {
            console.log(`❌ Endpoint call failed: ${e.message}`);
        }
        
        try {
            const balance = await ethers.provider.getBalance(CONTRACT_ADDRESS);
            console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} ETH`);
        } catch (e) {
            console.log(`❌ Balance check failed: ${e.message}`);
        }
        
    } catch (error) {
        console.log(`❌ Contract interaction failed: ${error.message}`);
        console.log("This might not be a ChainlinkVRFIntegratorV2_5 contract");
    }
    
    // Get transaction that created this contract
    console.log("\n🔍 Searching for contract creation transaction...");
    
    // Try to find creation transaction by checking recent blocks
    const latestBlock = await ethers.provider.getBlockNumber();
    console.log(`📊 Latest block: ${latestBlock}`);
    
    // Check last 1000 blocks for contract creation
    const startBlock = Math.max(0, latestBlock - 1000);
    console.log(`🔍 Searching blocks ${startBlock} to ${latestBlock}...`);
    
    for (let i = latestBlock; i >= startBlock; i--) {
        try {
            const block = await ethers.provider.getBlock(i, true);
            
            for (const tx of block.transactions) {
                if (tx.to === null) { // Contract creation
                    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
                    if (receipt.contractAddress?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
                        console.log(`\n🎯 FOUND CONTRACT CREATION TRANSACTION!`);
                        console.log(`📋 Transaction Hash: ${tx.hash}`);
                        console.log(`📋 Block Number: ${i}`);
                        console.log(`📋 From: ${tx.from}`);
                        console.log(`📋 Gas Used: ${receipt.gasUsed.toString()}`);
                        console.log(`📋 Input Data Length: ${tx.data.length} characters`);
                        
                        // Try to decode constructor arguments
                        console.log(`\n🔧 Analyzing constructor arguments...`);
                        
                        // Get the contract creation bytecode
                        const artifact = require("../artifacts/contracts/core/external/chainlink/ChainlinkVRFIntegratorV2_5.sol/ChainlinkVRFIntegratorV2_5.json");
                        const creationBytecode = artifact.bytecode.object;
                        
                        if (tx.data.startsWith(creationBytecode)) {
                            const constructorArgs = tx.data.substring(creationBytecode.length);
                            console.log(`📋 Constructor Arguments (hex): ${constructorArgs}`);
                            
                            // Try to decode
                            try {
                                const abiCoder = new ethers.utils.AbiCoder();
                                const decoded = abiCoder.decode(['address', 'address'], '0x' + constructorArgs);
                                console.log(`📋 Decoded Arguments:`);
                                console.log(`   Endpoint: ${decoded[0]}`);
                                console.log(`   Owner: ${decoded[1]}`);
                            } catch (decodeError) {
                                console.log(`❌ Failed to decode constructor args: ${decodeError.message}`);
                            }
                        } else {
                            console.log(`⚠️  Transaction data doesn't start with expected bytecode`);
                            console.log(`Expected start: ${creationBytecode.substring(0, 20)}...`);
                            console.log(`Actual start: ${tx.data.substring(0, 20)}...`);
                        }
                        
                        return;
                    }
                }
            }
        } catch (blockError) {
            // Skip blocks that can't be fetched
            continue;
        }
    }
    
    console.log(`❌ Contract creation transaction not found in recent blocks`);
    console.log(`💡 The contract might be older than 1000 blocks`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 