// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OFT} from "@layerzero/oft/OFT.sol";
import {Origin} from "@layerzero/oapp/OApp.sol";
import {OFTMsgCodec} from "@layerzero/oft/libs/OFTMsgCodec.sol";
import {SendParam, MessagingFee, MessagingReceipt, OFTReceipt} from "@layerzero/oft/interfaces/IOFT.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IEVVM} from "./interfaces/IEVVM.sol";

/**
 * @notice Interface for the VaultEVVM contract
 */
interface IVaultEVVM {
    function deposit(uint256 amount) external returns (uint256 shares);
    function withdraw(uint256 shares) external returns (uint256 amount);
    function depositGasless(address user, uint256 amount, uint256 nonce, bytes calldata signature)
        external
        returns (uint256 shares);
    function withdrawGasless(address user, uint256 shares, uint256 nonce, bytes calldata signature)
        external
        returns (uint256 amount);
    function userShares(address user) external view returns (uint256);
    function calculateUsdcAmount(uint256 shares) external view returns (uint256);
    function getNonce(address user) external view returns (uint256);
}

/**
 * @title YieldFlowOFTEVVM
 * @notice LayerZero OFT wrapper for cross-chain USDC with EVVM gasless integration
 * @dev Bridges USDC from any chain to Sepolia/EVVM and auto-deposits into VaultEVVM
 *
 * Key Features:
 * - Cross-chain USDC bridging via LayerZero OFT
 * - Auto-deposit to VaultEVVM on arrival (gasless for users)
 * - Gasless withdrawAndBridge via EVVM async nonces
 * - Compatible with MATE Metaprotocol (EVVM) on Sepolia
 *
 * Architecture:
 * 1. User deposits USDC on source chain (Arbitrum, Base, etc)
 * 2. LayerZero bridges to Sepolia (MATE Metaprotocol)
 * 3. Auto-deposits into VaultEVVM (gasless operations)
 * 4. Withdrawals can be gasless via EVVM executor
 */
