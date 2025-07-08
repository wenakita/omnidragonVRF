// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IPromotionalItemRegistry } from "../../interfaces/promotions/IPromotionalItemRegistry.sol";
import { IPromotionalItem } from "../../interfaces/promotions/IPromotionalItem.sol";

/**
 * @title PromotionalItemRegistry
 * @dev Registry for managing promotional items within the ecosystem
 *
 * Central registry for all promotional items available in the OmniDragon lottery system
 * Manages registration, discovery, and validation of promotional items
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract PromotionalItemRegistry is IPromotionalItemRegistry, Ownable {
    
    // Custom Errors
    error ItemTypeEmpty();
    error ItemAddressZero();
    error ItemAlreadyRegistered();
    error ItemNotRegistered();
    error InvalidItemContract();
    error ItemTypeNotFound();

    // Mapping from item type to contract address
    mapping(string => address) private promotionalItems;
    
    // Array to store all registered item types
    string[] private itemTypes;
    
    // Mapping to check if an item type exists (for gas optimization)
    mapping(string => bool) private itemTypeExists;

    // Events
    event PromotionalItemRegistered(string indexed itemType, address indexed itemAddress);
    event PromotionalItemUnregistered(string indexed itemType, address indexed itemAddress);

    /**
     * @dev Constructor
     */
    constructor() Ownable(msg.sender) {
        // FeeM functionality is handled by DragonFeeMHelper contract
    }

    /**
     * @dev Register a promotional item
     * @param itemType The type of the item (e.g., "SCRATCHER", "ENVELOPE")
     * @param itemAddress The contract address of the item
     */
    function registerPromotionalItem(string calldata itemType, address itemAddress) external override onlyOwner {
        if (bytes(itemType).length == 0) revert ItemTypeEmpty();
        if (itemAddress == address(0)) revert ItemAddressZero();
        if (itemTypeExists[itemType]) revert ItemAlreadyRegistered();

        // Validate that the contract implements IPromotionalItem
        try IPromotionalItem(itemAddress).getItemType() returns (string memory contractItemType) {
            // Ensure the contract's item type matches the registration
            if (keccak256(bytes(contractItemType)) != keccak256(bytes(itemType))) {
                revert InvalidItemContract();
            }
        } catch {
            revert InvalidItemContract();
        }

        // Register the item
        promotionalItems[itemType] = itemAddress;
        itemTypes.push(itemType);
        itemTypeExists[itemType] = true;

        emit PromotionalItemRegistered(itemType, itemAddress);
    }

    /**
     * @dev Unregister a promotional item
     * @param itemType The type of the item
     */
    function unregisterPromotionalItem(string calldata itemType) external override onlyOwner {
        if (!itemTypeExists[itemType]) revert ItemNotRegistered();

        address itemAddress = promotionalItems[itemType];
        
        // Remove from mapping
        delete promotionalItems[itemType];
        delete itemTypeExists[itemType];

        // Remove from array (find and remove)
        for (uint256 i = 0; i < itemTypes.length; i++) {
            if (keccak256(bytes(itemTypes[i])) == keccak256(bytes(itemType))) {
                // Move last element to current position and pop
                itemTypes[i] = itemTypes[itemTypes.length - 1];
                itemTypes.pop();
                break;
            }
        }

        emit PromotionalItemUnregistered(itemType, itemAddress);
    }

    /**
     * @dev Get a promotional item contract address
     * @param itemType The type of the item
     * @return The contract address of the item
     */
    function getPromotionalItem(string calldata itemType) external view override returns (address) {
        if (!itemTypeExists[itemType]) revert ItemTypeNotFound();
        return promotionalItems[itemType];
    }

    /**
     * @dev Check if a promotional item type exists
     * @param itemType The type of the item
     * @return True if the item type exists
     */
    function promotionalItemExists(string calldata itemType) external view override returns (bool) {
        return itemTypeExists[itemType];
    }

    /**
     * @dev Get all registered promotional item types
     * @return Array of item types
     */
    function getAllPromotionalItemTypes() external view override returns (string[] memory) {
        return itemTypes;
    }

    /**
     * @dev Get the number of registered promotional items
     * @return The count of registered items
     */
    function getPromotionalItemCount() external view returns (uint256) {
        return itemTypes.length;
    }

    /**
     * @dev Get promotional item details by index
     * @param index Index in the itemTypes array
     * @return itemType The item type
     * @return itemAddress The contract address
     */
    function getPromotionalItemByIndex(uint256 index) external view returns (string memory itemType, address itemAddress) {
        require(index < itemTypes.length, "Index out of bounds");
        itemType = itemTypes[index];
        itemAddress = promotionalItems[itemType];
    }

    /**
     * @dev Batch register multiple promotional items
     * @param itemTypesArray Array of item types
     * @param itemAddresses Array of contract addresses
     */
    function batchRegisterPromotionalItems(
        string[] calldata itemTypesArray,
        address[] calldata itemAddresses
    ) external onlyOwner {
        require(itemTypesArray.length == itemAddresses.length, "Array length mismatch");
        
        for (uint256 i = 0; i < itemTypesArray.length; i++) {
            // Use internal function to avoid duplicate validation
            _registerPromotionalItem(itemTypesArray[i], itemAddresses[i]);
        }
    }

    /**
     * @dev Internal function to register promotional item
     * @param itemType The type of the item
     * @param itemAddress The contract address of the item
     */
    function _registerPromotionalItem(string calldata itemType, address itemAddress) internal {
        if (bytes(itemType).length == 0) revert ItemTypeEmpty();
        if (itemAddress == address(0)) revert ItemAddressZero();
        if (itemTypeExists[itemType]) revert ItemAlreadyRegistered();

        // Validate that the contract implements IPromotionalItem
        try IPromotionalItem(itemAddress).getItemType() returns (string memory contractItemType) {
            // Ensure the contract's item type matches the registration
            if (keccak256(bytes(contractItemType)) != keccak256(bytes(itemType))) {
                revert InvalidItemContract();
            }
        } catch {
            revert InvalidItemContract();
        }

        // Register the item
        promotionalItems[itemType] = itemAddress;
        itemTypes.push(itemType);
        itemTypeExists[itemType] = true;

        emit PromotionalItemRegistered(itemType, itemAddress);
    }
} 