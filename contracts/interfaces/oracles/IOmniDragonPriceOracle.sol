// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOmniDragonPriceOracle
 * @dev Interface for OmniDragon Price Oracle with multi-source aggregation
 */
interface IOmniDragonPriceOracle {
    
    // ============ STRUCTS ============
    
    struct PriceData {
        int256 price;
        uint256 timestamp;
        bool isValid;
        string source;
    }

    struct AggregatedPrice {
        int256 price;
        bool success;
        uint256 timestamp;
        uint256 sourceCount;
    }

    struct OracleConfig {
        address feedAddress;
        uint256 heartbeat;
        uint256 deviation;
        bool isActive;
        string description;
    }

    // ============ EVENTS ============
    
    event PriceUpdated(
        int256 indexed price,
        uint256 indexed timestamp,
        string indexed source
    );
    
    event AggregatedPriceUpdated(
        int256 indexed price,
        uint256 indexed timestamp,
        uint256 sourceCount
    );
    
    event OracleAdded(
        address indexed feedAddress,
        string indexed description,
        uint256 heartbeat
    );
    
    event OracleRemoved(
        address indexed feedAddress,
        string indexed description
    );
    
    event OracleConfigUpdated(
        address indexed feedAddress,
        uint256 heartbeat,
        uint256 deviation,
        bool isActive
    );

    // ============ PRICE FUNCTIONS ============
    
    function getPrice(address feed) external view returns (PriceData memory);
    
    function getAggregatedPrice() external view returns (
        int256 price,
        bool success,
        uint256 timestamp
    );
    
    function getAllPrices() external view returns (PriceData[] memory);
    
    function getLatestRoundData(address feed) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );

    // ============ ADMIN FUNCTIONS ============
    
    function addOracle(
        address feedAddress,
        uint256 heartbeat,
        uint256 deviation,
        string calldata description
    ) external;
    
    function removeOracle(address feedAddress) external;
    
    function updateOracleConfig(
        address feedAddress,
        uint256 heartbeat,
        uint256 deviation,
        bool isActive
    ) external;
    
    function setAggregationMethod(uint8 method) external;
    
    function setDeviationThreshold(uint256 threshold) external;

    // ============ VIEW FUNCTIONS ============
    
    function getOracleConfig(address feedAddress) external view returns (OracleConfig memory);
    
    function getActiveOracles() external view returns (address[] memory);
    
    function getOracleCount() external view returns (uint256);
    
    function isOracleActive(address feedAddress) external view returns (bool);
    
    function getDeviationThreshold() external view returns (uint256);
    
    function getAggregationMethod() external view returns (uint8);

    // ============ VALIDATION FUNCTIONS ============
    
    function validatePrice(address feed) external view returns (bool isValid, string memory reason);
    
    function validateAllPrices() external view returns (bool allValid, uint256 validCount);
} 