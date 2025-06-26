import { ethers } from "hardhat";

/**
 * Debug and fix LayerZero configuration issues
 * Implements the suggested debugging approaches
 */

const CONTRACTS = {
    SONIC_INTEGRATOR: "0x89Ce5E25d8c635Bd41E5Ee33bF7c63DC50A3F0fb",
    ARBITRUM_CONSUMER: "0xD192343D5E351C983F6613e6d7c5c33f62C0eea4"
};

const CHAIN_EIDS = {
    ARBITRUM: 30110,
    SONIC: 30332
};

// Official LayerZero addresses from metadata API
const SONIC_CONFIG = {
    ENDPOINT: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B",
    SEND_ULN_302: "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7",
    RECEIVE_ULN_302: "0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043",
    EXECUTOR: "0x4208D6E27538189bB48E603D6123A94b8Abe0A0b",
    DVNS: {
        LAYERZERO_LABS: "0x2f55c492897526677c5b68fb199ea31e2c126416",
        NETHERMIND: "0xa7b5189bca84cd304d8553977c7c614329750d99"
    }
};

async function debugAndFixConfig() {
    console.log("🔧 Debug and Fix LayerZero Configuration");
    console.log("Implementing suggested debugging approaches");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    // Connect to contracts
    const sonicIntegrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        CONTRACTS.SONIC_INTEGRATOR
    );

    const endpoint = await ethers.getContractAt(
        "contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2",
        SONIC_CONFIG.ENDPOINT
    );

    console.log("✅ Connected to contracts");

    // Step 1: Verify contract state and parameters
    console.log("\n🔍 Step 1: Verifying Contract State...");
    
    try {
        const owner = await sonicIntegrator.owner();
        const contractEndpoint = await sonicIntegrator.endpoint();
        const peer = await sonicIntegrator.peers(CHAIN_EIDS.ARBITRUM);
        
        console.log("👤 Contract owner:", owner);
        console.log("🔗 Contract endpoint:", contractEndpoint);
        console.log("🤝 Arbitrum peer:", peer);
        console.log("✅ Is owner:", owner.toLowerCase() === deployer.address.toLowerCase());
        console.log("✅ Correct endpoint:", contractEndpoint.toLowerCase() === SONIC_CONFIG.ENDPOINT.toLowerCase());
        
        const expectedPeer = ethers.utils.hexZeroPad(CONTRACTS.ARBITRUM_CONSUMER, 32);
        console.log("✅ Correct peer:", peer.toLowerCase() === expectedPeer.toLowerCase());
        
    } catch (error: any) {
        console.log("❌ Contract state check failed:", error.message);
    }

    // Step 2: Try manual DVN configuration with higher gas limits
    console.log("\n⚙️ Step 2: Manual DVN Configuration (High Gas)...");
    
    try {
        // Configure send config with DVNs
        const sendConfig = {
            executorConfig: {
                maxMessageSize: 10000,
                executor: SONIC_CONFIG.EXECUTOR
            },
            ulnConfig: {
                confirmations: 20,
                requiredDVNs: [
                    SONIC_CONFIG.DVNS.LAYERZERO_LABS,
                    SONIC_CONFIG.DVNS.NETHERMIND
                ],
                optionalDVNs: [],
                optionalDVNThreshold: 0
            }
        };

        console.log("🔧 Setting send config with high gas limit...");
        const setSendConfigTx = await sonicIntegrator.setSendLibrary(
            CHAIN_EIDS.ARBITRUM,
            SONIC_CONFIG.SEND_ULN_302,
            { gasLimit: 1000000 } // High gas limit as suggested
        );
        
        console.log("⏳ Waiting for send library transaction...");
        await setSendConfigTx.wait();
        console.log("✅ Send library set successfully!");

    } catch (error: any) {
        console.log("❌ Manual DVN config failed:", error.message);
        console.log("🔍 Error code:", error.code);
        console.log("🔍 Error data:", error.data);
        
        // Try alternative approach - set DVNs directly through endpoint
        console.log("\n🔄 Trying alternative DVN configuration...");
        try {
            // This might work if the OApp interface is the issue
            const setConfigTx = await endpoint.setConfig(
                CONTRACTS.SONIC_INTEGRATOR,
                SONIC_CONFIG.SEND_ULN_302,
                ethers.utils.defaultAbiCoder.encode(
                    ["tuple(uint64,address[],address[],uint8)"],
                    [[
                        20, // confirmations
                        [SONIC_CONFIG.DVNS.LAYERZERO_LABS, SONIC_CONFIG.DVNS.NETHERMIND], // required DVNs
                        [], // optional DVNs
                        0   // threshold
                    ]]
                ),
                { gasLimit: 1000000 }
            );
            
            await setConfigTx.wait();
            console.log("✅ Alternative DVN config successful!");
            
        } catch (altError: any) {
            console.log("❌ Alternative approach also failed:", altError.message);
        }
    }

    // Step 3: Test quote function with debugging
    console.log("\n💰 Step 3: Testing Quote Function...");
    const options = "0x00030100110100000000000000000000000000030d40"; // 200k gas
    
    try {
        console.log("🔍 Calling quote with parameters:");
        console.log("  - Destination EID:", CHAIN_EIDS.ARBITRUM);
        console.log("  - Options:", options);
        
        const fee = await sonicIntegrator.quote(CHAIN_EIDS.ARBITRUM, options);
        console.log("✅ Quote successful!");
        console.log("💰 Native fee:", ethers.utils.formatEther(fee.nativeFee), "ETH");
        console.log("🪙 LZ token fee:", fee.lzTokenFee.toString());
        
        // If quote works, try a test VRF request
        console.log("\n🎲 Step 4: Test VRF Request...");
        const vrfTx = await sonicIntegrator.requestRandomWordsSimple(
            CHAIN_EIDS.ARBITRUM,
            {
                value: fee.nativeFee,
                gasLimit: 800000 // High gas limit
            }
        );
        
        console.log("⏳ VRF request submitted...");
        const receipt = await vrfTx.wait();
        console.log("✅ VRF request successful!");
        console.log("📋 Transaction:", vrfTx.hash);
        console.log("⛽ Gas used:", receipt.gasUsed.toString());
        
        return true;
        
    } catch (error: any) {
        console.log("❌ Quote/VRF failed:", error.message);
        console.log("🔍 Error details:");
        console.log("  - Code:", error.code);
        console.log("  - Data:", error.data);
        
        if (error.message.includes("Please set your OApp's DVNs")) {
            console.log("🚨 DVN configuration still incomplete");
            console.log("💡 Suggestion: The LayerZero wire command may need to be run multiple times");
        } else if (error.message.includes("0xc4c52593")) {
            console.log("🚨 Contract revert - possible parameter/state issue");
            console.log("💡 Suggestion: Check contract permissions and LayerZero configuration");
        }
        
        return false;
    }
}

if (require.main === module) {
    debugAndFixConfig()
        .then((success) => {
            if (success) {
                console.log("\n🎉 CONFIGURATION SUCCESSFUL!");
                console.log("VRF system is working! 🚀");
            } else {
                console.log("\n❌ Configuration issues remain");
                console.log("May need LayerZero team assistance or contract redeployment");
            }
        })
        .catch((error) => {
            console.error("❌ Debug script failed:", error);
            process.exitCode = 1;
        });
} 