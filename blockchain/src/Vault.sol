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
    event Rebalanced(address indexed strategy, uint256 amount);
    event StrategyAdded(address indexed strategy);
    event StrategyRemoved(address indexed strategy);
    event TotalDepositsUpdated(uint256 oldTotal, uint256 newTotal);
    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);

    constructor(address _usdc, address _feeCollector) Ownable(msg.sender) {
        if (_usdc == address(0) || _feeCollector == address(0)) revert ZeroAddress();
        USDC = IERC20(_usdc);
        feeCollector = _feeCollector;
    }

    function deposit(uint256 amount) external nonReentrant returns (uint256 shares) {
        if (amount < MIN_DEPOSIT) revert AmountTooSmall();

        // Calculate shares (first depositor gets 1:1 ratio)
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

    /// @notice Get user's USDC balance (including yield)
    /// @param user Address to check
    /// @return User's balance in USDC
    function balanceOf(address user) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (userShares[user] * totalDeposits) / totalShares;
    }

    /// @notice Add yield strategy protocol
    /// @param strategy Address of yield protocol (Aave, Compound, etc)
    function addStrategy(address strategy) external onlyOwner {
        if (strategy == address(0)) revert ZeroAddress();

        // Check if strategy already exists
        for (uint256 i = 0; i < yieldStrategies.length; i++) {
            if (yieldStrategies[i] == strategy) revert InvalidStrategy();
        }

        yieldStrategies.push(strategy);
        emit StrategyAdded(strategy);
    }

    /// @notice Remove yield strategy protocol
    /// @param strategy Address of yield protocol to remove
    function removeStrategy(address strategy) external onlyOwner {
        if (strategy == address(0)) revert ZeroAddress();

        bool found = false;
        for (uint256 i = 0; i < yieldStrategies.length; i++) {
            if (yieldStrategies[i] == strategy) {
                // Move last element to current position and pop
                yieldStrategies[i] = yieldStrategies[yieldStrategies.length - 1];
                yieldStrategies.pop();

                // Clear allocation for this strategy
                delete strategyAllocations[strategy];

                found = true;
                break;
            }
        }

        if (!found) revert InvalidStrategy();
        emit StrategyRemoved(strategy);
    }

    /// @notice Rebalance funds to optimal yield strategy
    /// @param strategy Target strategy address
    /// @param amount Amount to allocate
    /// @dev Called by owner/backend service when better yield found
    function rebalance(address strategy, uint256 amount) external onlyOwner {
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

        // In real implementation, this would:
        // 1. Withdraw from current strategies
        // 2. Deposit to new strategy via strategy adapter
        // For MVP, we just track allocations

        strategyAllocations[strategy] += amount;
        emit Rebalanced(strategy, amount);
    }

    /// @notice Update total deposits after yield accrual
    /// @param newTotal New total including earned yield
    /// @dev Called by owner after claiming yield from protocols
    function updateTotalDeposits(uint256 newTotal) external onlyOwner {
        uint256 oldTotal = totalDeposits;
        totalDeposits = newTotal;
        emit TotalDepositsUpdated(oldTotal, newTotal);
    }

    /// @notice Get all yield strategies
    /// @return Array of strategy addresses
    function getStrategies() external view returns (address[] memory) {
        return yieldStrategies;
    }

    /// @notice Get total number of strategies
    /// @return Number of active strategies
    function getStrategyCount() external view returns (uint256) {
        return yieldStrategies.length;
    }

    /// @notice Update fee collector address
    /// @param newFeeCollector New fee collector address
    function updateFeeCollector(address newFeeCollector) external onlyOwner {
        if (newFeeCollector == address(0)) revert ZeroAddress();
        address oldCollector = feeCollector;
        feeCollector = newFeeCollector;
        emit FeeCollectorUpdated(oldCollector, newFeeCollector);
    }

    /// @notice Get contract's current USDC balance
    /// @return Current USDC balance in the contract
    function getVaultBalance() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }

    /// @notice Calculate shares for a given USDC amount
    /// @param amount Amount of USDC
    /// @return Number of shares that would be minted
    function calculateShares(uint256 amount) external view returns (uint256) {
        if (totalShares == 0) return amount;
        return (amount * totalShares) / totalDeposits;
    }

    /// @notice Calculate USDC amount for given shares
    /// @param shares Number of shares
    /// @return Amount of USDC (gross, before fees)
    function calculateUsdcAmount(uint256 shares) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares * totalDeposits) / totalShares;
    }
}
