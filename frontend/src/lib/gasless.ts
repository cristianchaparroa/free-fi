/**
 * Gasless transaction utilities for EVVM integration
 *
 * Uses the STANDARD EVVM signature format for ecosystem compatibility
 * Message format: "<chainId>,<functionName>,<param1>,<param2>,...,<paramN>"
 *
 * This allows the frontend to work with:
 * - @evvm/viem-signature-library
 * - EVVM Signature Constructor tool
 * - All other EVVM ecosystem tools
 */

import { type WalletClient } from 'wagmi';
import { GenericSignatureBuilder } from '@evvm/viem-signature-library';

/**
 * Sign a gasless deposit message using standard EVVM format
 *
 * Message format: "<chainId>,depositGasless,<userAddress>,<amount>,<nonce>"
 *
 * @param walletClient - Viem wallet client
 * @param params - Deposit parameters
 * @returns EIP-191 signature
 */
export async function signDepositMessage(
  walletClient: WalletClient,
  params: {
    user: `0x${string}`;
    amount: bigint;
    nonce: bigint;
    chainId: number;
    vaultAddress: `0x${string}`; // Not used in standard EVVM format, but kept for API compatibility
  }
): Promise<`0x${string}`> {
  const { user, amount, nonce, chainId } = params;

  console.log('🔐 Signing deposit message with:', {
    user,
    amount: amount.toString(),
    nonce: nonce.toString(),
    chainId,
  });

  // Create the account object for the signature builder
  const account = {
    address: user,
  };

  // Use EVVM's GenericSignatureBuilder for standard format
  const signatureBuilder = new GenericSignatureBuilder(walletClient as any, account as any);

  // Build message: "<chainId>,depositGasless,<user>,<amount>,<nonce>"
  // Note: Address must be lowercase as per EVVM standard
  const inputs = `${user.toLowerCase()},${amount.toString()},${nonce.toString()}`;

  console.log('📝 Message inputs:', inputs);

  // Sign using standard EVVM format
  const signature = await signatureBuilder.signGenericMessage(
    BigInt(chainId),
    'depositGasless',
    inputs
  );

  console.log('✍️ Signature:', signature);

  return signature;
}

/**
 * Sign a gasless withdrawal message using standard EVVM format
 *
 * Message format: "<chainId>,withdrawGasless,<userAddress>,<shares>,<nonce>"
 *
 * @param walletClient - Viem wallet client
 * @param params - Withdrawal parameters
 * @returns EIP-191 signature
 */
export async function signWithdrawMessage(
  walletClient: WalletClient,
  params: {
    user: `0x${string}`;
    shares: bigint;
    nonce: bigint;
    chainId: number;
    vaultAddress: `0x${string}`; // Not used in standard EVVM format, but kept for API compatibility
  }
): Promise<`0x${string}`> {
  const { user, shares, nonce, chainId } = params;

  console.log('🔐 Signing withdraw message with:', {
    user,
    shares: shares.toString(),
    nonce: nonce.toString(),
    chainId,
  });

  // Create the account object for the signature builder
  const account = {
    address: user,
  };

  // Use EVVM's GenericSignatureBuilder for standard format
  const signatureBuilder = new GenericSignatureBuilder(walletClient as any, account as any);

  // Build message: "<chainId>,withdrawGasless,<user>,<shares>,<nonce>"
  // Note: Address must be lowercase as per EVVM standard
  const inputs = `${user.toLowerCase()},${shares.toString()},${nonce.toString()}`;

  console.log('📝 Message inputs:', inputs);

  // Sign using standard EVVM format
  const signature = await signatureBuilder.signGenericMessage(
    BigInt(chainId),
    'withdrawGasless',
    inputs
  );

  console.log('✍️ Signature:', signature);

  return signature;
}

/**
 * EVVM Async Nonce Payload Structure
 *
 * This is the format expected by EVVM.executeWithAsyncNonce()
 */
export interface EVVMAsyncNoncePayload {
  target: `0x${string}`; // Contract to call (vault address)
  data: `0x${string}`; // Encoded function call
  nonce: bigint; // User's nonce
  signature: `0x${string}`; // User's signature
  gasLimit: bigint; // Gas limit for execution
}

/**
 * Build EVVM async nonce payload for gasless deposit
 */
export function buildDepositPayload(params: {
  vaultAddress: `0x${string}`;
  user: `0x${string}`;
  amount: bigint;
  nonce: bigint;
  signature: `0x${string}`;
}): EVVMAsyncNoncePayload {
  const { vaultAddress, user, amount, nonce, signature } = params;

  // Encode depositGasless(address user, uint256 amount, uint256 nonce, bytes signature)
  const depositGaslessSelector = '0x' + keccak256(
    encodePacked(['string'], ['depositGasless(address,uint256,uint256,bytes)'])
  ).slice(2, 10); // First 4 bytes

  // Note: This is a simplified encoding. In production, use viem's encodeFunctionData
  // For now, we'll use the proper encoding
  const data = encodePacked(
    ['bytes4', 'address', 'uint256', 'uint256', 'bytes'],
    [depositGaslessSelector as `0x${string}`, user, amount, nonce, signature]
  );

  return {
    target: vaultAddress,
    data,
    nonce,
    signature,
    gasLimit: 500000n,
  };
}
