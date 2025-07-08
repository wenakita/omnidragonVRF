// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { TransparentUpgradeableProxy } from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import { ProxyAdmin } from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

/**
 * @title DragonVRFLib
 * @dev Library for VRF-related utilities in the Dragon ecosystem
 */
library DragonVRFLib {
    
    /**
     * @dev Calculate VRF request cost
     * @param gasLimit Gas limit for the request
     * @param gasPrice Current gas price
     * @return cost Cost in wei
     */
    function calculateRequestCost(uint32 gasLimit, uint256 gasPrice) internal pure returns (uint256 cost) {
        return gasLimit * gasPrice;
    }
    
    /**
     * @dev Validate VRF request parameters
     * @param numWords Number of random words requested
     * @param gasLimit Gas limit for callback
     * @return valid Whether parameters are valid
     */
    function validateRequestParams(uint32 numWords, uint32 gasLimit) internal pure returns (bool valid) {
        return numWords > 0 && numWords <= 10 && gasLimit >= 100000 && gasLimit <= 2500000;
    }
    
    /**
     * @dev Generate sequence number for VRF request
     * @param user User address
     * @param nonce Current nonce
     * @return sequence Unique sequence number
     */
    function generateSequence(address user, uint256 nonce) internal view returns (uint256 sequence) {
        return uint256(keccak256(abi.encodePacked(user, nonce, block.timestamp)));
    }

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
