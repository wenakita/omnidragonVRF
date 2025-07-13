// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { BasePromotionalItem } from "./BasePromotionalItem.sol";

/**
 * @title RedEnvelope
 * @dev Red Envelope promotional item that provides probability boosts
 *
 * Freely transferable promotional NFT that boosts lottery win probability
 * Can be traded and transferred freely between users
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract RedEnvelope is BasePromotionalItem {
    
    /**
     * @dev Constructor
     */
    constructor() BasePromotionalItem(
        "OmniDragon Red Envelope",
        "ODRE",
        "ENVELOPE",
        BoostType.PROBABILITY,
        TransferType.FREELY_TRANSFERABLE
    ) {
        // Red Envelope specific initialization
    }

    /**
     * @dev Mint a Red Envelope with standard boost
     * @param to Address to mint the envelope to
     * @param probabilityBoostPct Probability boost in percentage (e.g., 150 = 1.5x)
     * @param expiryTimestamp Expiry timestamp (0 = never expires)
     * @return tokenId The ID of the minted token
     */
    function mintRedEnvelope(
        address to,
        uint256 probabilityBoostPct,
        uint256 expiryTimestamp
    ) external onlyOwner returns (uint256 tokenId) {
        return _mintItem(to, probabilityBoostPct, expiryTimestamp);
    }

    /**
     * @dev Mint multiple Red Envelopes with the same boost
     * @param recipients Array of addresses to mint envelopes to
     * @param probabilityBoostPct Probability boost in percentage for all envelopes
     * @param expiryTimestamp Expiry timestamp for all envelopes (0 = never expires)
     */
    function batchMintRedEnvelopes(
        address[] calldata recipients,
        uint256 probabilityBoostPct,
        uint256 expiryTimestamp
    ) external onlyOwner {
        for (uint256 i = 0; i < recipients.length; i++) {
            _mintItem(recipients[i], probabilityBoostPct, expiryTimestamp);
        }
    }

    /**
     * @dev Mint premium Red Envelopes with varying boosts
     * @param recipients Array of addresses to mint envelopes to
     * @param probabilityBoostPctArray Array of probability boost amounts in percentage
     * @param expiryTimestamps Array of expiry timestamps
     */
    function batchMintPremiumRedEnvelopes(
        address[] calldata recipients,
        uint256[] calldata probabilityBoostPctArray,
        uint256[] calldata expiryTimestamps
    ) external onlyOwner {
        require(recipients.length == probabilityBoostPctArray.length, "Array length mismatch");
        require(recipients.length == expiryTimestamps.length, "Array length mismatch");

        for (uint256 i = 0; i < recipients.length; i++) {
            _mintItem(recipients[i], probabilityBoostPctArray[i], expiryTimestamps[i]);
        }
    }

    /**
     * @dev Get the total number of Red Envelopes minted
     * @return Total supply of Red Envelopes
     */
    function getTotalEnvelopes() external view returns (uint256) {
        return totalSupply();
    }

    /**
     * @dev Get active Red Envelopes for a user
     * @param user The user address
     * @return activeEnvelopes Array of active envelope token IDs
     */
    function getActiveEnvelopes(address user) external view returns (uint256[] memory activeEnvelopes) {
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
        activeEnvelopes = new uint256[](activeCount);
        uint256 activeIndex = 0;
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = allTokens[i];
            ItemMetadata memory metadata = _getItemMetadata(tokenId);
            if (!metadata.isUsed && !_isExpired(tokenId)) {
                activeEnvelopes[activeIndex] = tokenId;
                activeIndex++;
            }
        }
    }

    /**
     * @dev Mint Red Envelopes for a marketing campaign
     * @param recipients Array of addresses to mint envelopes to
     * @param boostAmount Boost amount for all envelopes
     * @param expiryTimestamp Expiry timestamp for all envelopes
     */
    function mintCampaignEnvelopes(
        address[] calldata recipients,
        uint256 boostAmount,
        uint256 expiryTimestamp
    ) external onlyOwner {
        for (uint256 i = 0; i < recipients.length; i++) {
            _mintItem(recipients[i], boostAmount, expiryTimestamp);
        }
    }
} 