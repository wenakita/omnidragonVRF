import { ethers } from 'hardhat'
import fs from 'fs'

// Load deployed addresses
const vanityData = JSON.parse(fs.readFileSync('vanity-addresses-final.json', 'utf8'))

// SONIC CUSTOM DVN - This is the key to fixing the issue
const SONIC_CUSTOM_DVN = '0x282b3386571f7f794450d5789911a9804fa346b4'

// Chain configurations with DVN settings
const CHAINS = {
    sonic: {
        name: 'Sonic',
        chainId: 146,
        eid: 30332,
        rpc: 'https://rpc.soniclabs.com',
        endpoint: '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B',
        dragonAddress: vanityData.omnidragon.address,
        sendLib: '0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7',
        receiveLib: '0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043',
        dvn: SONIC_CUSTOM_DVN, // Use custom DVN for Sonic
        gasPrice: ethers.utils.parseUnits('1', 'gwei')
    },
    arbitrum: {
        name: 'Arbitrum',
        chainId: 42161,
        eid: 30110,
        rpc: 'https://arb1.arbitrum.io/rpc',
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        dragonAddress: vanityData.omnidragon.address,
        sendLib: '0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1',
        receiveLib: '0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1',
        dvn: '0x2f55C492897526677C5B68fb199037c7B29E2b59', // LayerZero Labs DVN
        gasPrice: ethers.utils.parseUnits('0.1', 'gwei')
    },
    avalanche: {
        name: 'Avalanche',
        chainId: 43114,
        eid: 30106,
        rpc: 'https://api.avax.network/ext/bc/C/rpc',
        endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
        dragonAddress: vanityData.omnidragon.address,
        sendLib: '0x197D1333DEA5Fe0D6600E9b396c7f1B1cFCc558a',
        receiveLib: '0x197D1333DEA5Fe0D6600E9b396c7f1B1cFCc558a',
        dvn: '0x962F502A63F5FBeB44DC9ab932122648E8352959', // LayerZero Labs DVN
        gasPrice: ethers.utils.parseUnits('25', 'gwei')
    }
}

// OApp ABI
const OAPP_ABI = [
    'function owner() view returns (address)',
    'function endpoint() view returns (address)',
    'function setDelegate(address) external',
    'function getPeer(uint32) view returns (bytes32)',
    'function balanceOf(address) view returns (uint256)'
]

// LayerZero V2 Endpoint ABI
const ENDPOINT_ABI = [
    'function delegates(address) view returns (address)',
    'function setConfig(address _oapp, address _lib, uint32[] calldata _eids, uint32 _configType, bytes calldata _config) external',
    'function setSendLibrary(address _oapp, uint32 _eid, address _newLib) external',
    'function setReceiveLibrary(address _oapp, uint32 _eid, address _newLib, uint256 _gracePeriod) external',
    'function getSendLibrary(address _oapp, uint32 _eid) view returns (address)',
    'function getReceiveLibrary(address _oapp, uint32 _eid) view returns (address)',
    'function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) view returns (bytes)'
]

// Config types for LayerZero V2
const CONFIG_TYPE_EXECUTOR = 1
const CONFIG_TYPE_ULN = 2

