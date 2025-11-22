// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Config
 * @notice Centralized configuration for deployment scripts
 * @dev Contains addresses for MATE Metaprotocol (EVVM) and LayerZero endpoints
 */
library Config {
    // ========== SEPOLIA TESTNET ==========

    /// @notice MATE Metaprotocol (EVVM) Core Contract
    address public constant SEPOLIA_EVVM = 0x9902984d86059234c3B6e11D5eAEC55f9627dD0f;

    /// @notice MATE Staking Contract
    address public constant SEPOLIA_MATE_STAKING = 0x8eB2525239781e06dBDbd95d83c957C431CF2321;

    /// @notice MATE NameService Contract
    address public constant SEPOLIA_NAME_SERVICE = 0x8038e87dc67D87b31d890FD01E855a8517ebfD24;

    /// @notice MATE P2P Swap Contract
    address public constant SEPOLIA_P2P_SWAP = 0xC175f4Aa8b761ca7D0B35138969DF8095A1657B5;

    /// @notice LayerZero Endpoint on Sepolia
    address public constant SEPOLIA_LZ_ENDPOINT = 0x6EDCE65403992e310A62460808c4b910D972f10f;

    /// @notice Sepolia Chain ID
    uint256 public constant SEPOLIA_CHAIN_ID = 11155111;

    /// @notice LayerZero Endpoint ID for Sepolia
    uint32 public constant SEPOLIA_LZ_EID = 40161;

    // ========== ARBITRUM SEPOLIA ==========

    /// @notice LayerZero Endpoint on Arbitrum Sepolia
    address public constant ARBITRUM_SEPOLIA_LZ_ENDPOINT = 0x6EDCE65403992e310A62460808c4b910D972f10f;

    /// @notice Arbitrum Sepolia Chain ID
    uint256 public constant ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

    /// @notice LayerZero Endpoint ID for Arbitrum Sepolia
    uint32 public constant ARBITRUM_SEPOLIA_LZ_EID = 40231;

    // ========== BASE SEPOLIA ==========

    /// @notice LayerZero Endpoint on Base Sepolia
    address public constant BASE_SEPOLIA_LZ_ENDPOINT = 0x6EDCE65403992e310A62460808c4b910D972f10f;

    /// @notice Base Sepolia Chain ID
    uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;

    /// @notice LayerZero Endpoint ID for Base Sepolia
    uint32 public constant BASE_SEPOLIA_LZ_EID = 40245;

    // ========== HELPER FUNCTIONS ==========

    /**
     * @notice Get LayerZero endpoint for current chain
     * @param chainId The chain ID
     * @return LayerZero endpoint address
     */
    function getLzEndpoint(uint256 chainId) internal pure returns (address) {
        if (chainId == SEPOLIA_CHAIN_ID) return SEPOLIA_LZ_ENDPOINT;
        if (chainId == ARBITRUM_SEPOLIA_CHAIN_ID) return ARBITRUM_SEPOLIA_LZ_ENDPOINT;
        if (chainId == BASE_SEPOLIA_CHAIN_ID) return BASE_SEPOLIA_LZ_ENDPOINT;
        revert("Unsupported chain");
    }

    /**
     * @notice Get LayerZero endpoint ID for current chain
     * @param chainId The chain ID
     * @return LayerZero endpoint ID
     */
    function getLzEid(uint256 chainId) internal pure returns (uint32) {
        if (chainId == SEPOLIA_CHAIN_ID) return SEPOLIA_LZ_EID;
        if (chainId == ARBITRUM_SEPOLIA_CHAIN_ID) return ARBITRUM_SEPOLIA_LZ_EID;
        if (chainId == BASE_SEPOLIA_CHAIN_ID) return BASE_SEPOLIA_LZ_EID;
        revert("Unsupported chain");
    }

    /**
     * @notice Check if current chain has EVVM (MATE Metaprotocol)
     * @param chainId The chain ID
     * @return True if EVVM is available
     */
    function hasEvvm(uint256 chainId) internal pure returns (bool) {
        return chainId == SEPOLIA_CHAIN_ID;
    }

    /**
     * @notice Get EVVM address for current chain
     * @param chainId The chain ID
     * @return EVVM address (or address(0) if not available)
     */
    function getEvvm(uint256 chainId) internal pure returns (address) {
        if (chainId == SEPOLIA_CHAIN_ID) return SEPOLIA_EVVM;
        return address(0);
    }

    /**
     * @notice Get MATE NameService address
     * @param chainId The chain ID
     * @return NameService address (or address(0) if not available)
     */
    function getNameService(uint256 chainId) internal pure returns (address) {
        if (chainId == SEPOLIA_CHAIN_ID) return SEPOLIA_NAME_SERVICE;
        return address(0);
    }
}
