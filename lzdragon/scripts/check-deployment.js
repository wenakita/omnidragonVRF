const { ethers } = require('hardhat');

async function main() {
    const address = '0x690E5d16e171E3545895F3E064c25a8858A30777';
    console.log(`Checking address: ${address}`);
    
    const code = await ethers.provider.getCode(address);
    console.log(`Code length: ${code.length}`);
    console.log(`Already deployed: ${code !== '0x'}`);
    
    if (code !== '0x') {
        console.log('Contract is already deployed!');
        // Try to interact with it
        try {
            const contract = await ethers.getContractAt('omniDRAGON', address);
            const name = await contract.name();
            const symbol = await contract.symbol();
            const totalSupply = await contract.totalSupply();
            const owner = await contract.owner();
            
            console.log(`Name: ${name}`);
            console.log(`Symbol: ${symbol}`);
            console.log(`Total Supply: ${ethers.utils.formatEther(totalSupply)} DRAGON`);
            console.log(`Owner: ${owner}`);
        } catch (error) {
            console.log('Error interacting with contract:', error.message);
        }
    }
}

main().catch(console.error); 