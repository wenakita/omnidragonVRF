const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Comprehensive DVN Status Check for Sonic VRF Contract...");
    
    const [signer] = await ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);
    
    // Contract addresses
    const VRF_CONTRACT = "0x3bAc0b3C348425992224c8FafEeFc3aF6205755e";
    const LAYERZERO_ENDPOINT = "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B";
    const ARBITRUM_ENDPOINT_ID = 30110;
    const DVN_ADDRESS = "0x282b3386571f7f794450d5789911a9804fa346b4";
    const SEND_LIBRARY = "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7";
    
    console.log(`📡 VRF Contract: ${VRF_CONTRACT}`);
    console.log(`📡 LayerZero Endpoint: ${LAYERZERO_ENDPOINT}`);
    console.log(`📡 DVN Address: ${DVN_ADDRESS}`);
    console.log(`📡 Send Library: ${SEND_LIBRARY}`);
    
    try {
        // Get the endpoint contract
        const endpoint = await ethers.getContractAt("contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2", LAYERZERO_ENDPOINT);
        
        // 1. Check if DVN address has any code (is it a contract?)
        console.log("\n🔍 1. Checking DVN Contract Status...");
        const dvnCode = await ethers.provider.getCode(DVN_ADDRESS);
        console.log(`DVN has code: ${dvnCode !== '0x' ? 'YES' : 'NO'}`);
        console.log(`DVN code length: ${dvnCode.length}`);
        
        // 2. Check current configuration
        console.log("\n🔍 2. Current LayerZero Configuration...");
        const currentConfig = await endpoint.getConfig(
            VRF_CONTRACT,
            SEND_LIBRARY,
            ARBITRUM_ENDPOINT_ID,
            2 // ULN config type
        );
        console.log(`Current config length: ${currentConfig.length}`);
        console.log(`Current config: ${currentConfig.substring(0, 100)}...`);
        
        // Decode the current config
        try {
            const decoded = ethers.utils.defaultAbiCoder.decode(
                ["tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)"],
                currentConfig
            );
            console.log("📊 Decoded current config:");
            console.log(`  - Confirmations: ${decoded[0].confirmations}`);
            console.log(`  - Required DVN Count: ${decoded[0].requiredDVNCount}`);
            console.log(`  - Optional DVN Count: ${decoded[0].optionalDVNCount}`);
            console.log(`  - Optional DVN Threshold: ${decoded[0].optionalDVNThreshold}`);
            console.log(`  - Required DVNs: [${decoded[0].requiredDVNs.join(', ')}]`);
            console.log(`  - Optional DVNs: [${decoded[0].optionalDVNs.join(', ')}]`);
        } catch (decodeError) {
            console.log(`❌ Failed to decode current config: ${decodeError.message}`);
        }
        
        // 3. Try to call the DVN directly to see if it responds
        console.log("\n🔍 3. Testing DVN Direct Access...");
        try {
            // Try to get DVN interface - most DVNs implement a standard interface
            const dvnContract = await ethers.getContractAt("IERC165", DVN_ADDRESS);
            console.log("✅ DVN contract accessible");
            
            // Try to check if it supports DVN interface
            try {
                const supportsInterface = await dvnContract.supportsInterface("0x01ffc9a7"); // ERC165
                console.log(`DVN supports ERC165: ${supportsInterface}`);
            } catch (e) {
                console.log("DVN does not implement ERC165 or call failed");
            }
        } catch (dvnError) {
            console.log(`❌ Cannot access DVN contract: ${dvnError.message}`);
        }
        
        // 4. Check if we're the owner of the VRF contract
        console.log("\n🔍 4. Checking VRF Contract Ownership...");
        try {
            const vrfContract = await ethers.getContractAt("Ownable", VRF_CONTRACT);
            const owner = await vrfContract.owner();
            console.log(`VRF Contract owner: ${owner}`);
            console.log(`Our address: ${signer.address}`);
            console.log(`Are we owner: ${owner.toLowerCase() === signer.address.toLowerCase()}`);
        } catch (ownerError) {
            console.log(`❌ Cannot check ownership: ${ownerError.message}`);
        }
        
        // 5. Check gas estimation for the setConfig call
        console.log("\n🔍 5. Testing Gas Estimation...");
        const ulnConfig = {
            confirmations: 20,
            requiredDVNCount: 1,
            optionalDVNCount: 0,
            optionalDVNThreshold: 0,
            requiredDVNs: [DVN_ADDRESS],
            optionalDVNs: []
        };
        
        const configData = ethers.utils.defaultAbiCoder.encode(
            ["tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)"],
            [ulnConfig]
        );
        
        try {
            const gasEstimate = await endpoint.estimateGas.setConfig(
                VRF_CONTRACT,
                SEND_LIBRARY,
                [
                    {
                        eid: ARBITRUM_ENDPOINT_ID,
                        configType: 2,
                        config: configData
                    }
                ]
            );
            console.log(`✅ Gas estimate successful: ${gasEstimate.toString()}`);
        } catch (gasError) {
            console.log(`❌ Gas estimation failed: ${gasError.message}`);
            if (gasError.data) {
                console.log(`Gas error data: ${gasError.data}`);
            }
        }
        
        // 6. Check current network details
        console.log("\n🔍 6. Network Information...");
        const network = await ethers.provider.getNetwork();
        console.log(`Network name: ${network.name}`);
        console.log(`Chain ID: ${network.chainId}`);
        const gasPrice = await ethers.provider.getGasPrice();
        console.log(`Current gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
        
        // 7. Check signer balance
        const balance = await signer.getBalance();
        console.log(`Signer balance: ${ethers.utils.formatEther(balance)} ETH`);
        
    } catch (error) {
        console.error("❌ Error during DVN status check:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 