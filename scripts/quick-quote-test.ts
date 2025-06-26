import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Quick Quote Test");
    
    try {
        const integrator = await ethers.getContractAt(
            "ChainlinkVRFIntegratorV2_5",
            "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84"
        );
        
        console.log("✅ Connected to integrator");
        
        const fee = await integrator.quote(30110, "0x");
        console.log("✅ QUOTE SUCCESS! Fee:", ethers.utils.formatEther(fee.nativeFee), "S");
        
        return true;
    } catch (error: any) {
        console.log("❌ Quote failed:", error.message.slice(0, 50) + "...");
        return false;
    }
}

main().then(success => {
    console.log(success ? "🎯 FIXED!" : "🔧 Still broken");
    process.exit(success ? 0 : 1);
}).catch(console.error); 