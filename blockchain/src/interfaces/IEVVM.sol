// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IEVVM
 * @notice Interface for EVVM (MATE Metaprotocol) core functionality
 * @dev EVVM provides gasless transactions and blockchain abstraction
 */
interface IEVVM {
    /**
     * @notice Execute a transaction with async nonce (gasless)
     * @param target The contract address to call
     * @param data The calldata to execute
     * @param nonce The async nonce for this transaction
     * @dev This allows gasless execution where an executor pays the gas
     */
    function executeWithAsyncNonce(address target, bytes calldata data, uint256 nonce) external;

    /**
     * @notice Execute a transaction on behalf of a user
     * @param user The user address who signed the transaction
     * @param target The contract address to call
     * @param data The calldata to execute
     * @param signature The user's signature
     */
    function executeFor(address user, address target, bytes calldata data, bytes calldata signature) external;

    /**
     * @notice Register as an executor (can execute gasless transactions)
     * @dev Executors are trusted entities that pay gas for users
     */
    function registerExecutor() external;

    /**
     * @notice Check if an address is a registered executor
     * @param account Address to check
     * @return True if the account is an executor
     */
    function isExecutor(address account) external view returns (bool);

    /**
     * @notice Get the current nonce for an address
     * @param account Address to check
     * @return Current nonce value
     */
    function getNonce(address account) external view returns (uint256);

    /**
     * @notice Get the async nonce for an address
     * @param account Address to check
     * @return Current async nonce value
     */
    function getAsyncNonce(address account) external view returns (uint256);

    /// @notice Emitted when an executor executes a transaction
    event Executed(address indexed executor, address indexed target, bytes data, uint256 nonce);

    /// @notice Emitted when a new executor is registered
    event ExecutorRegistered(address indexed executor);
}
