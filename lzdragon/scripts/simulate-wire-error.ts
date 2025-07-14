import { ethers } from 'hardhat'
import fs from 'fs'

// Load deployed addresses
const vanityData = JSON.parse(fs.readFileSync('vanity-addresses-final.json', 'utf8'))

async function simulateWireError() {
    console.log('🔍 Simulating Standard Wire Error')
    console.log('=================================\n')
    
    console.log('This demonstrates what happens when we try the standard approach...\n')
    
    const privateKey = process.env.PRIVATE_KEY
    if (!privateKey) {
        throw new Error('PRIVATE_KEY not found')
    }
    
    // Connect to Sonic
    const provider = new ethers.providers.JsonRpcProvider('https://rpc.soniclabs.com')
    const wallet = new ethers.Wallet(privateKey, provider)
    
    // Endpoint contract with the functions that standard wire tries to call
    const endpointABI = [
        'function delegates(address) view returns (address)',
        'function setSendLibrary(address _oapp, uint32 _eid, address _newLib) external',
        'function setReceiveLibrary(address _oapp, uint32 _eid, address _newLib, uint256 _gracePeriod) external'
    ]
    
    const endpoint = new ethers.Contract(
        '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B', // Sonic endpoint
        endpointABI,
        wallet
    )
    
    console.log('📋 Checking Current Delegate:')
    const delegate = await endpoint.delegates(vanityData.omnidragon.address)
    console.log(`Delegate: ${delegate}`)
    console.log(`Our Address: ${wallet.address}`)
    console.log(`Are we the delegate? ${delegate.toLowerCase() === wallet.address.toLowerCase() ? '✅ YES' : '❌ NO'}`)
    
    console.log('\n🧪 Now attempting what standard wire command tries to do...')
    console.log('(This will fail with error 0xc4c52593)\n')
    
    try {
        console.log('💀 Calling endpoint.setSendLibrary()...')
        console.log('Parameters:')
        console.log(`  - OApp: ${vanityData.omnidragon.address}`)
        console.log(`  - Target EID: 30110 (Arbitrum)`)
        console.log(`  - Send Library: 0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7`)
        
        // This is exactly what the standard wire command tries to do
        const tx = await endpoint.setSendLibrary(
            vanityData.omnidragon.address,
            30110, // Arbitrum EID
            '0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7', // Send library
            {
                gasLimit: 200000,
                gasPrice: ethers.utils.parseUnits('10', 'gwei')
            }
        )
        
        console.log('🎉 Success! Transaction hash:', tx.hash)
        
    } catch (error: any) {
        console.log('❌ FAILED! Here\'s the exact error:')
        console.log('─'.repeat(60))
        console.log(`Error Message: ${error.message}`)
        
        if (error.data) {
            console.log(`Error Data: ${error.data}`)
            
            // Check for the specific error code
            if (error.data.includes('c4c52593')) {
                console.log('\n🔍 Error Analysis:')
                console.log('   Error Code: 0xc4c52593')
                console.log('   Meaning: ACCESS CONTROL - Unauthorized caller')
                console.log('   Root Cause: Only LayerZero team can modify endpoint libraries')
                console.log('   Solution: Use custom OApp-level DVN configuration instead')
            }
        }
        
        console.log('─'.repeat(60))
        
        console.log('\n💡 This is EXACTLY why we need the custom approach!')
        console.log('Standard wire fails because:')
        console.log('1. We don\'t have permission to modify endpoint libraries')
        console.log('2. Sonic uses LZDeadDVN which blocks standard configuration')
        console.log('3. The endpoint is access-controlled by LayerZero team')
        
        console.log('\n✅ Our custom OApp DVN approach works because:')
        console.log('1. We configure at OApp level (which we own)')
        console.log('2. We use the custom DVN directly in transactions')
        console.log('3. We bypass the endpoint-level restrictions')
        console.log('4. We set enforced options for proper gas limits')
    }
    
    console.log('\n🎯 Conclusion:')
    console.log('The standard `lz oapp wire` command is designed for chains where:')
    console.log('- Production DVNs are already deployed')
    console.log('- Default configurations are properly set up')
    console.log('- The chain is fully supported by LayerZero')
    console.log('')
    console.log('For Sonic (and other custom/new chains), we need the custom approach!')
}

// Run the simulation
simulateWireError().catch(console.error) 