// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {YieldFlowOFT} from "../../src/YieldFlowOFT.sol";
import {Vault} from "../../src/Vault.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";

// Mock LayerZero Endpoint
contract MockLZEndpoint {
    function setDelegate(address) external {}
}

contract YieldFlowOFTTest is Test {
    YieldFlowOFT public oft;
    Vault public vault;
    MockERC20 public usdc;
    MockLZEndpoint public lzEndpoint;

    address owner = address(1);
    address feeCollector = address(2);
    address user1 = address(3);

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);

        vm.prank(owner);
        vault = new Vault(address(usdc), feeCollector);

        lzEndpoint = new MockLZEndpoint();
        oft = new YieldFlowOFT(address(usdc), address(vault), address(lzEndpoint), owner);
        usdc.mint(user1, 10_000e6);
    }

    function testMintWithUsdc() public {
        uint256 amount = 1000e6;

        vm.startPrank(user1);
        usdc.approve(address(oft), amount);
        oft.mintWithUsdc(amount);

        assertEq(oft.balanceOf(user1), amount);
        assertEq(usdc.balanceOf(address(oft)), amount);
        vm.stopPrank();
    }

    function testMintWithUsdcRevertsOnZero() public {
        vm.prank(user1);
        vm.expectRevert(YieldFlowOFT.InvalidAmount.selector);
        oft.mintWithUsdc(0);
    }

    function testBurnForUsdc() public {
        uint256 amount = 1000e6;

        vm.startPrank(user1);
        usdc.approve(address(oft), amount);
        oft.mintWithUsdc(amount);

        oft.burnForUsdc(amount);

        assertEq(oft.balanceOf(user1), 0);
        assertEq(usdc.balanceOf(user1), 10_000e6);
        vm.stopPrank();
    }

    function testBurnForUsdcRevertsOnZero() public {
        vm.prank(user1);
        vm.expectRevert(YieldFlowOFT.InvalidAmount.selector);
        oft.burnForUsdc(0);
    }

    function testBurnForUsdcRevertsOnInsufficientBalance() public {
        vm.prank(user1);
        vm.expectRevert(YieldFlowOFT.InvalidAmount.selector);
        oft.burnForUsdc(100e6);
    }
}
