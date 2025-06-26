import fs from "fs";
import path from "path";

/**
 * Save the Sonic deployment information to deployments folder
 */

const SONIC_DEPLOYMENT = {
    contractName: "ChainlinkVRFIntegratorV2_5",
    address: "0x5aCd5D42605b925CEF3d8DdD9e83545E708904B4",
    deployer: "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F",
    txHash: "0x36b5c3e2371b0c170ac5c3b4cac759e837798c31bb932ce91fefca13051526c5",
    blockNumber: 35628044,
    gasUsed: "2503798",
    timestamp: Date.now(),
    network: "sonic",
    chainId: 146,
    endpoint: "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B",
    verified: true
};

async function saveSonicDeployment() {
    console.log("💾 Saving Sonic Deployment Information");
    console.log("=" .repeat(40));

    const deploymentsDir = path.join(__dirname, "..", "deployments", "sonic");
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
        console.log("📁 Created sonic deployments directory");
    }

    // Save deployment JSON
    const deploymentFile = path.join(deploymentsDir, "ChainlinkVRFIntegratorV2_5.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(SONIC_DEPLOYMENT, null, 2));
    
    console.log("💾 Deployment saved to:", deploymentFile);

    // Update deployment addresses file
    const addressesFile = path.join(__dirname, "..", "deployments", "DEPLOYMENT_ADDRESSES.md");
    const timestamp = new Date().toISOString();
    const addressEntry = `\n## Fresh Sonic Deployment - ${timestamp}\n- **ChainlinkVRFIntegratorV2_5**: \`${SONIC_DEPLOYMENT.address}\`\n- **Network**: Sonic\n- **TX Hash**: \`${SONIC_DEPLOYMENT.txHash}\`\n- **Block**: ${SONIC_DEPLOYMENT.blockNumber}\n`;
    
    fs.appendFileSync(addressesFile, addressEntry);
    console.log("📝 Address added to DEPLOYMENT_ADDRESSES.md");

    console.log("\n✅ Sonic deployment information saved!");
    console.log("📋 Contract Address:", SONIC_DEPLOYMENT.address);
    console.log("🌐 Network: Sonic (Chain ID: 146)");
    console.log("🔗 Endpoint:", SONIC_DEPLOYMENT.endpoint);
}

if (require.main === module) {
    saveSonicDeployment()
        .then(() => {
            console.log("\n🎉 SONIC DEPLOYMENT INFO SAVED!");
        })
        .catch((error) => {
            console.error("❌ Failed to save deployment info:", error);
            process.exitCode = 1;
        });
} 