import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("configure-dvn", "Configure LayerZero DVN for VRF contracts")
    .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
        const { ethers } = hre;
        
        console.log("🔧 Configuring LayerZero DVN...");
        
        // Get contract
        const contract = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            "0x1cD88Fd477a951954de27dC77Db0E41814B222a7"
        );
        
        // Set enforced options
        const enforcedOptions = [{
            eid: 30110,
            msgType: 1,
            options: "0x0003010011020000000000000000000000000000000000000000000000000000000493e0"
        }];
        
        const tx1 = await contract.setEnforcedOptions(enforcedOptions);
        console.log("✅ Enforced options set:", tx1.hash);
        
        // Set delegate
        const [signer] = await ethers.getSigners();
        const tx2 = await contract.setDelegate(signer.address);
        console.log("✅ Delegate set:", tx2.hash);
        
        console.log("🎯 DVN Configuration complete!");
    });