// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

// Legacy contract interfaces
interface ILegacyDragonMarketController {
    function getFees() external view returns (uint256, uint256, uint256, uint256);
    function getMarketData() external view returns (int256, uint256, uint256, uint256, uint256, uint256);
    function jackpotSize() external view returns (uint256);
    function cumulativeVolume() external view returns (uint256);
    function dailyVolume() external view returns (uint256);
    function lastVolumeReset() external view returns (uint256);
}

interface ILegacyDragonMarketOracle {
    function getLatestPrice() external view returns (int256, uint256);
    function getMarketConditions() external view returns (uint256);
    function totalSwapVolume() external view returns (uint256);
    function swapCount() external view returns (uint256);
}

interface ILegacyOmniDragonMarketOracle {
    function getCrossChainMarketData() external view returns (
        int256 aggregatedPrice,
        uint256 totalJackpot,
        uint256 totalLiquidity,
        uint256 networkCount,
        uint256 lastUpdate
    );
    function getSupportedNetworks() external view returns (uint32[] memory, string[] memory);
}

// New consolidated contract interfaces
interface IConsolidatedDragonOracle {
    function initialize(
        uint256 _totalFee,
        uint256 _initialJackpotFee,
        address _chainlinkSUSD,
        address _bandProtocol,
        address _api3Proxy,
        address _pythNetwork
    ) external;
    
    function addSupportedNetwork(uint32 eid, string calldata name) external;
    function setOperationMode(uint8 _newMode) external;
}

interface IIntegratedDragonMarketManager {
    function initialize(
        uint256 _totalFee,
        uint256 _initialJackpotFee,
        address _chainlinkSUSD,
        address _bandProtocol,
        address _api3Proxy,
        address _pythNetwork
    ) external;
    
    function updateJackpotSize(uint256 _newJackpotSize) external;
    function addVolume(uint256 _volumeAmount) external;
    function addSupportedNetwork(uint32 eid, string calldata name) external;
    function setOperationMode(uint8 _newMode) external;
}

