const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("📝 MANUAL SONICSCAN VERIFICATION GUIDE");
    console.log("======================================");
    
    const CONTRACT_ADDRESS = "0xC8A27A512AC32B3d63803821e121233f1E05Dc34";
    
    console.log(`📍 Contract: ${CONTRACT_ADDRESS}`);
    console.log(`🔗 SonicScan: https://sonicscan.org/address/${CONTRACT_ADDRESS}#code`);
    
    // Generate ABI-encoded constructor arguments
    const abiCoder = new ethers.utils.AbiCoder();
    const encodedArgs = abiCoder.encode(
        ['address', 'address'],
        [
            '0x6EDCE65403992e310A62460808c4b910D972f10f', // LayerZero endpoint
            '0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F'  // Owner address
        ]
    );
    
    console.log(`\n🔧 VERIFICATION PARAMETERS:`);
    console.log(`   Contract Name: ChainlinkVRFIntegratorV2_5`);
    console.log(`   Compiler Version: v0.8.22+commit.4fc1097e`);
    console.log(`   Optimization: Yes`);
    console.log(`   Optimization Runs: 200`);
    console.log(`   EVM Version: default (paris)`);
    
    console.log(`\n📋 CONSTRUCTOR ARGUMENTS (ABI-encoded):`);
    console.log(`${encodedArgs}`);
    
    console.log(`\n📝 STEP-BY-STEP VERIFICATION:`);
    console.log(`1. Go to: https://sonicscan.org/address/${CONTRACT_ADDRESS}#code`);
    console.log(`2. Click "Verify and Publish" button`);
    console.log(`3. Select verification method: "Solidity (Single file)"`);
    console.log(`4. Fill in the form:`);
    console.log(`   - Contract Address: ${CONTRACT_ADDRESS}`);
    console.log(`   - Contract Name: ChainlinkVRFIntegratorV2_5`);
    console.log(`   - Compiler Type: Solidity (Single file)`);
    console.log(`   - Compiler Version: v0.8.22+commit.4fc1097e`);
    console.log(`   - Open Source License Type: MIT`);
    console.log(`5. Optimization: Enable`);
    console.log(`   - Optimization Runs: 200`);
    console.log(`6. Paste the flattened source code (see flattened-vrf.sol)`);
    console.log(`7. Constructor Arguments (ABI-encoded): ${encodedArgs}`);
    console.log(`8. Click "Verify and Publish"`);
    
    // Check if flattened file exists
    if (fs.existsSync('./flattened-vrf.sol')) {
        console.log(`\n✅ FLATTENED CONTRACT READY:`);
        console.log(`   📁 File: ./flattened-vrf.sol`);
        console.log(`   📋 Copy the contents of this file for step 6 above`);
        
        // Get file size
        const stats = fs.statSync('./flattened-vrf.sol');
        console.log(`   📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
    } else {
        console.log(`\n❌ FLATTENED CONTRACT NOT FOUND`);
        console.log(`   Run: npx hardhat flatten contracts/core/external/chainlink/ChainlinkVRFIntegratorV2_5.sol > flattened-vrf.sol`);
    }
    
    console.log(`\n🔍 CONSTRUCTOR ARGUMENT BREAKDOWN:`);
    console.log(`   Parameter 1 (address _endpoint):`);
    console.log(`     Value: 0x6EDCE65403992e310A62460808c4b910D972f10f`);
    console.log(`     Description: LayerZero Sonic Endpoint`);
    console.log(`   Parameter 2 (address _initialOwner):`);
    console.log(`     Value: 0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F`);
    console.log(`     Description: Contract Owner (your address)`);
    
    console.log(`\n⚠️  IMPORTANT NOTES:`);
    console.log(`   - Make sure to use the EXACT compiler version: v0.8.22+commit.4fc1097e`);
    console.log(`   - Enable optimization with 200 runs`);
    console.log(`   - Use the complete ABI-encoded constructor arguments`);
    console.log(`   - The flattened contract should be used as-is`);
    
    console.log(`\n🎯 VERIFICATION SUCCESS:`);
    console.log(`   After successful verification, you'll see:`);
    console.log(`   ✅ "Contract Source Code Verified" checkmark`);
    console.log(`   📋 Full contract source code visible`);
    console.log(`   🔍 Read/Write contract interface available`);
    
    console.log(`\n🚀 Ready for manual verification!`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 