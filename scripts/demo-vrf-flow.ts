#!/usr/bin/env npx hardhat run --network sonic

/**
 * 🎥 LIVE STREAMING SAFE VRF FLOW DEMONSTRATION
 * 
 * This script demonstrates the OmniDragon VRF cross-chain flow:
 * Sonic → LayerZero → Arbitrum → Chainlink VRF → LayerZero → Sonic
 * 
 * 🔐 ALL SENSITIVE DATA IS REDACTED FOR LIVE STREAMING SAFETY
 */

import { ethers } from 'hardhat';
import 'dotenv/config';

// 🔐 LIVE STREAMING SAFE ADDRESSES (PUBLIC CONTRACT ADDRESSES)
const DEPLOYED_ADDRESSES = {
    SONIC: {
        VRF_INTEGRATOR: '0xD4023F563c2ea3Bd477786D99a14b5edA1252A84',
        NETWORK_NAME: 'Sonic Mainnet',
        CHAIN_ID: 146,
        EXPLORER: 'https://sonicscan.org'
    },
    ARBITRUM: {
        VRF_CONSUMER: '0xfc1f46fd517ed4193D605c59a4B27b5375457cE1',
        NETWORK_NAME: 'Arbitrum One',
        CHAIN_ID: 42161,
        EXPLORER: 'https://arbiscan.io'
    }
};

// LayerZero Endpoint IDs (public information)
const LAYERZERO_EIDS = {
    SONIC: 30332,
    ARBITRUM: 30110
};

