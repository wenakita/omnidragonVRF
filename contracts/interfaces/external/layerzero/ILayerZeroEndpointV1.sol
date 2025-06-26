// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { ILayerZeroUserApplicationConfig } from "./ILayerZeroUserApplicationConfig.sol";

/**
 * @title ILayerZeroEndpointV1
 * @dev Interface for the LayerZero endpoint V1
 *
 * Provides V1-specific functionality for cross-chain messaging
 * Legacy compatibility layer for OmniDragon's LayerZero integration
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
interface ILayerZeroEndpointV1 is ILayerZeroUserApplicationConfig {
    // @notice Returns the LayerZero endpoint version
    function getVersion() external view returns (uint16);

    // @notice Returns the chain ID used by the endpoint
    function getChainId() external view returns (uint16);

    // @notice Get the default receive library address
    function defaultReceiveLibraryAddress() external view returns (address);

    // @notice Get the inbound nonce for a specific chain and address
    function getInboundNonce(uint16 _chainId, bytes calldata _path) external view returns (uint64);

    // @notice Get the outbound nonce for a specific chain and address
    function getOutboundNonce(uint16 _chainId, address _srcAddress) external view returns (uint64);

    // @notice Estimate fees for sending a message
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParams
    ) external view returns (uint nativeFee, uint zroFee);

    // @notice Send a cross-chain message
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;

    // @notice used by the messaging library to publish verified payload
    function receivePayload(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        address _dstAddress,
        uint64 _nonce,
        uint _gasLimit,
        bytes calldata _payload
    ) external;

    // @notice the interface to retry failed message on this Endpoint destination
    function retryPayload(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        bytes calldata _payload
    ) external;

    // @notice query if any STORED payload (message blocking) at the endpoint.
    function hasStoredPayload(uint16 _srcChainId, bytes calldata _srcAddress) external view returns (bool);
}
