// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IMATEP2PSwap
 * @notice Interface for MATE P2P Swap service
 * @dev Deployed at: 0xC175f4Aa8b761ca7D0B35138969DF8095A1657B5 (Sepolia)
 */
interface IMATEP2PSwap {
    struct SwapOffer {
        address maker;
        address tokenOffered;
        uint256 amountOffered;
        address tokenWanted;
        uint256 amountWanted;
        uint256 expirationTime;
        bool active;
    }

    /**
     * @notice Create a swap offer
     * @param tokenOffered Token to offer
     * @param amountOffered Amount to offer
     * @param tokenWanted Token wanted in return
     * @param amountWanted Amount wanted in return
     * @param expirationTime When the offer expires
     * @return offerId The ID of the created offer
     */
    function createOffer(
        address tokenOffered,
        uint256 amountOffered,
        address tokenWanted,
        uint256 amountWanted,
        uint256 expirationTime
    ) external returns (uint256 offerId);

    /**
     * @notice Accept a swap offer
     * @param offerId The ID of the offer to accept
     */
    function acceptOffer(uint256 offerId) external;

    /**
     * @notice Cancel a swap offer
     * @param offerId The ID of the offer to cancel
     */
    function cancelOffer(uint256 offerId) external;

    /**
     * @notice Get offer details
     * @param offerId The ID of the offer
     * @return The swap offer details
     */
    function getOffer(uint256 offerId) external view returns (SwapOffer memory);

    /// @notice Emitted when a swap offer is created
    event OfferCreated(uint256 indexed offerId, address indexed maker, address tokenOffered, uint256 amountOffered);

    /// @notice Emitted when a swap is completed
    event SwapCompleted(uint256 indexed offerId, address indexed taker);

    /// @notice Emitted when an offer is cancelled
    event OfferCancelled(uint256 indexed offerId);
}
