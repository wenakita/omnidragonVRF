// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ERC721Enumerable } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IPromotionalItem } from "../../interfaces/promotions/IPromotionalItem.sol";

/**
 * @title BasePromotionalItem
 * @dev Abstract base contract for promotional items
 *
 * Provides common functionality for promotional items like GoldScratchers, RedEnvelopes, etc.
 * Implements ERC721 for NFT functionality with boost capabilities
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
abstract contract BasePromotionalItem is IPromotionalItem, ERC721, ERC721Enumerable, Ownable, ReentrancyGuard {
    
    // Custom Errors
    error ItemNotOwned();
    error ItemAlreadyUsed();
    error ItemExpired();
    error InvalidBoostAmount();
    error TransferNotAllowed();
    error ZeroAddress();

    // Constants
    uint256 public constant MAX_JACKPOT_BOOST = 1500; // 15% in basis points
    uint256 public constant MAX_PROBABILITY_BOOST = 500; // 5x multiplier in percentage (500%)
    uint256 public constant BASIS_POINTS = 10000;

    // Item metadata
    struct ItemMetadata {
        uint256 boostAmount;      // Boost amount in basis points or percentage
        uint256 expiryTimestamp;  // Expiry timestamp (0 = never expires)
        bool isUsed;              // Whether the item has been used
        bool isTransferred;       // Whether the item has been transferred (for ONE_TIME_TRANSFER items)
    }

    // State variables
    mapping(uint256 => ItemMetadata) public itemMetadata;
    uint256 private _nextTokenId;
    string private _itemType;
    BoostType private _boostType;
    TransferType private _transferType;

    // Events
    event ItemMinted(address indexed to, uint256 indexed tokenId, uint256 boostAmount, uint256 expiryTimestamp);
    event ItemUsed(address indexed user, uint256 indexed tokenId, uint256 originalAmount, uint256 boostedAmount);
    event ItemExpiredEvent(uint256 indexed tokenId);

    /**
     * @dev Constructor
     * @param name_ Name of the promotional item NFT
     * @param symbol_ Symbol of the promotional item NFT
     * @param itemType_ Type identifier for this promotional item
     * @param boostType_ Type of boost this item provides
     * @param transferType_ Transfer restrictions for this item
     */
    constructor(
        string memory name_,
        string memory symbol_,
        string memory itemType_,
        BoostType boostType_,
        TransferType transferType_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        _itemType = itemType_;
        _boostType = boostType_;
        _transferType = transferType_;
        _nextTokenId = 1;
    }

    // FeeM functionality is handled by DragonFeeMHelper contract

    /**
     * @dev Get the type of promotional item
     * @return itemType The type identifier string
     */
    function getItemType() external pure override returns (string memory) {
        return "BASE_PROMOTIONAL_ITEM";
    }

    /**
     * @dev Get the type of boost this promotional item provides
     * @return boostType The type of boost (jackpot or probability)
     */
    function getBoostType() external view override returns (BoostType) {
        return _boostType;
    }

    /**
     * @dev Get the transfer type of this promotional item
     * @return transferType The type of transfer restrictions
     */
    function getTransferType() external view override returns (TransferType) {
        return _transferType;
    }

    /**
     * @dev Check if a user has the promotional item
     * @param user User address
     * @param itemId Item ID to check
     * @return True if user has the item
     */
    function hasItem(address user, uint256 itemId) external view override returns (bool) {
        return _ownerOf(itemId) == user && !itemMetadata[itemId].isUsed && !_isExpired(itemId);
    }

    /**
     * @dev Calculate boost amount for a user
     * @param user Address of the user
     * @param itemId ID of the item
     * @return boostAmount The boost amount in basis points or percentage
     */
    function calculateBoost(address user, uint256 itemId) external view override returns (uint256) {
        if (_ownerOf(itemId) != user) return 0;
        if (itemMetadata[itemId].isUsed) return 0;
        if (_isExpired(itemId)) return 0;

        uint256 boost = itemMetadata[itemId].boostAmount;
        
        // Cap the boost based on type
        if (_boostType == BoostType.JACKPOT) {
            return boost > MAX_JACKPOT_BOOST ? MAX_JACKPOT_BOOST : boost;
        } else {
            return boost > MAX_PROBABILITY_BOOST ? MAX_PROBABILITY_BOOST : boost;
        }
    }

    /**
     * @dev Apply a promotional item to a swap/lottery transaction
     * @param itemId Identifier for the specific promotional item instance
     * @param user Address of the user
     * @param amount Base amount to potentially boost
     * @return isSuccess Whether the application was successful
     * @return boostedAmount The amount after applying any boost
     */
    function applyItem(uint256 itemId, address user, uint256 amount) external override nonReentrant returns (bool isSuccess, uint256 boostedAmount) {
        // Validate ownership and item state
        if (_ownerOf(itemId) != user) return (false, amount);
        if (itemMetadata[itemId].isUsed) return (false, amount);
        if (_isExpired(itemId)) return (false, amount);

        // Mark item as used
        itemMetadata[itemId].isUsed = true;

        // Calculate boost
        uint256 boost = itemMetadata[itemId].boostAmount;
        
        // Apply boost based on type
        if (_boostType == BoostType.JACKPOT) {
            // Cap boost to maximum allowed
            boost = boost > MAX_JACKPOT_BOOST ? MAX_JACKPOT_BOOST : boost;
            // Apply jackpot boost (additive percentage)
            boostedAmount = amount + (amount * boost / BASIS_POINTS);
        } else {
            // Cap boost to maximum allowed
            boost = boost > MAX_PROBABILITY_BOOST ? MAX_PROBABILITY_BOOST : boost;
            // Apply probability boost (multiplicative)
            boostedAmount = amount * (100 + boost) / 100;
        }

        emit ItemUsed(user, itemId, amount, boostedAmount);
        return (true, boostedAmount);
    }

    /**
     * @dev Mint a new promotional item
     * @param to Address to mint the item to
     * @param boostAmount Boost amount in basis points or percentage
     * @param expiryTimestamp Expiry timestamp (0 = never expires)
     * @return tokenId The ID of the minted token
     */
    function mint(address to, uint256 boostAmount, uint256 expiryTimestamp) external onlyOwner returns (uint256 tokenId) {
        return _mintItem(to, boostAmount, expiryTimestamp);
    }

    /**
     * @dev Batch mint promotional items
     * @param recipients Array of addresses to mint items to
     * @param boostAmounts Array of boost amounts
     * @param expiryTimestamps Array of expiry timestamps
     */
    function batchMint(
        address[] calldata recipients,
        uint256[] calldata boostAmounts,
        uint256[] calldata expiryTimestamps
    ) external onlyOwner {
        require(recipients.length == boostAmounts.length, "Array length mismatch");
        require(recipients.length == expiryTimestamps.length, "Array length mismatch");

        for (uint256 i = 0; i < recipients.length; i++) {
            _mintItem(recipients[i], boostAmounts[i], expiryTimestamps[i]);
        }
    }

    /**
     * @dev Internal function to mint a promotional item
     * @param to Address to mint the item to
     * @param boostAmount Boost amount in basis points or percentage
     * @param expiryTimestamp Expiry timestamp (0 = never expires)
     * @return tokenId The ID of the minted token
     */
    function _mintItem(address to, uint256 boostAmount, uint256 expiryTimestamp) internal returns (uint256 tokenId) {
        if (to == address(0)) revert ZeroAddress();
        
        // Validate boost amount
        if (_boostType == BoostType.JACKPOT && boostAmount > MAX_JACKPOT_BOOST) {
            revert InvalidBoostAmount();
        }
        if (_boostType == BoostType.PROBABILITY && boostAmount > MAX_PROBABILITY_BOOST) {
            revert InvalidBoostAmount();
        }

        tokenId = _nextTokenId++;
        
        // Set metadata
        itemMetadata[tokenId] = ItemMetadata({
            boostAmount: boostAmount,
            expiryTimestamp: expiryTimestamp,
            isUsed: false,
            isTransferred: false
        });

        _mint(to, tokenId);
        
        emit ItemMinted(to, tokenId, boostAmount, expiryTimestamp);
    }

    /**
     * @dev Check if an item is expired
     * @param itemId The item ID to check
     * @return True if the item is expired
     */
    function _isExpired(uint256 itemId) internal view returns (bool) {
        uint256 expiry = itemMetadata[itemId].expiryTimestamp;
        return expiry != 0 && block.timestamp > expiry;
    }

    /**
     * @dev Get item metadata (internal function for derived contracts)
     * @param itemId The item ID
     * @return metadata The item metadata
     */
    function _getItemMetadata(uint256 itemId) internal view returns (ItemMetadata memory) {
        return itemMetadata[itemId];
    }

    /**
     * @dev Override transfer functions to implement transfer restrictions
     */
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0))
        if (from == address(0)) {
            return super._update(to, tokenId, auth);
        }

        // Check transfer restrictions
        if (_transferType == TransferType.NON_TRANSFERABLE) {
            revert TransferNotAllowed();
        }
        
        if (_transferType == TransferType.ONE_TIME_TRANSFER) {
            if (itemMetadata[tokenId].isTransferred) {
                revert TransferNotAllowed();
            }
            itemMetadata[tokenId].isTransferred = true;
        }

        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Override _increaseBalance for ERC721Enumerable compatibility
     */
    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    /**
     * @dev Override supportsInterface to include all interfaces
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Get item metadata
     * @param itemId The item ID
     * @return metadata The item metadata
     */
    function getItemMetadata(uint256 itemId) external view returns (ItemMetadata memory) {
        return itemMetadata[itemId];
    }

    /**
     * @dev Get items owned by a user
     * @param user The user address
     * @return tokenIds Array of token IDs owned by the user
     */
    function getItemsByUser(address user) external view returns (uint256[] memory tokenIds) {
        uint256 balance = balanceOf(user);
        tokenIds = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(user, i);
        }
    }

    /**
     * @dev Get active (unused and not expired) items owned by a user
     * @param user The user address
     * @return activeTokenIds Array of active token IDs owned by the user
     */
    function getActiveItemsByUser(address user) external view returns (uint256[] memory activeTokenIds) {
        uint256 balance = balanceOf(user);
        uint256[] memory allTokens = new uint256[](balance);
        uint256 activeCount = 0;
        
        // First pass: collect all tokens and count active ones
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(user, i);
            allTokens[i] = tokenId;
            
            if (!itemMetadata[tokenId].isUsed && !_isExpired(tokenId)) {
                activeCount++;
            }
        }
        
        // Second pass: collect active tokens
        activeTokenIds = new uint256[](activeCount);
        uint256 activeIndex = 0;
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = allTokens[i];
            if (!itemMetadata[tokenId].isUsed && !_isExpired(tokenId)) {
                activeTokenIds[activeIndex] = tokenId;
                activeIndex++;
            }
        }
    }
} 