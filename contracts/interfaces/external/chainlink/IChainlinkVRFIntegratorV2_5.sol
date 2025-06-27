// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { MessagingFee } from "../../../../lib/devtools/packages/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "../../../../lib/devtools/packages/oapp-evm/contracts/oapp/OAppSender.sol";

/**
 * @title IChainlinkVRFIntegratorV2_5
 * @dev Interface for Chainlink VRF 2.5 integration with cross-chain support
 * 
 * This contract forwards VRF requests to peer chains for Chainlink VRF 2.5 processing via LayerZero V2.
 */
interface IChainlinkVRFIntegratorV2_5 {
    
    // Events
    event RandomWordsRequested(uint64 indexed requestId, address indexed requester, uint32 dstEid);
    event MessageSent(uint64 indexed requestId, uint32 indexed dstEid, bytes message);
    event RandomWordsReceived(uint256[] randomWords, uint64 indexed sequence, address indexed provider);
    event CallbackFailed(uint64 indexed sequence, address indexed provider, string reason);
    event CallbackSucceeded(uint64 indexed sequence, address indexed provider);
    event RequestExpired(uint64 indexed sequence, address indexed provider);
    event GasLimitUpdated(uint32 oldLimit, uint32 newLimit);
    event RequestTimeoutUpdated(uint256 oldTimeout, uint256 newTimeout); // AUDIT FIX: Add missing event
    event FeeMRegistered(address indexed contractAddress, uint256 indexed feeId);
    event ContractFunded(address indexed funder, uint256 amount, uint256 newBalance);

    /**
     * @notice Check the status of a request
     * @param requestId The request ID to check
     * @return fulfilled Whether the request has been fulfilled
     * @return exists Whether the request exists
     * @return provider The address that made the request
     * @return randomWord The random word (0 if not fulfilled)
     * @return timestamp When the request was made
     * @return expired Whether the request has expired
     */
    function checkRequestStatus(uint64 requestId) external view returns (
        bool fulfilled,
        bool exists,
        address provider,
        uint256 randomWord,
        uint256 timestamp,
        bool expired
    );

    /**
     * @notice Get the random word for a fulfilled request
     * @param requestId The request ID to query
     * @return randomWord The random word (0 if not fulfilled)
     * @return fulfilled Whether the request has been fulfilled
     */
    function getRandomWord(uint64 requestId) external view returns (uint256 randomWord, bool fulfilled);

    /**
     * @dev Request random words from a peer VRF Consumer
     * @param _dstEid The destination endpoint ID
     * @param _options LayerZero options for the cross-chain message
     */
    function requestRandomWords(uint32 _dstEid, bytes calldata _options) external payable returns (MessagingReceipt memory receipt, uint64 requestId);

    /**
     * @dev Request random words with default gas limit
     * @param _dstEid The destination endpoint ID
     */
    function requestRandomWordsSimple(uint32 _dstEid) external payable returns (MessagingReceipt memory receipt, uint64 requestId);
    
    /**
     * @dev Quote the fee for a random words request
     * @param _dstEid The destination endpoint ID
     * @param _options LayerZero options for the cross-chain message
     */
    function quote(uint32 _dstEid, bytes calldata _options) external view returns (MessagingFee memory fee);

    /**
     * @dev Update default gas limit (owner only)
     */
    function setDefaultGasLimit(uint32 _gasLimit) external;

    /**
     * @dev Update request timeout (owner only)
     */
    function setRequestTimeout(uint256 _timeout) external;

    /**
     * @dev Clean up expired requests (anyone can call)
     * @param requestIds Array of request IDs to clean up
     */
    function cleanupExpiredRequests(uint64[] calldata requestIds) external;

    /**
     * @dev Register contract on Sonic FeeM
     */
    function registerMe() external; // TEMPORARILY DISABLED - requires valid FeeM Project ID

    /**
     * @dev Emergency withdraw (owner only)
     */
    function withdraw() external;

    /**
     * @dev Fund contract with ETH for LayerZero operations
     */
    function fundContract() external payable;

    /**
     * @dev Authorize/deauthorize callers
     * @param caller The address to authorize/deauthorize
     * @param authorized Whether to authorize or deauthorize
     */
    function setAuthorizedCaller(address caller, bool authorized) external;

    /**
     * @dev Get current contract balance and status
     * @return balance Current ETH balance
     * @return canOperate Whether contract has sufficient funds for operations
     */
    function getContractStatus() external view returns (uint256 balance, bool canOperate);

    /* ========== STATE VARIABLES ========== */

    function requestCounter() external view returns (uint64);
    function defaultGasLimit() external view returns (uint32);
    function requestTimeout() external view returns (uint256);
    function s_requests(uint64 requestId) external view returns (
        bool fulfilled,
        bool exists,
        address provider,
        uint256 randomWord,
        uint256 timestamp,
        bool isContract
    );
    // AUDIT FIX: Removed redundant randomWordsProviders mapping from interface
} 