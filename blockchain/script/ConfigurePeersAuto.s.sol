// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {YieldFlowOFTEVVM} from "../src/YieldFlowOFTEVVM.sol";
import {Config} from "./Config.sol";
import {stdJson} from "forge-std/StdJson.sol";

/**
 * @title ConfigurePeersAuto
 * @notice Automatically configure LayerZero peers by reading deployment JSON files
 * @dev Sets up trusted peers for cross-chain communication
 *
 * Usage (from Arbitrum Sepolia):
 *   forge script script/ConfigurePeersAuto.s.sol:ConfigurePeersAuto \
 *     --rpc-url arbitrum-sepolia \
 *     --broadcast \
 *     -vvvv
 *
 * Usage (from Sepolia):
 *   forge script script/ConfigurePeersAuto.s.sol:ConfigurePeersAuto \
 *     --rpc-url sepolia \
 *     --broadcast \
 *     -vvvv
 *
 * This script automatically reads OFT addresses from:
 *   - deployments/sepolia-complete.json
 *   - deployments/oft-arbitrum-sepolia.json
 *   - deployments/oft-base-sepolia.json
 */
contract ConfigurePeersAuto is Script {
    using stdJson for string;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        uint256 chainId = block.chainid;

        console.log("=== Auto-Configuring LayerZero Peers ===");
        console.log("Chain ID:", chainId);
        console.log("Deployer:", deployer);
        console.log("");

        // Read deployment files
        address sepoliaOft = _readOftAddress("deployments/sepolia-complete.json");
        address arbitrumOft = _readOftAddress("deployments/oft-arbitrum-sepolia.json");
        address baseOft = _tryReadOftAddress("deployments/oft-base-sepolia.json");

        console.log("Detected OFT Addresses:");
        console.log("  Sepolia:", sepoliaOft);
        console.log("  Arbitrum Sepolia:", arbitrumOft);
        if (baseOft != address(0)) {
            console.log("  Base Sepolia:", baseOft);
        }
        console.log("");

        // Get current chain's OFT
        address currentOft;
        if (chainId == Config.SEPOLIA_CHAIN_ID) {
            currentOft = sepoliaOft;
        } else if (chainId == Config.ARBITRUM_SEPOLIA_CHAIN_ID) {
            currentOft = arbitrumOft;
        } else if (chainId == Config.BASE_SEPOLIA_CHAIN_ID) {
            currentOft = baseOft;
        } else {
            revert("Unsupported chain");
        }

        require(currentOft != address(0), "Current chain OFT not found");
        console.log("Current OFT Address:", currentOft);
        console.log("");

        YieldFlowOFTEVVM oft = YieldFlowOFTEVVM(currentOft);

        vm.startBroadcast(deployerPrivateKey);

        // Configure peers based on current chain
        if (chainId == Config.SEPOLIA_CHAIN_ID) {
            _configureFromSepolia(oft, arbitrumOft, baseOft);
        } else if (chainId == Config.ARBITRUM_SEPOLIA_CHAIN_ID) {
            _configureFromArbitrum(oft, sepoliaOft);
        } else if (chainId == Config.BASE_SEPOLIA_CHAIN_ID) {
            _configureFromBase(oft, sepoliaOft);
        }

        console.log("");
        console.log("=== Configuration Complete ===");
        console.log("Peers configured successfully");

        vm.stopBroadcast();
    }

    /**
     * @notice Read OFT address from deployment JSON file
     * @param filePath Path to deployment JSON file
     * @return OFT address
     */
    function _readOftAddress(string memory filePath) internal view returns (address) {
        string memory json = vm.readFile(filePath);
        bytes memory oftBytes = json.parseRaw(".oft");
        address oft = abi.decode(oftBytes, (address));
        require(oft != address(0), string.concat("OFT not found in ", filePath));
        return oft;
    }

    /**
     * @notice Try to read OFT address from deployment JSON file (returns 0 if not found)
     * @param filePath Path to deployment JSON file
     * @return OFT address or address(0) if not found
     */
    function _tryReadOftAddress(string memory filePath) internal view returns (address) {
        try vm.readFile(filePath) returns (string memory json) {
            bytes memory oftBytes = json.parseRaw(".oft");
            return abi.decode(oftBytes, (address));
        } catch {
            return address(0);
        }
    }

    /**
     * @notice Configure peers from Sepolia (destination)
     * @dev Connect to Arbitrum and Base
     */
    function _configureFromSepolia(YieldFlowOFTEVVM oft, address arbitrumOft, address baseOft) internal {
        console.log("Configuring Sepolia -> Source Chains");
        console.log("");

        // Set Arbitrum Sepolia as peer
        if (arbitrumOft != address(0)) {
            console.log("Setting Arbitrum Sepolia peer:", arbitrumOft);
            bytes32 peerBytes = bytes32(uint256(uint160(arbitrumOft)));
            oft.setPeer(Config.ARBITRUM_SEPOLIA_LZ_EID, peerBytes);
            console.log("  EID:", Config.ARBITRUM_SEPOLIA_LZ_EID);
            console.log("  Peer set!");
        } else {
            console.log("Arbitrum OFT not found, skipping...");
        }
        console.log("");

        // Set Base Sepolia as peer
        if (baseOft != address(0)) {
            console.log("Setting Base Sepolia peer:", baseOft);
            bytes32 peerBytes = bytes32(uint256(uint160(baseOft)));
            oft.setPeer(Config.BASE_SEPOLIA_LZ_EID, peerBytes);
            console.log("  EID:", Config.BASE_SEPOLIA_LZ_EID);
            console.log("  Peer set!");
        } else {
            console.log("Base OFT not found, skipping...");
        }
    }

    /**
     * @notice Configure peers from Arbitrum Sepolia (source)
     * @dev Connect to Sepolia destination
     */
    function _configureFromArbitrum(YieldFlowOFTEVVM oft, address sepoliaOft) internal {
        console.log("Configuring Arbitrum Sepolia -> Sepolia");
        console.log("");

        require(sepoliaOft != address(0), "Sepolia OFT not found");

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
    function _configureFromBase(YieldFlowOFTEVVM oft, address sepoliaOft) internal {
        console.log("Configuring Base Sepolia -> Sepolia");
        console.log("");

        require(sepoliaOft != address(0), "Sepolia OFT not found");

        console.log("Setting Sepolia peer:", sepoliaOft);
        bytes32 peerBytes = bytes32(uint256(uint160(sepoliaOft)));
        oft.setPeer(Config.SEPOLIA_LZ_EID, peerBytes);
        console.log("  EID:", Config.SEPOLIA_LZ_EID);
        console.log("  Peer set!");
    }
}
