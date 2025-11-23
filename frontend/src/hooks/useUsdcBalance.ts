/**
 * Hook to read USDC balance for connected user
 */

import { useAccount, useReadContract } from 'wagmi';
import { useContracts } from './useContracts';

export function useUsdcBalance() {
    const { address } = useAccount();
    const { usdc } = useContracts();

    // Read USDC balance
    const { data: balance, isLoading, refetch } = useReadContract({
        address: usdc?.address,
        abi: usdc?.abi,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: {
            enabled: !!usdc && !!address,
        },
    });

    // Formatted balance (USDC has 6 decimals)
    const formattedBalance = balance ? Number(balance) / 1e6 : 0;

    return {
        // Raw balance (bigint)
        balance: balance as bigint | undefined,

        // Formatted balance (number)
        formattedBalance,

        // Loading state
        isLoading,

        // Refetch function
        refetch,
    };
}
