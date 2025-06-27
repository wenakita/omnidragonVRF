const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🔍 BYTECODE ANALYSIS FOR CONTRACT VERIFICATION");
    console.log("===============================================");
    
    const CONTRACT_ADDRESS = "0xC8A27A512AC32B3d63803821e121233f1E05Dc34";
    
    // Get deployed bytecode
    const deployedBytecode = await ethers.provider.getCode(CONTRACT_ADDRESS);
    console.log(`📦 Deployed bytecode length: ${deployedBytecode.length} characters`);
    console.log(`📦 Deployed bytecode hash: ${ethers.utils.keccak256(deployedBytecode)}`);
    
    // Get all available artifacts for ChainlinkVRFIntegratorV2_5
    const artifactPath = "./artifacts/contracts/core/external/chainlink/ChainlinkVRFIntegratorV2_5.sol/ChainlinkVRFIntegratorV2_5.json";
    
    if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        
        // Handle different bytecode formats
        let artifactBytecode;
        if (artifact.deployedBytecode) {
            if (typeof artifact.deployedBytecode === 'string') {
                // Direct string format (already includes 0x)
                artifactBytecode = artifact.deployedBytecode;
            } else if (typeof artifact.deployedBytecode === 'object') {
                if (artifact.deployedBytecode.object) {
                    // Standard format
                    artifactBytecode = "0x" + artifact.deployedBytecode.object;
                } else {
                    // Try to convert object to string
                    artifactBytecode = "0x" + Object.values(artifact.deployedBytecode).join('');
                }
            }
        } else {
            console.log(`❌ No deployedBytecode found in artifact`);
            return;
        }
        
        console.log(`📦 Artifact bytecode length: ${artifactBytecode.length} characters`);
        console.log(`📦 Artifact bytecode hash: ${ethers.utils.keccak256(artifactBytecode)}`);
        
        const match = deployedBytecode.toLowerCase() === artifactBytecode.toLowerCase();
        console.log(`🔍 Bytecode match: ${match ? '✅ YES' : '❌ NO'}`);
        
        if (!match) {
            console.log(`\n📊 Detailed Comparison:`);
            console.log(`   Deployed starts with: ${deployedBytecode.substring(0, 100)}...`);
            console.log(`   Artifact starts with: ${artifactBytecode.substring(0, 100)}...`);
            
            // Check if it's just metadata differences (last few bytes)
            const deployedCore = deployedBytecode.substring(0, deployedBytecode.length - 200);
            const artifactCore = artifactBytecode.substring(0, artifactBytecode.length - 200);
            
            if (deployedCore === artifactCore) {
                console.log(`🔍 Core bytecode matches (only metadata differs)`);
            } else {
                console.log(`❌ Core bytecode also differs`);
                
                // Find first difference
                let firstDiff = -1;
                const minLength = Math.min(deployedBytecode.length, artifactBytecode.length);
                for (let i = 0; i < minLength; i++) {
                    if (deployedBytecode[i] !== artifactBytecode[i]) {
                        firstDiff = i;
                        break;
                    }
                }
                
                if (firstDiff !== -1) {
                    console.log(`🔍 First difference at position: ${firstDiff}`);
                    console.log(`   Deployed: ...${deployedBytecode.substring(Math.max(0, firstDiff - 20), firstDiff + 20)}...`);
                    console.log(`   Artifact: ...${artifactBytecode.substring(Math.max(0, firstDiff - 20), firstDiff + 20)}...`);
                }
            }
        } else {
            console.log(`✅ Perfect match! The contract should be verifiable with current settings.`);
        }
        
        // Provide recommendations
        console.log(`\n💡 RECOMMENDATIONS:`);
        if (match) {
            console.log(`✅ The bytecode matches! Try verification again with current compiler settings.`);
        } else {
            console.log(`❌ The contract was deployed with different compiler settings than your current project`);
            console.log(`1. To verify this contract, you need to find the exact compiler settings used during deployment`);
            console.log(`2. Check your deployment scripts or deployment history for the exact settings`);
            console.log(`3. Alternatively, if you have the original source code that was used for deployment, use that`);
            console.log(`4. The contract might have been deployed from a different version of your codebase`);
            console.log(`5. The difference at position ${firstDiff || 'unknown'} suggests different constructor args or linked libraries`);
        }
    } else {
        console.log(`❌ Artifact not found at ${artifactPath}`);
    }
    
    console.log(`\n🔗 Contract on SonicScan: https://sonicscan.org/address/${CONTRACT_ADDRESS}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 