// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ILayerZeroEndpointV1 } from "./ILayerZeroEndpointV1.sol";
import { ILayerZeroEndpointV2 } from "./ILayerZeroEndpointV2.sol";

/**
 * @title ILayerZero
 * @dev Combined interfaces for LayerZero V1 and V2
 *
 * Resolves function overload clashes between different LayerZero versions
 * Enables seamless cross-chain communication for the OmniDragon ecosystem
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */

// LayerZero V1 interfaces
interface ILayerZeroReceiverV1 {
    /**
     * @dev Receive messages from the LayerZero endpoint (V1)
     * @param _srcChainId Chain ID of the source chain
     * @param _srcAddress Address of the source contract (in bytes)
     * @param _nonce Nonce of the message
     * @param _payload Payload of the message
     */
    function lzReceiveV1(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external;
}

// LayerZero V2 interfaces
interface ILayerZeroReceiverV2 {
    /**
     * @notice Origin information for incoming messages
     */
    struct Origin {
        uint32 srcEid;        // Source endpoint ID
        bytes32 sender;       // Source sender address (as bytes32)
        uint64 nonce;         // Message nonce
    }

    /**
     * @dev Receive messages from the LayerZero endpoint (V2)
     * @param _origin Origin information
     * @param _guid Message GUID
     * @param _message Message content
     * @param _executor Executor address
     * @param _extraData Extra data
     */
    function lzReceiveV2(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external;
}
