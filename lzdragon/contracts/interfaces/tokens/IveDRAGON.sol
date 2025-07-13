// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IveDRAGON
 * @dev Interface for veDRAGON vote-escrowed token
 */
interface IveDRAGON {
    // Custom errors
    error ZeroAddress();
    error ZeroAmount();
    error LockExpired();
    error LockNotExpired();
    error ExistingLock();
    error NoLock();
    error InvalidDuration();
    error TransferFailed();
    error Unauthorized();

    // Structs
    struct LockedBalance {
        uint256 amount;
        uint256 unlockTime;
    }

    // Events
    event Deposit(address indexed user, uint256 amount, uint256 lockTime, uint256 votingPower);
    event Withdraw(address indexed user, uint256 amount);
    event LockUpdated(address indexed user, uint256 lockDuration, uint256 votingPower);

    // View functions
    function votingPowerOf(address user) external view returns (uint256);
    function getVotingPower(address account) external view returns (uint256);
    function getVotingPowerAt(address user, uint256 timestamp) external view returns (uint256);
    function getTotalVotingPower() external view returns (uint256);
    function getTotalVotingPowerAt(uint256 timestamp) external view returns (uint256);
    function lockedBalanceOf(address account) external view returns (uint256);
    function unlockTimeOf(address account) external view returns (uint256);
    function totalLockedSupply() external view returns (uint256);
    function getUserLock(address user) external view returns (uint256 amount, uint256 end);
    function hasActiveLock(address user) external view returns (bool);

    // State changing functions
    function createLock(uint256 lpAmount, uint256 lockDuration) external;
    function increaseLockAmount(uint256 additionalAmount) external;
    function extendLock(uint256 lockDuration) external;
    function withdraw() external;
}
