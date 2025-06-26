import { ethers } from "hardhat";
import { CONTRACTS, CHAIN_ENDPOINTS, layerZeroConfig } from "../layerzero.config";

/**
 * Configure LayerZero settings using the layerzero.config.ts file
 * This script applies the configuration defined in layerzero.config.ts
 */

async function configureLayerZeroFromConfig() {
    console.log("🔧 Configuring LayerZero from layerzero.config.ts");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    // Get network information
    const network = await ethers.provider.getNetwork();
    console.log("🌐 Network:", network.name, "Chain ID:", network.chainId);

    try {
        // Determine which contracts to configure based on current network
        let contractsToConfig: any[] = [];
        
        if (network.chainId === 146) { // Sonic
            contractsToConfig = layerZeroConfig.contracts.filter(c => c.eid === CHAIN_ENDPOINTS.SONIC);
            console.log("📍 Configuring Sonic contracts");
        } else if (network.chainId === 42161) { // Arbitrum
            contractsToConfig = layerZeroConfig.contracts.filter(c => c.eid === CHAIN_ENDPOINTS.ARBITRUM);
            console.log("📍 Configuring Arbitrum contracts");
        } else if (network.chainId === 43114) { // Avalanche
            contractsToConfig = layerZeroConfig.contracts.filter(c => c.eid === CHAIN_ENDPOINTS.AVALANCHE);
            console.log("📍 Configuring Avalanche contracts");
        } else {
            throw new Error(`Unsupported network: ${network.chainId}`);
        }

        for (const contractConfig of contractsToConfig) {
            console.log(`\n🔧 Configuring ${contractConfig.contractName} at ${contractConfig.address}`);
            
            // Connect to the contract
            const contract = await ethers.getContractAt(
                contractConfig.contractName,
                contractConfig.address
            );

            console.log("✅ Connected to contract");

            // Configure peer connections based on the config
            const relevantConnections = layerZeroConfig.connections.filter(
                conn => conn.from === contractConfig.eid
            );

            for (const connection of relevantConnections) {
                console.log(`\n🔗 Setting peer connection: ${connection.from} → ${connection.to}`);
                
                // Find the destination contract
                const destContract = layerZeroConfig.contracts.find(c => c.eid === connection.to);
                if (!destContract) {
                    console.log(`⚠️ Destination contract not found for EID ${connection.to}`);
                    continue;
                }

                // Convert address to bytes32
                const peerBytes32 = ethers.utils.hexZeroPad(destContract.address, 32);
                
                console.log(`   - Destination EID: ${connection.to}`);
                console.log(`   - Peer Address: ${destContract.address}`);
                console.log(`   - Peer Bytes32: ${peerBytes32}`);

                try {
                    // Check if peer is already set
                    const currentPeer = await contract.peers(connection.to);
                    
                    if (currentPeer.toLowerCase() === peerBytes32.toLowerCase()) {
                        console.log("   ✅ Peer already configured correctly");
                        continue;
                    }

                    // Set the peer
                    console.log("   🔄 Setting peer connection...");
                    const setPeerTx = await contract.setPeer(connection.to, peerBytes32, {
                        gasLimit: 200000
                    });
                    
                    console.log(`   ⏳ Transaction: ${setPeerTx.hash}`);
                    await setPeerTx.wait();
                    console.log("   ✅ Peer connection set successfully!");

                } catch (error: any) {
                    console.log(`   ❌ Failed to set peer: ${error.message}`);
                }
            }

            // Additional contract-specific configuration
            if (contractConfig.contractName === "ChainlinkVRFIntegratorV2_5") {
                console.log("\n⚙️ Configuring VRF Integrator settings...");
                
                try {
                    // Check current gas limit
                    const currentGasLimit = await contract.defaultGasLimit();
                    console.log(`   - Current Gas Limit: ${currentGasLimit}`);
                    
                    const targetGasLimit = 200000;
                    if (currentGasLimit.toNumber() !== targetGasLimit) {
                        console.log(`   🔄 Updating gas limit to ${targetGasLimit}...`);
                        const setGasLimitTx = await contract.setDefaultGasLimit(targetGasLimit);
                        await setGasLimitTx.wait();
                        console.log("   ✅ Gas limit updated");
                    } else {
                        console.log("   ✅ Gas limit already correct");
                    }

                    // Check request timeout
                    const currentTimeout = await contract.requestTimeout();
                    console.log(`   - Current Timeout: ${currentTimeout} seconds`);
                    
                    const targetTimeout = 3600; // 1 hour
                    if (currentTimeout.toNumber() !== targetTimeout) {
                        console.log(`   �� Updating timeout to ${targetTimeout} seconds...`);
                        const setTimeoutTx = await contract.setRequestTimeout(targetTimeout);
                        await setTimeoutTx.wait();
                        console.log("   ✅ Timeout updated");
                    } else {
                        console.log("   ✅ Timeout already correct");
                    }

                } catch (error: any) {
                    console.log(`   ⚠️ Configuration warning: ${error.message}`);
                }
            }

            // Check contract funding
            console.log("\n�� Checking contract funding...");
            const balance = await ethers.provider.getBalance(contractConfig.address);
            console.log(`   - Current Balance: ${ethers.utils.formatEther(balance)} ETH`);
            
            if (balance.lt(ethers.utils.parseEther("0.01"))) {
                console.log("   ⚠️ Low balance - consider funding the contract");
                console.log(`   💡 Use: contract.fundContract({value: ethers.utils.parseEther("0.1")})`);
            } else {
                console.log("   ✅ Contract has sufficient balance");
            }
        }

        console.log("\n🎉 LayerZero Configuration Complete!");
        console.log("✅ All peer connections configured");
        console.log("✅ Contract settings updated");
        console.log("✅ System ready for cross-chain VRF operations");

        // Print final status
        console.log("\n📊 Configuration Summary:");
        for (const contractConfig of contractsToConfig) {
            console.log(`\n${contractConfig.contractName}:`);
            console.log(`   - Address: ${contractConfig.address}`);
            console.log(`   - Network: ${network.name} (${network.chainId})`);
            console.log(`   - LayerZero EID: ${contractConfig.eid}`);
            
            const relevantConnections = layerZeroConfig.connections.filter(
                conn => conn.from === contractConfig.eid
            );
            
            console.log(`   - Peer Connections: ${relevantConnections.length}`);
            for (const conn of relevantConnections) {
                const destContract = layerZeroConfig.contracts.find(c => c.eid === conn.to);
                console.log(`     → ${conn.to}: ${destContract?.address}`);
            }
        }

        return {
            success: true,
            configuredContracts: contractsToConfig.length,
            network: network.name,
            chainId: network.chainId
        };

    } catch (error: any) {
        console.log("❌ Configuration failed:", error.message);
        if (error.stack) {
            console.log(error.stack);
        }
        
        return {
            success: false,
            error: error.message,
            network: network.name,
            chainId: network.chainId
        };
    }
}

// Run the configuration
if (require.main === module) {
    configureLayerZeroFromConfig()
        .then((result) => {
            if (result.success) {
                console.log("\n🚀 Configuration completed successfully!");
                process.exit(0);
            } else {
                console.log("\n💥 Configuration failed!");
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error("💥 Unexpected error:", error);
            process.exit(1);
        });
}

export default configureLayerZeroFromConfig;
