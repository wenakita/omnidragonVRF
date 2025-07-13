// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { BasePromotionalItem } from "./BasePromotionalItem.sol";

/**
 * @title GoldScratcher
 * @dev Gold Scratcher promotional item that provides jackpot boosts
 *
 * One-time transfer promotional NFT that boosts lottery jackpot payouts
 * Can only be transferred once from issuer to user, then becomes non-transferable
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract GoldScratcher is BasePromotionalItem {
    
    /**
     * @dev Constructor
     */
    constructor() BasePromotionalItem(
        "OmniDragon Gold Scratcher",
        "ODGS",
        "SCRATCHER",
        BoostType.JACKPOT,
        TransferType.ONE_TIME_TRANSFER
    ) {
        // Gold Scratcher specific initialization
    }

    /**
     * @dev Mint a Gold Scratcher with standard boost
     * @param to Address to mint the scratcher to
     * @param jackpotBoostBps Jackpot boost in basis points (e.g., 690 = 6.9%)
     * @param expiryTimestamp Expiry timestamp (0 = never expires)
     * @return tokenId The ID of the minted token
     */
    function mintGoldScratcher(
        address to,
        uint256 jackpotBoostBps,
        uint256 expiryTimestamp
    ) external onlyOwner returns (uint256 tokenId) {
        return _mintItem(to, jackpotBoostBps, expiryTimestamp);
    }

    /**
     * @dev Mint multiple Gold Scratchers with the same boost
     * @param recipients Array of addresses to mint scratchers to
     * @param jackpotBoostBps Jackpot boost in basis points for all scratchers
     * @param expiryTimestamp Expiry timestamp for all scratchers (0 = never expires)
     */
    function batchMintGoldScratchers(
        address[] calldata recipients,
        uint256 jackpotBoostBps,
        uint256 expiryTimestamp
    ) external onlyOwner {
        uint256[] memory boostAmounts = new uint256[](recipients.length);
        uint256[] memory expiryTimestamps = new uint256[](recipients.length);
        
        for (uint256 i = 0; i < recipients.length; i++) {
            boostAmounts[i] = jackpotBoostBps;
            expiryTimestamps[i] = expiryTimestamp;
        }
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mintItem(recipients[i], boostAmounts[i], expiryTimestamps[i]);
        }
    }

    /**
     * @dev Mint premium Gold Scratchers with varying boosts
     * @param recipients Array of addresses to mint scratchers to
     * @param jackpotBoostBpsArray Array of jackpot boost amounts in basis points
     * @param expiryTimestamps Array of expiry timestamps
     */
    function batchMintPremiumGoldScratchers(
        address[] calldata recipients,
        uint256[] calldata jackpotBoostBpsArray,
        uint256[] calldata expiryTimestamps
    ) external onlyOwner {
        require(recipients.length == jackpotBoostBpsArray.length, "Array length mismatch");
        require(recipients.length == expiryTimestamps.length, "Array length mismatch");

        for (uint256 i = 0; i < recipients.length; i++) {
            _mintItem(recipients[i], jackpotBoostBpsArray[i], expiryTimestamps[i]);
        }
    }

    /**
     * @dev Get the total number of Gold Scratchers minted
     * @return Total supply of Gold Scratchers
     */
    function getTotalScratchers() external view returns (uint256) {
        return totalSupply();
    }

    /**
     * @dev Get active Gold Scratchers for a user
     * @param user The user address
     * @return activeScratchers Array of active scratcher token IDs
     */
    function getActiveScratchers(address user) external view returns (uint256[] memory activeScratchers) {
        uint256 balance = balanceOf(user);
        uint256[] memory allTokens = new uint256[](balance);
        uint256 activeCount = 0;
        
        // First pass: collect all tokens and count active ones
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(user, i);
            allTokens[i] = tokenId;
            
            ItemMetadata memory metadata = _getItemMetadata(tokenId);
            if (!metadata.isUsed && !_isExpired(tokenId)) {
                activeCount++;
            }
        }
        
        // Second pass: collect active tokens
        activeScratchers = new uint256[](activeCount);
        uint256 activeIndex = 0;
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = allTokens[i];
            ItemMetadata memory metadata = _getItemMetadata(tokenId);
            if (!metadata.isUsed && !_isExpired(tokenId)) {
                activeScratchers[activeIndex] = tokenId;
                activeIndex++;
            }
        }
    }
} 