const { ethers } = require('hardhat');

async function main() {
    console.log('Generating new vanity address for omniDRAGON...');
    
    // CREATE2 Factory address
    const CREATE2_FACTORY_ADDRESS = "0xAA28020DDA6b954D16208eccF873D79AC6533833";
    
    // Get accounts
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    
    // Get the contract factory
    const DragonFactory = await ethers.getContractFactory("omniDRAGON");
    const bytecode = DragonFactory.bytecode;
    
    // Constructor arguments
    const registryAddress = "0x69B029B7EF2468c2B546556022be2DD66cd20777";
    const constructorArgs = ethers.utils.defaultAbiCoder.encode(
        ["string", "string", "address", "address", "address"],
        ["Dragon", "DRAGON", registryAddress, registryAddress, deployer.address]
    );
    const deploymentBytecode = bytecode + constructorArgs.slice(2);
    const bytecodeHash = ethers.utils.keccak256(deploymentBytecode);
    
    console.log(`Bytecode hash: ${bytecodeHash}`);
    console.log(`Searching for vanity address starting with 69...`);
    
    let attempts = 0;
    const maxAttempts = 50000;
    const candidates = [];
    
    while (attempts < maxAttempts) {
        // Generate a random salt
        const salt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`omniDRAGON-vanity-${Date.now()}-${Math.random()}`));
        
        // Calculate deployment address
        const computedAddress = ethers.utils.getCreate2Address(
            CREATE2_FACTORY_ADDRESS,
            salt,
            bytecodeHash
        );
        
        attempts++;
        
        // Check if address matches vanity pattern
        if (computedAddress.toLowerCase().startsWith('0x69')) {
            candidates.push({
                address: computedAddress,
                salt: salt,
                score: getVanityScore(computedAddress)
            });
            
            console.log(`Found: ${computedAddress} (score: ${getVanityScore(computedAddress)})`);
            
            // If we find one ending with 0777, use it immediately
            if (computedAddress.toLowerCase().endsWith('0777')) {
                console.log(`\n✅ Found perfect vanity address after ${attempts} attempts!`);
                console.log(`Address: ${computedAddress}`);
                console.log(`Salt: ${salt}`);
                console.log(`Bytecode hash: ${bytecodeHash}`);
                
                return createConfig(computedAddress, salt, bytecodeHash, registryAddress, CREATE2_FACTORY_ADDRESS);
            }
        }
        
        if (attempts % 10000 === 0) {
            console.log(`Searched ${attempts} addresses...`);
        }
    }
    
    if (candidates.length > 0) {
        // Sort by score (higher is better)
        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];
        
        console.log(`\n✅ Found ${candidates.length} vanity addresses starting with 69!`);
        console.log(`Best candidate: ${best.address} (score: ${best.score})`);
        console.log(`Salt: ${best.salt}`);
        console.log(`Bytecode hash: ${bytecodeHash}`);
        
        return createConfig(best.address, best.salt, bytecodeHash, registryAddress, CREATE2_FACTORY_ADDRESS);
    }
    
    console.log(`\n❌ No vanity address found after ${maxAttempts} attempts`);
}

function getVanityScore(address) {
    let score = 0;
    const addr = address.toLowerCase();
    
    // Points for starting with 69
    if (addr.startsWith('0x69')) score += 100;
    
    // Bonus points for ending with 0777
    if (addr.endsWith('0777')) score += 1000;
    
    // Points for other nice patterns
    if (addr.endsWith('777')) score += 50;
    if (addr.endsWith('000')) score += 30;
    if (addr.includes('69')) score += 10;
    
    return score;
}

function createConfig(address, salt, bytecodeHash, registryAddress, factoryAddress) {
    const config = {
        network: "multi-chain",
        timestamp: new Date().toISOString(),
        factory: factoryAddress,
        registry: {
            address: registryAddress,
            salt: "0x98f23b350844835bd924bf63a1fa9768049d00680dd110f5fd72b0979f708e4f",
            bytecodeHash: "0xeab74db63fef5936d78d0bdacd0f2b4176081ad8233b6d79887f87c3260e9cf5",
            contract_name: "OmniDragonHybridRegistry"
        },
        omnidragon: {
            address: address,
            salt: salt,
            bytecodeHash: bytecodeHash,
            contract_name: "omniDRAGON"
        }
    };
    
    console.log(`\nUpdated configuration:`);
    console.log(JSON.stringify(config, null, 2));
    
    return config;
}

main().catch(console.error); 