/**
 * Hook for gasless deposits via EVVM
 *
 * Flow:
 * 1. User approves USDC (one-time, pays gas)
 * 2. User signs deposit message (free, no gas)
 * 3. Submit signature to EVVM (free, no gas)
 * 4. EVVM executor calls depositGasless() (executor pays gas)
 */

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWalletClient, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { useContracts } from './useContracts';
import { signDepositMessage } from '@/lib/gasless';

export function useGaslessDeposit() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { vault, usdc, addresses } = useContracts();
  const [isApproving, setIsApproving] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Approval transaction (only gas cost for user)
  const { writeContract: approve, data: approveHash } = useWriteContract();

  // Wait for approval confirmation
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Reset approving state when approval completes
  useEffect(() => {
    if (isApproveSuccess && isApproving) {
      setIsApproving(false);
      refetchAllowance();
    }
  }, [isApproveSuccess, isApproving]);

  // Check current USDC allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: usdc?.address,
    abi: usdc?.abi,
    functionName: 'allowance',
    args: address && vault?.address ? [address, vault.address] : undefined,
    query: {
      enabled: !!usdc && !!address && !!vault,
    },
  });

  // Get user's current nonce
  const { data: userNonce, refetch: refetchNonce } = useReadContract({
    address: vault?.address,
    abi: vault?.abi,
    functionName: 'userNonces',
    args: address ? [address] : undefined,
    query: {
      enabled: !!vault && !!address,
    },
  });

  /**
   * Execute gasless deposit flow
   */
  const executeGaslessDeposit = async (amountUsd: string) => {
    if (!vault || !usdc || !address || !walletClient || !chainId) {
      setError('Wallet not connected or contracts not available');
      return;
    }

    if (!addresses?.evvm) {
      setError('EVVM not available on this chain');
      return;
    }

    setError(null);

    try {
      // Parse amount (USDC has 6 decimals)
      const amount = parseUnits(amountUsd, 6);

      // Step 1: Check if we need approval
      const needsApproval = !currentAllowance || currentAllowance < amount;

      if (needsApproval) {
        setIsApproving(true);
        approve({
          address: usdc.address,
          abi: usdc.abi,
          functionName: 'approve',
          args: [vault.address, amount],
        });
        // Wait for user to complete approval before proceeding
        // The UI will need to call this function again after approval
        return;
      }

      // Refetch to ensure we have latest nonce
      await refetchNonce();
      const nonce = (userNonce as bigint) || 0n;

      // Step 2: Sign the deposit message (gasless!)
      setIsSigning(true);
      const signature = await signDepositMessage(walletClient, {
        user: address,
        amount,
        nonce,
        chainId,
        vaultAddress: vault.address,
      });

      setIsSigning(false);

      // Step 3: Submit to Fisher (executor service) - USER PAYS 0 GAS!
      // Fisher will execute depositGasless() and pay all gas

      console.log('📡 Broadcasting to fishing spot (executor):', {
        user: address,
        amount: amount.toString(),
        nonce: nonce.toString(),
        signature,
      });

      // Set submitting state
      setIsSubmitting(true);

      // Call executor API (our "fishing spot")
      const response = await fetch('/api/executor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: address,
          amount: amount.toString(),
          nonce: nonce.toString(),
          signature,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Executor service failed');
      }

      console.log('✅ Deposit executed gaslessly! User paid 0 gas.', result);

      // Set success state
      setIsSubmitting(false);
      setIsSuccess(true);
      setTxHash(result.txHash);

      return result.txHash;
    } catch (err: any) {
      console.error('Gasless deposit error:', err);
      setError(err.message || 'Gasless deposit failed');
      setIsApproving(false);
      setIsSigning(false);
      setIsSubmitting(false);
    }
  };

  // Add setIsSubmitting before executor call
  useEffect(() => {
    if (isSigning) {
      setIsSubmitting(false);
    }
  }, [isSigning]);

  return {
    // Main function
    executeGaslessDeposit,

    // States
    isApproving: isApproving || isApproveConfirming,
    isSigning,
    isDepositing: isSubmitting, // Executor is submitting
    isLoading: isApproving || isApproveConfirming || isSigning || isSubmitting,

    // Success states
    isApproveSuccess,
    isDepositSuccess: isSuccess,

    // Results
    approveHash,
    depositHash: txHash,
    error,

    // Allowance info
    currentAllowance: currentAllowance as bigint | undefined,
    hasAllowance: (amount: bigint) =>
      currentAllowance ? currentAllowance >= amount : false,
    userNonce: userNonce as bigint | undefined,

    // Utils
    refetchAllowance,
    refetchNonce,
  };
}
