// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DragonTimelockLib
 * @dev Complete timelock library for Dragon ecosystem governance
 * Provides secure timelock mechanisms for critical operations
 *
 * Ensures governance transparency and prevents rushed critical changes
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
library DragonTimelockLib {

    // ======== EVENTS ========
    event ProposalCreated(
        bytes32 indexed proposalId,
        AdminOperation indexed operation,
        uint256 executeAfter,
        bytes data
    );
    
    event ProposalExecuted(bytes32 indexed proposalId, AdminOperation indexed operation);
    event ProposalCancelled(bytes32 indexed proposalId, AdminOperation indexed operation);
    
    // ======== STRUCTS ========
    
    /**
     * @dev Timelock proposal structure
     */
    struct TimelockProposal {
        AdminOperation operation;
        uint256 executeAfter;
        bytes data;
        bool executed;
        bool cancelled;
        address proposer;
        uint256 createdAt;
    }
    
    // ======== ENUMS ========
    
    /**
     * @dev Administrative operations that require timelock
     */
    enum AdminOperation {
        SET_JACKPOT_VAULT,
        SET_REVENUE_DISTRIBUTOR,
        SET_UNISWAP_ROUTER,
        SET_EMERGENCY_PAUSER,
        SET_MAX_SINGLE_TRANSFER,
        SET_TIMELOCK_DELAY,
        SET_ADAPTIVE_FEE_MANAGER,
        SET_BUY_FEES,
        SET_SELL_FEES,
        SET_TRANSFER_FEES,
        SET_VEDRAGON_LP_BOOST_MANAGER,
        SET_SONIC_FEEM_REGISTRY,
        SET_VRF_LOTTERY_MANAGER,
        SET_LOTTERY_MANAGER,
        SET_RANDOMNESS_PROVIDER,
        PAUSE_CONTRACT,
        UNPAUSE_CONTRACT,
        EMERGENCY_WITHDRAW,
        UPGRADE_CONTRACT,
        SET_MARKET_ORACLE,
        SET_MARKET_ANALYZER,
        SET_MARKET_CONTROLLER
    }
    
    // ======== CONSTANTS ========
    
    uint256 public constant MIN_TIMELOCK_DELAY = 1 hours;
    uint256 public constant MAX_TIMELOCK_DELAY = 30 days;
    uint256 public constant DEFAULT_TIMELOCK_DELAY = 48 hours;
    
    // ======== ERRORS ========
    
    error TimelockNotExpired();
    error ProposalNotFound();
    error ProposalAlreadyExecuted();
    error ProposalAlreadyCancelled();
    error InvalidTimelockDelay();
    error UnauthorizedOperation();
    error ProposalExpired();
    error InvalidProposalId();
    
    // ======== FUNCTIONS ========
    
    /**
     * @dev Generate a unique proposal ID
     */
    function generateProposalId(
        AdminOperation operation,
        bytes memory data,
        uint256 nonce
    ) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(operation, data, nonce, block.timestamp));
    }
    
    /**
     * @dev Create a new timelock proposal
     */
    function createProposal(
        mapping(bytes32 => TimelockProposal) storage proposals,
        AdminOperation operation,
        bytes memory data,
        uint256 timelockDelay,
        uint256 nonce
    ) internal returns (bytes32 proposalId) {
        if (timelockDelay < MIN_TIMELOCK_DELAY || timelockDelay > MAX_TIMELOCK_DELAY) {
            revert InvalidTimelockDelay();
        }
        
        proposalId = generateProposalId(operation, data, nonce);
        
        if (proposals[proposalId].createdAt != 0) {
            revert InvalidProposalId();
        }
        
        uint256 executeAfter = block.timestamp + timelockDelay;
        
        proposals[proposalId] = TimelockProposal({
            operation: operation,
            executeAfter: executeAfter,
            data: data,
            executed: false,
            cancelled: false,
            proposer: msg.sender,
            createdAt: block.timestamp
        });
        
        emit ProposalCreated(proposalId, operation, executeAfter, data);
        
        return proposalId;
    }
    
    /**
     * @dev Execute a timelock proposal
     */
    function executeProposal(
        mapping(bytes32 => TimelockProposal) storage proposals,
        bytes32 proposalId
    ) internal returns (TimelockProposal memory proposal) {
        proposal = proposals[proposalId];
        
        if (proposal.createdAt == 0) {
            revert ProposalNotFound();
        }
        
        if (proposal.executed) {
            revert ProposalAlreadyExecuted();
        }
        
        if (proposal.cancelled) {
            revert ProposalAlreadyCancelled();
        }
        
        if (block.timestamp < proposal.executeAfter) {
            revert TimelockNotExpired();
        }
        
        // Check for proposal expiration (7 days after unlock time)
        if (block.timestamp > proposal.executeAfter + 7 days) {
            revert ProposalExpired();
        }
        
        proposals[proposalId].executed = true;
        
        emit ProposalExecuted(proposalId, proposal.operation);
        
        return proposal;
    }
    
    /**
     * @dev Cancel a timelock proposal
     */
    function cancelProposal(
        mapping(bytes32 => TimelockProposal) storage proposals,
        bytes32 proposalId
    ) internal {
        TimelockProposal storage proposal = proposals[proposalId];
        
        if (proposal.createdAt == 0) {
            revert ProposalNotFound();
        }
        
        if (proposal.executed) {
            revert ProposalAlreadyExecuted();
        }
        
        if (proposal.cancelled) {
            revert ProposalAlreadyCancelled();
        }
        
        proposal.cancelled = true;
        
        emit ProposalCancelled(proposalId, proposal.operation);
    }
    
    /**
     * @dev Check if a proposal is ready for execution
     */
    function isProposalReady(
        mapping(bytes32 => TimelockProposal) storage proposals,
        bytes32 proposalId
    ) internal view returns (bool) {
        TimelockProposal storage proposal = proposals[proposalId];
        
        return proposal.createdAt != 0 &&
               !proposal.executed &&
               !proposal.cancelled &&
               block.timestamp >= proposal.executeAfter &&
               block.timestamp <= proposal.executeAfter + 7 days;
    }
    
    /**
     * @dev Get proposal details
     */
    function getProposal(
        mapping(bytes32 => TimelockProposal) storage proposals,
        bytes32 proposalId
    ) internal view returns (TimelockProposal memory) {
        return proposals[proposalId];
    }
    
    /**
     * @dev Check if an operation requires timelock
     */
    function requiresTimelock(AdminOperation operation) internal pure returns (bool) {
        return operation == AdminOperation.SET_JACKPOT_VAULT ||
               operation == AdminOperation.SET_REVENUE_DISTRIBUTOR ||
               operation == AdminOperation.SET_ADAPTIVE_FEE_MANAGER ||
               operation == AdminOperation.SET_BUY_FEES ||
               operation == AdminOperation.SET_SELL_FEES ||
               operation == AdminOperation.SET_TRANSFER_FEES ||
               operation == AdminOperation.SET_TIMELOCK_DELAY ||
               operation == AdminOperation.UPGRADE_CONTRACT ||
               operation == AdminOperation.EMERGENCY_WITHDRAW;
    }
    
    /**
     * @dev Check if an operation allows emergency bypass
     */
    function allowsEmergencyBypass(AdminOperation operation) internal pure returns (bool) {
        return operation == AdminOperation.SET_EMERGENCY_PAUSER ||
               operation == AdminOperation.SET_UNISWAP_ROUTER ||
               operation == AdminOperation.SET_VEDRAGON_LP_BOOST_MANAGER ||
               operation == AdminOperation.SET_SONIC_FEEM_REGISTRY ||
               operation == AdminOperation.PAUSE_CONTRACT ||
               operation == AdminOperation.UNPAUSE_CONTRACT;
    }
    
    /**
     * @dev Validate timelock delay
     */
    function validateTimelockDelay(uint256 delay) internal pure returns (bool) {
        return delay >= MIN_TIMELOCK_DELAY && delay <= MAX_TIMELOCK_DELAY;
    }
}
