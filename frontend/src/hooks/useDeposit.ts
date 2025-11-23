/**
 * Hook for handling deposits into VaultEVVM
 * Handles both USDC approval and deposit in one flow
 */

import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
import { useContracts } from './useContracts';

export function useDeposit() {
    const { address } = useAccount();
    const { vault, usdc } = useContracts();
    const [isApproving, setIsApproving] = useState(false);
    const [isDepositing, setIsDepositing] = useState(false);
    const pendingAmountRef = useRef<bigint | null>(null);

    // Approval transaction
    const {
        writeContract: approve,
        data: approveHash,
        isPending: isApprovePending,
        error: approveError,
    } = useWriteContract();

    // Deposit transaction
    const {
        writeContract: deposit,
        data: depositHash,
        isPending: isDepositPending,
        error: depositError,
    } = useWriteContract();

    // Wait for approval confirmation
    const {
        isLoading: isApproveConfirming,
        isSuccess: isApproveSuccess,
    } = useWaitForTransactionReceipt({
        hash: approveHash,
    });

    // Wait for deposit confirmation
    const {
        isLoading: isDepositConfirming,
        isSuccess: isDepositSuccess,
    } = useWaitForTransactionReceipt({
        hash: depositHash,
    });

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

    // Reset approving state when approval completes
    useEffect(() => {
        if (isApproveSuccess && isApproving) {
            setIsApproving(false);
            refetchAllowance();
        }
    }, [isApproveSuccess, isApproving]);

    // Reset depositing state when deposit completes
    useEffect(() => {
        if (isDepositSuccess) {
            setIsDepositing(false);
        }
    }, [isDepositSuccess]);

    /**
     * Execute deposit flow
     * 1. Check if approval is needed
     * 2. Approve if necessary
     * 3. Deposit
     */
    const executeDeposit = async (amountUsd: string) => {
        if (!vault || !usdc || !address) {
            throw new Error('Wallet not connected or contracts not available');
        }

        // Parse amount (USDC has 6 decimals)
        const amount = parseUnits(amountUsd, 6);

        // Check if we need approval
        const needsApproval = !currentAllowance || currentAllowance < amount;

        if (needsApproval) {
            // Step 1: Approve USDC spending
            pendingAmountRef.current = amount;
            setIsApproving(true);
            approve({
                address: usdc.address,
                abi: usdc.abi,
                functionName: 'approve',
                args: [vault.address, amount],
            });
        } else {
            // Already approved, proceed to deposit
            executeDepositTransaction(amount);
        }
    };

    /**
     * Execute the actual deposit transaction
     */
    const executeDepositTransaction = (amount: bigint) => {
        if (!vault) return;

        setIsDepositing(true);
        deposit({
            address: vault.address,
            abi: vault.abi,
            functionName: 'deposit',
            args: [amount],
            gas: 500000n, // Set reasonable gas limit
        });
    };

    return {
        // Main function to call
        executeDeposit,

        // Transaction states
        isApproving: isApprovePending || isApproveConfirming || isApproving,
        isDepositing: isDepositPending || isDepositConfirming || isDepositing,

        // Success states
        isApproveSuccess,
        isDepositSuccess,

        // Errors
        approveError,
        depositError,

        // Transaction hashes
        approveHash,
        depositHash,

        // Allowance info
        currentAllowance: currentAllowance as bigint | undefined,
        hasAllowance: (amount: bigint) => currentAllowance ? currentAllowance >= amount : false,
    };
}
