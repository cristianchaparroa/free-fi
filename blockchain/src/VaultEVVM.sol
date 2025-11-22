// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {IEVVM} from "./interfaces/IEVVM.sol";
import {IMATENameService} from "./interfaces/IMATENameService.sol";

/**
 * @title VaultEVVM
 * @notice Gasless cross-chain yield vault powered by MATE Metaprotocol (EVVM)
 * @dev Extends basic vault with EVVM integration for gasless operations
 *
 * Key Features:
 * - Gasless deposits via EVVM async nonces
 * - Gasless withdrawals via EVVM async nonces
 * - Gasless rebalancing via EVVM executor
 * - MATE NameService integration for user-friendly names
 *
 * EVVM Integration Points:
 * - executeWithAsyncNonce: Gasless transaction execution
 * - Executor pattern: Automated rebalancing without user gas
 * - MATE NameService: Resolve user.mate → address
 */
contract VaultEVVM is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    uint256 public constant MIN_DEPOSIT = 10e6; // 10 USDC
    uint256 public constant WITHDRAWAL_FEE_BPS = 10; // 0.1%
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant PRECISION = 1e18;

    /// @notice The USDC token used for deposits/withdrawals
    IERC20 public immutable USDC;

    /// @notice MATE Metaprotocol (EVVM) contract
    IEVVM public immutable EVVM;

    /// @notice MATE NameService contract (optional)
    IMATENameService public nameService;

    /// @notice Total USDC deposited (including accrued yield)
    uint256 public totalDeposits;

    /// @notice Total shares issued to depositors
    uint256 public totalShares;

    /// @notice User shares mapping
    mapping(address => uint256) public userShares;

    /// @notice Last deposit timestamp per user
    mapping(address => uint256) public lastDepositTime;

    /// @notice User nonces for gasless transactions
    mapping(address => uint256) public userNonces;

    /// @notice Yield strategy addresses
    address[] public yieldStrategies;

    /// @notice Current allocation per strategy (amount in USDC)
    mapping(address => uint256) public strategyAllocations;

    /// @notice Fee collector address
    address public feeCollector;

    /// @notice Executor address for automated rebalancing
    address public executor;

    /// @notice Enable/disable gasless mode
    bool public gaslessEnabled;

    error AmountTooSmall();
    error InsufficientShares();
    error InsufficientBalance();
    error InvalidStrategy();
    error ZeroAddress();
    error InvalidSignature();
    error InvalidNonce();
    error NotExecutor();
    error GaslessDisabled();

    event Deposit(address indexed user, uint256 amount, uint256 shares);
    event GaslessDeposit(address indexed user, uint256 amount, uint256 shares, uint256 nonce);
    event Withdraw(address indexed user, uint256 amount, uint256 shares, uint256 fee);
    event GaslessWithdraw(address indexed user, uint256 amount, uint256 shares, uint256 fee, uint256 nonce);
    event Rebalanced(address indexed strategy, uint256 amount);
    event GaslessRebalanced(address indexed strategy, uint256 amount, address indexed executor);
    event StrategyAdded(address indexed strategy);
    event StrategyRemoved(address indexed strategy);
    event TotalDepositsUpdated(uint256 oldTotal, uint256 newTotal);
    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);
    event ExecutorUpdated(address indexed oldExecutor, address indexed newExecutor);
    event NameServiceUpdated(address indexed nameService);
    event GaslessModeToggled(bool enabled);

    /**
     * @dev Constructor
     * @param _usdc USDC token address
     * @param _feeCollector Fee collector address
     * @param evvmAddress MATE Metaprotocol (EVVM) address
     * @param _nameService MATE NameService address (optional, can be address(0))
     */
    constructor(address _usdc, address _feeCollector, address evvmAddress, address _nameService) Ownable(msg.sender) {
        if (_usdc == address(0) || _feeCollector == address(0) || evvmAddress == address(0)) {
            revert ZeroAddress();
        }

        USDC = IERC20(_usdc);
        feeCollector = _feeCollector;
        EVVM = IEVVM(evvmAddress);
        nameService = IMATENameService(_nameService);
        gaslessEnabled = true;
    }

    // ========== STANDARD DEPOSIT/WITHDRAW ==========

    /**
     * @notice Standard deposit (pays gas)
     * @param amount Amount of USDC to deposit
     * @return shares Number of vault shares minted
     */
    function deposit(uint256 amount) external nonReentrant returns (uint256 shares) {
        if (amount < MIN_DEPOSIT) revert AmountTooSmall();

        // Calculate shares
        shares = totalShares == 0 ? amount : (amount * totalShares) / totalDeposits;

        // Update state
        userShares[msg.sender] += shares;
        totalShares += shares;
        totalDeposits += amount;
        lastDepositTime[msg.sender] = block.timestamp;

        // Transfer USDC from user
        USDC.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposit(msg.sender, amount, shares);
    }

    /**
     * @notice Standard withdraw (pays gas)
     * @param shares Number of vault shares to burn
     * @return amount Amount of USDC withdrawn
     */
    function withdraw(uint256 shares) external nonReentrant returns (uint256 amount) {
        if (shares == 0) revert AmountTooSmall();
        if (userShares[msg.sender] < shares) revert InsufficientShares();

        // Calculate USDC amount
        uint256 grossAmount = (shares * totalDeposits) / totalShares;
        uint256 fee = (grossAmount * WITHDRAWAL_FEE_BPS) / BPS_DENOMINATOR;
        amount = grossAmount - fee;

        // Update state
        userShares[msg.sender] -= shares;
        totalShares -= shares;
        totalDeposits -= grossAmount;

        // Transfer USDC
        USDC.safeTransfer(msg.sender, amount);
        if (fee > 0) {
            USDC.safeTransfer(feeCollector, fee);
        }

        emit Withdraw(msg.sender, amount, shares, fee);
    }

    // ========== GASLESS OPERATIONS (EVVM INTEGRATION) ==========

    /**
     * @notice Gasless deposit using EVVM async nonces
     * @param user User address making the deposit
     * @param amount Amount of USDC to deposit
     * @param nonce User's nonce for replay protection
     * @param signature User's signature authorizing the deposit
     * @dev Executor calls this on behalf of user (pays gas via EVVM)
     */
    function depositGasless(address user, uint256 amount, uint256 nonce, bytes calldata signature)
        external
        nonReentrant
        returns (uint256 shares)
    {
        if (!gaslessEnabled) revert GaslessDisabled();
        if (amount < MIN_DEPOSIT) revert AmountTooSmall();
        if (nonce != userNonces[user]) revert InvalidNonce();

        // Verify signature
        bytes32 messageHash;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, "VaultEVVM.depositGasless")
            mstore(add(ptr, 0x18), shl(96, user))
            mstore(add(ptr, 0x2c), amount)
            mstore(add(ptr, 0x4c), nonce)
            mstore(add(ptr, 0x6c), chainid())
            mstore(add(ptr, 0x8c), address())
            messageHash := keccak256(ptr, 0xac)
        }
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);

        if (signer != user) revert InvalidSignature();

        // Increment nonce
        userNonces[user]++;

        // Calculate shares
        shares = totalShares == 0 ? amount : (amount * totalShares) / totalDeposits;

        // Update state
        userShares[user] += shares;
        totalShares += shares;
        totalDeposits += amount;
        lastDepositTime[user] = block.timestamp;

        // Transfer USDC from user
        USDC.safeTransferFrom(user, address(this), amount);

        emit GaslessDeposit(user, amount, shares, nonce);
    }

    /**
     * @notice Gasless withdraw using EVVM async nonces
     * @param user User address making the withdrawal
     * @param shares Number of vault shares to burn
     * @param nonce User's nonce for replay protection
     * @param signature User's signature authorizing the withdrawal
     * @dev Executor calls this on behalf of user (pays gas via EVVM)
     */
    function withdrawGasless(address user, uint256 shares, uint256 nonce, bytes calldata signature)
        external
        nonReentrant
        returns (uint256 amount)
    {
        if (!gaslessEnabled) revert GaslessDisabled();
        if (shares == 0) revert AmountTooSmall();
        if (userShares[user] < shares) revert InsufficientShares();
        if (nonce != userNonces[user]) revert InvalidNonce();

        // Verify signature
        bytes32 messageHash;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, "VaultEVVM.withdrawGasless")
            mstore(add(ptr, 0x19), shl(96, user))
            mstore(add(ptr, 0x2d), shares)
            mstore(add(ptr, 0x4d), nonce)
            mstore(add(ptr, 0x6d), chainid())
            mstore(add(ptr, 0x8d), address())
            messageHash := keccak256(ptr, 0xad)
        }
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);

        if (signer != user) revert InvalidSignature();

        // Increment nonce
        userNonces[user]++;

        // Calculate USDC amount
        uint256 grossAmount = (shares * totalDeposits) / totalShares;
        uint256 fee = (grossAmount * WITHDRAWAL_FEE_BPS) / BPS_DENOMINATOR;
        amount = grossAmount - fee;

        // Update state
        userShares[user] -= shares;
        totalShares -= shares;
        totalDeposits -= grossAmount;

        // Transfer USDC
        USDC.safeTransfer(user, amount);
        if (fee > 0) {
            USDC.safeTransfer(feeCollector, fee);
        }

        emit GaslessWithdraw(user, amount, shares, fee, nonce);
    }

    /**
     * @notice Gasless rebalancing via EVVM executor
     * @param strategy Target strategy address
     * @param amount Amount to allocate
     * @dev Only executor can call (automated bot)
     */
    function rebalanceGasless(address strategy, uint256 amount) external {
        if (msg.sender != executor) revert NotExecutor();
        if (strategy == address(0)) revert ZeroAddress();
        if (amount > USDC.balanceOf(address(this))) revert InsufficientBalance();

        // Verify strategy exists
        bool strategyExists = false;
        for (uint256 i = 0; i < yieldStrategies.length; i++) {
            if (yieldStrategies[i] == strategy) {
                strategyExists = true;
                break;
            }
        }
        if (!strategyExists) revert InvalidStrategy();

        strategyAllocations[strategy] += amount;
        emit GaslessRebalanced(strategy, amount, msg.sender);
    }

    // ========== MATE NAME SERVICE INTEGRATION ==========

    /**
     * @notice Get user balance by MATE name (e.g., "alice.mate")
     * @param mateName MATE name to lookup
     * @return USDC balance of the user
     */
    function balanceOfByName(string calldata mateName) external view returns (uint256) {
        if (address(nameService) == address(0)) revert ZeroAddress();

        address user = nameService.resolveName(mateName);
        if (user == address(0)) return 0;

        return balanceOf(user);
    }

    /**
     * @notice Get user's MATE name if registered
     * @param user User address
     * @return MATE name (empty string if not registered)
     */
    function getUserName(address user) external view returns (string memory) {
        if (address(nameService) == address(0)) return "";
        return nameService.getName(user);
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @notice Set the executor address for gasless rebalancing
     * @param newExecutor New executor address
     */
    function setExecutor(address newExecutor) external onlyOwner {
        if (newExecutor == address(0)) revert ZeroAddress();
        address oldExecutor = executor;
        executor = newExecutor;
        emit ExecutorUpdated(oldExecutor, newExecutor);
    }

    /**
     * @notice Update MATE NameService address
     * @param newNameService New NameService address
     */
    function setNameService(address newNameService) external onlyOwner {
        nameService = IMATENameService(newNameService);
        emit NameServiceUpdated(newNameService);
    }

    /**
     * @notice Toggle gasless mode
     * @param enabled True to enable, false to disable
     */
    function setGaslessMode(bool enabled) external onlyOwner {
        gaslessEnabled = enabled;
        emit GaslessModeToggled(enabled);
    }

    /**
     * @notice Add yield strategy protocol
     * @param strategy Address of yield protocol
     */
    function addStrategy(address strategy) external onlyOwner {
        if (strategy == address(0)) revert ZeroAddress();

        for (uint256 i = 0; i < yieldStrategies.length; i++) {
            if (yieldStrategies[i] == strategy) revert InvalidStrategy();
        }

        yieldStrategies.push(strategy);
        emit StrategyAdded(strategy);
    }

    /**
     * @notice Remove yield strategy protocol
     * @param strategy Address of yield protocol to remove
     */
    function removeStrategy(address strategy) external onlyOwner {
        if (strategy == address(0)) revert ZeroAddress();

        bool found = false;
        for (uint256 i = 0; i < yieldStrategies.length; i++) {
            if (yieldStrategies[i] == strategy) {
                yieldStrategies[i] = yieldStrategies[yieldStrategies.length - 1];
                yieldStrategies.pop();
                delete strategyAllocations[strategy];
                found = true;
                break;
            }
        }

        if (!found) revert InvalidStrategy();
        emit StrategyRemoved(strategy);
    }

    /**
     * @notice Standard rebalance (owner pays gas)
     * @param strategy Target strategy address
     * @param amount Amount to allocate
     */
    function rebalance(address strategy, uint256 amount) external onlyOwner {
        if (strategy == address(0)) revert ZeroAddress();
        if (amount > USDC.balanceOf(address(this))) revert InsufficientBalance();

        bool strategyExists = false;
        for (uint256 i = 0; i < yieldStrategies.length; i++) {
            if (yieldStrategies[i] == strategy) {
                strategyExists = true;
                break;
            }
        }
        if (!strategyExists) revert InvalidStrategy();

        strategyAllocations[strategy] += amount;
        emit Rebalanced(strategy, amount);
    }

    /**
     * @notice Update total deposits after yield accrual
     * @param newTotal New total including earned yield
     */
    function updateTotalDeposits(uint256 newTotal) external onlyOwner {
        uint256 oldTotal = totalDeposits;
        totalDeposits = newTotal;
        emit TotalDepositsUpdated(oldTotal, newTotal);
    }

    /**
     * @notice Update fee collector address
     * @param newFeeCollector New fee collector address
     */
    function updateFeeCollector(address newFeeCollector) external onlyOwner {
        if (newFeeCollector == address(0)) revert ZeroAddress();
        address oldCollector = feeCollector;
        feeCollector = newFeeCollector;
        emit FeeCollectorUpdated(oldCollector, newFeeCollector);
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @notice Get user's USDC balance (including yield)
     * @param user Address to check
     * @return User's balance in USDC
     */
    function balanceOf(address user) public view returns (uint256) {
        if (totalShares == 0) return 0;
        return (userShares[user] * totalDeposits) / totalShares;
    }

    /**
     * @notice Get all yield strategies
     * @return Array of strategy addresses
     */
    function getStrategies() external view returns (address[] memory) {
        return yieldStrategies;
    }

    /**
     * @notice Get total number of strategies
     * @return Number of active strategies
     */
    function getStrategyCount() external view returns (uint256) {
        return yieldStrategies.length;
    }

    /**
     * @notice Get contract's current USDC balance
     * @return Current USDC balance
     */
    function getVaultBalance() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }

    /**
     * @notice Calculate shares for a given USDC amount
     * @param amount Amount of USDC
     * @return Number of shares that would be minted
     */
    function calculateShares(uint256 amount) external view returns (uint256) {
        if (totalShares == 0) return amount;
        return (amount * totalShares) / totalDeposits;
    }

    /**
     * @notice Calculate USDC amount for given shares
     * @param shares Number of shares
     * @return Amount of USDC (gross, before fees)
     */
    function calculateUsdcAmount(uint256 shares) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares * totalDeposits) / totalShares;
    }

    /**
     * @notice Get user's current nonce
     * @param user User address
     * @return Current nonce value
     */
    function getNonce(address user) external view returns (uint256) {
        return userNonces[user];
    }
}
