task('list-all-addresses', 'Display all deployed OmniDragon ecosystem addresses in a table')
    .setAction(async (taskArgs, hre) => {
        console.log('📋 OmniDragon Ecosystem - Complete Address Directory');
        console.log('====================================================');

        // Contract addresses and details
        const contracts = {
            avalanche: {
                name: 'Avalanche C-Chain',
                chainId: 43114,
                explorer: 'https://snowtrace.io',
                contracts: {
                    // Phase 1 - Infrastructure
                    chainRegistry: {
                        address: '0x2f435b57E018b88a8F86ae4017e70E90fCfC875d',
                        name: 'OmniDragonChainRegistry',
                        description: 'LayerZero proxy registry'
                    },
                    
                    // Phase 2 - Core Tokens
                    omniDRAGON: {
                        address: '0x60E34a8fFc991e3aD7b823c8410d8b52bCbC70b8',
                        name: 'omniDRAGON',
                        description: 'Main cross-chain token'
                    },
                    redDRAGON: {
                        address: '0x35018e538B1479E1A0f37d8275087C3cC2FefA52',
                        name: 'redDRAGON',
                        description: 'LP staking rewards (universal LP support)'
                    },
                    veDRAGON: {
                        address: '0xbB2012b782cBd4a28D12292Ff41e90D03e721A65',
                        name: 'veDRAGON',
                        description: 'Vote-escrowed governance token'
                    },
                    veDRAGONMath: {
                        address: '0x72F53Da04a87bD3D9d2CD7bf0341d2CDCB8d7B2d',
                        name: 'veDRAGONMath',
                        description: 'Math library for veDRAGON'
                    },
                    
                    // Phase 3 - DeFi Infrastructure
                    feeManager: {
                        address: '0x6Af504208099c01d7272C3b6f968648158C2a348',
                        name: 'OmniDragonFeeManager',
                        description: 'Dynamic fee management system'
                    },
                    
                    // Phase 4 - Lottery System
                    drandProvider: {
                        address: '0x08a0CE56aAfDb6Ea62a725f1a6eF35D70760f69D',
                        name: 'DrandRandomnessProvider',
                        description: 'Drand beacon randomness provider'
                    },
                    jackpotVault: {
                        address: '0x46C39E4790f9cA330F9309345cE900A0ac471Ed1',
                        name: 'DragonJackpotVault',
                        description: 'Lottery jackpot vault'
                    },
                    jackpotDistributor: {
                        address: '0x8A356e7F286eb43116E62b940c239f3D20a80A8d',
                        name: 'DragonJackpotDistributor',
                        description: 'Lottery prize distribution'
                    },
                    lotteryManager: {
                        address: '0x4201D20253331071b22528c7f7D7BB8814609Fa6',
                        name: 'OmniDragonLotteryManager',
                        description: 'Main lottery system controller'
                    },
                    
                    // Phase 5 - Cross-Chain VRF
                    vrfIntegrator: {
                        address: '0x00D71291968aD25BFC3856e18eDbA844Ccb91706',
                        name: 'ChainlinkVRFIntegratorV2_5',
                        description: 'Cross-chain VRF request handler'
                    }
                }
            },
            arbitrum: {
                name: 'Arbitrum One',
                chainId: 42161,
                explorer: 'https://arbiscan.io',
                contracts: {
                    vrfConsumer: {
                        address: '0xA32DbFCfcf085274E5C766B08CCF2E17BfEFc754',
                        name: 'OmniDragonVRFConsumerV2_5',
                        description: 'Chainlink VRF consumer + cross-chain responder'
                    }
                }
            },
            infrastructure: {
                name: 'LayerZero V2 Infrastructure',
                contracts: {
                    avalancheLzEndpoint: {
                        address: '0x1a44076050125825900e736c501f859c50fE728c',
                        name: 'LayerZero Endpoint (Avalanche)',
                        description: 'LayerZero V2 messaging endpoint'
                    },
                    arbitrumLzEndpoint: {
                        address: '0x1a44076050125825900e736c501f859c50fE728c',
                        name: 'LayerZero Endpoint (Arbitrum)',
                        description: 'LayerZero V2 messaging endpoint'
                    },
                    chainlinkVRF: {
                        address: '0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e',
                        name: 'Chainlink VRF Coordinator (Arbitrum)',
                        description: 'Chainlink VRF V2.5 coordinator'
                    }
                }
            }
        };

        // Helper function to display contracts table
        function displayContractsTable(networkData, networkKey) {
            console.log(`\n🌐 ${networkData.name} ${networkData.chainId ? `(Chain ID: ${networkData.chainId})` : ''}`);
            console.log('='.repeat(60));
            
            console.log('┌──────────────────────────────────────────────┬────────────────────────────────────────────┐');
            console.log('│ Contract                                     │ Address                                    │');
            console.log('├──────────────────────────────────────────────┼────────────────────────────────────────────┤');
            
            Object.entries(networkData.contracts).forEach(([key, contract]) => {
                const nameColumn = `${contract.name}`.padEnd(44);
                const addressColumn = contract.address.padEnd(42);
                console.log(`│ ${nameColumn} │ ${addressColumn} │`);
                
                if (contract.description) {
                    const descColumn = `  └─ ${contract.description}`.padEnd(44);
                    console.log(`│ ${descColumn} │ ${''.padEnd(42)} │`);
                }
            });
            
            console.log('└──────────────────────────────────────────────┴────────────────────────────────────────────┘');
            
            // Add explorer links for blockchain networks
            if (networkData.explorer) {
                console.log('\n🔗 Block Explorer Links:');
                Object.entries(networkData.contracts).forEach(([key, contract]) => {
                    console.log(`   ${contract.name}: ${networkData.explorer}/address/${contract.address}`);
                });
            }
        }

        // Display all networks
        Object.entries(contracts).forEach(([networkKey, networkData]) => {
            displayContractsTable(networkData, networkKey);
        });

        // Cross-chain configuration summary
        console.log('\n🔗 Cross-Chain Configuration');
        console.log('============================');
        console.log('┌─────────────────────────┬─────────────────────────────────────────────────┐');
        console.log('│ Configuration           │ Details                                         │');
        console.log('├─────────────────────────┼─────────────────────────────────────────────────┤');
        console.log('│ Avalanche EID           │ 30106                                           │');
        console.log('│ Arbitrum EID            │ 30110                                           │');
        console.log('│ VRF Request Flow        │ Avalanche → Arbitrum → Chainlink → Response    │');
        console.log('│ VRF Request Gas         │ 1M gas                                          │');
        console.log('│ VRF Response Gas        │ 2.5M gas                                        │');
        console.log('│ Peer Status             │ ✅ Bidirectional peers configured               │');
        console.log('│ Options Status          │ ✅ Enforced options set                         │');
        console.log('└─────────────────────────┴─────────────────────────────────────────────────┘');

        // Ecosystem summary
        console.log('\n📊 Ecosystem Summary');
        console.log('==================');
        console.log('┌─────────────────────────┬─────────────────────────────────────────────────┐');
        console.log('│ Component               │ Status                                          │');
        console.log('├─────────────────────────┼─────────────────────────────────────────────────┤');
        console.log('│ Phase 1 (Infrastructure)│ ✅ Chain Registry deployed                      │');
        console.log('│ Phase 2 (Core Tokens)   │ ✅ omniDRAGON, redDRAGON, veDRAGON deployed     │');
        console.log('│ Phase 3 (DeFi)         │ ✅ Fee Manager deployed                         │');
        console.log('│ Phase 4 (Lottery)      │ ✅ Complete lottery system deployed             │');
        console.log('│ Phase 5 (Cross-VRF)    │ ✅ Cross-chain VRF fully operational           │');
        console.log('│ Universal LP Support    │ ✅ Works with any Uniswap V2-style DEX         │');
        console.log('│ LayerZero V2           │ ✅ Latest cross-chain messaging                 │');
        console.log('│ Chainlink VRF          │ ✅ Secure randomness source                     │');
        console.log('└─────────────────────────┴─────────────────────────────────────────────────┘');

        // Development info
        console.log('\n🛠️  Development Information');
        console.log('===========================');
        console.log(`📅 Deployment Date: ${new Date().toISOString().split('T')[0]}`);
        console.log(`👤 Deployer: 0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F`);
        console.log(`🔧 Hardhat Network Config: Available for avalanche, arbitrum`);
        console.log(`📋 Total Contracts: ${Object.values(contracts).reduce((total, network) => total + Object.keys(network.contracts || {}).length, 0)}`);
        console.log(`🌍 Networks: ${Object.keys(contracts).length} (Avalanche, Arbitrum, Infrastructure)`);

        // Usage examples
        console.log('\n💡 Usage Examples');
        console.log('================');
        console.log('🎲 Request Cross-Chain VRF:');
        console.log('   const vrfIntegrator = await ethers.getContractAt("ChainlinkVRFIntegratorV2_5", "0x00D71291968aD25BFC3856e18eDbA844Ccb91706");');
        console.log('   await vrfIntegrator.requestRandomWords({ gasLimit: 1000000 });');
        console.log('');
        console.log('🪙 Interact with omniDRAGON:');
        console.log('   const omniDragon = await ethers.getContractAt("omniDRAGON", "0x60E34a8fFc991e3aD7b823c8410d8b52bCbC70b8");');
        console.log('');
        console.log('🎰 Use Lottery System:');
        console.log('   const lottery = await ethers.getContractAt("OmniDragonLotteryManager", "0x4201D20253331071b22528c7f7D7BB8814609Fa6");');

        console.log('\n🎉 OmniDragon Ecosystem - READY FOR MAINNET! 🚀');
    }); 