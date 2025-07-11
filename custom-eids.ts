// Custom EID Registry for non-standard LayerZero endpoints
// Use this when the official @layerzerolabs/lz-definitions doesn't include your chain

export const CustomEndpointId = {
    // Official LayerZero V2 EIDs
    ARBITRUM_V2_MAINNET: 30110,
    AVALANCHE_V2_MAINNET: 30106,
    ETHEREUM_V2_MAINNET: 30101,
    BSC_V2_MAINNET: 30102,
    POLYGON_V2_MAINNET: 30109,
    OPTIMISM_V2_MAINNET: 30111,
    BASE_V2_MAINNET: 30184,
    
    // Custom EIDs
    SONIC_V2_MAINNET: 30332,
    
    // Add more custom EIDs as needed
    // YOUR_CUSTOM_CHAIN: 30XXX,
} as const

export type CustomEndpointIdType = typeof CustomEndpointId[keyof typeof CustomEndpointId]

// Helper function to validate EID
export function isValidEID(eid: number): boolean {
    return Object.values(CustomEndpointId).includes(eid as CustomEndpointIdType)
}

// Helper function to get chain name from EID
export function getChainName(eid: number): string {
    const entry = Object.entries(CustomEndpointId).find(([, value]) => value === eid)
    return entry ? entry[0].replace('_V2_MAINNET', '').toLowerCase() : 'unknown'
} 