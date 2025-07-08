// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { TransparentUpgradeableProxy } from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import { ProxyAdmin } from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

/**
 * @title DragonDeployerLib
 * @dev Library for deployment utilities in the Dragon ecosystem
 */
library DragonDeployerLib {
    
    /**
     * @dev Calculate CREATE2 address
     * @param factory Factory address
     * @param salt Salt for deployment
     * @param bytecodeHash Hash of the contract bytecode
     * @return predicted Predicted address
     */
    function computeCreate2Address(
        address factory,
        bytes32 salt,
        bytes32 bytecodeHash
    ) internal pure returns (address predicted) {
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            factory,
            salt,
            bytecodeHash
        )))));
    }
    
    /**
     * @dev Generate deployment salt
     * @param baseSalt Base salt
     * @param contractName Contract name
     * @param version Version string
     * @return salt Generated salt
     */
    function generateSalt(
        bytes32 baseSalt,
        string memory contractName,
        string memory version
    ) internal pure returns (bytes32 salt) {
        return keccak256(abi.encodePacked(baseSalt, contractName, version));
    }
    
    /**
     * @dev Validate deployment parameters
     * @param factory Factory address
     * @param salt Deployment salt
     * @param bytecode Contract bytecode
     * @return valid Whether parameters are valid
     */
    function validateDeploymentParams(
        address factory,
        bytes32 salt,
        bytes memory bytecode
    ) internal pure returns (bool valid) {
        return factory != address(0) && salt != bytes32(0) && bytecode.length > 0;
    }

    /**
     * @dev Parameters for deploying a SwapTrigger contract
     */
    struct SwapParams {
        address implementation;
        address router;
        address wrappedNative;
        address[] pairs;
        address proxyAdmin;
        bytes initData; // Encoded initializer data
    }

    /**
     * @notice Deploys a SwapTrigger contract behind a TransparentUpgradeableProxy
     * @param params The deployment parameters
     * @return proxy The address of the deployed proxy contract
     */
    function deploySwapTrigger(
        address /* omniDragon */,
        SwapParams memory params,
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
}