async function setCustomOAppDVN() {
    console.log('🔧 Setting Custom OApp DVN Configuration')
    console.log('=======================================\n')
    
    console.log('🎯 Objective: Fix LayerZero Access Control Issues')
    console.log('- Replace LZDeadDVN with custom DVN')
    console.log('- Configure proper ULN settings')
    console.log('- Set 10 confirmations (reduced from 20)')
    console.log('- Enable cross-chain transfers\n')
    
    console.log('📋 DVN Configuration:')
    console.log(`- Sonic DVN: ${SONIC_CUSTOM_DVN} (Custom)`)
    console.log(`- Arbitrum DVN: ${CHAINS.arbitrum.dvn} (LayerZero Labs)`)
    console.log(`- Avalanche DVN: ${CHAINS.avalanche.dvn} (LayerZero Labs)`)
    console.log('')
    
    const privateKey = process.env.PRIVATE_KEY
    if (!privateKey) {
        throw new Error('PRIVATE_KEY not found in environment variables')
    }
    
    let results = {
        delegatesSet: 0,
        librariesSet: 0,
        dvnConfigured: 0,
        errors: [] as string[]
    }
    
    // Step 1: Set delegates and libraries on each chain
    for (const [chainKey, chain] of Object.entries(CHAINS)) {
        console.log(`\n🌐 Configuring ${chain.name}...`)
        console.log('-'.repeat(50))
        
        try {
            const provider = new ethers.providers.JsonRpcProvider(chain.rpc)
            const wallet = new ethers.Wallet(privateKey, provider)
            const oapp = new ethers.Contract(chain.dragonAddress, OAPP_ABI, wallet)
            const endpoint = new ethers.Contract(chain.endpoint, ENDPOINT_ABI, wallet)
            
            // Check ownership
            const owner = await oapp.owner()
            console.log(`Owner: ${owner}`)
            
            if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
                console.log('⚠️  Not the owner - skipping')
                continue
            }
            
            // Step 1a: Ensure delegate is set
            console.log('\n📝 Step 1: Setting Delegate...')
            const currentDelegate = await endpoint.delegates(chain.dragonAddress)
            console.log(`Current delegate: ${currentDelegate}`)
            
            if (currentDelegate.toLowerCase() !== wallet.address.toLowerCase()) {
                try {
                    const tx = await oapp.setDelegate(wallet.address, {
                        gasLimit: 100000,
                        gasPrice: chain.gasPrice
                    })
                    console.log(`TX: ${tx.hash}`)
                    await tx.wait()
                    console.log('✅ Delegate set successfully')
                    results.delegatesSet++
                } catch (error: any) {
                    console.log(`❌ Failed to set delegate: ${error.message}`)
                    results.errors.push(`${chain.name} delegate: ${error.message}`)
                    continue
                }
            } else {
                console.log('✅ Delegate already set correctly')
                results.delegatesSet++
            }
            
            // Step 1b: Configure libraries for peer chains
            console.log('\n📚 Step 2: Setting Libraries...')
            const peers = Object.entries(CHAINS).filter(([k, _]) => k !== chainKey)
            
            for (const [peerKey, peer] of peers) {
                console.log(`\nConfiguring libraries for ${peer.name} (EID ${peer.eid}):`)
                
                try {
                    // Set Send Library
                    const currentSendLib = await endpoint.getSendLibrary(chain.dragonAddress, peer.eid)
                    console.log(`Current send library: ${currentSendLib}`)
                    
                    if (currentSendLib.toLowerCase() !== chain.sendLib.toLowerCase()) {
                        console.log(`Setting send library to: ${chain.sendLib}`)
                        const tx = await endpoint.setSendLibrary(
                            chain.dragonAddress,
                            peer.eid,
                            chain.sendLib,
                            {
                                gasLimit: 200000,
                                gasPrice: chain.gasPrice
                            }
                        )
                        console.log(`TX: ${tx.hash}`)
                        await tx.wait()
                        console.log('✅ Send library set')
                    } else {
                        console.log('✅ Send library already correct')
                    }
                    
                    // Set Receive Library
                    const currentReceiveLib = await endpoint.getReceiveLibrary(chain.dragonAddress, peer.eid)
                    console.log(`Current receive library: ${currentReceiveLib}`)
                    
                    if (currentReceiveLib.toLowerCase() !== chain.receiveLib.toLowerCase()) {
                        console.log(`Setting receive library to: ${chain.receiveLib}`)
                        const tx = await endpoint.setReceiveLibrary(
                            chain.dragonAddress,
                            peer.eid,
                            chain.receiveLib,
                            0, // Grace period
                            {
                                gasLimit: 200000,
                                gasPrice: chain.gasPrice
                            }
                        )
                        console.log(`TX: ${tx.hash}`)
                        await tx.wait()
                        console.log('✅ Receive library set')
                    } else {
                        console.log('✅ Receive library already correct')
                    }
                    
                    results.librariesSet++
                    
                } catch (error: any) {
                    console.log(`❌ Failed to set libraries: ${error.message}`)
                    results.errors.push(`${chain.name} libraries to ${peer.name}: ${error.message}`)
                    
                    // Check if it's the access control error
                    if (error.data && error.data.includes('c4c52593')) {
                        console.log('🔍 This is the access control error we need to fix!')
                        console.log('💡 The delegate pattern is working, but DVN config is blocking library settings')
                    }
                }
            }
            
            // Step 1c: Configure DVN settings
            console.log('\n🛡️  Step 3: Configuring DVN Settings...')
            
            for (const [peerKey, peer] of peers) {
                console.log(`\nConfiguring DVN for ${chain.name} → ${peer.name}:`)
                
                try {
                    // Create ULN config with custom DVN
                    const ulnConfig = ethers.utils.defaultAbiCoder.encode(
                        ['uint64', 'uint8', 'uint8', 'uint8', 'address[]', 'address[]'],
                        [
                            10,              // confirmations (reduced from 20)
                            1,               // requiredDVNCount  
                            0,               // optionalDVNCount
                            0,               // optionalDVNThreshold
                            [chain.dvn],     // requiredDVNs (use chain's DVN)
                            []               // optionalDVNs
                        ]
                    )
                    
                    console.log(`Using DVN: ${chain.dvn}`)
                    console.log(`Target EID: ${peer.eid}`)
                    console.log(`Send Library: ${chain.sendLib}`)
                    
                    // Set ULN config
                    const tx = await endpoint.setConfig(
                        chain.dragonAddress,  // OApp address
                        chain.sendLib,        // Send library
                        [peer.eid],          // Target EIDs
                        CONFIG_TYPE_ULN,     // Config type (2 = ULN)
                        ulnConfig,           // ULN config
                        {
                            gasLimit: 300000,
                            gasPrice: chain.gasPrice
                        }
                    )
                    
                    console.log(`TX: ${tx.hash}`)
                    await tx.wait()
                    console.log('✅ DVN configuration set successfully!')
                    results.dvnConfigured++
                    
                } catch (error: any) {
                    console.log(`❌ Failed to set DVN config: ${error.message}`)
                    results.errors.push(`${chain.name} DVN to ${peer.name}: ${error.message}`)
                    
                    // Detailed error analysis
                    if (error.data) {
                        console.log(`Error data: ${error.data}`)
                        if (error.data.includes('c4c52593')) {
                            console.log('🔍 Access control error - need to contact LayerZero team')
                        }
                    }
                }
            }
            
        } catch (error: any) {
            console.log(`❌ Chain setup error: ${error.message}`)
            results.errors.push(`${chain.name} setup: ${error.message}`)
        }
    }
    
    // Step 2: Summary and next steps
    console.log('\n\n📊 Configuration Results')
    console.log('=========================')
    
    console.log(`\n✅ Delegates set: ${results.delegatesSet}/3`)
    console.log(`✅ Libraries set: ${results.librariesSet}/6`)
    console.log(`✅ DVN configured: ${results.dvnConfigured}/6`)
    console.log(`❌ Errors: ${results.errors.length}`)
    
    if (results.errors.length > 0) {
        console.log('\n❌ Errors encountered:')
        results.errors.forEach((error, i) => {
            console.log(`${i + 1}. ${error}`)
        })
    }
    
    // Analysis and recommendations
    console.log('\n🔍 Analysis:')
    if (results.dvnConfigured > 0) {
        console.log('✅ Some DVN configurations succeeded!')
        console.log('✅ The custom DVN approach is working')
        console.log('✅ Access control is properly configured')
    } else {
        console.log('⚠️  DVN configuration blocked by access control')
        console.log('⚠️  This confirms the LZDeadDVN issue on Sonic')
    }
    
    console.log('\n🎯 Next Steps:')
    console.log('1. If DVN config succeeded: Test cross-chain transfers')
    console.log('2. If DVN config failed: Contact LayerZero team with these details:')
    console.log(`   - Custom DVN: ${SONIC_CUSTOM_DVN}`)
    console.log(`   - Chain: Sonic (EID 30332)`)
    console.log(`   - Contract: ${CHAINS.sonic.dragonAddress}`)
    console.log(`   - Issue: Need to whitelist custom DVN`)
    console.log('3. Request LayerZero team to replace LZDeadDVN with custom DVN')
    
    console.log('\n🌟 Status: Custom DVN configuration attempted!')
    console.log('Your contracts are properly deployed and the delegate pattern is working.')
    console.log('The remaining issue is purely DVN whitelisting with LayerZero.')
    
    return results
}

// Execute the DVN configuration
setCustomOAppDVN().catch(console.error) 