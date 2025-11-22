// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {YieldFlowOFTEVVM} from "../src/YieldFlowOFTEVVM.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {Config} from "./Config.sol";

/**
 * @title DeployYieldFlowOFTEVVM
 * @notice Deployment script for YieldFlowOFTEVVM contract
 * @dev Deploys YieldFlowOFTEVVM for cross-chain bridging with EVVM integration
 *
 * Usage for Sepolia (Destination Chain):
 *   forge script script/DeployYieldFlowOFTEVVM.s.sol:DeployYieldFlowOFTEVVM \
 *     --rpc-url sepolia \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 *
 * Usage for Source Chains (Arbitrum/Base Sepolia):
 *   forge script script/DeployYieldFlowOFTEVVM.s.sol:DeployYieldFlowOFTEVVM \
 *     --rpc-url arbitrum-sepolia \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 *
 * Environment Variables Required:
 *   PRIVATE_KEY - Deployer private key
 *   ETHERSCAN_API_KEY - For contract verification
 *   USE_MOCK_USDC - Set to "true" to deploy mock USDC (optional)
 *   USDC_ADDRESS - Real USDC address if not using mock (optional)
 *   VAULT_ADDRESS - VaultEVVM address (only for Sepolia)
 */
contract DeployYieldFlowOFTEVVM is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        uint256 chainId = block.chainid;

        console.log("=== Deploying YieldFlowOFTEVVM ===");
        console.log("Chain ID:", chainId);
        console.log("Deployer:", deployer);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Get or Deploy USDC
        address usdcAddress = _getOrDeployUSDC(deployer);
        console.log("USDC Address:", usdcAddress);

        // 2. Get LayerZero endpoint
        address lzEndpoint = Config.getLZEndpoint(chainId);
        console.log("LayerZero Endpoint:", lzEndpoint);

        // 3. Get Vault address (only on Sepolia)
        address vaultAddress = address(0);
        if (Config.hasEVVM(chainId)) {
            // On Sepolia (destination), need vault address
            vaultAddress = vm.envOr("VAULT_ADDRESS", address(0));
            if (vaultAddress == address(0)) {
                console.log("WARNING: VAULT_ADDRESS not set. Deploy vault first or set VAULT_ADDRESS env var.");
                console.log("Deploying without vault (can be set later via updateVaultAddress)");
            } else {
                console.log("Vault Address:", vaultAddress);
            }
        } else {
            console.log("Source chain detected - no vault needed");
        }

        // 4. Get EVVM address (only on Sepolia)
        address evvmAddress = Config.getEVVM(chainId);
        console.log("EVVM Address:", evvmAddress);
        console.log("");

        // 5. Deploy YieldFlowOFTEVVM
        console.log("Deploying YieldFlowOFTEVVM...");
        YieldFlowOFTEVVM oft =
            new YieldFlowOFTEVVM(usdcAddress, vaultAddress, lzEndpoint, evvmAddress, deployer);
        console.log("YieldFlowOFTEVVM deployed at:", address(oft));
        console.log("");

        // 6. Verify deployment
        console.log("=== Deployment Summary ===");
        console.log("Chain:", _getChainName(chainId));
        console.log("YieldFlowOFTEVVM:", address(oft));
        console.log("USDC:", usdcAddress);
        console.log("Vault:", vaultAddress == address(0) ? "Not set" : vm.toString(vaultAddress));
        console.log("LayerZero Endpoint:", lzEndpoint);
        console.log("EVVM:", evvmAddress == address(0) ? "Not available" : vm.toString(evvmAddress));
        console.log("");

        // 7. Display next steps
        console.log("=== Next Steps ===");
        if (Config.hasEVVM(chainId)) {
            console.log("1. If vault not set, call: oft.updateVaultAddress(<vault>)");
            console.log("2. Set up LayerZero peers (setPeer) to connect with source chains");
            console.log("3. Enable auto-deposit: oft.setAutoDeposit(true)");
            console.log("4. Set up executor and enable gasless mode: oft.setGaslessMode(true)");
        } else {
            console.log("1. Deploy YieldFlowOFTEVVM on Sepolia (destination)");
            console.log("2. Set up LayerZero peers (setPeer) to connect with Sepolia");
            console.log("3. Test cross-chain bridging");
        }
        console.log("");

        // 8. Display verification command
        console.log("=== Verification Command ===");
        console.log(
            string.concat(
                "forge verify-contract ",
                vm.toString(address(oft)),
                " YieldFlowOFTEVVM --chain ",
                _getChainName(chainId),
                " --watch --constructor-args $(cast abi-encode 'constructor(address,address,address,address,address)' ",
                vm.toString(usdcAddress),
                " ",
                vm.toString(vaultAddress),
                " ",
                vm.toString(lzEndpoint),
                " ",
                vm.toString(evvmAddress),
                " ",
                vm.toString(deployer),
                ")"
            )
        );
        console.log("");

        // 9. Save deployment info to file
        string memory fileName = string.concat("deployments/oft-", _getChainName(chainId), ".json");
        string memory deploymentInfo = string.concat(
            "{\n",
            '  "chainId": ',
            vm.toString(chainId),
            ",\n",
            '  "oft": "',
            vm.toString(address(oft)),
            '",\n',
            '  "usdc": "',
            vm.toString(usdcAddress),
            '",\n',
            '  "vault": "',
            vm.toString(vaultAddress),
            '",\n',
            '  "lzEndpoint": "',
            vm.toString(lzEndpoint),
            '",\n',
            '  "evvm": "',
            vm.toString(evvmAddress),
            '",\n',
            '  "lzEid": ',
            vm.toString(uint256(Config.getLZEid(chainId))),
            "\n",
            "}"
        );

        vm.writeFile(fileName, deploymentInfo);
        console.log("Deployment info saved to:", fileName);

        vm.stopBroadcast();
    }

    /**
     * @notice Get existing USDC or deploy mock
     * @param deployer Deployer address
     * @return USDC address
     */
    function _getOrDeployUSDC(address deployer) internal returns (address) {
        bool useMock = vm.envOr("USE_MOCK_USDC", true);

        if (useMock) {
            console.log("Deploying Mock USDC...");
            MockERC20 mockUsdc = new MockERC20("USD Coin", "USDC", 6);
            mockUsdc.mint(deployer, 1_000_000 * 10 ** 6);
            console.log("Minted 1,000,000 USDC to deployer");
            return address(mockUsdc);
        } else {
            address usdcAddress = vm.envAddress("USDC_ADDRESS");
            require(usdcAddress != address(0), "USDC_ADDRESS not set");
            console.log("Using existing USDC at:", usdcAddress);
            return usdcAddress;
        }
    }

    /**
     * @notice Get chain name from chain ID
     * @param chainId Chain ID
     * @return Chain name
     */
    function _getChainName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == Config.SEPOLIA_CHAIN_ID) return "sepolia";
        if (chainId == Config.ARBITRUM_SEPOLIA_CHAIN_ID) return "arbitrum-sepolia";
        if (chainId == Config.BASE_SEPOLIA_CHAIN_ID) return "base-sepolia";
        return "unknown";
    }
}
