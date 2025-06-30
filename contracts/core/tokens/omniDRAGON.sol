// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title omniDRAGON
 * @dev Simplified version of omniDRAGON optimized for CREATE2 deployment
 * No constructor arguments - all configuration set after deployment
 */
contract omniDRAGON {
    string public name = "DRAGON";
    string public symbol = "DRAGON";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    address public owner;
    bool public initialized;
    
    // LayerZero and other addresses set after deployment
    address public lzEndpoint;
    address public delegate;
    address public jackpotVault;
    address public revenueDistributor;
    address public lotteryManager;
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Initialized(address indexed lzEndpoint, address indexed delegate);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyInitialized() {
        require(initialized, "Not initialized");
        _;
    }
    
    // Empty constructor for CREATE2
    constructor() {
        // No arguments needed for CREATE2
    }
    
    /**
     * @dev Initialize contract after deployment
     */
    function initialize(
        address _lzEndpoint,
        address _delegate,
        uint256 _initialSupply
    ) external {
        require(!initialized, "Already initialized");
        require(_lzEndpoint != address(0), "Invalid endpoint");
        require(_delegate != address(0), "Invalid delegate");
        
        owner = _delegate;
        lzEndpoint = _lzEndpoint;
        delegate = _delegate;
        initialized = true;
        
        if (_initialSupply > 0) {
            totalSupply = _initialSupply;
            balanceOf[_delegate] = _initialSupply;
            emit Transfer(address(0), _delegate, _initialSupply);
        }
        
        emit Initialized(_lzEndpoint, _delegate);
    }
    
    /**
     * @dev Set core addresses after initialization
     */
    function setCoreAddresses(
        address _jackpotVault,
        address _revenueDistributor,
        address _lotteryManager
    ) external onlyOwner onlyInitialized {
        jackpotVault = _jackpotVault;
        revenueDistributor = _revenueDistributor;
        lotteryManager = _lotteryManager;
    }
    
    /**
     * @dev Basic ERC20 transfer
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    /**
     * @dev Basic ERC20 approve
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    /**
     * @dev Basic ERC20 transferFrom
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
    
    /**
     * @dev Mint tokens (owner only)
     */
    function mint(address to, uint256 amount) external onlyOwner onlyInitialized {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
    
    /**
     * @dev Burn tokens
     */
    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }
    
    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

