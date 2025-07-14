import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { EndpointId, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'
import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'
import { Options } from '@layerzerolabs/lz-v2-utilities'
import { BigNumberish, BytesLike } from 'ethers'
import { createLogger } from '@layerzerolabs/io-devtools'

const logger = createLogger()

interface Args {
    amount: string
    to: string
    toEid: EndpointId
}

interface SendParam {
    dstEid: EndpointId // Destination endpoint ID, represented as a number.
    to: BytesLike // Recipient address, represented as bytes.
    amountLD: BigNumberish // Amount to send in local decimals.
    minAmountLD: BigNumberish // Minimum amount to send in local decimals.
    extraOptions: BytesLike // Additional options supplied by the caller to be used in the LayerZero message.
    composeMsg: BytesLike // The composed message for the send() operation.
    oftCmd: BytesLike // The OFT command to be executed, unused in default OFT implementations.
}

// send tokens from a contract on one network to another
task('lz:oft:send', 'Sends tokens from either OFT or OFTAdapter')
    .addParam('to', 'recipient address on destination network', undefined, types.string)
    .addParam('toEid', 'destination endpoint ID', undefined, types.int)
    .addParam('amount', 'amount to transfer in token decimals', undefined, types.string)
    .setAction(async (taskArgs: Args, hre: HardhatRuntimeEnvironment) => {
        const { ethers, deployments } = hre
        const toAddress = taskArgs.to
        const eidB = taskArgs.toEid

        logger.info(`Initiating OFT transfer from ${hre.network.name} to ${endpointIdToNetwork(eidB)}`)
        logger.info(`Recipient: ${toAddress}`)
        logger.info(`Amount: ${taskArgs.amount}`)

        // Get the contract factories
        const oftDeployment = await deployments.get('MyOFT')

        const [signer] = await ethers.getSigners()
        logger.info(`Using signer: ${signer.address}`)

        // Create contract instances
        const oftContract = new ethers.Contract(oftDeployment.address, oftDeployment.abi, signer)

        const decimals = await oftContract.decimals()
        const amount = ethers.utils.parseUnits(taskArgs.amount, decimals)
        let options = Options.newOptions().addExecutorLzReceiveOption(65000, 0).toBytes()

        // Now you can interact with the correct contract
        const oft = oftContract

        const sendParam: SendParam = {
            dstEid: eidB,
            to: addressToBytes32(toAddress),
            amountLD: amount,
            minAmountLD: amount,
            extraOptions: options,
            composeMsg: ethers.utils.arrayify('0x'), // Assuming no composed message
            oftCmd: ethers.utils.arrayify('0x'), // Assuming no OFT command is needed
        }
        
        // Get the quote for the send operation
        logger.info('Quoting gas cost for the send transaction...')
        const feeQuote = await oft.quoteSend(sendParam, false)
        const nativeFee = feeQuote.nativeFee
        logger.info(`  Native fee: ${ethers.utils.formatEther(nativeFee)} ETH`)

        logger.info(
            `Sending ${taskArgs.amount} token(s) to network ${endpointIdToNetwork(eidB)} (${eidB})`
        )

        const r = await oft.send(sendParam, { nativeFee: nativeFee, lzTokenFee: 0 }, signer.address, {
            value: nativeFee,
        })
        logger.info(`Send tx initiated. Transaction hash: ${r.hash}`)
        logger.info(`LayerZero Scan: https://layerzeroscan.com/tx/${r.hash}`)
        
        // Wait for confirmation
        logger.info('Waiting for transaction confirmation...')
        const receipt = await r.wait()
        logger.info(`Transaction confirmed in block ${receipt.blockNumber}`)
        
        return {
            txHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
        }
    }) 