async function main() {
    console.log('\n🎥 ═══════════════════════════════════════════════════════════');
    console.log('🎥 OMNIDRAGON VRF CROSS-CHAIN DEMONSTRATION');
    console.log('🎥 ═══════════════════════════════════════════════════════════');
    console.log('🔐 LIVE STREAMING SAFE - NO PRIVATE KEYS DISPLAYED');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Step 1: Show the architecture
    console.log('🏗️  ARCHITECTURE OVERVIEW:');
    console.log('   ┌─────────────┐    LayerZero    ┌─────────────────┐');
    console.log('   │    SONIC    │ ──────────────► │    ARBITRUM     │');
    console.log('   │ VRF Request │                 │ Chainlink VRF   │');
    console.log('   │             │ ◄────────────── │   Consumer      │');
    console.log('   └─────────────┘    Response     └─────────────────┘');
    console.log('');

    // Step 2: Display contract addresses (public info)
    console.log('📍 DEPLOYED CONTRACTS:');
    console.log(`   Sonic VRF Integrator:  ${DEPLOYED_ADDRESSES.SONIC.VRF_INTEGRATOR}`);
    console.log(`   Arbitrum VRF Consumer: ${DEPLOYED_ADDRESSES.ARBITRUM.VRF_CONSUMER}`);
    console.log('');

    // Step 3: Connect to contracts
    console.log('🔗 CONNECTING TO CONTRACTS...');
    
    // Get signer (address will be masked for security)
    const [signer] = await ethers.getSigners();
    const signerAddress = await signer.getAddress();
    console.log(`   Connected as: ${signerAddress.slice(0, 6)}...${signerAddress.slice(-4)} 🔐`);
    
    // Connect to Sonic VRF Integrator
    const vrfIntegratorABI = [
        "function requestRandomWordsSimple(uint32 _dstEid) external payable returns (tuple(bytes32 guid, uint64 nonce, MessagingFee fee) receipt, uint64 requestId)",
        "function quote(uint32 _dstEid, bytes calldata _options) external view returns (tuple(uint256 nativeFee, uint256 lzTokenFee) fee)",
        "function getRandomWord(uint64 requestId) external view returns (uint256 randomWord, bool fulfilled)",
        "function checkRequestStatus(uint64 requestId) external view returns (bool fulfilled, bool exists, address provider, uint256 randomWord, uint256 timestamp, bool expired)",
        "function requestCounter() external view returns (uint64)",
        "event RandomWordsRequested(uint64 indexed requestId, address indexed provider, uint32 indexed dstEid)",
        "event RandomWordsReceived(uint256[] randomWords, uint64 indexed requestId, address indexed provider)"
    ];
    
    const vrfIntegrator = new ethers.Contract(
        DEPLOYED_ADDRESSES.SONIC.VRF_INTEGRATOR,
        vrfIntegratorABI,
        signer
    );

    console.log('   ✅ Connected to Sonic VRF Integrator');
    console.log('   ✅ Connected to wallet');
    console.log('');

    // Step 4: Check current request counter
    console.log('📊 CURRENT STATE:');
    try {
        const currentCounter = await vrfIntegrator.requestCounter();
        console.log(`   Current request counter: ${currentCounter}`);
        console.log(`   Next request ID will be: ${currentCounter.add(1)}`);
    } catch (error) {
        console.log('   ⚠️  Could not fetch request counter (contract may be busy)');
    }
    console.log('');

    // Step 5: Quote the fee for the request
    console.log('💰 CALCULATING LAYERZERO FEES...');
    try {
        const options = "0x"; // Empty options for simple request
        const quote = await vrfIntegrator.quote(LAYERZERO_EIDS.ARBITRUM, options);
        const feeInEth = ethers.utils.formatEther(quote.nativeFee);
        console.log(`   LayerZero fee: ${feeInEth} ETH`);
        console.log(`   LZ Token fee: ${quote.lzTokenFee} (should be 0)`);
    } catch (error) {
        console.log('   ⚠️  Could not quote fees (using estimated fee)');
    }
    console.log('');

    // Step 6: Show the request flow (simulation)
    console.log('🚀 VRF REQUEST FLOW DEMONSTRATION:');
    console.log('');
    console.log('   Step 1: 📤 Request sent from Sonic');
    console.log('           ├─ User calls requestRandomWordsSimple()');
    console.log('           ├─ Request ID generated');
    console.log('           └─ LayerZero message sent to Arbitrum');
    console.log('');
    console.log('   Step 2: 🔄 Arbitrum receives request');
    console.log('           ├─ VRF Consumer receives LayerZero message');
    console.log('           ├─ Forwards request to Chainlink VRF 2.5');
    console.log('           └─ Waits for Chainlink callback');
    console.log('');
    console.log('   Step 3: 🎲 Chainlink VRF generates randomness');
    console.log('           ├─ VRF Coordinator generates random number');
    console.log('           ├─ Calls rawFulfillRandomWords()');
    console.log('           └─ Consumer receives random word');
    console.log('');
    console.log('   Step 4: 📥 Response sent back to Sonic');
    console.log('           ├─ Consumer sends LayerZero message back');
    console.log('           ├─ Sonic Integrator receives response');
    console.log('           └─ Random word available for use');
    console.log('');

    // Step 7: Interactive demonstration option
    console.log('🎮 INTERACTIVE DEMONSTRATION:');
    console.log('   To make a real VRF request, you would:');
    console.log('   1. Ensure wallet has sufficient balance for LayerZero fees');
    console.log('   2. Call: vrfIntegrator.requestRandomWordsSimple(30110, {value: fee})');
    console.log('   3. Wait for cross-chain processing (~2-5 minutes)');
    console.log('   4. Check result with: vrfIntegrator.getRandomWord(requestId)');
    console.log('');

    // Step 8: Show monitoring capabilities
    console.log('🔍 MONITORING CAPABILITIES:');
    console.log('   ├─ Track requests: checkRequestStatus(requestId)');
    console.log('   ├─ View on explorers:');
    console.log(`   │  ├─ Sonic: ${DEPLOYED_ADDRESSES.SONIC.EXPLORER}/address/${DEPLOYED_ADDRESSES.SONIC.VRF_INTEGRATOR}`);
    console.log(`   │  └─ Arbitrum: ${DEPLOYED_ADDRESSES.ARBITRUM.EXPLORER}/address/${DEPLOYED_ADDRESSES.ARBITRUM.VRF_CONSUMER}`);
    console.log('   └─ Events: RandomWordsRequested, RandomWordsReceived');
    console.log('');

    // Step 9: Security features
    console.log('🛡️  SECURITY FEATURES:');
    console.log('   ├─ Peer verification (only authorized chains)');
    console.log('   ├─ Request timeout (1 hour expiration)');
    console.log('   ├─ Duplicate request prevention');
    console.log('   ├─ Owner-only administrative functions');
    console.log('   └─ Chainlink VRF 2.5 cryptographic security');
    console.log('');

    console.log('✅ VRF FLOW DEMONSTRATION COMPLETE!');
    console.log('🔐 NO SENSITIVE INFORMATION WAS DISPLAYED');
    console.log('═══════════════════════════════════════════════════════════\n');
}

// Handle errors safely for live streaming
main()
    .then(() => {
        console.log('🎥 Demo completed successfully - safe for live streaming!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Demo error (no sensitive data exposed):');
        console.error('   Error type:', error.name || 'Unknown');
        console.error('   Safe message: Contract interaction failed');
        console.log('🔐 No private keys or sensitive data were exposed');
        process.exit(1);
    }); 