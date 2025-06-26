// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { TransparentUpgradeableProxy } from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import { ProxyAdmin } from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

/**
 * @title DragonDeployerLib
 * @dev Library for deploying SwapTrigger contracts with upgradeability support
 */
library DragonDeployerLib {
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
     * @param omniDragon The address of the OmniDragon token
     * @param params The deployment parameters
     * @param owner The owner of the deployed contract
     * @return proxy The address of the deployed proxy contract
     */
    function deploySwapTrigger(
        address omniDragon,
        SwapParams memory params,
        address owner
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
