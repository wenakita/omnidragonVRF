import { ethers } from "hardhat";

async function main() {
    console.log("🔧 Setting up LayerZero V2 Enforced Options");
    console.log("=" .repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    const integratorAddress = "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84";
    
    // Connect to Sonic VRF Integrator
    const integrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        integratorAddress
    );

    console.log("✅ Connected to Sonic Integrator");

    // Get the LayerZero endpoint
    const endpointAddress = await integrator.endpoint();
    console.log("🌐 LayerZero Endpoint:", endpointAddress);

    // Connect to the endpoint
    const endpoint = await ethers.getContractAt(
        "contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2",
        endpointAddress
    );

    // Check current enforced options
    console.log("\n🔍 Checking current enforced options...");
    try {
        const currentOptions = await endpoint.getEnforcedOptions(integratorAddress, 30110);
        console.log("📋 Current enforced options for Arbitrum:", currentOptions);
    } catch (error: any) {
        console.log("❌ Error getting enforced options:", error.message);
    }

    // Create enforced options for VRF requests
    console.log("\n⚙️ Setting up enforced options...");
    
    // For LayerZero V2, we need to create proper options
    // The format is: OptionsBuilder.newOptions().addExecutorLzReceiveOption(gasLimit, value)
    
    // Manual option creation (since OptionsBuilder import was problematic)
    // LayerZero V2 options format: [type][params]
    // Type 1 = Executor options, params = [gasLimit][value]
    
    const gasLimit = 690420; // From contract's defaultGasLimit
    const value = 0; // No native value needed for callback
    
    // Create options manually (this is the hex encoding of LayerZero options)
    // Format: 0x0001 (type) + gasLimit (32 bytes) + value (32 bytes)
    const optionsHex = "0x0001" + 
        ethers.utils.hexZeroPad(ethers.utils.hexlify(gasLimit), 32).slice(2) + 
        ethers.utils.hexZeroPad(ethers.utils.hexlify(value), 32).slice(2);
    
    console.log("📦 Created options:", optionsHex);
    console.log("⛽ Gas limit:", gasLimit);
    console.log("💰 Value:", value);

    // Set enforced options
    try {
        console.log("\n🚀 Setting enforced options for Arbitrum...");
        
        // The setEnforcedOptions function signature varies by implementation
        // Let's try the standard approach first
        const tx = await endpoint.setEnforcedOptions([{
            eid: 30110, // Arbitrum
            msgType: 1, // Standard message type
            options: optionsHex
        }], {
            gasLimit: 200000
        });

        console.log("⏳ Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Enforced options set successfully!");

        // Verify the options were set
        const newOptions = await endpoint.getEnforcedOptions(integratorAddress, 30110);
        console.log("✅ New enforced options:", newOptions);

    } catch (error: any) {
        console.log("❌ Failed to set enforced options:", error.message);
        
        // Try alternative approach - check if the integrator contract has its own setEnforcedOptions
        console.log("\n💡 Trying alternative approach...");
        try {
            // Some contracts have their own enforced options management
            const altTx = await integrator.setEnforcedOptions(30110, optionsHex, {
                gasLimit: 200000
            });
            
            console.log("⏳ Alternative transaction sent:", altTx.hash);
            await altTx.wait();
            console.log("✅ Enforced options set via contract!");
            
        } catch (altError: any) {
            console.log("❌ Alternative approach also failed:", altError.message);
            console.log("💡 May need to use LayerZero CLI tools instead");
        }
    }

    // Test the VRF request after setting enforced options
    console.log("\n🎲 Testing VRF request with enforced options...");
    try {
        // Try a simple VRF request now that enforced options are set
        const tx = await integrator.requestRandomWordsSimple(30110, {
            value: ethers.utils.parseEther("0.001"),
            gasLimit: 500000
        });
        
        console.log("⏳ VRF request sent:", tx.hash);
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            console.log("🎉 VRF request successful!");
            console.log("📦 Block:", receipt.blockNumber);
            console.log("⛽ Gas used:", receipt.gasUsed.toString());
            
            // Parse events
            for (const log of receipt.logs) {
                try {
                    const parsed = integrator.interface.parseLog(log);
                    if (parsed.name === "RandomWordsRequested") {
                        console.log("📝 Request ID:", parsed.args.requestId.toString());
                        console.log("📝 Provider:", parsed.args.provider);
                        console.log("📝 Target EID:", parsed.args.dstEid.toString());
                    }
                } catch (parseError) {
                    // Skip unparseable logs
                }
            }
        } else {
            console.log("❌ VRF request failed");
        }
        
    } catch (vrfError: any) {
        console.log("❌ VRF request still failing:", vrfError.message);
        console.log("💡 May need additional LayerZero configuration");
    }

    console.log("\n🎯 Enforced Options Setup Complete!");
}

main()
    .then(() => {
        console.log("\n🏁 Setup complete!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Setup error:", error);
        process.exit(1);
    }); 