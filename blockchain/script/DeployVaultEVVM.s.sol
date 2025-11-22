// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {VaultEVVM} from "../src/VaultEVVM.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {Config} from "./Config.sol";

/**
 * @title DeployVaultEVVM
 * @notice Deployment script for VaultEVVM contract
 * @dev Deploys VaultEVVM integrated with MATE Metaprotocol (EVVM)
 *
 * Usage:
 *   forge script script/DeployVaultEVVM.s.sol:DeployVaultEVVM \
 *     --rpc-url sepolia \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 *
 * Environment Variables Required:
 *   PRIVATE_KEY - Deployer private key
 *   ETHERSCAN_API_KEY - For contract verification
 *   USE_MOCK_USDC - Set to "true" to deploy mock USDC (optional)
 *   USDC_ADDRESS - Real USDC address if not using mock (optional)
 *   FEE_COLLECTOR - Fee collector address (optional, defaults to deployer)
 */
contract DeployVaultEVVM is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        uint256 chainId = block.chainid;

        console.log("=== Deploying VaultEVVM ===");
        console.log("Chain ID:", chainId);
        console.log("Deployer:", deployer);
        console.log("");

        // Verify we're on Sepolia (EVVM only available on Sepolia)
        require(Config.hasEvvm(chainId), "EVVM not available on this chain");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Get or Deploy USDC
        address usdcAddress = getOrDeployUsdc(deployer);
        console.log("USDC Address:", usdcAddress);

        // 2. Get fee collector (defaults to deployer)
        address feeCollector = vm.envOr("FEE_COLLECTOR", deployer);
        console.log("Fee Collector:", feeCollector);

        // 3. Get EVVM and NameService addresses
        address evvmAddress = Config.getEvvm(chainId);
        address nameServiceAddress = Config.getNameService(chainId);
        console.log("EVVM Address:", evvmAddress);
        console.log("NameService Address:", nameServiceAddress);
        console.log("");

        // 4. Deploy VaultEVVM
        console.log("Deploying VaultEVVM...");
        VaultEVVM vault = new VaultEVVM(usdcAddress, feeCollector, evvmAddress, nameServiceAddress);
        console.log("VaultEVVM deployed at:", address(vault));
        console.log("");

        // 5. Verify deployment
        console.log("=== Deployment Summary ===");
        console.log("USDC:", usdcAddress);
        console.log("VaultEVVM:", address(vault));
        console.log("Fee Collector:", feeCollector);
        console.log("EVVM:", evvmAddress);
        console.log("NameService:", nameServiceAddress);
        console.log("");

        // 6. Display verification command
        console.log("=== Verification Command ===");
        console.log(
            string.concat(
                "forge verify-contract ",
                vm.toString(address(vault)),
                " VaultEVVM --chain sepolia --watch --constructor-args $(cast abi-encode 'constructor(address,address,address,address)' ",
                vm.toString(usdcAddress),
                " ",
                vm.toString(feeCollector),
                " ",
                vm.toString(evvmAddress),
                " ",
                vm.toString(nameServiceAddress),
                ")"
            )
        );
        console.log("");

        // 7. Save deployment info to file
        string memory deploymentInfo = string.concat(
            "{\n",
            '  "chainId": ',
            vm.toString(chainId),
            ",\n",
            '  "vault": "',
            vm.toString(address(vault)),
            '",\n',
            '  "usdc": "',
            vm.toString(usdcAddress),
            '",\n',
            '  "feeCollector": "',
            vm.toString(feeCollector),
            '",\n',
            '  "evvm": "',
            vm.toString(evvmAddress),
            '",\n',
            '  "nameService": "',
            vm.toString(nameServiceAddress),
            '"\n',
            "}"
        );

        vm.writeFile("deployments/vault-evvm.json", deploymentInfo);
        console.log("Deployment info saved to: deployments/vault-evvm.json");

        vm.stopBroadcast();
    }

    /**
     * @notice Get existing USDC or deploy mock
     * @param deployer Deployer address
     * @return USDC address
     */
    function getOrDeployUsdc(address deployer) internal returns (address) {
        // Check if we should use mock USDC
        bool useMock = vm.envOr("USE_MOCK_USDC", true);

        if (useMock) {
            console.log("Deploying Mock USDC...");
            MockERC20 mockUsdc = new MockERC20("USD Coin", "USDC", 6);

            // Mint 1 million USDC to deployer for testing
            mockUsdc.mint(deployer, 1_000_000 * 10 ** 6);
            console.log("Minted 1,000,000 USDC to deployer");

            return address(mockUsdc);
        } else {
            // Use real USDC address from env
            address usdcAddress = vm.envAddress("USDC_ADDRESS");
            require(usdcAddress != address(0), "USDC_ADDRESS not set");
            console.log("Using existing USDC at:", usdcAddress);
            return usdcAddress;
        }
    }
}
