// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IDragonRevenueDistributor
 * @dev Interface for the DragonRevenueDistributor contract which distributes fees
 *
 * Manages fee distribution to voters based on voting weight and partner participation
 * Facilitates democratic revenue sharing within the OmniDragon ecosystem
 * https://x.com/sonicreddragon
 * https://t.me/sonicreddragon
 */
interface IDragonRevenueDistributor {
    // Events
    event VotesRecorded(uint256 indexed period, uint256 indexed partnerId, address indexed user, uint256 votes);
    event FeesDeposited(uint256 indexed period, uint256 indexed partnerId, address indexed token, uint256 amount);
    event FeesClaimed(uint256 indexed period, uint256 indexed partnerId, address indexed user, address token, uint256 amount);
    event PeriodRolled(uint256 indexed oldPeriod, uint256 indexed newPeriod);
    event GeneralFeesDistributed(address indexed token, uint256 amount);

    /**
     * @dev Records votes for a partner by a user
     * @param _partnerId ID of the partner being voted for
     * @param _user Address of the voter
     * @param _votes Amount of votes cast
     */
    function recordVotes(uint256 _partnerId, address _user, uint256 _votes) external;

    /**
     * @dev Deposits fees for a specific partner
     * @param _partnerId ID of the partner
     * @param _token Token address of the fee
     * @param _amount Amount of fees
     */
    function depositFees(uint256 _partnerId, address _token, uint256 _amount) external;

    /**
     * @dev Distributes general fees not associated with a specific partner
     * @param _token Token address of the fee
     * @param _amount Amount of fees
     */
    function distributeGeneralFees(address _token, uint256 _amount) external;

    /**
     * @dev Claims fees for a specific period, partner, and token
     * @param _period Period to claim for
     * @param _partnerId ID of the partner
     * @param _token Token address to claim
     * @return amount Amount claimed
     */
    function claimFees(uint256 _period, uint256 _partnerId, address _token) external returns (uint256 amount);

    /**
     * @dev Gets the amount of fees claimable by a user
     * @param _period Period to check
     * @param _partnerId ID of the partner
     * @param _user Address of the user
     * @param _token Token address to check
     * @return amount Claimable amount
     */
    function getUserClaimable(uint256 _period, uint256 _partnerId, address _user, address _token) external view returns (uint256 amount);

    /**
     * @dev Gets the current period
     * @return period Current period
     */
    function getCurrentPeriod() external view returns (uint256 period);

    /**
     * @dev Checks and rolls to a new period if needed
     * @return newPeriod The current period after checking
     */
    function checkAndRollPeriod() external returns (uint256 newPeriod);

    /**
     * @dev Gets the total votes for a partner in a period
     * @param _period Period to check
     * @param _partnerId ID of the partner
     * @return votes Total votes
     */
    function getPartnerTotalVotes(uint256 _period, uint256 _partnerId) external view returns (uint256 votes);

    /**
     * @dev Gets a user's votes for a partner in a period
     * @param _period Period to check
     * @param _partnerId ID of the partner
     * @param _user Address of the user
     * @return votes User's votes
     */
    function getUserVotes(uint256 _period, uint256 _partnerId, address _user) external view returns (uint256 votes);
}
