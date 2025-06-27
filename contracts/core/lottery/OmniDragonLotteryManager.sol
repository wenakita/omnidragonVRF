// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { veDRAGONMath } from "../../libraries/math/veDRAGONMath.sol";
import { IChainlinkVRFIntegratorV2_5 } from "../../interfaces/external/chainlink/IChainlinkVRFIntegratorV2_5.sol";
import { MessagingReceipt } from "../../../lib/devtools/packages/oapp-evm/contracts/oapp/OAppSender.sol";

// ============ INTERFACES ============

interface IRandomWordsCallbackV2_5 {
    function receiveRandomWords(uint256[] memory randomWords, uint64 sequence) external;
}

interface IDragonJackpotVault {
    function getJackpotBalance() external view returns (uint256 balance);
    function payJackpot(address winner, uint256 amount) external;
    function getLastWinTime() external view returns (uint256 timestamp);
    function setWrappedNativeToken(address _wrappedNativeToken) external;
}

interface IDragonJackpotDistributor {
    function addToJackpot(uint256 amount) external;
    function distributeJackpot(address winner, uint256 amount) external;
    function getCurrentJackpot() external view returns (uint256);
}

interface IOmniDragonRandomnessProvider {
    function requestRandomnessFromPool() external payable returns (uint256);
    function drawUnpredictableFromPool(
        address swapper,
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint256 amountOut
    ) external returns (uint256 randomness);
    function getRandomnessRequest(uint256 randomnessId) external view returns (
        address requester,
        uint64 timestamp,
        bool fulfilled,
        uint256 randomValue,
        uint32 requestType
    );
    function authorizeConsumer(address consumer, bool authorized) external;
}

// ============ MAIN CONTRACT ============

