// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Structs used by the interface
struct MessagingParams {
  uint32 dstEid;
  bytes32 receiver;
  bytes message;
  bytes options;
  bool payInLzToken;
}

struct MessagingReceipt {
  bytes32 guid;
  uint64 nonce;
  MessagingFee fee;
}

struct MessagingFee {
  uint256 nativeFee;
  uint256 lzTokenFee;
}

struct Origin {
  uint32 srcEid;
  bytes32 sender;
  uint64 nonce;
}

struct SetConfigParam {
  uint32 eid;
  uint32 configType;
  bytes config;
}

/**
 * @title ILayerZeroEndpointV2
 * @dev Interface for LayerZero V2 endpoint
 */
interface ILayerZeroEndpointV2 {
  /**
   * @dev Send a message to another chain
   * @param _params Messaging parameters
   * @param _refundAddress Address to refund excess fees
   * @return receipt Messaging receipt with GUID and fee info
   */
  function send(
    MessagingParams calldata _params,
    address _refundAddress
  ) external payable returns (MessagingReceipt memory receipt);

  /**
   * @dev Quote the fee for sending a message
   * @param _params Messaging parameters
   * @param _sender Sender address
   * @return fee The messaging fee quote
   */
  function quote(MessagingParams calldata _params, address _sender) external view returns (MessagingFee memory fee);

  /**
   * @dev Set configuration for a specific endpoint and library
   * @param _oappAddress OApp address
   * @param _lib Library address
   * @param _params Configuration parameters
   */
  function setConfig(address _oappAddress, address _lib, SetConfigParam[] calldata _params) external;

  /**
   * @dev Get configuration
   * @param _oappAddress OApp address
   * @param _lib Library address
   * @param _eid Endpoint ID
   * @param _configType Configuration type
   * @return config Configuration bytes
   */
  function getConfig(
    address _oappAddress,
    address _lib,
    uint32 _eid,
    uint32 _configType
  ) external view returns (bytes memory config);

  /**
   * @dev Check if path is initialized
   * @param _oappAddress OApp address
   * @param _eid Endpoint ID
   * @param _sender Sender address
   * @return initialized Whether the path is initialized
   */
  function isInitialized(address _oappAddress, uint32 _eid, bytes32 _sender) external view returns (bool initialized);
}
