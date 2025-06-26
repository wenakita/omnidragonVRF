import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Simple Integrator Check");
    
    const integrator = await ethers.getContractAt(
        "ChainlinkVRFIntegratorV2_5",
        "0xD4023F563c2ea3Bd477786D99a14b5edA1252A84"
    );

    console.log("✅ Connected");
    
    const endpoint = await integrator.endpoint();
    console.log("Endpoint:", endpoint);
    
    const peer = await integrator.peers(30110);
    console.log("Arbitrum Peer:", peer);
    
    const owner = await integrator.owner();
    console.log("Owner:", owner);
    
    // Now check endpoint
    const endpointContract = await ethers.getContractAt(
        "contracts/interfaces/external/layerzero/ILayerZeroEndpointV2.sol:ILayerZeroEndpointV2",
        endpoint
    );
    
    const sendLib = await endpointContract.getSendLibrary("0xD4023F563c2ea3Bd477786D99a14b5edA1252A84", 30110);
    console.log("Send Library:", sendLib);
    
    const receiveLib = await endpointContract.getReceiveLibrary("0xD4023F563c2ea3Bd477786D99a14b5edA1252A84", 30110);
    console.log("Receive Library:", receiveLib);
    
    console.log("Done!");
}

main().catch(console.error); 