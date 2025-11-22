// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {YieldFlowOFTEVVM} from "../src/YieldFlowOFTEVVM.sol";
import {Config} from "./Config.sol";

/**
 * @title ConfigurePeers
 * @notice Configure LayerZero peers to connect OFT contracts across chains
 * @dev Sets up trusted peers for cross-chain communication
 *
 * Usage (from Sepolia):
 *   forge script script/ConfigurePeers.s.sol:ConfigurePeers \
 *     --rpc-url sepolia \
 *     --broadcast \
 *     -vvvv
 *
 * Usage (from Arbitrum Sepolia):
 *   forge script script/ConfigurePeers.s.sol:ConfigurePeers \
 *     --rpc-url arbitrum-sepolia \
 *     --broadcast \
 *     -vvvv
 *
 * Environment Variables:
 *   PRIVATE_KEY - Deployer private key
 *   OFT_ADDRESS - YieldFlowOFTEVVM address on current chain
 *   PEER_OFT_SEPOLIA - YieldFlowOFTEVVM address on Sepolia
 *   PEER_OFT_ARBITRUM - YieldFlowOFTEVVM address on Arbitrum Sepolia
 *   PEER_OFT_BASE - YieldFlowOFTEVVM address on Base Sepolia
 */
contract ConfigurePeers is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        uint256 chainId = block.chainid;

        console.log("=== Configuring LayerZero Peers ===");
        console.log("Chain ID:", chainId);
        console.log("Deployer:", deployer);
        console.log("");

        // Get OFT address on current chain
        address oftAddress = vm.envAddress("OFT_ADDRESS");
        require(oftAddress != address(0), "OFT_ADDRESS not set");
        console.log("OFT Address:", oftAddress);

        YieldFlowOFTEVVM oft = YieldFlowOFTEVVM(oftAddress);

        vm.startBroadcast(deployerPrivateKey);

        // Configure peers based on current chain
        if (chainId == Config.SEPOLIA_CHAIN_ID) {
            _configureFromSepolia(oft);
        } else if (chainId == Config.ARBITRUM_SEPOLIA_CHAIN_ID) {
            _configureFromArbitrum(oft);
        } else if (chainId == Config.BASE_SEPOLIA_CHAIN_ID) {
            _configureFromBase(oft);
        } else {
            revert("Unsupported chain");
        }

        console.log("");
        console.log("=== Configuration Complete ===");
        console.log("Peers configured successfully");

        vm.stopBroadcast();
    }

    /**
     * @notice Configure peers from Sepolia (destination)
     * @dev Connect to Arbitrum and Base
     */
    function _configureFromSepolia(YieldFlowOFTEVVM oft) internal {
        console.log("Configuring Sepolia → Source Chains");
        console.log("");

        // Set Arbitrum Sepolia as peer
        address arbOft = vm.envOr("PEER_OFT_ARBITRUM", address(0));
        if (arbOft != address(0)) {
            console.log("Setting Arbitrum Sepolia peer:", arbOft);
            bytes32 peerBytes = bytes32(uint256(uint160(arbOft)));
            oft.setPeer(Config.ARBITRUM_SEPOLIA_LZ_EID, peerBytes);
            console.log("  EID:", Config.ARBITRUM_SEPOLIA_LZ_EID);
            console.log("  Peer set!");
        } else {
            console.log("PEER_OFT_ARBITRUM not set, skipping...");
        }
        console.log("");

        // Set Base Sepolia as peer
        address baseOft = vm.envOr("PEER_OFT_BASE", address(0));
        if (baseOft != address(0)) {
            console.log("Setting Base Sepolia peer:", baseOft);
            bytes32 peerBytes = bytes32(uint256(uint160(baseOft)));
            oft.setPeer(Config.BASE_SEPOLIA_LZ_EID, peerBytes);
            console.log("  EID:", Config.BASE_SEPOLIA_LZ_EID);
            console.log("  Peer set!");
        } else {
            console.log("PEER_OFT_BASE not set, skipping...");
        }
    }

    /**
     * @notice Configure peers from Arbitrum Sepolia (source)
     * @dev Connect to Sepolia destination
     */
    function _configureFromArbitrum(YieldFlowOFTEVVM oft) internal {
        console.log("Configuring Arbitrum Sepolia → Sepolia");
        console.log("");

        address sepoliaOft = vm.envAddress("PEER_OFT_SEPOLIA");
        require(sepoliaOft != address(0), "PEER_OFT_SEPOLIA not set");

        console.log("Setting Sepolia peer:", sepoliaOft);
        bytes32 peerBytes = bytes32(uint256(uint160(sepoliaOft)));
        oft.setPeer(Config.SEPOLIA_LZ_EID, peerBytes);
        console.log("  EID:", Config.SEPOLIA_LZ_EID);
        console.log("  Peer set!");
    }

    /**
     * @notice Configure peers from Base Sepolia (source)
     * @dev Connect to Sepolia destination
     */
    function _configureFromBase(YieldFlowOFTEVVM oft) internal {
        console.log("Configuring Base Sepolia → Sepolia");
        console.log("");

        address sepoliaOft = vm.envAddress("PEER_OFT_SEPOLIA");
        require(sepoliaOft != address(0), "PEER_OFT_SEPOLIA not set");

        console.log("Setting Sepolia peer:", sepoliaOft);
        bytes32 peerBytes = bytes32(uint256(uint160(sepoliaOft)));
        oft.setPeer(Config.SEPOLIA_LZ_EID, peerBytes);
        console.log("  EID:", Config.SEPOLIA_LZ_EID);
        console.log("  Peer set!");
    }
}
