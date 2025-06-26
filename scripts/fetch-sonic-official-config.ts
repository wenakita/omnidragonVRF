import axios from "axios";

/**
 * Fetch Official Sonic Configuration from LayerZero Metadata API
 * This ensures we use the correct endpoints and DVNs as deployed by LayerZero
 */

const LAYERZERO_METADATA_API = "https://metadata.layerzero-api.com/v1/metadata/deployments";

interface DVNInfo {
    version: number;
    canonicalName: string;
    id: string;
    deprecated?: boolean;
}

interface ChainDeployment {
    eid: string;
    endpointV2?: {
        address: string;
    };
    executor?: {
        address: string;
    };
    sendUln302?: {
        address: string;
    };
    receiveUln302?: {
        address: string;
    };
    deadDVN?: {
        address: string;
    };
}

interface ChainMetadata {
    deployments: ChainDeployment[];
    dvns: Record<string, DVNInfo>;
    chainDetails: {
        chainKey: string;
        nativeChainId: number;
        chainStatus: string;
    };
}

async function fetchSonicConfig() {
    console.log("🔍 Fetching Official Sonic Configuration from LayerZero API");
    console.log("=" .repeat(70));

    try {
        // Fetch the metadata
        console.log("📡 Fetching from:", LAYERZERO_METADATA_API);
        const response = await axios.get(LAYERZERO_METADATA_API);
        const metadata = response.data;

        // Look for Sonic chain data
        const sonicKey = "sonic-mainnet";
        const sonicData: ChainMetadata = metadata[sonicKey];

        if (!sonicData) {
            console.log("❌ Sonic chain not found in metadata");
            console.log("Available chains:", Object.keys(metadata));
            return;
        }

        console.log("✅ Found Sonic Chain Configuration");
        console.log("Chain Status:", sonicData.chainDetails.chainStatus);
        console.log("Native Chain ID:", sonicData.chainDetails.nativeChainId);

        // Get V2 deployment (latest)
        const v2Deployment = sonicData.deployments.find(d => d.endpointV2);
        
        if (!v2Deployment) {
            console.log("❌ No LayerZero V2 deployment found for Sonic");
            return;
        }

        console.log("\n🏗️ LayerZero V2 Infrastructure:");
        console.log("EID:", v2Deployment.eid);
        console.log("Endpoint V2:", v2Deployment.endpointV2?.address);
        console.log("Executor:", v2Deployment.executor?.address);
        console.log("Send ULN 302:", v2Deployment.sendUln302?.address);
        console.log("Receive ULN 302:", v2Deployment.receiveUln302?.address);

        // List active DVNs (non-deprecated)
        console.log("\n🛡️ Available DVNs:");
        const activeDVNs = Object.entries(sonicData.dvns)
            .filter(([_, info]) => !info.deprecated)
            .sort((a, b) => a[1].canonicalName.localeCompare(b[1].canonicalName));

        activeDVNs.forEach(([address, info]) => {
            console.log(`  ${info.canonicalName} (${info.id})`);
            console.log(`    Address: ${address}`);
            console.log(`    Version: ${info.version}`);
        });

        // Show deprecated DVNs
        const deprecatedDVNs = Object.entries(sonicData.dvns)
            .filter(([_, info]) => info.deprecated);

        if (deprecatedDVNs.length > 0) {
            console.log("\n⚠️ Deprecated DVNs (avoid using):");
            deprecatedDVNs.forEach(([address, info]) => {
                console.log(`  ${info.canonicalName}: ${address}`);
            });
        }

        // Generate configuration for our contracts
        console.log("\n📋 Recommended Configuration:");
        console.log("=" .repeat(50));
        
        const layerZeroLabsDVN = activeDVNs.find(([_, info]) => 
            info.id === "layerzero-labs" || info.canonicalName.includes("LayerZero")
        );
        
        const nethermindDVN = activeDVNs.find(([_, info]) => 
            info.id === "nethermind" || info.canonicalName.includes("Nethermind")
        );

        if (layerZeroLabsDVN && nethermindDVN) {
            console.log("✅ Recommended DVN Setup:");
            console.log(`  LayerZero Labs: ${layerZeroLabsDVN[0]}`);
            console.log(`  Nethermind: ${nethermindDVN[0]}`);
        } else {
            console.log("⚠️ Could not find both LayerZero Labs and Nethermind DVNs");
            console.log("Available options:", activeDVNs.map(([_, info]) => info.canonicalName));
        }

        // Generate environment variables
        console.log("\n🔧 Environment Variables:");
        console.log(`SONIC_LZ_ENDPOINT="${v2Deployment.endpointV2?.address}"`);
        console.log(`SONIC_LZ_EID="${v2Deployment.eid}"`);
        console.log(`SONIC_EXECUTOR="${v2Deployment.executor?.address}"`);
        console.log(`SONIC_SEND_ULN302="${v2Deployment.sendUln302?.address}"`);
        console.log(`SONIC_RECEIVE_ULN302="${v2Deployment.receiveUln302?.address}"`);

        if (layerZeroLabsDVN) {
            console.log(`SONIC_LAYERZERO_DVN="${layerZeroLabsDVN[0]}"`);
        }
        if (nethermindDVN) {
            console.log(`SONIC_NETHERMIND_DVN="${nethermindDVN[0]}"`);
        }

        return {
            endpoint: v2Deployment.endpointV2?.address,
            eid: v2Deployment.eid,
            executor: v2Deployment.executor?.address,
            sendUln302: v2Deployment.sendUln302?.address,
            receiveUln302: v2Deployment.receiveUln302?.address,
            dvns: {
                layerZeroLabs: layerZeroLabsDVN?.[0],
                nethermind: nethermindDVN?.[0]
            }
        };

    } catch (error: any) {
        console.error("❌ Error fetching Sonic configuration:", error.message);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        }
    }
}

// Also fetch Arbitrum for comparison
async function fetchArbitrumConfig() {
    console.log("\n🔍 Fetching Arbitrum Configuration for Comparison");
    console.log("=" .repeat(50));

    try {
        const response = await axios.get(LAYERZERO_METADATA_API);
        const metadata = response.data;

        const arbitrumKey = "arbitrum-mainnet";
        const arbitrumData: ChainMetadata = metadata[arbitrumKey];

        if (!arbitrumData) {
            console.log("❌ Arbitrum chain not found");
            return;
        }

        const v2Deployment = arbitrumData.deployments.find(d => d.endpointV2);
        
        if (v2Deployment) {
            console.log("Arbitrum EID:", v2Deployment.eid);
            console.log("Arbitrum Endpoint V2:", v2Deployment.endpointV2?.address);
            
            const activeDVNs = Object.entries(arbitrumData.dvns)
                .filter(([_, info]) => !info.deprecated);
            
            console.log("Arbitrum Active DVNs:", activeDVNs.length);
        }

    } catch (error: any) {
        console.error("❌ Error fetching Arbitrum configuration:", error.message);
    }
}

async function main() {
    await fetchSonicConfig();
    await fetchArbitrumConfig();
    
    console.log("\n🎯 Next Steps:");
    console.log("1. Update hardhat.config.ts with official endpoint");
    console.log("2. Update layerzero.config.ts with official DVNs");
    console.log("3. Redeploy contracts with correct configuration");
    console.log("4. Test VRF request with official infrastructure");
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
} 