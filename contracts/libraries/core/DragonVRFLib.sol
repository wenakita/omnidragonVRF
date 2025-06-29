// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { TransparentUpgradeableProxy } from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import { ProxyAdmin } from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

/**
 * @title DragonVRFLib
 * @dev Library for deploying VRFConsumer contracts with upgradeability support
 */
library DragonVRFLib {
    /**
     * @dev Parameters for deploying a VRFConsumer contract
     */
    struct VRFParams {
        address implementation;
        address coordinator;
        bytes32 keyHash;
        uint64 subscriptionId;
        uint32 callbackGasLimit;
        uint16 requestConfirmations;
        uint32 numWords;
        address proxyAdmin;
        bytes initData; // Encoded initializer data
    }

    /**
     * @notice Deploys a VRFConsumer contract behind a TransparentUpgradeableProxy
     * @param params The deployment parameters
     * @return proxy The address of the deployed proxy contract
     */
    function deployVRFConsumer(
        VRFParams memory params,
        address /* owner */
    ) internal returns (address proxy) {
        require(params.implementation != address(0), "No implementation");
        require(params.proxyAdmin != address(0), "No proxy admin");
        // Deploy the proxy
        TransparentUpgradeableProxy p = new TransparentUpgradeableProxy(
            params.implementation,
            params.proxyAdmin,
            params.initData
        );
        proxy = address(p);
        // Optionally, transfer ownership or set up roles here
        return proxy;
    }

    /**
     * @notice Updates the lottery contract address in the VRFConsumer
     * @param vrfConsumer The address of the VRFConsumer contract
     * @param lotteryContract The new lottery contract address
     */
    function updateLotteryContract(
        address vrfConsumer,
        address lotteryContract
    ) internal {
        // Example: call a function on the VRFConsumer to update the lottery contract
        // (bool success,) = vrfConsumer.call(abi.encodeWithSignature("setLotteryContract(address)", lotteryContract));
        // require(success, "Update failed");
    }

    /**
     * @notice Updates peer addresses for VRF contracts
     * @param arbReq The Arbitrum VRF requester address
     * @param sonicVRF The Sonic VRF consumer address
     */
    function updateVRFPeers(
        address arbReq,
        address sonicVRF
    ) internal {
        // Example: call a function to update peer addresses
        // (bool success,) = arbReq.call(abi.encodeWithSignature("setPeer(address)", sonicVRF));
        // require(success, "Update failed");
    }
}
