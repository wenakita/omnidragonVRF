import { ethers } from 'hardhat';
import 'dotenv/config';

async function main() {
    console.log('🏔️  DEPLOYING CHAINLINK VRF INTEGRATOR V2.5 TO AVALANCHE');
    console.log('════════════════════════════════════════════════════════');
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    const balance = await deployer.getBalance();
    
    console.log('📊 DEPLOYMENT INFO:');
    console.log(`   Deployer: ${deployerAddress}`);
    console.log(`   Balance: ${ethers.utils.formatEther(balance)} AVAX`);
    console.log('');
    
    // Avalanche LayerZero V2 Configuration
    const lzEndpoint = process.env.AVALANCHE_LZ_ENDPOINT || '0x1a44076050125825900e736c501f859c50fE728c';
    
    console.log('🔗 CONFIGURATION:');
    console.log(`   LayerZero Endpoint: ${lzEndpoint}`);
    console.log(`   Initial Owner: ${deployerAddress}`);
    console.log('');
    
    // Get the contract factory
    console.log('📦 GETTING CONTRACT FACTORY...');
    const ChainlinkVRFIntegratorV2_5 = await ethers.getContractFactory('ChainlinkVRFIntegratorV2_5');
    console.log('   ✅ Contract factory loaded');
    
    // Deploy the contract
    console.log('🚀 DEPLOYING CONTRACT...');
    const vrfIntegrator = await ChainlinkVRFIntegratorV2_5.deploy(
        lzEndpoint,      // LayerZero V2 endpoint for Avalanche
        deployerAddress  // initial owner
    );
    
    console.log('⏳ WAITING FOR DEPLOYMENT...');
    await vrfIntegrator.deployed();
    
    console.log('');
    console.log('✅ DEPLOYMENT SUCCESSFUL!');
    console.log('════════════════════════════════════════════════════════');
    console.log(`📍 Contract Address: ${vrfIntegrator.address}`);
    console.log(`🌐 Explorer: https://snowtrace.io/address/${vrfIntegrator.address}`);
    console.log('');
    
    // Get deployment transaction details
    const deployTx = vrfIntegrator.deployTransaction;
    console.log('📋 TRANSACTION DETAILS:');
    console.log(`   Transaction Hash: ${deployTx.hash}`);
    console.log(`   Gas Used: ${deployTx.gasLimit?.toString()}`);
    console.log(`   Gas Price: ${ethers.utils.formatUnits(deployTx.gasPrice || 0, 'gwei')} gwei`);
    console.log('');
    
    console.log('🔧 NEXT STEPS:');
    console.log('1. Set peer connections to other chains');
    console.log('2. Configure LayerZero DVN and Executor');
    console.log('3. Fund contract with AVAX for LayerZero fees');
    console.log('4. Test VRF requests');
    console.log('');
    
    console.log('🔗 PEER CONNECTION COMMANDS:');
    console.log('   # Connect to Arbitrum VRF Consumer');
    console.log(`   # setPeer(30110, "0xfc1f46fd517ed4193D605c59a4B27b5375457cE1")`);
    console.log('');
    
    return {
        address: vrfIntegrator.address,
        txHash: deployTx.hash
    };
}

main()
    .then((result) => {
        console.log('🎉 AVALANCHE VRF INTEGRATOR DEPLOYMENT COMPLETE!');
        console.log(`📍 Address: ${result.address}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ DEPLOYMENT FAILED:', error);
        process.exit(1);
    }); 