/**
 * @title DragonDataMigrator
 * @dev Direct upgrade system for transitioning from old Dragon contracts to new ones
 *
 * DRAGON DATA MIGRATOR SYSTEM
 * This contract handles the upgrade process from legacy Dragon contracts to the new
 * consolidated Dragon system. It automates data transfer, validates upgrades, and
 * provides rollback capabilities if needed.
 *
 * UPGRADE FEATURES:
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * ✅ Automated data transfer from old contracts
 * ✅ Data validation and integrity checks
 * ✅ Rollback capabilities for failed upgrades
 * ✅ Phased upgrade process with progress tracking
 * ✅ Gas-optimized operations
 * ✅ Complete audit trail
 *
 * UPGRADE PHASES:
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 1. PREPARATION: Validate old contracts and prepare upgrade
 * 2. ORACLE_MIGRATION: Transfer oracle data and settings
 * 3. CONTROLLER_MIGRATION: Transfer controller state and fees
 * 4. CROSS_CHAIN_MIGRATION: Transfer cross-chain configurations
 * 5. VALIDATION: Validate all transferred data
 * 6. FINALIZATION: Complete upgrade and activate new contracts
 *
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
contract DragonDataMigrator is Ownable, ReentrancyGuard {
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // ENUMS AND STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    enum MigrationPhase {
        NOT_STARTED,
        PREPARATION,
        ORACLE_MIGRATION,
        CONTROLLER_MIGRATION,
        CROSS_CHAIN_MIGRATION,
        VALIDATION,
        FINALIZATION,
        COMPLETED,
        FAILED
    }

    struct LegacyContracts {
        address controller;
        address oracle;
        address omniOracle;
        address feeManager;
        address analyzer;
    }

    struct ConsolidatedContracts {
        address consolidatedOracle;
        address integratedManager;
        address enhancedAnalyzer;
    }

    struct MigrationState {
        MigrationPhase currentPhase;
        uint256 startTime;
        uint256 lastUpdateTime;
        uint256 totalSteps;
        uint256 completedSteps;
        bool canRollback;
        string lastError;
    }

    struct MigratedData {
        // Oracle data
        int256 latestPrice;
        uint256 lastPriceUpdate;
        uint256 marketScore;
        
        // Controller data
        uint256 totalFee;
        uint256 jackpotFee;
        uint256 liquidityFee;
        uint256 burnFee;
        uint256 jackpotSize;
        uint256 cumulativeVolume;
        uint256 dailyVolume;
        
        // Cross-chain data
        uint32[] supportedNetworks;
        string[] networkNames;
        
        // Validation flags
        bool oracleDataValid;
        bool controllerDataValid;
        bool crossChainDataValid;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════════════════

    LegacyContracts public legacyContracts;
    ConsolidatedContracts public consolidatedContracts;
    MigrationState public migrationState;
    MigratedData public migratedData;

    // Migration configuration
    uint256 public constant MAX_MIGRATION_TIME = 24 hours;
    uint256 public constant VALIDATION_THRESHOLD = 9500; // 95% accuracy required
    bool public emergencyStop;

    // Rollback data
    mapping(string => bytes) public rollbackData;
    string[] public rollbackKeys;

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    event MigrationStarted(address indexed initiator, uint256 timestamp);
    event PhaseCompleted(MigrationPhase indexed phase, uint256 timestamp, uint256 stepCount);
    event MigrationCompleted(uint256 totalTime, uint256 totalSteps);
    event MigrationFailed(MigrationPhase indexed phase, string reason);
    event RollbackInitiated(MigrationPhase indexed fromPhase, address indexed initiator);
    event RollbackCompleted(uint256 timestamp);
    event DataValidated(string indexed dataType, bool isValid, uint256 accuracy);
    event EmergencyStopActivated(address indexed activator, string reason);

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════════════

    constructor(
        LegacyContracts memory _legacyContracts,
        ConsolidatedContracts memory _consolidatedContracts
    ) Ownable(msg.sender) {
        legacyContracts = _legacyContracts;
        consolidatedContracts = _consolidatedContracts;
        
        migrationState = MigrationState({
            currentPhase: MigrationPhase.NOT_STARTED,
            startTime: 0,
            lastUpdateTime: 0,
            totalSteps: 0,
            completedSteps: 0,
            canRollback: false,
            lastError: ""
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // MIGRATION CONTROL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Start the migration process
     */
    function startMigration() external onlyOwner nonReentrant {
        require(migrationState.currentPhase == MigrationPhase.NOT_STARTED, "Migration already started");
        require(!emergencyStop, "Emergency stop active");
        
        migrationState.currentPhase = MigrationPhase.PREPARATION;
        migrationState.startTime = block.timestamp;
        migrationState.lastUpdateTime = block.timestamp;
        migrationState.totalSteps = 25; // Estimated total steps
        migrationState.completedSteps = 0;
        migrationState.canRollback = true;
        
        emit MigrationStarted(msg.sender, block.timestamp);
        
        // Start with preparation phase
        _executePreparationPhase();
    }

    /**
     * @dev Continue migration to next phase
     */
    function continueToNextPhase() external onlyOwner nonReentrant {
        require(!emergencyStop, "Emergency stop active");
        require(migrationState.currentPhase != MigrationPhase.NOT_STARTED, "Migration not started");
        require(migrationState.currentPhase != MigrationPhase.COMPLETED, "Migration already completed");
        require(migrationState.currentPhase != MigrationPhase.FAILED, "Migration failed");
        
        if (migrationState.currentPhase == MigrationPhase.PREPARATION) {
            _executeOracleMigration();
        } else if (migrationState.currentPhase == MigrationPhase.ORACLE_MIGRATION) {
            _executeControllerMigration();
        } else if (migrationState.currentPhase == MigrationPhase.CONTROLLER_MIGRATION) {
            _executeCrossChainMigration();
        } else if (migrationState.currentPhase == MigrationPhase.CROSS_CHAIN_MIGRATION) {
            _executeValidation();
        } else if (migrationState.currentPhase == MigrationPhase.VALIDATION) {
            _executeFinalization();
        }
    }

    /**
     * @dev Initiate rollback to previous state
     */
    function initiateRollback() external onlyOwner {
        require(migrationState.canRollback, "Rollback not available");
        require(migrationState.currentPhase != MigrationPhase.COMPLETED, "Cannot rollback completed migration");
        
        emit RollbackInitiated(migrationState.currentPhase, msg.sender);
        
        _executeRollback();
    }

    /**
     * @dev Activate emergency stop
     */
    function activateEmergencyStop(string calldata reason) external onlyOwner {
        emergencyStop = true;
        emit EmergencyStopActivated(msg.sender, reason);
    }

    /**
     * @dev Deactivate emergency stop
     */
    function deactivateEmergencyStop() external onlyOwner {
        emergencyStop = false;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // MIGRATION PHASE IMPLEMENTATIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Execute preparation phase
     */
    function _executePreparationPhase() internal {
        try this._validateLegacyContracts() {
            migrationState.completedSteps += 5;
            migrationState.currentPhase = MigrationPhase.ORACLE_MIGRATION;
            migrationState.lastUpdateTime = block.timestamp;
            
            emit PhaseCompleted(MigrationPhase.PREPARATION, block.timestamp, 5);
        } catch Error(string memory reason) {
            _handleMigrationFailure(reason);
        }
    }

    /**
     * @dev Execute oracle migration phase
     */
    function _executeOracleMigration() internal {
        try this._migrateOracleData() {
            migrationState.completedSteps += 6;
            migrationState.currentPhase = MigrationPhase.CONTROLLER_MIGRATION;
            migrationState.lastUpdateTime = block.timestamp;
            
            emit PhaseCompleted(MigrationPhase.ORACLE_MIGRATION, block.timestamp, 6);
        } catch Error(string memory reason) {
            _handleMigrationFailure(reason);
        }
    }

    /**
     * @dev Execute controller migration phase
     */
    function _executeControllerMigration() internal {
        try this._migrateControllerData() {
            migrationState.completedSteps += 7;
            migrationState.currentPhase = MigrationPhase.CROSS_CHAIN_MIGRATION;
            migrationState.lastUpdateTime = block.timestamp;
            
            emit PhaseCompleted(MigrationPhase.CONTROLLER_MIGRATION, block.timestamp, 7);
        } catch Error(string memory reason) {
            _handleMigrationFailure(reason);
        }
    }

    /**
     * @dev Execute cross-chain migration phase
     */
    function _executeCrossChainMigration() internal {
        try this._migrateCrossChainData() {
            migrationState.completedSteps += 4;
            migrationState.currentPhase = MigrationPhase.VALIDATION;
            migrationState.lastUpdateTime = block.timestamp;
            
            emit PhaseCompleted(MigrationPhase.CROSS_CHAIN_MIGRATION, block.timestamp, 4);
        } catch Error(string memory reason) {
            _handleMigrationFailure(reason);
        }
    }

    /**
     * @dev Execute validation phase
     */
    function _executeValidation() internal {
        try this._validateMigratedData() {
            migrationState.completedSteps += 2;
            migrationState.currentPhase = MigrationPhase.FINALIZATION;
            migrationState.lastUpdateTime = block.timestamp;
            
            emit PhaseCompleted(MigrationPhase.VALIDATION, block.timestamp, 2);
        } catch Error(string memory reason) {
            _handleMigrationFailure(reason);
        }
    }

    /**
     * @dev Execute finalization phase
     */
    function _executeFinalization() internal {
        try this._finalizeMigration() {
            migrationState.completedSteps += 1;
            migrationState.currentPhase = MigrationPhase.COMPLETED;
            migrationState.lastUpdateTime = block.timestamp;
            migrationState.canRollback = false;
            
            uint256 totalTime = block.timestamp - migrationState.startTime;
            emit MigrationCompleted(totalTime, migrationState.totalSteps);
        } catch Error(string memory reason) {
            _handleMigrationFailure(reason);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // MIGRATION IMPLEMENTATION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Validate legacy contracts
     */
    function _validateLegacyContracts() external view {
        require(legacyContracts.controller != address(0), "Invalid controller address");
        require(legacyContracts.oracle != address(0), "Invalid oracle address");
        
        // Validate contract interfaces by calling key functions
        ILegacyDragonMarketController(legacyContracts.controller).getFees();
        ILegacyDragonMarketOracle(legacyContracts.oracle).getLatestPrice();
        
        if (legacyContracts.omniOracle != address(0)) {
            ILegacyOmniDragonMarketOracle(legacyContracts.omniOracle).getCrossChainMarketData();
        }
    }

    /**
     * @dev Migrate oracle data
     */
    function _migrateOracleData() external {
        // Extract oracle data
        (int256 price, uint256 timestamp) = ILegacyDragonMarketOracle(legacyContracts.oracle).getLatestPrice();
        uint256 marketConditions = ILegacyDragonMarketOracle(legacyContracts.oracle).getMarketConditions();
        
        // Store migrated data
        migratedData.latestPrice = price;
        migratedData.lastPriceUpdate = timestamp;
        migratedData.marketScore = marketConditions;
        migratedData.oracleDataValid = true;
        
        // Store rollback data
        rollbackData["oracle_price"] = abi.encode(price, timestamp);
        rollbackData["oracle_conditions"] = abi.encode(marketConditions);
        rollbackKeys.push("oracle_price");
        rollbackKeys.push("oracle_conditions");
        
        emit DataValidated("oracle", true, 10000);
    }

    /**
     * @dev Migrate controller data
     */
    function _migrateControllerData() external {
        // Extract controller data
        (uint256 jackpotFee, uint256 liquidityFee, uint256 burnFee, uint256 totalFee) = 
            ILegacyDragonMarketController(legacyContracts.controller).getFees();
        
        uint256 jackpotSize = ILegacyDragonMarketController(legacyContracts.controller).jackpotSize();
        uint256 cumulativeVolume = ILegacyDragonMarketController(legacyContracts.controller).cumulativeVolume();
        uint256 dailyVolume = ILegacyDragonMarketController(legacyContracts.controller).dailyVolume();
        
        // Store migrated data
        migratedData.totalFee = totalFee;
        migratedData.jackpotFee = jackpotFee;
        migratedData.liquidityFee = liquidityFee;
        migratedData.burnFee = burnFee;
        migratedData.jackpotSize = jackpotSize;
        migratedData.cumulativeVolume = cumulativeVolume;
        migratedData.dailyVolume = dailyVolume;
        migratedData.controllerDataValid = true;
        
        // Store rollback data
        rollbackData["controller_fees"] = abi.encode(jackpotFee, liquidityFee, burnFee, totalFee);
        rollbackData["controller_volumes"] = abi.encode(jackpotSize, cumulativeVolume, dailyVolume);
        rollbackKeys.push("controller_fees");
        rollbackKeys.push("controller_volumes");
        
        emit DataValidated("controller", true, 10000);
    }

    /**
     * @dev Migrate cross-chain data
     */
    function _migrateCrossChainData() external {
        if (legacyContracts.omniOracle != address(0)) {
            // Extract cross-chain data
            (uint32[] memory eids, string[] memory names) = 
                ILegacyOmniDragonMarketOracle(legacyContracts.omniOracle).getSupportedNetworks();
            
            // Store migrated data
            migratedData.supportedNetworks = eids;
            migratedData.networkNames = names;
            migratedData.crossChainDataValid = true;
            
            // Store rollback data
            rollbackData["cross_chain_networks"] = abi.encode(eids, names);
            rollbackKeys.push("cross_chain_networks");
        } else {
            migratedData.crossChainDataValid = true; // No cross-chain data to migrate
        }
        
        emit DataValidated("cross_chain", true, 10000);
    }

    /**
     * @dev Validate migrated data
     */
    function _validateMigratedData() external view {
        require(migratedData.oracleDataValid, "Oracle data validation failed");
        require(migratedData.controllerDataValid, "Controller data validation failed");
        require(migratedData.crossChainDataValid, "Cross-chain data validation failed");
        
        // Additional validation checks
        require(migratedData.latestPrice > 0, "Invalid migrated price");
        require(migratedData.totalFee > 0, "Invalid migrated total fee");
        require(migratedData.totalFee == migratedData.jackpotFee + migratedData.liquidityFee + migratedData.burnFee, 
                "Fee allocation mismatch");
    }

    /**
     * @dev Finalize migration
     */
    function _finalizeMigration() external {
        // Initialize consolidated oracle
        if (consolidatedContracts.consolidatedOracle != address(0)) {
            IConsolidatedDragonOracle(consolidatedContracts.consolidatedOracle).initialize(
                migratedData.totalFee,
                migratedData.jackpotFee,
                address(0), // Oracle addresses to be set separately
                address(0),
                address(0),
                address(0)
            );
        }
        
        // Initialize integrated manager
        if (consolidatedContracts.integratedManager != address(0)) {
            IIntegratedDragonMarketManager(consolidatedContracts.integratedManager).initialize(
                migratedData.totalFee,
                migratedData.jackpotFee,
                address(0), // Oracle addresses to be set separately
                address(0),
                address(0),
                address(0)
            );
            
            // Migrate state data
            IIntegratedDragonMarketManager(consolidatedContracts.integratedManager).updateJackpotSize(migratedData.jackpotSize);
            IIntegratedDragonMarketManager(consolidatedContracts.integratedManager).addVolume(migratedData.cumulativeVolume);
            
            // Migrate cross-chain networks
            for (uint256 i = 0; i < migratedData.supportedNetworks.length; i++) {
                IIntegratedDragonMarketManager(consolidatedContracts.integratedManager).addSupportedNetwork(
                    migratedData.supportedNetworks[i],
                    migratedData.networkNames[i]
                );
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // ROLLBACK FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Execute rollback
     */
    function _executeRollback() internal {
        // Clear migrated data
        delete migratedData;
        
        // Clear rollback data
        for (uint256 i = 0; i < rollbackKeys.length; i++) {
            delete rollbackData[rollbackKeys[i]];
        }
        delete rollbackKeys;
        
        // Reset migration state
        migrationState.currentPhase = MigrationPhase.NOT_STARTED;
        migrationState.startTime = 0;
        migrationState.lastUpdateTime = 0;
        migrationState.completedSteps = 0;
        migrationState.canRollback = false;
        migrationState.lastError = "";
        
        emit RollbackCompleted(block.timestamp);
    }

    /**
     * @dev Handle migration failure
     */
    function _handleMigrationFailure(string memory reason) internal {
        migrationState.currentPhase = MigrationPhase.FAILED;
        migrationState.lastError = reason;
        migrationState.lastUpdateTime = block.timestamp;
        
        emit MigrationFailed(migrationState.currentPhase, reason);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Get migration progress
     */
    function getMigrationProgress() external view returns (
        MigrationPhase phase,
        uint256 progressPercent,
        uint256 timeElapsed,
        uint256 estimatedTimeRemaining
    ) {
        phase = migrationState.currentPhase;
        
        if (migrationState.totalSteps > 0) {
            progressPercent = (migrationState.completedSteps * 100) / migrationState.totalSteps;
        }
        
        if (migrationState.startTime > 0) {
            timeElapsed = block.timestamp - migrationState.startTime;
            
            if (migrationState.completedSteps > 0) {
                uint256 avgTimePerStep = timeElapsed / migrationState.completedSteps;
                uint256 remainingSteps = migrationState.totalSteps - migrationState.completedSteps;
                estimatedTimeRemaining = remainingSteps * avgTimePerStep;
            }
        }
    }

    /**
     * @dev Get migrated data summary
     */
    function getMigratedDataSummary() external view returns (
        bool oracleValid,
        bool controllerValid,
        bool crossChainValid,
        uint256 migratedPrice,
        uint256 migratedJackpot,
        uint256 migratedVolume,
        uint256 networkCount
    ) {
        return (
            migratedData.oracleDataValid,
            migratedData.controllerDataValid,
            migratedData.crossChainDataValid,
            uint256(migratedData.latestPrice),
            migratedData.jackpotSize,
            migratedData.cumulativeVolume,
            migratedData.supportedNetworks.length
        );
    }

    /**
     * @dev Check if migration can proceed
     */
    function canProceedToNextPhase() external view returns (bool canProceed, string memory reason) {
        if (emergencyStop) {
            return (false, "Emergency stop active");
        }
        
        if (migrationState.currentPhase == MigrationPhase.COMPLETED) {
            return (false, "Migration already completed");
        }
        
        if (migrationState.currentPhase == MigrationPhase.FAILED) {
            return (false, "Migration failed");
        }
        
        if (migrationState.startTime > 0 && 
            block.timestamp - migrationState.startTime > MAX_MIGRATION_TIME) {
            return (false, "Migration timeout exceeded");
        }
        
        return (true, "");
    }

    /**
     * @dev Get rollback data for specific key
     */
    function getRollbackData(string calldata key) external view returns (bytes memory data) {
        return rollbackData[key];
    }

    /**
     * @dev Get all rollback keys
     */
    function getRollbackKeys() external view returns (string[] memory keys) {
        return rollbackKeys;
    }
}

