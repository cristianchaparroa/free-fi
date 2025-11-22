// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IMATENameService
 * @notice Interface for MATE Name Service (like ENS for EVVM)
 * @dev Deployed at: 0x8038e87dc67D87b31d890FD01E855a8517ebfD24 (Sepolia)
 */
interface IMATENameService {
    /**
     * @notice Register a name for an address
     * @param name The name to register (e.g., "alice.mate")
     * @param owner The address that will own this name
     */
    function registerName(string calldata name, address owner) external;

    /**
     * @notice Resolve a name to an address
     * @param name The name to resolve
     * @return The address associated with the name
     */
    function resolveName(string calldata name) external view returns (address);

    /**
     * @notice Get the name for an address (reverse lookup)
     * @param owner The address to lookup
     * @return The name associated with the address
     */
    function getName(address owner) external view returns (string memory);

    /**
     * @notice Check if a name is available
     * @param name The name to check
     * @return True if the name is available
     */
    function isAvailable(string calldata name) external view returns (bool);

    /// @notice Emitted when a name is registered
    event NameRegistered(string indexed name, address indexed owner);

    /// @notice Emitted when a name is transferred
    event NameTransferred(string indexed name, address indexed from, address indexed to);
}
