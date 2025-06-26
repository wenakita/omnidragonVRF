// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

/**
 * @title ILayerZeroReceiver
 * @dev Interface for contracts that receive LayerZero messages
 *
 * Defines callback functionality for processing cross-chain messages
 * Essential for contracts that receive LayerZero communications in OmniDragon
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
interface ILayerZeroReceiver {
  /**
   * @dev Handle incoming LayerZero message
   * @param _origin Origin information
   * @param _guid Message GUID
   * @param _message Message payload
   * @param _executor Executor address
   * @param _extraData Extra data
   */
  function lzReceive(
    Origin calldata _origin,
    bytes32 _guid,
    bytes calldata _message,
    address _executor,
    bytes calldata _extraData
  ) external;
}

/**
 * @dev Origin information for incoming messages
 */
struct Origin {
  uint32 srcEid; // Source endpoint ID
  bytes32 sender; // Source sender address
  uint64 nonce; // Message nonce
}
