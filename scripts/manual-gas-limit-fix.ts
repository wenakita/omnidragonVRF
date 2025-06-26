import { ethers } from "hardhat";

/**
 * Manual fix for the 0xc4c52593 error by setting explicit gas limits
 * Based on the debugging suggestions for insufficient gas limit issues
 */

const CONTRACTS = {
    SONIC_INTEGRATOR: "0x89Ce5E25d8c635Bd41E5Ee33bF7c63DC50A3F0fb",
    SONIC_ENDPOINT: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B"
};

const CHAIN_EIDS = {
    ARBITRUM: 30110
};

const SONIC_CONFIG = {
    SEND_ULN_302: "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7"
};

async function manualGasLimitFix() {
    console.log("🔧 Manual Gas Limit Fix for LayerZero Configuration");
    console.log("Attempting to set send library with explicit high gas limit");
    console.log("=" .repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);
    console.log("💰 Balance:", ethers.utils.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    // Connect to LayerZero endpoint
    const endpoint = await ethers.getContractAt(
        "contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2",
        CONTRACTS.SONIC_ENDPOINT
    );

    console.log("✅ Connected to LayerZero Endpoint:", CONTRACTS.SONIC_ENDPOINT);

    // The exact transaction data that's failing from the LayerZero wire command
    const transactionData = "0x9535ff3000000000000000000000000089ce5e25d8c635bd41e5ee33bf7c63dc50a3f0fb000000000000000000000000000000000000000000000000000000000000759e000000000000000000000000c39161c743d0307eb9bcc9fef03eeb9dc4802de7";

    console.log("\n🔍 Analyzing failed transaction:");
    console.log("- Function: setSendLibrary");
    console.log("- Target:", CONTRACTS.SONIC_INTEGRATOR);
    console.log("- Destination EID:", CHAIN_EIDS.ARBITRUM);
    console.log("- Send Library:", SONIC_CONFIG.SEND_ULN_302);

    // Try different gas limits
    const gasLimits = [500000, 800000, 1000000, 1500000, 2000000];

    for (const gasLimit of gasLimits) {
        console.log(`\n⛽ Attempting with gas limit: ${gasLimit.toLocaleString()}`);
        
        try {
            // Try to estimate gas first
            const estimatedGas = await endpoint.estimateGas.setSendLibrary(
                CONTRACTS.SONIC_INTEGRATOR,
                CHAIN_EIDS.ARBITRUM,
                SONIC_CONFIG.SEND_ULN_302
            );
            console.log("✅ Gas estimation successful:", estimatedGas.toString());
            
            // If estimation works, try the actual transaction
            const tx = await endpoint.setSendLibrary(
                CONTRACTS.SONIC_INTEGRATOR,
                CHAIN_EIDS.ARBITRUM,
                SONIC_CONFIG.SEND_ULN_302,
                { gasLimit: gasLimit }
            );
            
            console.log("⏳ Transaction submitted:", tx.hash);
            const receipt = await tx.wait();
            console.log("✅ Transaction successful!");
            console.log("⛽ Gas used:", receipt.gasUsed.toString());
            
            // Test if this fixed the quote function
            await testQuoteFunction();
            return true;
            
        } catch (error: any) {
            console.log(`❌ Failed with gas limit ${gasLimit}:`, error.message);
            
            if (error.message.includes("0xc4c52593")) {
                console.log("🚨 Same revert error - may be a contract state issue");
            } else if (error.message.includes("gas")) {
                console.log("⛽ Gas-related error - trying higher limit");
                continue;
            } else {
                console.log("🤔 Different error type");
            }
        }
    }

    console.log("\n❌ All gas limit attempts failed");
    console.log("💡 This suggests the issue is not gas-related");
    console.log("💡 Possible causes:");
    console.log("   - Contract state/permission issue");
    console.log("   - Invalid library address");
    console.log("   - LayerZero endpoint configuration conflict");
    
    return false;
}

async function testQuoteFunction() {
    console.log("\n💰 Testing Quote Function...");
    
    const sonicIntegrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        CONTRACTS.SONIC_INTEGRATOR
    );
    
    const options = "0x00030100110100000000000000000000000000030d40";
    
    try {
        const fee = await sonicIntegrator.quote(CHAIN_EIDS.ARBITRUM, options);
        console.log("✅ Quote function now works!");
        console.log("💰 Native fee:", ethers.utils.formatEther(fee.nativeFee), "ETH");
        return true;
    } catch (error: any) {
        console.log("❌ Quote still fails:", error.message);
        return false;
    }
}

if (require.main === module) {
    manualGasLimitFix()
        .then((success) => {
            if (success) {
                console.log("\n🎉 MANUAL FIX SUCCESSFUL!");
                console.log("LayerZero configuration completed! 🚀");
            } else {
                console.log("\n❌ Manual fix failed");
                console.log("May need LayerZero team assistance");
            }
        })
        .catch((error) => {
            console.error("❌ Script failed:", error);
            process.exitCode = 1;
        });
} 