// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDragonPartnerFeeDistributor {
    function depositFees(uint256 _partnerId, address _token, uint256 _amount) external;
    function recordVote(address voter, uint256 partnerId, uint256 votes) external;
    function getUserClaimable(uint256 _period, uint256 _partnerId, address _user, address _token) external view returns (uint256);
    function checkAndRollPeriod() external;
    function setProtocolFee(uint256 _fee) external;
} 