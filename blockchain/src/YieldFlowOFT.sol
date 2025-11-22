// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OFT} from "@layerzero/oft/OFT.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title YieldFlowOFT
 * @notice OFT wrapper for cross-chain USDC deposits
 * @dev Enables deposits from any LayerZero-supported chain to the vault
 */
contract YieldFlowOFT is OFT {
    using SafeERC20 for IERC20;

    /// @notice The vault contract address on the destination chain (Saga)
    address public vaultAddress;

    /// @notice The USDC token address
    IERC20 public immutable USDC;

    error ZeroAddress();
    error InsufficientFee();
    error InvalidAmount();

    event CrossChainDeposit(address indexed user, uint32 indexed dstEid, uint256 amount);
    event VaultAddressUpdated(address indexed oldVault, address indexed newVault);

    /**
     * @dev Constructor for YieldFlowOFT
     * @param _usdc The USDC token address on this chain
     * @param _vault The vault address on destination chain (can be updated later)
     * @param _lzEndpoint The LayerZero endpoint address
     * @param _owner The owner of the contract
     */
    constructor(address _usdc, address _vault, address _lzEndpoint, address _owner)
        OFT("YieldFlow Receipt", "yfUSDC", _lzEndpoint, _owner)
        Ownable(_owner)
    {
        if (_usdc == address(0)) revert ZeroAddress();
        if (_lzEndpoint == address(0)) revert ZeroAddress();
        if (_owner == address(0)) revert ZeroAddress();

        USDC = IERC20(_usdc);
        vaultAddress = _vault;
    }

    /**
     * @notice Mint OFT tokens by depositing USDC
     * @param amount Amount of USDC to deposit
     * @dev Users must approve this contract to spend USDC first
     */
    function mintWithUsdc(uint256 amount) external {
        if (amount == 0) revert InvalidAmount();

        // Transfer USDC from user to this contract
        USDC.safeTransferFrom(msg.sender, address(this), amount);

        // Mint equivalent OFT tokens to user
        _mint(msg.sender, amount);

        emit CrossChainDeposit(msg.sender, 0, amount);
    }

    /**
     * @notice Burn OFT tokens and receive USDC back
     * @param amount Amount of OFT tokens to burn
     * @dev This is for unwrapping on the source chain
     */
    function burnForUsdc(uint256 amount) external {
        if (amount == 0) revert InvalidAmount();
        if (balanceOf(msg.sender) < amount) revert InvalidAmount();

        // Burn OFT tokens from user
        _burn(msg.sender, amount);

        // Transfer USDC back to user
        USDC.safeTransfer(msg.sender, amount);
    }

    /**
     * @notice Update the vault address
     * @param newVault New vault address
     * @dev Only owner can update
     */
    function updateVaultAddress(address newVault) external onlyOwner {
        if (newVault == address(0)) revert ZeroAddress();
        address oldVault = vaultAddress;
        vaultAddress = newVault;
        emit VaultAddressUpdated(oldVault, newVault);
    }

    /**
     * @notice Withdraw USDC from contract (emergency function)
     * @param to Recipient address
     * @param amount Amount to withdraw
     * @dev Only owner can withdraw
     */
    function emergencyWithdrawUsdc(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        USDC.safeTransfer(to, amount);
    }

    /**
     * @notice Get USDC balance of this contract
     * @return USDC balance
     */
    function getUsdcBalance() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }
}
