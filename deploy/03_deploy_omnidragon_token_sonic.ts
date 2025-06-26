import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployOmniDragonToken: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  // Only deploy on sonic network
  if (network.name !== 'sonic') {
    console.log('Not on sonic network, skipping omniDRAGON deployment.');
    return;
  }

  try {
    // Use existing CREATE2 factory (UPDATED - 🔐 LIVE STREAMING SAFE)
    const EXISTING_FACTORY_ADDRESS = '0xAA28020DDA6b954D16208eccF873D79AC6533833';
    
    console.log('🏭 Using existing CREATE2FactoryWithOwnership at:', EXISTING_FACTORY_ADDRESS);
    console.log('🪙 Deploying omniDRAGON Token using CREATE2...');
    console.log('Deployer:', deployer);

    // Get the factory contract
    const factory = await ethers.getContractAt('CREATE2FactoryWithOwnership', EXISTING_FACTORY_ADDRESS);

    // Get the omniDRAGON contract factory
    const OmniDRAGONFactory = await ethers.getContractFactory('omniDRAGON');
    const bytecode = OmniDRAGONFactory.bytecode;

    // Create a deterministic salt for cross-chain deployment
    // Using a fixed string to ensure same address across all chains
    const salt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('OMNIDRAGON_TOKEN_V1'));
    
    console.log('Salt:', salt);
    console.log('Bytecode hash:', ethers.utils.keccak256(bytecode));

    // Compute the expected address
    const expectedAddress = await factory.computeAddress(salt, ethers.utils.keccak256(bytecode));
    console.log('Expected omniDRAGON address:', expectedAddress);

    // Check if already deployed
    const existingDeployment = await factory.deploymentBySalt(salt);
    
    let omniDRAGONAddress;
    
    if (existingDeployment !== ethers.constants.AddressZero) {
      console.log('✅ omniDRAGON already deployed at:', existingDeployment);
      omniDRAGONAddress = existingDeployment;
    } else {
      // Deploy using CREATE2
      console.log('Deploying omniDRAGON with CREATE2...');
      const tx = await factory.deploy(bytecode, salt, 'omniDRAGON');
      const receipt = await tx.wait();
      
      // Get the deployed address from the event
      const deployedEvent = receipt.events?.find((e: any) => e.event === 'ContractDeployed');
      omniDRAGONAddress = deployedEvent?.args?.deployed;
      
      console.log(`✅ omniDRAGON deployed via CREATE2 to: ${omniDRAGONAddress}`);
    }

    // Save deployment info for hardhat-deploy
    await deployments.save('omniDRAGON', {
      address: omniDRAGONAddress,
      abi: OmniDRAGONFactory.interface.fragments.map(f => f.format('json')).map(f => JSON.parse(f)),
      bytecode: bytecode,
      deployedBytecode: await ethers.provider.getCode(omniDRAGONAddress),
      args: [],
      receipt: {
        from: deployer,
        to: EXISTING_FACTORY_ADDRESS,
        contractAddress: omniDRAGONAddress,
        transactionIndex: 0,
        gasUsed: ethers.BigNumber.from('0'),
        logsBloom: '0x',
        blockHash: '0x',
        transactionHash: '0x',
        logs: [],
        blockNumber: 0,
        confirmations: 1,
        cumulativeGasUsed: ethers.BigNumber.from('0'),
        status: 1,
        type: 2,
        byzantium: true
      } as any
    });

    console.log('\n📋 Deployment Summary:');
    console.log('=====================');
    console.log(`🏭 CREATE2Factory: ${EXISTING_FACTORY_ADDRESS}`);
    console.log(`🪙 omniDRAGON: ${omniDRAGONAddress}`);
    console.log(`   - Name: Dragon`);
    console.log(`   - Symbol: DRAGON`);
    console.log(`   - Network: Sonic (${network.config.chainId})`);
    console.log(`   - Deterministic: ✅ (same address on all chains)`);
    console.log(`   - Explorer: https://sonicscan.org/address/${omniDRAGONAddress}`);
    console.log('');
    console.log('🔧 Next Steps:');
    console.log('1. Deploy on other chains using same salt for identical address');
    console.log('2. Configure LayerZero cross-chain functionality');
    console.log('3. Set up token distribution parameters');
    console.log('4. Configure vault and lottery integration');

    // Verify the token contract
    const token = await ethers.getContractAt('omniDRAGON', omniDRAGONAddress);
    const name = await token.name();
    const symbol = await token.symbol();
    const owner = await token.owner();
    
    console.log('\n✅ Token Verification:');
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Owner: ${owner}`);
    console.log(`   - Deployer: ${deployer}`);

  } catch (error: any) {
    console.error('❌ omniDRAGON deployment failed:', error);
    if (error && error.stack) {
      console.error(error.stack);
    }
  }
};

export default deployOmniDragonToken;
deployOmniDragonToken.tags = ['omniDRAGON', 'token', 'create2', 'sonic'];
deployOmniDragonToken.dependencies = []; // No dependencies - uses existing factory 