contract OmniDragonLotteryManager is Ownable, ReentrancyGuard, IRandomWordsCallbackV2_5 {
    using SafeERC20 for IERC20;

    // ============ EVENTS ============
    event LotteryConfigured(uint256 indexed lotteryId, uint256 entryFee, uint256 maxParticipants);
    event LotteryEntered(uint256 indexed lotteryId, address indexed participant, uint256 entryFee);
    event LotteryDrawn(uint256 indexed lotteryId, address indexed winner, uint256 prize);
    event InstantLotteryProcessed(address indexed user, uint256 swapAmount, bool won, uint256 reward);
    event RandomnessRequested(uint256 indexed lotteryId, uint256 requestId);
    event RandomnessFulfilled(uint256 indexed requestId, uint256 randomness);

    // ============ ENUMS ============
    
    enum RandomnessSource {
        CHAINLINK_VRF,      // Primary: Chainlink VRF (most secure)
        DRAND,              // Secondary: drand beacon (future implementation)
        RANDOMNESS_PROVIDER // Fallback: OmniDragonRandomnessProvider (less secure)
    }

    // ============ STRUCTS ============
    
    struct LotteryConfig {
        uint256 entryFee;
        uint256 maxParticipants;
        uint256 prizePool;
        bool isActive;
        address[] participants;
        uint256 vrfRequestId;
        bool isDrawn;
        RandomnessSource randomnessSource; // Track which source was used
        uint64 vrfSequence; // For Chainlink VRF tracking
    }

    struct InstantLotteryConfig {
        uint256 baseWinProbability; // Base probability in basis points (1-10000)
        uint256 minSwapAmount;      // Minimum swap amount to qualify
        uint256 rewardPercentage;   // Percentage of swap amount as reward
        bool isActive;
    }

    struct UserStats {
        uint256 totalSwaps;
        uint256 totalVolume;
        uint256 totalWins;
        uint256 totalRewards;
        uint256 lastSwapTime;
    }

    // ============ STATE VARIABLES ============
    
    IChainlinkVRFIntegratorV2_5 public vrfIntegrator;
    IOmniDragonRandomnessProvider public randomnessProvider;
    IDragonJackpotVault public jackpotVault;
    IDragonJackpotDistributor public jackpotDistributor;
    
    uint256 public nextLotteryId = 1;
    uint256 public constant MIN_SWAP_INTERVAL = 1; // 1 second between swaps per user
    uint256 public constant MAX_PARTICIPANTS_PER_LOTTERY = 1000; // DoS protection
    
    mapping(uint256 => LotteryConfig) public lotteries;
    mapping(address => bool) public authorizedSwapContracts;
    mapping(address => UserStats) public userStats;
    mapping(uint256 => uint256) public vrfRequestToLottery; // VRF request ID to lottery ID
    
    InstantLotteryConfig public instantLotteryConfig;

    // ============ CONSTRUCTOR ============
    
    constructor(
        address _vrfIntegrator,
        address _randomnessProvider,
        address _jackpotVault,
        address _jackpotDistributor
    ) Ownable(msg.sender) {
        vrfIntegrator = IChainlinkVRFIntegratorV2_5(_vrfIntegrator);
        randomnessProvider = IOmniDragonRandomnessProvider(_randomnessProvider);
        jackpotVault = IDragonJackpotVault(_jackpotVault);
        jackpotDistributor = IDragonJackpotDistributor(_jackpotDistributor);
        
        // Set default instant lottery config
        instantLotteryConfig = InstantLotteryConfig({
            baseWinProbability: 100,  // 1% base win rate
            minSwapAmount: 1e18,      // 1 token minimum
            rewardPercentage: 500,    // 5% of swap amount
            isActive: true
        });
        
        // Register for Sonic FeeM automatically
        // No-op - FeeM registration disabled
    }

    // ============ MODIFIERS ============
    
    modifier onlyAuthorizedSwapContract() {
        require(authorizedSwapContracts[msg.sender], "Not authorized swap contract");
        _;
    }

    modifier rateLimited(address user) {
        require(
            block.timestamp >= userStats[user].lastSwapTime + MIN_SWAP_INTERVAL,
            "Swap too frequent"
        );
        userStats[user].lastSwapTime = block.timestamp;
        _;
    }

    // ============ ADMIN FUNCTIONS ============
    
    function setVRFIntegrator(address _vrfIntegrator) external onlyOwner {
        vrfIntegrator = IChainlinkVRFIntegratorV2_5(_vrfIntegrator);
        
        // Auto-authorize this contract with the VRF integrator if possible
        if (_vrfIntegrator != address(0)) {
            try IChainlinkVRFIntegratorV2_5(_vrfIntegrator).setAuthorizedCaller(address(this), true) {
                // Successfully authorized
            } catch {
                // Authorization failed - owner will need to authorize manually
            }
        }
    }

    function setRandomnessProvider(address _randomnessProvider) external onlyOwner {
        randomnessProvider = IOmniDragonRandomnessProvider(_randomnessProvider);
    }

    function setJackpotVault(address _jackpotVault) external onlyOwner {
        jackpotVault = IDragonJackpotVault(_jackpotVault);
    }

    function setJackpotDistributor(address _jackpotDistributor) external onlyOwner {
        jackpotDistributor = IDragonJackpotDistributor(_jackpotDistributor);
    }

    function authorizeSwapContract(address swapContract, bool authorized) external onlyOwner {
        authorizedSwapContracts[swapContract] = authorized;
    }

    function configureInstantLottery(
        uint256 _baseWinProbability,
        uint256 _minSwapAmount,
        uint256 _rewardPercentage,
        bool _isActive
    ) external onlyOwner {
        require(_baseWinProbability <= 10000, "Invalid probability");
        require(_rewardPercentage <= 10000, "Invalid reward percentage");
        
        instantLotteryConfig = InstantLotteryConfig({
            baseWinProbability: _baseWinProbability,
            minSwapAmount: _minSwapAmount,
            rewardPercentage: _rewardPercentage,
            isActive: _isActive
        });
    }

    function fundJackpot(uint256 /*amount*/) external payable onlyOwner {
        // Fund the jackpot distributor
        require(address(jackpotDistributor) != address(0), "Distributor not set");
        
        if (msg.value > 0) {
            // Send native S to distributor (if it accepts ETH)
            payable(address(jackpotDistributor)).transfer(msg.value);
        }
    }

    /**
     * @notice Fund jackpot with ERC20 tokens
     * @param token The ERC20 token address
     * @param amount The amount of tokens to fund
     * @dev Caller must approve this contract first for the token amount
     */
    function fundJackpotERC20(address token, uint256 amount) external onlyOwner {
        require(address(jackpotDistributor) != address(0), "Distributor not set");
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer tokens from caller to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Approve and add to jackpot distributor
        IERC20(token).forceApprove(address(jackpotDistributor), amount);
        jackpotDistributor.addToJackpot(amount);
    }

    // ============ LOTTERY FUNCTIONS ============
    
    function createLottery(
        uint256 entryFee,
        uint256 maxParticipants
    ) external onlyOwner returns (uint256 lotteryId) {
        require(maxParticipants <= MAX_PARTICIPANTS_PER_LOTTERY, "Exceeds max participants");
        
        lotteryId = nextLotteryId++;
        
        lotteries[lotteryId] = LotteryConfig({
            entryFee: entryFee,
            maxParticipants: maxParticipants,
            prizePool: 0,
            isActive: true,
            participants: new address[](0),
            vrfRequestId: 0,
            isDrawn: false,
            randomnessSource: RandomnessSource.RANDOMNESS_PROVIDER,
            vrfSequence: 0
        });

        emit LotteryConfigured(lotteryId, entryFee, maxParticipants);
    }

    function enterLottery(uint256 lotteryId) external payable nonReentrant {
        LotteryConfig storage lottery = lotteries[lotteryId];
        require(lottery.isActive, "Lottery not active");
        require(!lottery.isDrawn, "Lottery already drawn");
        require(lottery.participants.length < lottery.maxParticipants, "Lottery full");
        require(lottery.maxParticipants <= MAX_PARTICIPANTS_PER_LOTTERY, "Exceeds max participants");
        require(msg.value == lottery.entryFee, "Incorrect entry fee");

        lottery.participants.push(msg.sender);
        lottery.prizePool += msg.value;

        emit LotteryEntered(lotteryId, msg.sender, msg.value);

        // Auto-draw if lottery is full
        if (lottery.participants.length == lottery.maxParticipants) {
            _requestRandomnessForLottery(lotteryId);
        }
    }

    function drawLottery(uint256 lotteryId) external onlyOwner {
        LotteryConfig storage lottery = lotteries[lotteryId];
        require(lottery.isActive, "Lottery not active");
        require(!lottery.isDrawn, "Lottery already drawn");
        require(lottery.participants.length > 0, "No participants");

        _requestRandomnessForLottery(lotteryId);
    }

    function _requestRandomnessForLottery(uint256 lotteryId) internal {
        LotteryConfig storage lottery = lotteries[lotteryId];
        
        // Try Chainlink VRF first (most secure)
        if (address(vrfIntegrator) != address(0)) {
            uint256 vrfFee = 0.25 ether; // Proven working fee amount
            require(address(this).balance >= vrfFee, "Insufficient balance for VRF fee");
            
            try vrfIntegrator.requestRandomWordsSimple{value: vrfFee}(30110) returns (
                MessagingReceipt memory, 
                uint64 requestId
            ) {
                lottery.vrfRequestId = requestId;
                lottery.vrfSequence = requestId;
                lottery.randomnessSource = RandomnessSource.CHAINLINK_VRF;
                vrfRequestToLottery[requestId] = lotteryId;
                
                emit RandomnessRequested(lotteryId, requestId);
                return;
            } catch {
                // VRF failed, fall back to randomness provider
            }
        }
        
        // Fallback to randomness provider
        if (address(randomnessProvider) != address(0)) {
            uint256 poolFee = 0.0001 ether; 
            require(address(this).balance >= poolFee, "Insufficient balance for pool fee");
            
            uint256 requestId = randomnessProvider.requestRandomnessFromPool{value: poolFee}();
            lottery.vrfRequestId = requestId;
            lottery.randomnessSource = RandomnessSource.RANDOMNESS_PROVIDER;
            vrfRequestToLottery[requestId] = lotteryId;
            
            emit RandomnessRequested(lotteryId, requestId);
        } else {
            revert("No randomness source available");
        }
    }

    function fulfillLottery(uint256 lotteryId) external onlyOwner {
        LotteryConfig storage lottery = lotteries[lotteryId];
        require(lottery.vrfRequestId != 0, "No randomness request for this lottery");
        require(!lottery.isDrawn, "Lottery already drawn");
        
        uint256 randomness;
        bool fulfilled = false;
        
        // Check fulfillment based on randomness source
        if (lottery.randomnessSource == RandomnessSource.CHAINLINK_VRF) {
            // Check VRF integrator for fulfillment
            if (address(vrfIntegrator) != address(0)) {
                (uint256 randomWord, bool vrfFulfilled) = vrfIntegrator.getRandomWord(lottery.vrfSequence);
                if (vrfFulfilled && randomWord != 0) {
                    randomness = randomWord;
                    fulfilled = true;
                }
            }
        } else if (lottery.randomnessSource == RandomnessSource.RANDOMNESS_PROVIDER) {
            // Check randomness provider for fulfillment
            if (address(randomnessProvider) != address(0)) {
                (,, bool providerFulfilled, uint256 randomValue,) = randomnessProvider.getRandomnessRequest(lottery.vrfRequestId);
                if (providerFulfilled) {
                    randomness = randomValue;
                    fulfilled = true;
                }
            }
        }
        
        require(fulfilled, "Randomness request not fulfilled");
        require(randomness != 0, "Invalid random value");

        uint256 winnerIndex = randomness % lottery.participants.length;
        address winner = lottery.participants[winnerIndex];

        lottery.isDrawn = true;
        lottery.isActive = false;

        // Transfer prize to winner
        (bool success, ) = winner.call{value: lottery.prizePool}("");
        require(success, "Prize transfer failed");

        emit LotteryDrawn(lotteryId, winner, lottery.prizePool);
        emit RandomnessFulfilled(lottery.vrfRequestId, randomness);
    }

    // ============ INSTANT LOTTERY FUNCTIONS ============
    
    function processInstantLottery(
        address user,
        uint256 swapAmount
    ) external onlyAuthorizedSwapContract rateLimited(user) nonReentrant {
        require(instantLotteryConfig.isActive, "Instant lottery not active");
        require(swapAmount >= instantLotteryConfig.minSwapAmount, "Swap amount too small");

        // Update user stats
        UserStats storage stats = userStats[user];
        stats.totalSwaps++;
        stats.totalVolume += swapAmount;

        // Calculate swap amount-based probability using veDRAGONMath scaling
        uint256 swapBasedProbability = _calculateSwapBasedProbability(swapAmount);
        
        // Add loyalty bonus
        uint256 loyaltyBonus = _calculateLoyaltyBonus(user);
        uint256 winProbability = swapBasedProbability + loyaltyBonus;
        
        // Cap at maximum probability (4% = 400 basis points)
        if (winProbability > 400) winProbability = 400;

        // Get secure randomness from provider for per-swap lottery
        uint256 randomness = randomnessProvider.drawUnpredictableFromPool(
            user,
            address(0), // tokenA - could be passed from swap contract
            address(0), // tokenB - could be passed from swap contract  
            swapAmount,
            swapAmount  // amountOut - could be passed from swap contract
        );
        bool won = (randomness % 10000) < winProbability;

        uint256 reward = 0;
        if (won) {
            // Reward comes from accumulated jackpot, not percentage of swap
            uint256 availableJackpot = jackpotDistributor.getCurrentJackpot();
            if (availableJackpot > 0) {
                // Get a percentage of current jackpot as reward
                reward = (availableJackpot * instantLotteryConfig.rewardPercentage) / 10000;
                
                stats.totalWins++;
                stats.totalRewards += reward;
                
                // Distribute reward via jackpot distributor
                jackpotDistributor.distributeJackpot(user, reward);
            } else {
                won = false; // No jackpot available
            }
        }

        emit InstantLotteryProcessed(user, swapAmount, won, reward);
    }

    /**
     * @dev Calculate swap-based win probability using logarithmic scaling
     * @param swapAmount The swap amount in token units (assumes 1:1 USD ratio)
     * @return Probability in basis points (1 BP = 0.01%)
     * 
     * LOGARITHMIC SCALING FORMULA:
     * - $10 swap = 1 basis point (0.01% - rounded up from 0.004% for eligibility)
     * - $100 swap = 4 basis points (0.04%)
     * - $1,000 swap = 40 basis points (0.4%)  
     * - $10,000 swap = 400 basis points (4%)
     * 
     * Implementation uses piecewise linear interpolation to approximate log10 scaling.
     * WARNING: Assumes swapAmount is in token units equivalent to USD value.
     * Integer arithmetic may introduce small rounding errors near boundaries.
     */
    function _calculateSwapBasedProbability(uint256 swapAmount) internal pure returns (uint256) {
        uint256 minAmount = 10 ether; // $10 equivalent in token units
        uint256 maxAmount = 10000 ether; // $10,000 equivalent in token units
        
        if (swapAmount < minAmount) {
            return 0; // Below minimum
        } else if (swapAmount >= maxAmount) {
            return 400; // 4% maximum
        } else {
            // Logarithmic scaling implementation
            // Calculate log10(swapAmount / $10) and scale appropriately
            
            uint256 ratio = (swapAmount * 1000) / minAmount; // Multiply by 1000 for precision
            uint256 logValue = 0;
            
            // Simple log10 approximation for the specific range we need
            if (ratio >= 1000000) { // >= $10,000
                logValue = 3000; // log10(1000) * 1000 = 3000
            } else if (ratio >= 100000) { // >= $1,000  
                logValue = 2000 + ((ratio - 100000) * 1000) / 900000; // Interpolate between 2.0 and 3.0
            } else if (ratio >= 10000) { // >= $100
                logValue = 1000 + ((ratio - 10000) * 1000) / 90000; // Interpolate between 1.0 and 2.0
            } else { // >= $10
                logValue = (ratio - 1000) * 1000 / 9000; // Interpolate between 0.0 and 1.0
            }
            
            // Convert log value to basis points: 0.4 * 10^logValue
            // Base is 0.4 basis points, multiply by 10^(logValue/1000)
            uint256 probabilityBP;
            if (logValue == 0) {
                probabilityBP = 1; // Round 0.4 up to 1 for minimum eligibility
            } else if (logValue <= 1000) { // 0-1x multiplier
                probabilityBP = 1 + (logValue * 3) / 1000; // Scale from 1 to 4 basis points
            } else if (logValue <= 2000) { // 1-2x multiplier  
                probabilityBP = 4 + ((logValue - 1000) * 36) / 1000; // Scale from 4 to 40 basis points
            } else { // 2-3x multiplier
                probabilityBP = 40 + ((logValue - 2000) * 360) / 1000; // Scale from 40 to 400 basis points
            }
            
            return probabilityBP;
        }
    }

    function _calculateLoyaltyBonus(address user) internal view returns (uint256) {
        UserStats memory stats = userStats[user];
        
        // Loyalty bonus: 1 basis point per 10 swaps (max 50 basis points)
        uint256 swapBonus = (stats.totalSwaps / 10) * 1;
        if (swapBonus > 50) swapBonus = 50;
        
        // Volume bonus: 1 basis point per 100 tokens volume (max 30 basis points)
        uint256 volumeBonus = (stats.totalVolume / (100 * 1e18)) * 1;
        if (volumeBonus > 30) volumeBonus = 30;
        
        return swapBonus + volumeBonus;
    }

    // ============ VIEW FUNCTIONS ============
    
    function getLotteryInfo(uint256 lotteryId) external view returns (
        uint256 entryFee,
        uint256 maxParticipants,
        uint256 currentParticipants,
        uint256 prizePool,
        bool isActive,
        bool isDrawn
    ) {
        LotteryConfig memory lottery = lotteries[lotteryId];
        return (
            lottery.entryFee,
            lottery.maxParticipants,
            lottery.participants.length,
            lottery.prizePool,
            lottery.isActive,
            lottery.isDrawn
        );
    }

    function getLotteryDetails(uint256 lotteryId) external view returns (
        uint256 entryFee,
        uint256 maxParticipants,
        uint256 currentParticipants,
        uint256 prizePool,
        bool isActive,
        bool isDrawn,
        uint256 vrfRequestId,
        uint64 vrfSequence,
        RandomnessSource randomnessSource,
        bool randomnessFulfilled
    ) {
        LotteryConfig memory lottery = lotteries[lotteryId];
        
        bool fulfilled = false;
        if (lottery.vrfRequestId != 0) {
            if (lottery.randomnessSource == RandomnessSource.CHAINLINK_VRF && address(vrfIntegrator) != address(0)) {
                (, fulfilled) = vrfIntegrator.getRandomWord(lottery.vrfSequence);
            } else if (lottery.randomnessSource == RandomnessSource.RANDOMNESS_PROVIDER && address(randomnessProvider) != address(0)) {
                (,, fulfilled,,) = randomnessProvider.getRandomnessRequest(lottery.vrfRequestId);
            }
        }
        
        return (
            lottery.entryFee,
            lottery.maxParticipants,
            lottery.participants.length,
            lottery.prizePool,
            lottery.isActive,
            lottery.isDrawn,
            lottery.vrfRequestId,
            lottery.vrfSequence,
            lottery.randomnessSource,
            fulfilled
        );
    }

    function getLotteryParticipants(uint256 lotteryId) external view returns (address[] memory) {
        require(lotteries[lotteryId].participants.length <= MAX_PARTICIPANTS_PER_LOTTERY, "Too many participants for view");
        return lotteries[lotteryId].participants;
    }

    function getLotteryParticipantsPaginated(
        uint256 lotteryId, 
        uint256 startIndex, 
        uint256 count
    ) external view returns (address[] memory participants, uint256 totalCount) {
        address[] storage allParticipants = lotteries[lotteryId].participants;
        totalCount = allParticipants.length;
        
        require(startIndex < totalCount, "Start index out of bounds");
        
        uint256 endIndex = startIndex + count;
        if (endIndex > totalCount) {
            endIndex = totalCount;
        }
        
        participants = new address[](endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex; i++) {
            participants[i - startIndex] = allParticipants[i];
        }
    }

    function getUserStats(address user) external view returns (
        uint256 totalSwaps,
        uint256 totalVolume,
        uint256 totalWins,
        uint256 totalRewards,
        uint256 winRate
    ) {
        UserStats memory stats = userStats[user];
        uint256 currentWinRate = stats.totalSwaps > 0 ? (stats.totalWins * 10000) / stats.totalSwaps : 0;
        
        return (
            stats.totalSwaps,
            stats.totalVolume,
            stats.totalWins,
            stats.totalRewards,
            currentWinRate
        );
    }

    function getInstantLotteryConfig() external view returns (
        uint256 baseWinProbability,
        uint256 minSwapAmount,
        uint256 rewardPercentage,
        bool isActive
    ) {
        return (
            instantLotteryConfig.baseWinProbability,
            instantLotteryConfig.minSwapAmount,
            instantLotteryConfig.rewardPercentage,
            instantLotteryConfig.isActive
        );
    }

    function getRewardPoolBalance() external view returns (uint256) {
        if (address(jackpotDistributor) != address(0)) {
            return jackpotDistributor.getCurrentJackpot();
        }
        return 0;
    }

    function getJackpotVaultBalance() external view returns (uint256) {
        if (address(jackpotVault) != address(0)) {
            return jackpotVault.getJackpotBalance();
        }
        return 0;
    }

    function calculateWinProbability(address user, uint256 swapAmount) external view returns (uint256) {
        uint256 swapBasedProbability = _calculateSwapBasedProbability(swapAmount);
        uint256 loyaltyBonus = _calculateLoyaltyBonus(user);
        uint256 winProbability = swapBasedProbability + loyaltyBonus;
        if (winProbability > 400) winProbability = 400; // Cap at 4%
        return winProbability;
    }

    function calculateWinProbability(address user) external view returns (uint256) {
        // Legacy function - uses minimum swap amount for probability calculation
        uint256 minSwap = 10 ether; // $10
        return this.calculateWinProbability(user, minSwap);
    }

    function calculatePotentialReward(uint256 /*swapAmount*/) external view returns (uint256) {
        // Reward now comes from jackpot percentage, not swap percentage
        uint256 availableJackpot = address(jackpotDistributor) != address(0) ? 
            jackpotDistributor.getCurrentJackpot() : 0;
        return (availableJackpot * instantLotteryConfig.rewardPercentage) / 10000;
    }

    function calculateSwapBasedProbability(uint256 swapAmount) external pure returns (uint256) {
        return _calculateSwapBasedProbability(swapAmount);
    }

    // ============ VRF CALLBACK FUNCTION ============
    
    /**
     * @notice Receive random words from VRF integrator (automatic callback)
     * @param randomWords Array of random words
     * @param sequence The request sequence number
     */
    function receiveRandomWords(uint256[] memory randomWords, uint64 sequence) external override {
        require(msg.sender == address(vrfIntegrator), "Only VRF integrator can call");
        require(randomWords.length > 0, "No random words provided");
        
        // Find the lottery associated with this sequence
        uint256 lotteryId = vrfRequestToLottery[sequence];
        require(lotteryId != 0, "No lottery found for this sequence");
        
        LotteryConfig storage lottery = lotteries[lotteryId];
        require(lottery.vrfSequence == sequence, "Sequence mismatch");
        require(!lottery.isDrawn, "Lottery already drawn");
        require(lottery.randomnessSource == RandomnessSource.CHAINLINK_VRF, "Not a VRF lottery");
        
        // Automatically fulfill the lottery with the received random word
        uint256 randomness = randomWords[0];
        uint256 winnerIndex = randomness % lottery.participants.length;
        address winner = lottery.participants[winnerIndex];

        lottery.isDrawn = true;
        lottery.isActive = false;

        // Transfer prize to winner
        (bool success, ) = winner.call{value: lottery.prizePool}("");
        require(success, "Prize transfer failed");

        emit LotteryDrawn(lotteryId, winner, lottery.prizePool);
        emit RandomnessFulfilled(lottery.vrfRequestId, randomness);
    }

    // ============ EMERGENCY FUNCTIONS ============
    
    function emergencyWithdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function emergencyWithdrawS(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        payable(owner()).transfer(amount);
    }

    function getJackpotContracts() external view returns (address vault, address distributor) {
        return (address(jackpotVault), address(jackpotDistributor));
    }

    /**
     * @notice Check if this contract is registered for Sonic FeeM
     * @return isRegistered Whether the contract is registered for fee monetization
     */
    function checkFeeMStatus() external view returns (bool isRegistered) {
    }

    // Required to receive ETH
    receive() external payable {}
} 