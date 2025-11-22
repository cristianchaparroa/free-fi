// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Vault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MIN_DEPOSIT = 10e6; // 10 USDC
    uint256 public constant WITHDRAWAL_FEE_BPS = 10; // 0.1%
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant PRECISION = 1e18;

    /// @notice The USDC token used for deposits/withdrawals
    IERC20 public immutable USDC;

    /// @notice Total USDC deposited (including accrued yield)
    uint256 public totalDeposits;

    /// @notice Total shares issued to depositors
    uint256 public totalShares;

    /// @notice User shares mapping
    mapping(address => uint256) public userShares;

    /// @notice Last deposit timestamp per user (for potential time-locks)
    mapping(address => uint256) public lastDepositTime;

    /// @notice Yield strategy addresses (protocols we deposit to)
    address[] public yieldStrategies;

    /// @notice Current allocation per strategy (amount in USDC)
    mapping(address => uint256) public strategyAllocations;

    /// @notice Fee collector address
    address public feeCollector;

    error AmountTooSmall();
    error InsufficientShares();
    error InsufficientBalance();
    error InvalidStrategy();
    error ZeroAddress();

    event Deposit(address indexed user, uint256 amount, uint256 shares);
    event Withdraw(address indexed user, uint256 amount, uint256 shares, uint256 fee);

    constructor(address _usdc, address _feeCollector) Ownable(msg.sender) {
        if (_usdc == address(0) || _feeCollector == address(0)) revert ZeroAddress();
        USDC = IERC20(_usdc);
        feeCollector = _feeCollector;
    }

    function deposit(uint256 amount) external nonReentrant returns (uint256 shares) {
        if (amount < MIN_DEPOSIT) revert AmountTooSmall();

        // Calculate shares (first depositor gets 1:1 ratio)
        shares = totalShares == 0
            ? amount
            : (amount * totalShares) / totalDeposits;

        // Update state
        userShares[msg.sender] += shares;
        totalShares += shares;
        totalDeposits += amount;
        lastDepositTime[msg.sender] = block.timestamp;

        // Transfer USDC from user
        USDC.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposit(msg.sender, amount, shares);
    }

    function withdraw(uint256 shares) external nonReentrant returns (uint256 amount) {
        if (shares == 0) revert AmountTooSmall();
        if (userShares[msg.sender] < shares) revert InsufficientShares();

        // Calculate USDC amount (includes earned yield)
        uint256 grossAmount = (shares * totalDeposits) / totalShares;

        // Apply withdrawal fee
        uint256 fee = (grossAmount * WITHDRAWAL_FEE_BPS) / BPS_DENOMINATOR;
        amount = grossAmount - fee;

        // Update state
        userShares[msg.sender] -= shares;
        totalShares -= shares;
        totalDeposits -= grossAmount;

        // Transfer USDC to user and fee to collector
        USDC.safeTransfer(msg.sender, amount);
        if (fee > 0) {
            USDC.safeTransfer(feeCollector, fee);
        }

        emit Withdraw(msg.sender, amount, shares, fee);
    }
}