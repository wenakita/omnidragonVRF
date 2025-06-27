const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 COMPREHENSIVE ADDRESS VERIFICATION");
    console.log("=" .repeat(60));

    // Expected addresses based on our conversation
    const EXPECTED_ADDRESSES = {
        SONIC_VRF: "0x3bAc0b3C348425992224c8FafEeFc3aF6205755e",
        ARBITRUM_VRF: "0x6E11334470dF61D62383892Bd8e57a3a655718C8",
        ARBITRUM_EID: 30110,
        SONIC_EID: 30332
    };

    console.log("📋 EXPECTED ADDRESSES:");
    console.log(`   Sonic VRF Integrator: ${EXPECTED_ADDRESSES.SONIC_VRF}`);
    console.log(`   Arbitrum VRF Consumer: ${EXPECTED_ADDRESSES.ARBITRUM_VRF}`);
    console.log(`   Arbitrum EID: ${EXPECTED_ADDRESSES.ARBITRUM_EID}`);
    console.log(`   Sonic EID: ${EXPECTED_ADDRESSES.SONIC_EID}`);

    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`\n🔑 Using signer: ${signer.address}`);

    // 1. VERIFY SONIC CONTRACT
    console.log("\n" + "=".repeat(60));
    console.log("1️⃣ SONIC VRF INTEGRATOR VERIFICATION");
    console.log("=".repeat(60));

    try {
        const VRFContract = await ethers.getContractFactory("ChainlinkVRFIntegratorV2_5");
        const sonicContract = VRFContract.attach(EXPECTED_ADDRESSES.SONIC_VRF);

        // Check if contract exists
        const code = await ethers.provider.getCode(EXPECTED_ADDRESSES.SONIC_VRF);
        if (code === "0x") {
            console.log("❌ No contract found at Sonic address!");
            return;
        }

        console.log("✅ Contract exists at Sonic address");

        // Get contract info
        const owner = await sonicContract.owner();
        const requestCounter = await sonicContract.requestCounter();
        const defaultGasLimit = await sonicContract.defaultGasLimit();
        const balance = await ethers.provider.getBalance(EXPECTED_ADDRESSES.SONIC_VRF);
        const endpoint = await sonicContract.endpoint();

        console.log(`   Owner: ${owner}`);
        console.log(`   Request Counter: ${requestCounter}`);
        console.log(`   Default Gas Limit: ${defaultGasLimit}`);
        console.log(`   Balance: ${ethers.utils.formatEther(balance)} S`);
        console.log(`   LayerZero Endpoint: ${endpoint}`);

        // Check peer configuration
        const currentPeer = await sonicContract.peers(EXPECTED_ADDRESSES.ARBITRUM_EID);
        const expectedPeerBytes32 = ethers.utils.hexZeroPad(EXPECTED_ADDRESSES.ARBITRUM_VRF, 32);
        
        console.log(`   Current Peer (raw): ${currentPeer}`);
        console.log(`   Expected Peer: ${expectedPeerBytes32}`);
        
        const peerCorrect = currentPeer.toLowerCase() === expectedPeerBytes32.toLowerCase();
        console.log(`   Peer Configuration: ${peerCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);

        if (!peerCorrect) {
            console.log(`   ⚠️  PEER MISMATCH DETECTED!`);
            console.log(`      Current: ${currentPeer}`);
            console.log(`      Expected: ${expectedPeerBytes32}`);
        }

    } catch (error) {
        console.log(`❌ Error checking Sonic contract: ${error.message}`);
    }

    // 2. VERIFY LAYERZERO CONFIG FILE
    console.log("\n" + "=".repeat(60));
    console.log("2️⃣ LAYERZERO CONFIG FILE VERIFICATION");
    console.log("=".repeat(60));

    try {
        const fs = require('fs');
        const configContent = fs.readFileSync('layerzero.config.ts', 'utf8');
        
        // Extract addresses from config
        const sonicAddressMatch = configContent.match(/address: '(0x[a-fA-F0-9]{40})'/g);
        if (sonicAddressMatch && sonicAddressMatch.length >= 2) {
            const sonicConfigAddress = sonicAddressMatch[0].match(/'(0x[a-fA-F0-9]{40})'/)[1];
            const arbitrumConfigAddress = sonicAddressMatch[1].match(/'(0x[a-fA-F0-9]{40})'/)[1];
            
            console.log(`   Sonic in config: ${sonicConfigAddress}`);
            console.log(`   Arbitrum in config: ${arbitrumConfigAddress}`);
            
            const sonicMatch = sonicConfigAddress.toLowerCase() === EXPECTED_ADDRESSES.SONIC_VRF.toLowerCase();
            const arbitrumMatch = arbitrumConfigAddress.toLowerCase() === EXPECTED_ADDRESSES.ARBITRUM_VRF.toLowerCase();
            
            console.log(`   Sonic address correct: ${sonicMatch ? '✅' : '❌'}`);
            console.log(`   Arbitrum address correct: ${arbitrumMatch ? '✅' : '❌'}`);
            
            if (!sonicMatch) {
                console.log(`   ⚠️  SONIC ADDRESS MISMATCH!`);
                console.log(`      Config: ${sonicConfigAddress}`);
                console.log(`      Expected: ${EXPECTED_ADDRESSES.SONIC_VRF}`);
            }
            
            if (!arbitrumMatch) {
                console.log(`   ⚠️  ARBITRUM ADDRESS MISMATCH!`);
                console.log(`      Config: ${arbitrumConfigAddress}`);
                console.log(`      Expected: ${EXPECTED_ADDRESSES.ARBITRUM_VRF}`);
            }
        }
    } catch (error) {
        console.log(`❌ Error reading config file: ${error.message}`);
    }

    // 3. VERIFY SCRIPT ADDRESSES
    console.log("\n" + "=".repeat(60));
    console.log("3️⃣ SCRIPT ADDRESS VERIFICATION");
    console.log("=".repeat(60));

    const scriptsToCheck = [
        'scripts/debug-vrf-request.js',
        'scripts/request-random-word.js',
        'scripts/update-sonic-peer.js'
    ];

    for (const scriptPath of scriptsToCheck) {
        try {
            const fs = require('fs');
            if (fs.existsSync(scriptPath)) {
                const scriptContent = fs.readFileSync(scriptPath, 'utf8');
                
                // Look for address patterns
                const addressMatches = scriptContent.match(/0x[a-fA-F0-9]{40}/g) || [];
                const uniqueAddresses = [...new Set(addressMatches)];
                
                console.log(`\n📄 ${scriptPath}:`);
                uniqueAddresses.forEach(addr => {
                    if (addr.toLowerCase() === EXPECTED_ADDRESSES.SONIC_VRF.toLowerCase()) {
                        console.log(`   ✅ ${addr} (Sonic VRF - CORRECT)`);
                    } else if (addr.toLowerCase() === EXPECTED_ADDRESSES.ARBITRUM_VRF.toLowerCase()) {
                        console.log(`   ✅ ${addr} (Arbitrum VRF - CORRECT)`);
                    } else if (addr === "0x1aFF9b2bCDe8a9c29d598c40558a23b61be78551") {
                        console.log(`   ❌ ${addr} (OLD Arbitrum VRF - INCORRECT)`);
                    } else if (addr === "0x1cD88Fd477a951954de27dC77Db0E41814B222a7") {
                        console.log(`   ❌ ${addr} (OLD Sonic VRF - INCORRECT)`);
                    } else {
                        console.log(`   ⚠️  ${addr} (Unknown address)`);
                    }
                });
            }
        } catch (error) {
            console.log(`   ❌ Error checking ${scriptPath}: ${error.message}`);
        }
    }

    // 4. SUMMARY
    console.log("\n" + "=".repeat(60));
    console.log("4️⃣ VERIFICATION SUMMARY");
    console.log("=".repeat(60));
    
    console.log("📋 REFERENCE ADDRESSES:");
    console.log(`   ✅ Sonic VRF (CURRENT): ${EXPECTED_ADDRESSES.SONIC_VRF}`);
    console.log(`   ✅ Arbitrum VRF (CURRENT): ${EXPECTED_ADDRESSES.ARBITRUM_VRF}`);
    console.log(`   ❌ Old Arbitrum VRF: 0x1aFF9b2bCDe8a9c29d598c40558a23b61be78551`);
    console.log(`   ❌ Old Sonic VRF: 0x1cD88Fd477a951954de27dC77Db0E41814B222a7`);
    
    console.log("\n🎯 ACTION ITEMS:");
    console.log("   1. Ensure all scripts use the CURRENT addresses");
    console.log("   2. Ensure LayerZero config uses the CURRENT addresses");
    console.log("   3. Ensure Sonic contract peer points to CURRENT Arbitrum address");
    console.log("   4. Complete LayerZero DVN/Executor configuration");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 