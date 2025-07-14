import { ethers } from 'hardhat'
import hre from 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'

async function main() {
    const [deployer] = await ethers.getSigners()
    
    console.log(`\n=== Testing Cross-Chain Transfer from Sonic ===`)
    console.log(`Deployer: ${deployer.address}`)
    console.log(`Network: ${hre.network.name}`)
    
    // Contract address (same on all chains)
    const dragonAddress = "0x69403746cc8611da542e70a7dd59e98206430777"
    
    // Get dragon contract
    const dragon = await ethers.getContractAt("omniDRAGON", dragonAddress)
    
    // Check balance
    const balance = await dragon.balanceOf(deployer.address)
    console.log(`Current Balance: ${ethers.utils.formatEther(balance)} DRAGON`)
    
    if (balance.eq(0)) {
        console.log(`❌ No DRAGON tokens to transfer`)
        return
    }
    
    // Test transfer amount (1 DRAGON)
    const transferAmount = ethers.utils.parseEther("1")
    
    // Destination: Arbitrum
    const arbitrumEID = EndpointId.ARBITRUM_V2_MAINNET // 30110
    
    // Recipient (same deployer address on Arbitrum)
    const recipient = deployer.address
    const recipientBytes32 = ethers.utils.hexZeroPad(recipient, 32)
    
    console.log(`\n=== Transfer Details ===`)
    console.log(`From: Sonic (EID: ${EndpointId.SONIC_V2_MAINNET})`)
    console.log(`To: Arbitrum (EID: ${arbitrumEID})`)
    console.log(`Amount: ${ethers.utils.formatEther(transferAmount)} DRAGON`)
    console.log(`Recipient: ${recipient}`)
    
    try {
        // Prepare send parameters
        const sendParam = {
            dstEid: arbitrumEID,
            to: recipientBytes32,
            amountLD: transferAmount,
            minAmountLD: transferAmount, // No slippage for test
            extraOptions: "0x",
            composeMsg: "0x",
            oftCmd: "0x"
        }
        
        console.log(`\n=== Getting Quote ===`)
        const quote = await dragon.quoteSend(sendParam, false)
        
        console.log(`Quote Result:`)
        console.log(`- Native Fee: ${ethers.utils.formatEther(quote.nativeFee)} ETH`)
        console.log(`- LZ Token Fee: ${ethers.utils.formatEther(quote.lzTokenFee)} LZ`)
        
        // Check if we have enough ETH for the fee
        const ethBalance = await deployer.getBalance()
        console.log(`ETH Balance: ${ethers.utils.formatEther(ethBalance)} ETH`)
        
        if (ethBalance.lt(quote.nativeFee)) {
            console.log(`❌ Insufficient ETH for transfer fee`)
            console.log(`Need: ${ethers.utils.formatEther(quote.nativeFee)} ETH`)
            console.log(`Have: ${ethers.utils.formatEther(ethBalance)} ETH`)
            return
        }
        
        console.log(`\n=== Executing Transfer ===`)
        console.log(`Sending ${ethers.utils.formatEther(transferAmount)} DRAGON to Arbitrum...`)
        
        // Execute the transfer
        const tx = await dragon.send(
            sendParam,
            { nativeFee: quote.nativeFee, lzTokenFee: quote.lzTokenFee },
            recipient,
            { value: quote.nativeFee }
        )
        
        console.log(`Transaction sent: ${tx.hash}`)
        console.log(`Waiting for confirmation...`)
        
        const receipt = await tx.wait()
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`)
        
        // Check updated balance
        const newBalance = await dragon.balanceOf(deployer.address)
        console.log(`\nUpdated Balance: ${ethers.utils.formatEther(newBalance)} DRAGON`)
        console.log(`Transferred: ${ethers.utils.formatEther(balance.sub(newBalance))} DRAGON`)
        
        console.log(`\n🎉 Cross-chain transfer successful!`)
        console.log(`Now check your balance on Arbitrum: npx hardhat run scripts/test-layerzero-connection.ts --network arbitrum-mainnet`)
        
    } catch (error) {
        console.error(`❌ Transfer failed:`, error.message)
        
        // Try to get more specific error info
        if (error.reason) {
            console.error(`Reason: ${error.reason}`)
        }
        if (error.code) {
            console.error(`Code: ${error.code}`)
        }
    }
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
}) 