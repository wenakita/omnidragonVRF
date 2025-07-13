// SPDX-License-Identifier: MIT

/**
 * @title IReceiver
 * @dev Interface for LayerZero message receiving functionality
 *
 * Defines callback interface for processing incoming LayerZero messages
 * Essential for contracts that need to receive cross-chain communications
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */

pragma solidity ^0.8.18;

interface IReceiver {
    /**
     * @notice Called when a message is received from LayerZero
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source address from the source chain
     * @param _nonce A number that indicates the order of messages
     * @param _payload The message payload
     */
    function lzReceive(uint16 _srcChainId, bytes memory _srcAddress, uint64 _nonce, bytes memory _payload) external;
}
