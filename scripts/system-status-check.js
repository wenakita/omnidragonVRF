const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 VRF System Comprehensive Status Check...\n");

    // Contract addresses
    const SONIC_CONTRACT = '0x5949156D5dD762aB15c1FEd4dE90B8a8CAF60746';
    const ARBITRUM_CONTRACT = '0x77913403bC1841F87d884101b25B6230CB4fbe28';
    const ARBITRUM_EID = 30110;
    const SONIC_EID = 30332;
    
    const [signer] = await ethers.getSigners();
    console.log(`📝 Signer: ${signer.address}`);

    if (hre.network.name === 'sonic') {
        console.log("🔥 SONIC NETWORK STATUS\n");
        
        try {
            const contract = await ethers.getContractAt(
                "ChainlinkVRFIntegratorV2_5", 
                SONIC_CONTRACT, 
                signer
            );

            // Basic info
            const userBalance = await signer.getBalance();
            const contractBalance = await ethers.provider.getBalance(SONIC_CONTRACT);
            console.log(`💰 User Balance: ${ethers.utils.formatEther(userBalance)} S`);
            console.log(`💰 Contract Balance: ${ethers.utils.formatEther(contractBalance)} S`);

            // Check owner
            const owner = await contract.owner();
            console.log(`👤 Contract Owner: ${owner}`);
            console.log(`👤 Is Signer Owner: ${owner.toLowerCase() === signer.address.toLowerCase()}`);

            // Check peer configuration
            const peer = await contract.peers(ARBITRUM_EID);
            console.log(`🔗 Arbitrum Peer: ${peer}`);
            
            const expectedPeer = ethers.utils.hexZeroPad(ARBITRUM_CONTRACT.toLowerCase(), 32);
            console.log(`🔗 Expected Peer: ${expectedPeer}`);
            console.log(`✅ Peer Correct: ${peer.toLowerCase() === expectedPeer.toLowerCase()}`);

            // Check request counter
            const requestCounter = await contract.requestCounter();
            console.log(`📊 Request Counter: ${requestCounter}`);

            // Check default gas limit
            const defaultGasLimit = await contract.defaultGasLimit();
            console.log(`⛽ Default Gas Limit: ${defaultGasLimit}`);

            // Check request timeout
            const requestTimeout = await contract.requestTimeout();
            console.log(`⏰ Request Timeout: ${requestTimeout} seconds`);

            // Check endpoint
            const endpoint = await contract.endpoint();
            console.log(`🌐 LayerZero Endpoint: ${endpoint}`);

            // Try to check enforced options
            try {
                const enforcedOptions = await contract.enforcedOptions(ARBITRUM_EID, 1);
                console.log(`⚙️ Enforced Options: ${enforcedOptions}`);
            } catch (e) {
                console.log(`⚙️ Enforced Options: Error - ${e.message}`);
            }

        } catch (error) {
            console.error("❌ Sonic Error:", error.message);
        }
    }

    if (hre.network.name === 'arbitrum') {
        console.log("🔷 ARBITRUM NETWORK STATUS\n");
        
        try {
            const contract = await ethers.getContractAt(
                "OmniDragonVRFConsumerV2_5", 
                ARBITRUM_CONTRACT, 
                signer
            );

            // Basic info
            const userBalance = await signer.getBalance();
            const contractBalance = await ethers.provider.getBalance(ARBITRUM_CONTRACT);
            console.log(`💰 User Balance: ${ethers.utils.formatEther(userBalance)} ETH`);
            console.log(`💰 Contract Balance: ${ethers.utils.formatEther(contractBalance)} ETH`);

            // Check owner
            const owner = await contract.owner();
            console.log(`👤 Contract Owner: ${owner}`);
            console.log(`👤 Is Signer Owner: ${owner.toLowerCase() === signer.address.toLowerCase()}`);

            // VRF Configuration
            const subId = await contract.subscriptionId();
            const keyHash = await contract.keyHash();
            const gasLimit = await contract.callbackGasLimit();
            const confirmations = await contract.requestConfirmations();
            const nativePayment = await contract.nativePayment();
            
            console.log(`🎲 VRF Subscription ID: ${subId.toString()}`);
            console.log(`🔑 Key Hash: ${keyHash}`);
            console.log(`⛽ Callback Gas Limit: ${gasLimit}`);
            console.log(`✅ Request Confirmations: ${confirmations}`);
            console.log(`💳 Native Payment: ${nativePayment}`);

            // Check VRF coordinator
            const vrfCoordinator = await contract.vrfCoordinator();
            console.log(`🎯 VRF Coordinator: ${vrfCoordinator}`);

            // Check peer configuration
            const sonicPeer = await contract.peers(SONIC_EID);
            const expectedSonicPeer = ethers.utils.hexZeroPad(SONIC_CONTRACT.toLowerCase(), 32);
            console.log(`🔗 Sonic Peer: ${sonicPeer}`);
            console.log(`🔗 Expected Peer: ${expectedSonicPeer}`);
            console.log(`✅ Peer Correct: ${sonicPeer.toLowerCase() === expectedSonicPeer.toLowerCase()}`);

            // Check chain support
            const isSonicSupported = await contract.supportedChains(SONIC_EID);
            console.log(`🌐 Sonic Supported: ${isSonicSupported}`);

            // Check gas limits
            const sonicGasLimit = await contract.chainGasLimits(SONIC_EID);
            console.log(`⛽ Sonic Gas Limit: ${sonicGasLimit}`);

            // Check minimum balance
            const minBalance = await contract.minimumBalance();
            console.log(`💰 Minimum Balance: ${ethers.utils.formatEther(minBalance)} ETH`);

            // Check endpoint
            const endpoint = await contract.endpoint();
            console.log(`🌐 LayerZero Endpoint: ${endpoint}`);

            // Check recent requests
            console.log("\n📋 Recent VRF Requests:");
            let foundRequests = false;
            for (let i = 1; i <= 10; i++) {
                try {
                    const requestInfo = await contract.getRequestBySequence(i);
                    if (requestInfo.exists) {
                        foundRequests = true;
                        console.log(`   Sequence ${i}:`);
                        console.log(`      Request ID: ${requestInfo.requestId}`);
                        console.log(`      Fulfilled: ${requestInfo.fulfilled}`);
                        console.log(`      Response Sent: ${requestInfo.responseSent}`);
                        console.log(`      Source Chain: ${requestInfo.sourceChainEid}`);
                        if (requestInfo.fulfilled) {
                            console.log(`      Random Word: ${requestInfo.randomWord}`);
                        }
                        console.log(`      Timestamp: ${new Date(requestInfo.timestamp * 1000).toISOString()}`);
                    }
                } catch (e) {
                    // Skip if sequence doesn't exist
                }
            }
            if (!foundRequests) {
                console.log("   No requests found");
            }

        } catch (error) {
            console.error("❌ Arbitrum Error:", error.message);
        }
    }

    console.log("\n📋 SYSTEM DIAGNOSIS:");
    console.log("===================");
    console.log("1. Check if both contracts are owned by the same address");
    console.log("2. Verify LayerZero peers are correctly configured");
    console.log("3. Ensure Arbitrum contract has correct VRF subscription ID");
    console.log("4. Confirm both contracts have sufficient balances");
    console.log("5. Check if LayerZero enforced options are set correctly");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 