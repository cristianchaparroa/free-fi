// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {Vault} from "../../src/Vault.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";

contract VaultTest is Test {
    Vault public vault;
    MockERC20 public usdc;

    address public owner = address(1);
    address public feeCollector = address(2);
    address public user1 = address(3);
    address public user2 = address(4);

    uint256 constant INITIAL_BALANCE = 10_000e6; // 10,000 USDC

    function setUp() public {
        // Deploy contracts
        vm.startPrank(owner);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        vault = new Vault(address(usdc), feeCollector);
        vm.stopPrank();

        // Mint USDC to test users
        usdc.mint(user1, INITIAL_BALANCE);
        usdc.mint(user2, INITIAL_BALANCE);

        // Label addresses for better traces
        vm.label(owner, "Owner");
        vm.label(feeCollector, "FeeCollector");
        vm.label(user1, "User1");
        vm.label(user2, "User2");
        vm.label(address(vault), "Vault");
        vm.label(address(usdc), "USDC");
    }

    /*//////////////////////////////////////////////////////////////
                            DEPOSIT TESTS
    //////////////////////////////////////////////////////////////*/

    function testDeposit() public {
        uint256 depositAmount = 1000e6; // 1,000 USDC

        vm.startPrank(user1);
        usdc.approve(address(vault), depositAmount);

        uint256 sharesBefore = vault.userShares(user1);
        vault.deposit(depositAmount);
        uint256 sharesAfter = vault.userShares(user1);

        assertEq(sharesAfter - sharesBefore, depositAmount, "Incorrect shares minted");
        assertEq(vault.balanceOf(user1), depositAmount, "Incorrect balance");
        assertEq(vault.totalDeposits(), depositAmount, "Incorrect total deposits");
        vm.stopPrank();
    }

    function testDepositMultipleUsers() public {
        uint256 amount1 = 1000e6;
        uint256 amount2 = 500e6;

        // User 1 deposits
        vm.startPrank(user1);
        usdc.approve(address(vault), amount1);
        vault.deposit(amount1);
        vm.stopPrank();

        // User 2 deposits
        vm.startPrank(user2);
        usdc.approve(address(vault), amount2);
        vault.deposit(amount2);
        vm.stopPrank();

        assertEq(vault.balanceOf(user1), amount1, "User1 incorrect balance");
        assertEq(vault.balanceOf(user2), amount2, "User2 incorrect balance");
        assertEq(vault.totalDeposits(), amount1 + amount2, "Incorrect total");
    }

    function testCannotDepositBelowMinimum() public {
        uint256 tooSmall = 5e6; // 5 USDC (below 10 USDC minimum)

        vm.startPrank(user1);
        usdc.approve(address(vault), tooSmall);

        vm.expectRevert(Vault.AmountTooSmall.selector);
        vault.deposit(tooSmall);
        vm.stopPrank();
    }

    function testFuzzDeposit(uint256 amount) public {
        amount = bound(amount, vault.MIN_DEPOSIT(), INITIAL_BALANCE);

        vm.startPrank(user1);
        usdc.approve(address(vault), amount);
        vault.deposit(amount);

        assertEq(vault.balanceOf(user1), amount, "Fuzz: Incorrect balance");
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                           WITHDRAW TESTS
    //////////////////////////////////////////////////////////////*/

    function testWithdraw() public {
        uint256 depositAmount = 1000e6;

        // Deposit first
        vm.startPrank(user1);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount);

        uint256 shares = vault.userShares(user1);
        uint256 balanceBefore = usdc.balanceOf(user1);

        // Withdraw
        vault.withdraw(shares);
        uint256 balanceAfter = usdc.balanceOf(user1);

        // Should get back deposit minus 0.1% fee
        uint256 expectedWithdrawal = depositAmount * 9990 / 10000;
        assertApproxEqAbs(
            balanceAfter - balanceBefore,
            expectedWithdrawal,
            1, // 1 wei tolerance
            "Incorrect withdrawal amount"
        );
        vm.stopPrank();
    }

    function testWithdrawWithYield() public {
        uint256 depositAmount = 1000e6;

        // User1 deposits
        vm.startPrank(user1);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount);
        vm.stopPrank();

        // Simulate 10% yield
        uint256 yieldEarned = 100e6;
        usdc.mint(address(vault), yieldEarned);

        vm.prank(owner);
        vault.updateTotalDeposits(depositAmount + yieldEarned);

        // User1 withdraws
        vm.startPrank(user1);
        uint256 shares = vault.userShares(user1);
        uint256 balanceBefore = usdc.balanceOf(user1);

        vault.withdraw(shares);
        uint256 balanceAfter = usdc.balanceOf(user1);

        // Should get back principal + yield - fee
        uint256 grossAmount = depositAmount + yieldEarned;
        uint256 expectedNet = grossAmount * 9990 / 10000;

        assertApproxEqAbs(balanceAfter - balanceBefore, expectedNet, 1, "Incorrect withdrawal with yield");
        vm.stopPrank();
    }

    function testCannotWithdrawMoreThanBalance() public {
        uint256 depositAmount = 1000e6;

        vm.startPrank(user1);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount);

        uint256 shares = vault.userShares(user1);

        vm.expectRevert(Vault.InsufficientShares.selector);
        vault.withdraw(shares + 1);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        YIELD DISTRIBUTION TESTS
    //////////////////////////////////////////////////////////////*/

    function testYieldDistributionProportional() public {
        uint256 amount1 = 1000e6; // User1: 1000 USDC
        uint256 amount2 = 500e6; // User2: 500 USDC

        // Both users deposit
        vm.startPrank(user1);
        usdc.approve(address(vault), amount1);
        vault.deposit(amount1);
        vm.stopPrank();

        vm.startPrank(user2);
        usdc.approve(address(vault), amount2);
        vault.deposit(amount2);
        vm.stopPrank();

        // Simulate 15% yield (225 USDC total)
        uint256 totalDeposited = amount1 + amount2;
        uint256 yieldEarned = (totalDeposited * 15) / 100;
        usdc.mint(address(vault), yieldEarned);

        vm.prank(owner);
        vault.updateTotalDeposits(totalDeposited + yieldEarned);

        // Check proportional distribution
        // User1 should have ~1150 USDC (1000 + 150 yield)
        // User2 should have ~575 USDC (500 + 75 yield)
        uint256 balance1 = vault.balanceOf(user1);
        uint256 balance2 = vault.balanceOf(user2);

        assertApproxEqAbs(balance1, 1150e6, 1e6, "User1 yield incorrect");
        assertApproxEqAbs(balance2, 575e6, 1e6, "User2 yield incorrect");
    }

    /*//////////////////////////////////////////////////////////////
                        STRATEGY MANAGEMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function testAddStrategy() public {
        address strategy = address(0x123);

        vm.prank(owner);
        vault.addStrategy(strategy);

        address[] memory strategies = vault.getStrategies();
        assertEq(strategies.length, 1, "Strategy not added");
        assertEq(strategies[0], strategy, "Wrong strategy address");
    }

    function testCannotAddDuplicateStrategy() public {
        address strategy = address(0x123);

        vm.startPrank(owner);
        vault.addStrategy(strategy);

        vm.expectRevert(Vault.InvalidStrategy.selector);
        vault.addStrategy(strategy);
        vm.stopPrank();
    }

    function testRemoveStrategy() public {
        address strategy = address(0x123);

        vm.startPrank(owner);
        vault.addStrategy(strategy);
        vault.removeStrategy(strategy);
        vm.stopPrank();

        address[] memory strategies = vault.getStrategies();
        assertEq(strategies.length, 0, "Strategy not removed");
    }

    function testRebalance() public {
        address strategy = address(0x123);
        uint256 depositAmount = 1000e6;

        // Add strategy and deposit funds
        vm.prank(owner);
        vault.addStrategy(strategy);

        vm.startPrank(user1);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount);
        vm.stopPrank();

        // Rebalance
        vm.prank(owner);
        vault.rebalance(strategy, depositAmount);

        assertEq(vault.strategyAllocations(strategy), depositAmount, "Incorrect allocation");
    }

    /*//////////////////////////////////////////////////////////////
                            ACCESS CONTROL TESTS
    //////////////////////////////////////////////////////////////*/

    function testOnlyOwnerCanRebalance() public {
        vm.prank(user1);
        vm.expectRevert();
        vault.rebalance(address(0x123), 1000e6);
    }

    function testOnlyOwnerCanAddStrategy() public {
        vm.prank(user1);
        vm.expectRevert();
        vault.addStrategy(address(0x123));
    }

    function testOnlyOwnerCanUpdateTotalDeposits() public {
        vm.prank(user1);
        vm.expectRevert();
        vault.updateTotalDeposits(1000e6);
    }

    /*//////////////////////////////////////////////////////////////
                              GAS TESTS
    //////////////////////////////////////////////////////////////*/

    function testGasDeposit() public {
        uint256 depositAmount = 1000e6;

        vm.startPrank(user1);
        usdc.approve(address(vault), depositAmount);

        uint256 gasBefore = gasleft();
        vault.deposit(depositAmount);
        uint256 gasUsed = gasBefore - gasleft();

        console2.log("Gas used for deposit:", gasUsed);
        vm.stopPrank();
    }

    function testGasWithdraw() public {
        uint256 depositAmount = 1000e6;

        vm.startPrank(user1);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount);

        uint256 shares = vault.userShares(user1);

        uint256 gasBefore = gasleft();
        vault.withdraw(shares);
        uint256 gasUsed = gasBefore - gasleft();

        console2.log("Gas used for withdraw:", gasUsed);
        vm.stopPrank();
    }
}