contract YieldFlowOFTEVVM is OFT {
    using SafeERC20 for IERC20;
    using OFTMsgCodec for bytes;
    using OFTMsgCodec for bytes32;

    /// @notice The vault contract address on Sepolia/EVVM
    address public vaultAddress;

    /// @notice The USDC token address on this chain
    IERC20 public immutable USDC;

    /// @notice MATE Metaprotocol (EVVM) contract on Sepolia
    IEVVM public evvm;

    /// @notice Enable/disable auto-deposit to vault on receive
    bool public autoDepositEnabled;

    /// @notice Enable/disable gasless mode via EVVM
    bool public gaslessModeEnabled;

    error ZeroAddress();
    error InsufficientFee();
    error InvalidAmount();
    error VaultDepositFailed();
    error GaslessModeDisabled();
    error EVVMNotConfigured();

    event CrossChainDeposit(address indexed user, uint32 indexed dstEid, uint256 amount);
    event VaultAddressUpdated(address indexed oldVault, address indexed newVault);
    event EVVMAddressUpdated(address indexed oldEVVM, address indexed newEVVM);
    event AutoDepositToVault(address indexed user, uint256 amount, uint256 shares);
    event AutoDepositToggled(bool enabled);
    event GaslessModeToggled(bool enabled);

    /**
     * @dev Constructor for YieldFlowOFTEVVM
     * @param _usdc The USDC token address on this chain
     * @param _vault The VaultEVVM address on Sepolia (destination chain)
     * @param _lzEndpoint The LayerZero endpoint address
     * @param _evvm The MATE Metaprotocol (EVVM) address on Sepolia
     * @param _owner The owner of the contract
     */
    constructor(
        address _usdc,
        address _vault,
        address _lzEndpoint,
        address _evvm,
        address _owner
    ) OFT("YieldFlow Receipt EVVM", "yfUSDC", _lzEndpoint, _owner) Ownable(_owner) {
        if (_usdc == address(0)) revert ZeroAddress();
        if (_lzEndpoint == address(0)) revert ZeroAddress();
        if (_owner == address(0)) revert ZeroAddress();

        USDC = IERC20(_usdc);
        vaultAddress = _vault;
        evvm = IEVVM(_evvm);
        autoDepositEnabled = true;
        gaslessModeEnabled = false; // Enable after executor setup
    }

    // ========== STANDARD OFT OPERATIONS ==========

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

    // ========== WITHDRAW AND BRIDGE ==========

    /**
     * @notice Withdraw from vault and bridge USDC to destination chain
     * @param shares Amount of vault shares to withdraw
     * @param dstEid Destination endpoint ID (target chain)
     * @param recipient Recipient address on destination chain
     * @param extraOptions Additional LayerZero options
     * @return msgReceipt The LayerZero messaging receipt
     * @return oftReceipt The OFT receipt
     * @dev Standard withdraw (user pays gas)
     */
    function withdrawAndBridge(
        uint256 shares,
        uint32 dstEid,
        address recipient,
        bytes calldata extraOptions
    ) external payable returns (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) {
        if (vaultAddress == address(0)) revert ZeroAddress();
        if (shares == 0) revert InvalidAmount();
        if (recipient == address(0)) revert ZeroAddress();

        // Withdraw from vault (gets USDC)
        uint256 usdcAmount = IVaultEVVM(vaultAddress).withdraw(shares);

        // Mint OFT tokens to sender
        _mint(msg.sender, usdcAmount);

        // Prepare LayerZero send params
        SendParam memory sendParam = SendParam({
            dstEid: dstEid,
            to: bytes32(uint256(uint160(recipient))),
            amountLD: usdcAmount,
            minAmountLD: (usdcAmount * 99) / 100, // 1% slippage
            extraOptions: extraOptions,
            composeMsg: "",
            oftCmd: ""
        });

        // Execute cross-chain transfer
        MessagingFee memory fee = MessagingFee({nativeFee: msg.value, lzTokenFee: 0});
        (msgReceipt, oftReceipt) = this.send(sendParam, fee, payable(msg.sender));
    }

    /**
     * @notice Gasless withdraw and bridge via EVVM executor
     * @param user User address withdrawing
     * @param shares Amount of vault shares to withdraw
     * @param nonce User's nonce for replay protection
     * @param signature User's signature authorizing withdrawal
     * @param dstEid Destination endpoint ID
     * @param recipient Recipient address on destination chain
     * @param extraOptions Additional LayerZero options
     * @return msgReceipt The LayerZero messaging receipt
     * @return oftReceipt The OFT receipt
     * @dev Executor calls this on behalf of user (gasless for user)
     */
    function withdrawAndBridgeGasless(
        address user,
        uint256 shares,
        uint256 nonce,
        bytes calldata signature,
        uint32 dstEid,
        address recipient,
        bytes calldata extraOptions
    ) external payable returns (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) {
        if (!gaslessModeEnabled) revert GaslessModeDisabled();
        if (address(evvm) == address(0)) revert EVVMNotConfigured();
        if (vaultAddress == address(0)) revert ZeroAddress();
        if (shares == 0) revert InvalidAmount();
        if (recipient == address(0)) revert ZeroAddress();

        // Withdraw from vault gaslessly (executor pays gas via EVVM)
        uint256 usdcAmount = IVaultEVVM(vaultAddress).withdrawGasless(user, shares, nonce, signature);

        // Mint OFT tokens to user
        _mint(user, usdcAmount);

        // Prepare LayerZero send params
        SendParam memory sendParam = SendParam({
            dstEid: dstEid,
            to: bytes32(uint256(uint160(recipient))),
            amountLD: usdcAmount,
            minAmountLD: (usdcAmount * 99) / 100,
            extraOptions: extraOptions,
            composeMsg: "",
            oftCmd: ""
        });

        // Execute cross-chain transfer (executor pays LayerZero fee)
        MessagingFee memory fee = MessagingFee({nativeFee: msg.value, lzTokenFee: 0});
        (msgReceipt, oftReceipt) = this.send(sendParam, fee, payable(msg.sender));
    }

    /**
     * @notice Quote the fee for withdrawing and bridging
     * @param shares Amount of vault shares to withdraw
     * @param dstEid Destination endpoint ID
     * @param extraOptions Additional LayerZero options
     * @return fee The messaging fee quote
     */
    function quoteWithdrawAndBridge(uint256 shares, uint32 dstEid, bytes calldata extraOptions)
        external
        view
        returns (MessagingFee memory fee)
    {
        if (vaultAddress == address(0)) revert ZeroAddress();

        // Get expected USDC amount from shares
        uint256 usdcAmount = IVaultEVVM(vaultAddress).calculateUsdcAmount(shares);

        SendParam memory sendParam = SendParam({
            dstEid: dstEid,
            to: bytes32(uint256(uint160(msg.sender))),
            amountLD: usdcAmount,
            minAmountLD: (usdcAmount * 99) / 100,
            extraOptions: extraOptions,
            composeMsg: "",
            oftCmd: ""
        });

        return this.quoteSend(sendParam, false);
    }

    // ========== LAYERZERO RECEIVE OVERRIDE ==========

    /**
     * @notice Override _lzReceive to add custom logic for auto-depositing to VaultEVVM
     * @dev This function is called when OFT tokens arrive on Sepolia via LayerZero
     * @dev If auto-deposit is enabled, automatically deposits into VaultEVVM (gasless!)
     * @param _origin The origin information (source chain and sender)
     * @param _guid The unique identifier for the received LayerZero message
     * @param _message The encoded message containing recipient and amount
     * @param _executor The address of the executor
     * @param _extraData Additional data
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) internal virtual override {
        // Call parent implementation to handle standard OFT receive logic
        // This will mint OFT tokens to the recipient
        super._lzReceive(_origin, _guid, _message, _executor, _extraData);

        // Early return if auto-deposit is disabled
        if (!autoDepositEnabled) return;

        // Early return if vault is not configured
        if (vaultAddress == address(0)) return;

        // Decode the recipient address from the message
        address recipient = _message.sendTo().bytes32ToAddress();

        // Get the amount that was credited (in local decimals)
        uint256 amountLd = _toLD(_message.amountSD());

        // Get the OFT token balance of the recipient
        uint256 recipientBalance = balanceOf(recipient);

        // Early return if recipient has no balance
        if (recipientBalance == 0) return;

        // Early return if balance is insufficient
        if (recipientBalance < amountLd) return;

        // Burn the OFT tokens from recipient
        _burn(recipient, amountLd);

        // Approve vault to spend USDC
        USDC.forceApprove(vaultAddress, amountLd);

        // Deposit USDC into the vault on behalf of the recipient
        // This uses VaultEVVM's standard deposit() which works for cross-chain arrivals
        // The gasless operations (depositGasless) are for direct user interactions
        try IVaultEVVM(vaultAddress).deposit(amountLd) returns (uint256 shares) {
            // Vault shares are now owned by recipient in the VaultEVVM contract
            emit AutoDepositToVault(recipient, amountLd, shares);
        } catch {
            // If vault deposit fails, re-mint the OFT tokens back to recipient
            _mint(recipient, amountLd);
            // Reset approval
            USDC.forceApprove(vaultAddress, 0);
            revert VaultDepositFailed();
        }

        // Reset approval to 0 for security
        USDC.forceApprove(vaultAddress, 0);
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @notice Update the vault address
     * @param newVault New VaultEVVM address
     */
    function updateVaultAddress(address newVault) external onlyOwner {
        if (newVault == address(0)) revert ZeroAddress();
        address oldVault = vaultAddress;
        vaultAddress = newVault;
        emit VaultAddressUpdated(oldVault, newVault);
    }

    /**
     * @notice Update the EVVM address
     * @param newEVVM New MATE Metaprotocol address
     */
    function updateEVVMAddress(address newEVVM) external onlyOwner {
        if (newEVVM == address(0)) revert ZeroAddress();
        address oldEVVM = address(evvm);
        evvm = IEVVM(newEVVM);
        emit EVVMAddressUpdated(oldEVVM, newEVVM);
    }

    /**
     * @notice Toggle auto-deposit to vault on receive
     * @param enabled True to enable, false to disable
     */
    function setAutoDeposit(bool enabled) external onlyOwner {
        autoDepositEnabled = enabled;
        emit AutoDepositToggled(enabled);
    }

    /**
     * @notice Toggle gasless mode via EVVM
     * @param enabled True to enable, false to disable
     */
    function setGaslessMode(bool enabled) external onlyOwner {
        gaslessModeEnabled = enabled;
        emit GaslessModeToggled(enabled);
    }

    /**
     * @notice Withdraw USDC from contract (emergency function)
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdrawUsdc(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        USDC.safeTransfer(to, amount);
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @notice Get USDC balance of this contract
     * @return USDC balance
     */
    function getUsdcBalance() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }

    /**
     * @notice Check if gasless mode is enabled
     * @return True if enabled
     */
    function isGaslessModeEnabled() external view returns (bool) {
        return gaslessModeEnabled;
    }

    /**
     * @notice Check if auto-deposit is enabled
     * @return True if enabled
     */
    function isAutoDepositEnabled() external view returns (bool) {
        return autoDepositEnabled;
    }

    /**
     * @notice Get EVVM contract address
     * @return EVVM address
     */
    function getEVVMAddress() external view returns (address) {
        return address(evvm);
    }
}
