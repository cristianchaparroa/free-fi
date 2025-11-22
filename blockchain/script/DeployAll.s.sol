// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {VaultEVVM} from "../src/VaultEVVM.sol";
import {YieldFlowOFTEVVM} from "../src/YieldFlowOFTEVVM.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {Config} from "./Config.sol";

/**
 * @title DeployAll
 * @notice Comprehensive deployment script for entire FreeFi protocol on Sepolia
 * @dev Deploys VaultEVVM + YieldFlowOFTEVVM with EVVM integration
 *
 * Usage:
 *   forge script script/DeployAll.s.sol:DeployAll \
 *     --rpc-url sepolia \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 *
 * Environment Variables:
 *   PRIVATE_KEY - Deployer private key
 *   ETHERSCAN_API_KEY - For contract verification
 *   USE_MOCK_USDC - Set to "true" to deploy mock USDC (default: true)
 *   FEE_COLLECTOR - Fee collector address (default: deployer)
 *   EXECUTOR - Executor address for gasless operations (default: deployer)
 */
contract DeployAll is Script {
    struct Deployment {
        address usdc;
        address vault;
        address oft;
        address evvm;
        address nameService;
        address feeCollector;
        address executor;
    }

    function run() external returns (Deployment memory deployment) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        uint256 chainId = block.chainid;

        console.log("=== FreeFi Protocol Deployment ===");
        console.log("Chain ID:", chainId);
        console.log("Deployer:", deployer);
        console.log("");

        // Verify we're on Sepolia
        require(Config.hasEVVM(chainId), "Deploy on Sepolia for EVVM integration");

        vm.startBroadcast(deployerPrivateKey);

        // ========== STEP 1: USDC ==========
        console.log("Step 1: Deploy/Get USDC");
        deployment.usdc = _getOrDeployUSDC(deployer);
        console.log("  USDC:", deployment.usdc);
        console.log("");

        // ========== STEP 2: Configuration ==========
        console.log("Step 2: Get Configuration");
        deployment.evvm = Config.getEVVM(chainId);
        deployment.nameService = Config.getNameService(chainId);
        deployment.feeCollector = vm.envOr("FEE_COLLECTOR", deployer);
        deployment.executor = vm.envOr("EXECUTOR", deployer);
        address lzEndpoint = Config.getLZEndpoint(chainId);

        console.log("  EVVM:", deployment.evvm);
        console.log("  NameService:", deployment.nameService);
        console.log("  Fee Collector:", deployment.feeCollector);
        console.log("  Executor:", deployment.executor);
        console.log("  LayerZero Endpoint:", lzEndpoint);
        console.log("");

        // ========== STEP 3: Deploy VaultEVVM ==========
        console.log("Step 3: Deploy VaultEVVM");
        VaultEVVM vault =
            new VaultEVVM(deployment.usdc, deployment.feeCollector, deployment.evvm, deployment.nameService);
        deployment.vault = address(vault);
        console.log("  VaultEVVM:", deployment.vault);
        console.log("");

        // ========== STEP 4: Deploy YieldFlowOFTEVVM ==========
        console.log("Step 4: Deploy YieldFlowOFTEVVM");
        YieldFlowOFTEVVM oft =
            new YieldFlowOFTEVVM(deployment.usdc, deployment.vault, lzEndpoint, deployment.evvm, deployer);
        deployment.oft = address(oft);
        console.log("  YieldFlowOFTEVVM:", deployment.oft);
        console.log("");

        // ========== STEP 5: Configure VaultEVVM ==========
        console.log("Step 5: Configure VaultEVVM");
        vault.setExecutor(deployment.executor);
        console.log("  Set executor:", deployment.executor);

        vault.setGaslessMode(true);
        console.log("  Enabled gasless mode");
        console.log("");

        // ========== STEP 6: Configure YieldFlowOFTEVVM ==========
        console.log("Step 6: Configure YieldFlowOFTEVVM");
        oft.setAutoDeposit(true);
        console.log("  Enabled auto-deposit");

        // Note: Gasless mode for OFT should be enabled after executor is ready
        console.log("  Gasless mode: disabled (enable after executor setup)");
        console.log("");

        // ========== STEP 7: Summary ==========
        console.log("=== Deployment Complete ===");
        console.log("USDC:", deployment.usdc);
        console.log("VaultEVVM:", deployment.vault);
        console.log("YieldFlowOFTEVVM:", deployment.oft);
        console.log("Fee Collector:", deployment.feeCollector);
        console.log("Executor:", deployment.executor);
        console.log("EVVM:", deployment.evvm);
        console.log("NameService:", deployment.nameService);
        console.log("");

        // ========== STEP 8: Next Steps ==========
        console.log("=== Next Steps ===");
        console.log("1. Deploy YieldFlowOFTEVVM on source chains (Arbitrum, Base)");
        console.log("2. Configure LayerZero peers (use ConfigurePeers.s.sol)");
        console.log("3. Set up executor bot backend");
        console.log("4. Enable gasless mode on OFT: oft.setGaslessMode(true)");
        console.log("5. Test cross-chain deposits");
        console.log("6. Test gasless operations");
        console.log("");

        // ========== STEP 9: Save Deployment Info ==========
        string memory deploymentInfo = string.concat(
            "{\n",
            '  "chainId": ',
            vm.toString(chainId),
            ",\n",
            '  "usdc": "',
            vm.toString(deployment.usdc),
            '",\n',
            '  "vault": "',
            vm.toString(deployment.vault),
            '",\n',
            '  "oft": "',
            vm.toString(deployment.oft),
            '",\n',
            '  "feeCollector": "',
            vm.toString(deployment.feeCollector),
            '",\n',
            '  "executor": "',
            vm.toString(deployment.executor),
            '",\n',
            '  "evvm": "',
            vm.toString(deployment.evvm),
            '",\n',
            '  "nameService": "',
            vm.toString(deployment.nameService),
            '",\n',
            '  "lzEndpoint": "',
            vm.toString(lzEndpoint),
            '",\n',
            '  "lzEid": ',
            vm.toString(uint256(Config.getLZEid(chainId))),
            "\n",
            "}"
        );

        vm.writeFile("deployments/sepolia-complete.json", deploymentInfo);
        console.log("Deployment saved to: deployments/sepolia-complete.json");

        vm.stopBroadcast();

        return deployment;
    }

    function _getOrDeployUSDC(address deployer) internal returns (address) {
        bool useMock = vm.envOr("USE_MOCK_USDC", true);

        if (useMock) {
            console.log("  Deploying Mock USDC...");
            MockERC20 mockUsdc = new MockERC20("USD Coin", "USDC", 6);
            mockUsdc.mint(deployer, 10_000_000 * 10 ** 6); // 10M USDC
            console.log("  Minted 10,000,000 USDC to deployer");
            return address(mockUsdc);
        } else {
            address usdcAddress = vm.envAddress("USDC_ADDRESS");
            require(usdcAddress != address(0), "USDC_ADDRESS not set");
            console.log("  Using existing USDC");
            return usdcAddress;
        }
    }
}
