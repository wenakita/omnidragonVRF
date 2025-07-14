const { ethers } = require("hardhat");

async function main() {
    console.log(`\n--- Debugging FeeM Registration Issue ---`);
    
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    
    const SONIC_FEEM_CONTRACT = "0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830";
    const FEEM_REGISTRATION_ID = 143;
    
    try {
        // 1. Check if FeeM contract exists
        console.log("1. Checking FeeM contract...");
        const feemCode = await ethers.provider.getCode(SONIC_FEEM_CONTRACT);
        if (feemCode === "0x") {
            console.log("❌ FeeM contract not found!");
            return;
        }
        console.log("✅ FeeM contract exists");
        
        // 2. Try to get contract interface
        console.log("\n2. Testing contract interface...");
        
        // Try different possible function signatures
        const possibleSignatures = [
            "selfRegister(uint256)",
            "selfRegister(uint256,address)",
            "register(uint256)",
            "register(uint256,address)",
            "registerContract(uint256)",
            "addRegistration(uint256)"
        ];
        
        for (const sig of possibleSignatures) {
            try {
                console.log(`Testing signature: ${sig}`);
                
                // Try static call first
                const calldata = ethers.utils.id(sig).slice(0, 10) + 
                    ethers.utils.defaultAbiCoder.encode(["uint256"], [FEEM_REGISTRATION_ID]).slice(2);
                
                const result = await ethers.provider.call({
                    to: SONIC_FEEM_CONTRACT,
                    data: calldata,
                    from: deployer.address
                });
                
                console.log(`✅ ${sig} - Success! Result: ${result}`);
                
                // If static call works, try actual transaction
                const tx = await deployer.sendTransaction({
                    to: SONIC_FEEM_CONTRACT,
                    data: calldata,
                    gasLimit: 100000
                });
                
                console.log(`✅ Transaction sent: ${tx.hash}`);
                const receipt = await tx.wait();
                console.log(`✅ Transaction confirmed: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
                
                if (receipt.status === 1) {
                    console.log(`🎉 Found working signature: ${sig}`);
                    return;
                }
                
            } catch (error) {
                console.log(`❌ ${sig} - Failed: ${error.message.split('\n')[0]}`);
            }
        }
        
        // 3. Try to inspect the contract
        console.log("\n3. Inspecting contract bytecode...");
        
        // Look for common function selectors in bytecode
        const functionSelectors = [
            "0x6652e71c", // selfRegister(uint256)
            "0xa2e62045", // register(uint256)
            "0x4420e486", // registerContract(uint256)
        ];
        
        for (const selector of functionSelectors) {
            if (feemCode.includes(selector.slice(2))) {
                console.log(`✅ Found function selector ${selector} in bytecode`);
            }
        }
        
        // 4. Check if ID is already registered
        console.log("\n4. Checking registration status...");
        
        try {
            // Try to check if registration exists
            const checkCall = ethers.utils.id("registrations(uint256)").slice(0, 10) + 
                ethers.utils.defaultAbiCoder.encode(["uint256"], [FEEM_REGISTRATION_ID]).slice(2);
            
            const regResult = await ethers.provider.call({
                to: SONIC_FEEM_CONTRACT,
                data: checkCall
            });
            
            console.log(`Registration check result: ${regResult}`);
            
        } catch (error) {
            console.log(`Registration check failed: ${error.message.split('\n')[0]}`);
        }
        
        // 5. Try alternative approach - check if it's a proxy
        console.log("\n5. Checking if contract is a proxy...");
        
        // Check for proxy patterns
        const proxySelectors = [
            "0x5c60da1b", // implementation()
            "0x3659cfe6", // upgradeTo(address)
            "0x8f283970", // changeAdmin(address)
        ];
        
        for (const selector of proxySelectors) {
            try {
                const result = await ethers.provider.call({
                    to: SONIC_FEEM_CONTRACT,
                    data: selector
                });
                console.log(`✅ Proxy function ${selector} exists`);
            } catch (error) {
                // Silent fail for proxy checks
            }
        }
        
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main().catch(console.error); 